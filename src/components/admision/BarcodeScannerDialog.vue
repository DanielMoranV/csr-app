<script setup>
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Slider from 'primevue/slider';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

/**
 * Diálogo que usa la cámara del dispositivo como lector de código de barras.
 * Al detectar un código emite `detected` con el texto y se cierra; la vista
 * padre lo inyecta en el input de búsqueda y dispara la consulta.
 *
 * Formatos soportados: PDF417 (DNI peruano), Code128/Code39 (wristbands /
 * historia impresa), QR, EAN e ITF.
 */
const props = defineProps({
    visible: { type: Boolean, default: false }
});
const emit = defineEmits(['update:visible', 'detected']);

const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
});

// ── Configuración del lector (formatos a intentar) ───────────────────────────
const buildReader = () => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.QR_CODE, BarcodeFormat.EAN_13, BarcodeFormat.ITF]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    return new BrowserMultiFormatReader(hints);
};

const videoEl = ref(null);
const reader = shallowRef(null);
const controls = shallowRef(null); // IScannerControls devuelto por ZXing

const status = ref('idle'); // idle | starting | scanning | error
const errorMsg = ref('');

// Dispositivos disponibles (para poder alternar cámara: webcam ↔ cámara trasera).
const devices = ref([]);
const currentDeviceId = ref(null);
const hasMultipleCameras = computed(() => devices.value.length > 1);

// ── Arranque / parada de la cámara ───────────────────────────────────────────

// Libera cualquier pista de vídeo que siga abierta en el elemento <video>. ZXing
// debería hacerlo en controls.stop(), pero si un arranque falla a medias el
// stream puede quedar retenido y bloquear la cámara ("NotReadableError").
const releaseStream = () => {
    const stream = videoEl.value?.srcObject;
    if (stream?.getTracks) {
        stream.getTracks().forEach((t) => {
            try {
                t.stop();
            } catch {
                /* noop */
            }
        });
    }
    if (videoEl.value) videoEl.value.srcObject = null;
};

const stop = () => {
    try {
        controls.value?.stop();
    } catch {
        /* noop */
    }
    releaseStream();
    controls.value = null;
    reader.value = null;
    track.value = null;
    zoomCaps.value = null;
    torchSupported.value = false;
    torchOn.value = false;
    status.value = 'idle';
};

const start = async (deviceId) => {
    stop();
    errorMsg.value = '';
    status.value = 'starting';

    // getUserMedia requiere contexto seguro (HTTPS o localhost).
    if (!navigator.mediaDevices?.getUserMedia) {
        status.value = 'error';
        errorMsg.value = 'La cámara no está disponible. Verifica que accedes por HTTPS.';
        return;
    }

    try {
        reader.value = buildReader();

        // Enumerar cámaras (para el botón de alternar). Ignoramos fallos.
        try {
            const list = await BrowserMultiFormatReader.listVideoInputDevices();
            devices.value = list || [];
        } catch {
            devices.value = [];
        }

        // Selección de cámara: la indicada, o la trasera si podemos detectarla.
        let selected = deviceId ?? currentDeviceId.value;
        if (!selected && devices.value.length) {
            const back = devices.value.find((d) => /back|rear|trasera|environment/i.test(d.label));
            selected = (back || devices.value[devices.value.length - 1]).deviceId;
        }
        currentDeviceId.value = selected || null;

        const onResult = (result) => {
            if (!result) return;
            const text = result.getText?.() ?? String(result);
            if (text) handleDetected(text);
        };

        // Base de constraints: cámara elegida (o trasera en móviles).
        const baseVideo = () => (selected ? { deviceId: { exact: selected } } : { facingMode: { ideal: 'environment' } });

        // Se intenta primero en alta resolución (mejor para el PDF417 del DNI) y
        // se degrada si la cámara no puede entregarla: muchas webcams lanzan
        // NotReadableError/OverconstrainedError al pedir 1080p. El foco continuo
        // NO se pide aquí (constraint no estándar que rompe algunas cámaras); se
        // aplica después con applyConstraints, que no tumba el stream si falla.
        const attempts = [{ video: { ...baseVideo(), width: { ideal: 1920 }, height: { ideal: 1080 } } }, { video: baseVideo() }, { video: true }];

        let lastErr = null;
        for (const constraints of attempts) {
            try {
                controls.value = await reader.value.decodeFromConstraints(constraints, videoEl.value, onResult);
                lastErr = null;
                break;
            } catch (e) {
                lastErr = e;
                releaseStream();
                // Si el usuario denegó el permiso, reintentar es inútil.
                if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') break;
            }
        }
        if (lastErr) throw lastErr;

        status.value = 'scanning';

        // Con el stream ya abierto: foco continuo + zoom/linterna si la cámara
        // los soporta (típicamente en móviles).
        await applyTrackEnhancements();
    } catch (e) {
        status.value = 'error';
        errorMsg.value = describeError(e);
    }
};

