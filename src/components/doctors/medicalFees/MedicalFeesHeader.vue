<script setup>
import Button from 'primevue/button';
import { ref } from 'vue';

const props = defineProps({
    canImport: {
        type: Boolean,
        required: true
    },
    servicesCount: {
        type: Number,
        default: 0
    }
});

const emit = defineEmits(['import-excel', 'clear-data']);

const fileInput = ref(null);

function handleImportClick() {
    fileInput.value.click();
}

function handleFileChange(event) {
    emit('import-excel', event);
}

function handleClearClick() {
    emit('clear-data');
}
</script>

<template>
    <div class="header-section">
        <div class="header-icon-wrapper">
            <i class="pi pi-dollar"></i>
        </div>
        <div class="header-content">
            <h1 class="header-title">Honorarios Médicos</h1>
            <p class="header-subtitle">
                <i class="pi pi-chart-line mr-2"></i>
                Gestión y clasificación de honorarios del personal médico
            </p>
        </div>
        <div class="header-actions">
            <Button label="Limpiar Datos" icon="pi pi-trash" severity="danger" outlined class="clear-button" @click="handleClearClick" :disabled="servicesCount === 0" />
            <Button :label="!canImport ? 'Cargando datos...' : 'Importar Excel'" :icon="!canImport ? 'pi pi-spin pi-spinner' : 'pi pi-upload'" class="import-button" @click="handleImportClick" :loading="!canImport" :disabled="!canImport" />
        </div>
        <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display: none" @change="handleFileChange" :disabled="!canImport" />
    </div>
</template>

<style scoped>
.header-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.header-icon-wrapper {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%);
    box-shadow:
        0 8px 20px rgba(102, 126, 234, 0.3),
        0 4px 12px rgba(118, 75, 162, 0.4);
    animation: pulse 2s ease-in-out infinite;
    position: relative;
    overflow: hidden;
}

.header-icon-wrapper::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: shimmer 3s infinite;
}

.header-icon-wrapper i {
    font-size: 2rem;
    color: #ffffff;
    z-index: 1;
}

:global(.dark) .header-icon-wrapper {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 50%, #764ba2 100%);
    box-shadow:
        0 8px 20px rgba(118, 75, 162, 0.4),
        0 4px 12px rgba(102, 126, 234, 0.5);
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.dark) .header-title {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.header-subtitle {
    color: var(--text-color-secondary);
    font-size: 1rem;
    display: flex;
    align-items: center;
    margin: 0;
}

.header-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.clear-button {
    transition: all 0.3s ease !important;
}

.clear-button:hover:not(:disabled) {
    transform: translateY(-2px) !important;
}

.import-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: white !important;
    border: none !important;
    padding: 0.75rem 1.5rem !important;
    font-weight: 600 !important;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
    transition: all 0.3s ease !important;
}

.import-button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4) !important;
}

@keyframes pulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
}

@keyframes shimmer {
    0%,
    100% {
        transform: translateX(-100%) rotate(45deg);
    }
    50% {
        transform: translateX(100%) rotate(45deg);
    }
}
</style>
