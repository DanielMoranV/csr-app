<script setup>
import { useLiquidaciones } from '@/composables/useLiquidaciones';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const { isLoading, error, generarPdf, clearError } = useLiquidaciones();

// ── Entrada ──────────────────────────────────────────────────────────────────
const numeroAdmision = ref('');
const searchInput = ref(null);
// Migrar fresco desde el ETL (default). Desmarcar lee lo ya migrado (más rápido).
const migrarFresh = ref(true);

// Número normalizado (solo dígitos) y validación.
const normalized = computed(() => numeroAdmision.value.trim());
const isValid = computed(() => /^\d+$/.test(normalized.value));

// ── PDF cargado (Blob + object URL para el visor embebido) ────────────────────
const pdfUrl = ref(null);
const currentBlob = ref(null);
// Número de admisión al que corresponde el Blob en memoria (para reutilizarlo
// entre "Ver" y "Descargar" sin volver a esperar la migración).
const currentNumero = ref('');

const releaseUrl = () => {
    if (pdfUrl.value) {
        URL.revokeObjectURL(pdfUrl.value);
        pdfUrl.value = null;
    }
};

const setBlob = (blob, numero) => {
    releaseUrl();
    currentBlob.value = blob;
    currentNumero.value = numero;
    pdfUrl.value = URL.createObjectURL(blob);
};

/**
 * Garantiza un Blob para el número actual: reutiliza el ya cargado si coincide,
 * o lo genera. Devuelve el Blob o `null` si falló.
 */
const ensureBlob = async () => {
    const numero = normalized.value;
    if (currentBlob.value && currentNumero.value === numero) return currentBlob.value;

    const blob = await generarPdf(numero, { migrar: migrarFresh.value });
    if (blob) setBlob(blob, numero);
    return blob;
};

// ── Acciones ─────────────────────────────────────────────────────────────────
const handleVer = async () => {
    if (!isValid.value || isLoading.value) return;
    await ensureBlob();
};

const handleDescargar = async () => {
    if (!isValid.value || isLoading.value) return;
    const blob = await ensureBlob();
    if (blob) saveBlob(blob, normalized.value);
};

/** Abre el PDF ya cargado en una pestaña nueva (gesto directo → sin bloqueo de popups). */
const abrirEnPestana = () => {
    if (pdfUrl.value) window.open(pdfUrl.value, '_blank');
};

const saveBlob = (blob, numero) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liquidacion-${numero}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Al cambiar el número o el modo de migración, el PDF mostrado deja de
// corresponder a la entrada: se limpia el visor y el error para evitar confusión.
watch([numeroAdmision, migrarFresh], () => {
    releaseUrl();
    currentBlob.value = null;
    currentNumero.value = '';
    clearError();
});

onBeforeUnmount(releaseUrl);

// ── Estado de error (mensaje en línea según el caso) ──────────────────────────
// El interceptor de axios normaliza el error a { status, message } (el cuerpo
// binario de error se pierde, por eso mapeamos el copy por código HTTP).
const errorInfo = computed(() => {
    const e = error.value;
    if (!e) return null;
    const byStatus = {
        403: { icon: 'pi pi-lock', cls: 'warn', title: 'No tienes permiso', subtitle: 'No tienes permiso para ver liquidaciones.', retry: false },
        404: { icon: 'pi pi-search-minus', cls: 'warn', title: 'Admisión no encontrada', subtitle: `No se encontró la admisión «${currentNumeroBuscado.value}». Verifica el número e inténtalo nuevamente.`, retry: false },
        502: { icon: 'pi pi-server', cls: 'danger', title: 'Servicio no disponible', subtitle: 'No se pudo obtener la liquidación. Intenta de nuevo en unos minutos.', retry: true },
        503: { icon: 'pi pi-server', cls: 'danger', title: 'Servicio no disponible', subtitle: 'No se pudo obtener la liquidación. Intenta de nuevo en unos minutos.', retry: true },
        504: { icon: 'pi pi-clock', cls: 'danger', title: 'La generación tardó demasiado', subtitle: 'El servicio no respondió a tiempo. Vuelve a intentarlo.', retry: true }
    };
    return byStatus[e.status] || { icon: 'pi pi-exclamation-triangle', cls: 'danger', title: 'No se pudo generar la liquidación', subtitle: e.message || 'Ocurrió un problema al generar la liquidación. Intenta nuevamente.', retry: true };
});

// Número que se estaba consultando cuando ocurrió el error (para el mensaje 404).
const currentNumeroBuscado = ref('');
watch(isLoading, (loading) => {
    if (loading) currentNumeroBuscado.value = normalized.value;
});
</script>

