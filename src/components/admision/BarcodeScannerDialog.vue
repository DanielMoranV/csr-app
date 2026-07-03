<script setup>
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
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
const stop = () => {
    try {
        controls.value?.stop();
    } catch {
        /* noop */
    }
    controls.value = null;
    reader.value = null;
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

        if (selected) {
            controls.value = await reader.value.decodeFromVideoDevice(selected, videoEl.value, onResult);
        } else {
            // Sin deviceId: pedimos la cámara trasera por constraint (móviles).
            controls.value = await reader.value.decodeFromConstraints({ video: { facingMode: 'environment' } }, videoEl.value, onResult);
        }
        status.value = 'scanning';
    } catch (e) {
        status.value = 'error';
        errorMsg.value = describeError(e);
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
            return 'La cámara está en uso por otra aplicación.';
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
            </div>

            <p v-if="status === 'scanning'" class="scanner-hint"><i class="pi pi-camera"></i> Apunta al código de barras del documento (DNI, pulsera o QR).</p>
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
</style>