// ── Realce de la pista de vídeo: foco continuo, zoom y linterna ───────────────
const track = shallowRef(null);
const zoom = ref(1);
const zoomCaps = ref(null); // { min, max, step } o null si no hay zoom
const torchSupported = ref(false);
const torchOn = ref(false);

const applyTrackEnhancements = async () => {
    track.value = null;
    zoomCaps.value = null;
    torchSupported.value = false;
    torchOn.value = false;

    const stream = videoEl.value?.srcObject;
    const t = stream?.getVideoTracks?.()[0];
    if (!t) return;
    track.value = t;

    const caps = t.getCapabilities?.() || {};
    const settings = t.getSettings?.() || {};

    // Autofocus continuo (clave para el DNI). Se aplica por separado porque
    // muchos navegadores lo ignoran dentro de getUserMedia.
    if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
        try {
            await t.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
        } catch {
            /* noop */
        }
    }

    // Zoom (óptico/digital): permite acercar un código pequeño.
    if (caps.zoom && typeof caps.zoom.max === 'number') {
        zoomCaps.value = { min: caps.zoom.min ?? 1, max: caps.zoom.max, step: caps.zoom.step || 0.1 };
        zoom.value = settings.zoom ?? zoomCaps.value.min;
    }

    torchSupported.value = !!caps.torch;
};

const applyZoom = async (value) => {
    zoom.value = value;
    if (!track.value) return;
    try {
        await track.value.applyConstraints({ advanced: [{ zoom: value }] });
    } catch {
        /* noop */
    }
};

const toggleTorch = async () => {
    if (!track.value || !torchSupported.value) return;
    const next = !torchOn.value;
    try {
        await track.value.applyConstraints({ advanced: [{ torch: next }] });
        torchOn.value = next;
    } catch {
        /* noop */
    }
};

const describeError = (e) => {
    switch (e?.name) {
        case 'NotAllowedError':
        case 'SecurityError':
            return 'Permiso de cámara denegado. Habilítalo en el navegador y reintenta.';
        case 'NotFoundError':
        case 'OverconstrainedError':
            return 'No se encontró una cámara disponible en este equipo.';
        case 'NotReadableError':
            return 'No se pudo acceder a la cámara. Ciérrala en otras apps o pestañas (Teams, Zoom, Cámara de Windows) y reintenta.';
        default:
            return e?.message || 'No se pudo iniciar la cámara.';
    }
};

const handleDetected = (text) => {
    const code = text.trim();
    if (!code) return;
    stop();
    emit('detected', code);
    dialogVisible.value = false;
};

const switchCamera = () => {
    if (!hasMultipleCameras.value) return;
    const idx = devices.value.findIndex((d) => d.deviceId === currentDeviceId.value);
    const next = devices.value[(idx + 1) % devices.value.length];
    start(next.deviceId);
};

const retry = () => start();