<template>
    <div class="liq-view">
        <div class="main-card">
            <!-- Cabecera -->
            <div class="header-section">
                <div class="header-icon-wrapper"><i class="pi pi-file-pdf"></i></div>
                <div class="header-content">
                    <h1 class="header-title">Liquidación de Servicios</h1>
                    <p class="header-subtitle"><i class="pi pi-info-circle mr-2"></i>Ingresa el número de admisión de la hospitalización para ver o descargar su liquidación en PDF.</p>
                </div>
            </div>

            <!-- Barra de búsqueda -->
            <div class="search-bar">
                <IconField class="search-field">
                    <InputIcon class="pi pi-hashtag" />
                    <InputText ref="searchInput" v-model="numeroAdmision" placeholder="Número de admisión (ej. 376813)…" class="search-input" inputmode="numeric" autofocus :disabled="isLoading" @keyup.enter="handleVer" />
                </IconField>
                <Button label="Ver" icon="pi pi-eye" :loading="isLoading" :disabled="!isValid" @click="handleVer" />
                <Button label="Descargar" icon="pi pi-download" severity="secondary" outlined :disabled="!isValid || isLoading" @click="handleDescargar" />
            </div>

            <!-- Opciones -->
            <div class="options-row">
                <div class="opt">
                    <Checkbox v-model="migrarFresh" :binary="true" inputId="migrarFresh" :disabled="isLoading" />
                    <label for="migrarFresh">Volver a migrar datos antes de generar <span class="opt-hint">(más preciso, tarda ~10-15 s)</span></label>
                </div>
            </div>

            <!-- Validación de entrada -->
            <p v-if="numeroAdmision && !isValid" class="input-error"><i class="pi pi-exclamation-circle"></i> El número de admisión debe contener solo dígitos.</p>

            <!-- Estado: generando (migración + armado del PDF, ~10-15 s) -->
            <div v-if="isLoading" class="state-block">
                <ProgressSpinner style="width: 48px; height: 48px" strokeWidth="4" />
                <p class="state-text">Generando liquidación…</p>
                <p class="state-subtext">Esto puede tardar unos 10-15 segundos mientras se preparan los datos.</p>
            </div>

            <!-- Estado: error (mensaje según el caso) -->
            <div v-else-if="errorInfo" class="state-block">
                <i :class="[errorInfo.icon, 'state-icon', errorInfo.cls]"></i>
                <p class="state-text">{{ errorInfo.title }}</p>
                <p v-if="errorInfo.subtitle" class="state-subtext">{{ errorInfo.subtitle }}</p>
                <Button v-if="errorInfo.retry" label="Reintentar" icon="pi pi-refresh" @click="handleVer" />
            </div>

            <!-- Resultado: visor embebido del PDF -->
            <div v-else-if="pdfUrl" class="viewer">
                <div class="viewer-toolbar">
                    <span class="viewer-label"
                        ><i class="pi pi-file-pdf"></i> Liquidación de la admisión <strong class="mono">{{ currentNumero }}</strong></span
                    >
                    <div class="viewer-actions">
                        <Button label="Abrir en pestaña nueva" icon="pi pi-external-link" severity="secondary" text @click="abrirEnPestana" />
                        <Button label="Descargar" icon="pi pi-download" severity="secondary" outlined @click="handleDescargar" />
                    </div>
                </div>
                <iframe :src="pdfUrl" class="viewer-frame" title="Liquidación de Servicios"></iframe>
                <p class="viewer-hint">¿No se muestra el PDF? Usa «Abrir en pestaña nueva» o «Descargar».</p>
            </div>

            <!-- Estado: inicial (aún no se genera) -->
            <div v-else class="state-block muted">
                <i class="pi pi-file-pdf state-icon"></i>
                <p class="state-text">Ingresa un número de admisión y pulsa «Ver» para generar la liquidación.</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.liq-view {
    padding: 1rem;
}
.main-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Cabecera */
.header-section {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
}
.header-icon-wrapper {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 60%, #000));
    box-shadow: 0 6px 16px color-mix(in srgb, var(--primary-color) 35%, transparent);
}
.header-icon-wrapper i {
    font-size: 1.75rem;
    color: #fff;
}
.header-content {
    flex: 1;
}
.header-title {
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
    color: var(--text-color);
}
.header-subtitle {
    color: var(--text-color-secondary);
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    margin: 0;
}

/* Barra de búsqueda */
.search-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
}
.search-field {
    flex: 1;
    min-width: 260px;
}
.search-input {
    width: 100%;
    font-size: 1.1rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
}

/* Opciones */
.options-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 0.5rem;
}
.opt {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color);
    font-size: 0.9rem;
}
.opt-hint {
    color: var(--text-color-secondary);
}

.input-error {
    color: var(--red-500, #ef4444);
    font-size: 0.85rem;
    margin: 0.25rem 0 0;
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

/* Bloques de estado (loading / vacío / error) */
.state-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3.5rem 1rem;
    text-align: center;
}
.state-block.muted {
    color: var(--text-color-secondary);
}
.state-icon {
    font-size: 3rem;
    color: var(--text-color-secondary);
}
.state-icon.warn {
    color: var(--yellow-500, #eab308);
}
.state-icon.danger {
    color: var(--red-500, #ef4444);
}
.state-text {
    font-size: 1.1rem;
    color: var(--text-color);
    margin: 0;
}
.state-subtext {
    color: var(--text-color-secondary);
    margin: 0;
}

/* Visor del PDF */
.viewer {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
}
.viewer-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}
.viewer-label {
    color: var(--text-color);
    font-size: 0.95rem;
}
.viewer-label i {
    color: var(--primary-color);
    margin-right: 0.35rem;
}
.viewer-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}
.viewer-frame {
    width: 100%;
    height: 75vh;
    min-height: 480px;
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    background: var(--surface-ground);
}
.viewer-hint {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    margin: 0;
    text-align: center;
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

@media (max-width: 768px) {
    .main-card {
        padding: 1rem;
    }
    .viewer-toolbar {
        align-items: flex-start;
    }
}
</style>