// ── Ciclo de vida ligado a la visibilidad del diálogo ────────────────────────
watch(
    () => props.visible,
    (val) => {
        if (val) start();
        else stop();
    }
);

// El padre monta el diálogo con v-if (visible ya en true), por lo que el watch
// no dispara en el montaje inicial: arrancamos aquí.
onMounted(() => {
    if (props.visible) start();
});

onBeforeUnmount(stop);
</script>

<template>
    <Dialog v-model:visible="dialogVisible" modal header="Escanear código" :style="{ width: '32rem', maxWidth: '95vw' }" :dismissableMask="true">
        <div class="scanner-body">
            <div class="video-frame">
                <video ref="videoEl" class="scanner-video" autoplay muted playsinline></video>
                <div v-if="status === 'scanning'" class="scan-guide"></div>

                <div v-if="status === 'starting'" class="video-overlay">
                    <i class="pi pi-spin pi-spinner"></i>
                    <span>Iniciando cámara…</span>
                </div>
                <div v-else-if="status === 'error'" class="video-overlay error">
                    <i class="pi pi-exclamation-triangle"></i>
                    <span>{{ errorMsg }}</span>
                </div>

                <!-- Linterna (si la cámara la soporta): ayuda con DNIs plastificados -->
                <Button
                    v-if="status === 'scanning' && torchSupported"
                    class="torch-btn"
                    :icon="torchOn ? 'pi pi-lightbulb' : 'pi pi-bolt'"
                    rounded
                    :severity="torchOn ? 'warn' : 'secondary'"
                    v-tooltip.left="torchOn ? 'Apagar linterna' : 'Encender linterna'"
                    @click="toggleTorch"
                />
            </div>

            <!-- Zoom: acerca el código pequeño del DNI hasta que enfoca nítido -->
            <div v-if="status === 'scanning' && zoomCaps" class="zoom-control">
                <i class="pi pi-search-minus"></i>
                <Slider :modelValue="zoom" :min="zoomCaps.min" :max="zoomCaps.max" :step="zoomCaps.step" class="zoom-slider" @update:modelValue="applyZoom" />
                <i class="pi pi-search-plus"></i>
            </div>

            <p v-if="status === 'scanning'" class="scanner-hint"><i class="pi pi-camera"></i> Apunta al código de barras del documento. Para el DNI, acerca el reverso y usa el zoom hasta que enfoque nítido.</p>
        </div>

        <template #footer>
            <Button v-if="status === 'error'" label="Reintentar" icon="pi pi-refresh" @click="retry" />
            <Button v-if="hasMultipleCameras && status === 'scanning'" label="Cambiar cámara" icon="pi pi-sync" severity="secondary" outlined @click="switchCamera" />
            <Button label="Cerrar" icon="pi pi-times" severity="secondary" text @click="dialogVisible = false" />
        </template>
    </Dialog>
</template>

<style scoped>
.scanner-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}
.video-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    background: #000;
    border-radius: 12px;
    overflow: hidden;
}
.scanner-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}
/* Guía visual centrada para encuadrar el código */
.scan-guide {
    position: absolute;
    inset: 20% 12%;
    border: 3px solid rgba(255, 255, 255, 0.85);
    border-radius: 10px;
    box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.25);
    pointer-events: none;
}
.video-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    text-align: center;
    padding: 1.5rem;
    color: #fff;
    background: rgba(0, 0, 0, 0.55);
}
.video-overlay i {
    font-size: 2rem;
}
.video-overlay.error i {
    color: var(--yellow-400, #facc15);
}
.scanner-hint {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-color-secondary);
}

/* Linterna sobre el vídeo */
.torch-btn {
    position: absolute;
    top: 0.6rem;
    right: 0.6rem;
    z-index: 2;
}

/* Control de zoom */
.zoom-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.25rem 0.25rem 0;
}
.zoom-control i {
    color: var(--text-color-secondary);
    font-size: 0.9rem;
}
.zoom-slider {
    flex: 1;
}
</style>
