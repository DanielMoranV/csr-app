<script setup>
import { TreasuryService } from '@/service/TreasuryService';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';

const toast = useToast();

const accounts = ref([]);
const loadingAccounts = ref(true);
const selectedAccount = ref(null);

const selectedFile = ref(null);
const isDragging = ref(false);
const fileInputRef = ref(null);

const importing = ref(false);
const importResult = ref(null); // { created, errors, message, status }
const downloadingTemplate = ref(false);

// ─── LOAD ACCOUNTS ────────────────────────────────────────────────────────────
onMounted(async () => {
    try {
        const res = await TreasuryService.getBankAccounts();
        accounts.value = (res.data.data || res.data).map((acc) => ({
            ...acc,
            displayName: `${acc.bank.name} — ${acc.description} (${acc.currency})`
        }));
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las cuentas bancarias', life: 3000 });
    } finally {
        loadingAccounts.value = false;
    }
});

// ─── FILE HANDLING ─────────────────────────────────────────────────────────────
const handleFileSelect = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
        toast.add({ severity: 'warn', summary: 'Formato inválido', detail: 'Solo se aceptan archivos .xlsx o .xls', life: 3000 });
        return;
    }
    selectedFile.value = file;
    importResult.value = null;
};

const onFileInputChange = (e) => handleFileSelect(e.target.files[0]);

const onDropZoneClick = () => fileInputRef.value?.click();

const onDragOver = (e) => {
    e.preventDefault();
    isDragging.value = true;
};
const onDragLeave = () => {
    isDragging.value = false;
};
const onDrop = (e) => {
    e.preventDefault();
    isDragging.value = false;
    handleFileSelect(e.dataTransfer.files[0]);
};

const clearFile = () => {
    selectedFile.value = null;
    importResult.value = null;
    if (fileInputRef.value) fileInputRef.value.value = '';
};

const fileSizeLabel = computed(() => {
    if (!selectedFile.value) return '';
    const kb = selectedFile.value.size / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
});

const canImport = computed(() => selectedAccount.value && selectedFile.value && !importing.value);

// ─── TEMPLATE DOWNLOAD ────────────────────────────────────────────────────────
const downloadTemplate = async () => {
    downloadingTemplate.value = true;
    try {
        const res = await TreasuryService.downloadMedicalHonoraryTemplate();
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_honorarios_medicos.xlsx';
        a.click();
        URL.revokeObjectURL(url);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo descargar la plantilla', life: 3000 });
    } finally {
        downloadingTemplate.value = false;
    }
};

// ─── IMPORT ───────────────────────────────────────────────────────────────────
const doImport = async () => {
    if (!canImport.value) return;
    importing.value = true;
    importResult.value = null;

    try {
        const formData = new FormData();
        formData.append('file', selectedFile.value);
        formData.append('bank_account_id', selectedAccount.value);

        const res = await TreasuryService.importMedicalHonorary(formData);
        const data = res.data?.data || {};
        importResult.value = {
            status: 'success',
            created: data.created ?? 0,
            errors: data.errors ?? [],
            message: res.data?.message || 'Importación completada.'
        };
        toast.add({ severity: 'success', summary: 'Importación exitosa', detail: importResult.value.message, life: 4000 });
    } catch (err) {
        const status = err.response?.status;
        if (status === 207) {
            // Partial success
            const data = err.response.data?.data || {};
            importResult.value = {
                status: 'partial',
                created: data.created ?? 0,
                errors: data.errors ?? [],
                message: err.response.data?.message || 'Importación con errores parciales.'
            };
            toast.add({ severity: 'warn', summary: 'Importación parcial', detail: importResult.value.message, life: 5000 });
        } else if (status === 422) {
            const validationErrors = err.response?.data?.errors || {};
            const messages = Object.values(validationErrors).flat().join(' | ');
            importResult.value = {
                status: 'error',
                created: 0,
                errors: Object.values(validationErrors).flat(),
                message: messages || 'Error de validación.'
            };
            toast.add({ severity: 'error', summary: 'Error de validación', detail: messages, life: 5000 });
        } else {
            importResult.value = { status: 'error', created: 0, errors: ['Error inesperado al importar.'], message: 'Error inesperado.' };
            toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo completar la importación', life: 4000 });
        }
    } finally {
        importing.value = false;
    }
};
</script>

<template>
    <div class="treasury-view">
        <div class="main-card">
            <!-- Hero Header -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-file-import"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Importación Masiva</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-stethoscope mr-2"></i>
                        Honorarios Médicos — carga desde archivo Excel
                    </p>
                </div>
            </div>

            <!-- Template download banner -->
            <div class="template-banner">
                <div class="template-banner-info">
                    <i class="pi pi-info-circle template-banner-icon"></i>
                    <div>
                        <div class="template-banner-title">¿Primera vez? Descarga la plantilla Excel</div>
                        <div class="template-banner-sub">Incluye la hoja <strong>CUENTAS</strong> con los códigos de retención y un desplegable para TIPO_DOC</div>
                    </div>
                </div>
                <Button label="Descargar Plantilla" icon="pi pi-download" class="template-download-btn" :loading="downloadingTemplate" @click="downloadTemplate" />
            </div>

            <div class="import-layout">
                <!-- LEFT: steps / form -->
                <div class="import-form-col">
                    <!-- STEP 1: Cuenta Bancaria -->
                    <div class="step-card">
                        <div class="step-header">
                            <div class="step-number">1</div>
                            <div>
                                <div class="step-title">Cuenta Bancaria</div>
                                <div class="step-subtitle">Los movimientos se asociarán a esta cuenta</div>
                            </div>
                        </div>
                        <div class="step-body">
                            <Dropdown v-model="selectedAccount" :options="accounts" optionLabel="displayName" optionValue="id" filter :loading="loadingAccounts" placeholder="Seleccione una cuenta bancaria..." class="w-full account-dropdown">
                                <template #value="{ value }">
                                    <div v-if="value" class="account-selected">
                                        <i class="pi pi-wallet account-sel-icon"></i>
                                        <span>{{ accounts.find((a) => a.id === value)?.displayName }}</span>
                                    </div>
                                    <span v-else class="p-dropdown-label p-placeholder">Seleccione una cuenta bancaria...</span>
                                </template>
                                <template #option="{ option }">
                                    <div class="account-option">
                                        <i class="pi pi-wallet account-opt-icon"></i>
                                        <span>{{ option.displayName }}</span>
                                    </div>
                                </template>
                            </Dropdown>
                            <div v-if="selectedAccount" class="account-hint">
                                <i class="pi pi-check-circle"></i>
                                Cuenta seleccionada correctamente
                            </div>
                        </div>
                    </div>

                    <!-- STEP 2: Archivo -->
                    <div class="step-card">
                        <div class="step-header">
                            <div class="step-number">2</div>
                            <div>
                                <div class="step-title">Archivo Excel</div>
                                <div class="step-subtitle">Formatos aceptados: .xlsx / .xls</div>
                            </div>
                        </div>
                        <div class="step-body">
                            <!-- Drop zone -->
                            <div
                                v-if="!selectedFile"
                                class="drop-zone"
                                :class="{ 'drop-zone--active': isDragging, 'drop-zone--disabled': !selectedAccount }"
                                @click="selectedAccount && onDropZoneClick()"
                                @dragover="onDragOver"
                                @dragleave="onDragLeave"
                                @drop="onDrop"
                            >
                                <div class="drop-zone-icon">
                                    <i class="pi pi-cloud-upload"></i>
                                </div>
                                <p class="drop-zone-title">
                                    {{ isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo aquí' }}
                                </p>
                                <p class="drop-zone-sub">o haz clic para seleccionar</p>
                                <div v-if="!selectedAccount" class="drop-zone-hint"><i class="pi pi-info-circle mr-1"></i>Selecciona primero una cuenta bancaria</div>
                            </div>

                            <!-- File preview -->
                            <div v-else class="file-preview">
                                <div class="file-icon-wrapper">
                                    <i class="pi pi-file-excel file-icon"></i>
                                </div>
                                <div class="file-info">
                                    <div class="file-name">{{ selectedFile.name }}</div>
                                    <div class="file-meta">{{ fileSizeLabel }}</div>
                                </div>
                                <Button icon="pi pi-times" class="file-remove-btn" text rounded v-tooltip.top="'Quitar archivo'" @click="clearFile" />
                            </div>

                            <input ref="fileInputRef" type="file" accept=".xlsx,.xls" style="display: none" @change="onFileInputChange" />
                        </div>
                    </div>

                    <!-- STEP 3: Importar -->
                    <div class="step-card step-card--action">
                        <div class="step-header">
                            <div class="step-number" :class="{ 'step-number--active': canImport }">3</div>
                            <div>
                                <div class="step-title">Ejecutar Importación</div>
                                <div class="step-subtitle">La categoría y dirección son fijas (Honorarios / Egreso)</div>
                            </div>
                        </div>
                        <div class="step-body">
                            <div class="import-info-row">
                                <div class="import-info-badge">
                                    <i class="pi pi-tag"></i>
                                    <span>Categoría: <strong>Honorarios Médicos</strong></span>
                                </div>
                                <div class="import-info-badge import-info-badge--egreso">
                                    <i class="pi pi-arrow-down"></i>
                                    <span>Dirección: <strong>Egreso</strong></span>
                                </div>
                            </div>
                            <Button label="Importar Archivo" icon="pi pi-upload" class="import-btn" :disabled="!canImport" :loading="importing" @click="doImport" />
                        </div>
                    </div>
                </div>

                <!-- RIGHT: result panel -->
                <div class="import-result-col">
                    <!-- Idle state -->
                    <div v-if="!importResult && !importing" class="result-idle">
                        <div class="result-idle-icon">
                            <i class="pi pi-inbox"></i>
                        </div>
                        <p class="result-idle-title">Sin resultados aún</p>
                        <p class="result-idle-sub">Completa los pasos y presiona Importar</p>
                    </div>

                    <!-- Loading state -->
                    <div v-if="importing" class="result-loading">
                        <ProgressSpinner style="width: 60px; height: 60px" strokeWidth="4" />
                        <p class="result-loading-text">Procesando archivo...</p>
                        <p class="result-loading-sub">Esto puede tomar unos segundos</p>
                    </div>

                    <!-- Result: success / partial -->
                    <div v-if="importResult && !importing" class="result-panel" :class="`result-panel--${importResult.status}`">
                        <!-- Status icon -->
                        <div class="result-status-icon">
                            <i :class="importResult.status === 'success' ? 'pi pi-check-circle' : importResult.status === 'partial' ? 'pi pi-exclamation-circle' : 'pi pi-times-circle'" />
                        </div>

                        <!-- Message -->
                        <p class="result-message">{{ importResult.message }}</p>

                        <!-- Created count -->
                        <div class="result-stat" v-if="importResult.created > 0">
                            <div class="result-stat-number">{{ importResult.created }}</div>
                            <div class="result-stat-label">movimiento(s) creado(s)</div>
                        </div>

                        <!-- Errors list -->
                        <div v-if="importResult.errors?.length > 0" class="result-errors">
                            <div class="result-errors-header">
                                <i class="pi pi-exclamation-triangle"></i>
                                Errores detectados ({{ importResult.errors.length }})
                            </div>
                            <ul class="result-errors-list">
                                <li v-for="(err, idx) in importResult.errors" :key="idx" class="result-error-item">
                                    <i class="pi pi-circle-fill result-error-dot"></i>
                                    {{ err }}
                                </li>
                            </ul>
                        </div>

                        <!-- Reset button -->
                        <Button
                            label="Nueva importación"
                            icon="pi pi-refresh"
                            class="result-reset-btn"
                            text
                            @click="
                                clearFile();
                                importResult = null;
                            "
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes shimmer {
    0%,
    100% {
        transform: translateX(-100%) rotate(45deg);
    }
    50% {
        transform: translateX(100%) rotate(45deg);
    }
}
@keyframes gradientShift {
    0%,
    100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
}
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
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

.treasury-view {
    padding: 1rem;
    animation: fadeIn 0.5s ease-out;
}

.main-card {
    background: linear-gradient(145deg, var(--surface-section), var(--surface-card));
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
}
.main-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #10b981, #059669, #10b981, #047857);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

/* ─── HEADER ─────────────────────────────────────────────────────────────── */
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
    background: linear-gradient(135deg, #10b981, #059669, #047857);
    box-shadow:
        0 8px 20px rgba(16, 185, 129, 0.3),
        0 4px 12px rgba(5, 150, 105, 0.4);
    animation: pulse 2s ease-in-out infinite;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
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
    color: #fff;
    z-index: 1;
}
.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.4rem 0;
    background: linear-gradient(135deg, #10b981, #059669);
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

/* ─── LAYOUT ──────────────────────────────────────────────────────────────── */
.import-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: start;
}
@media (max-width: 900px) {
    .import-layout {
        grid-template-columns: 1fr;
    }
}

/* ─── STEP CARDS ──────────────────────────────────────────────────────────── */
.import-form-col {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.step-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 14px;
    overflow: hidden;
    transition: box-shadow 0.2s;
}
.step-card:hover {
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.1);
}

.step-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--surface-border);
    background: linear-gradient(135deg, var(--surface-section) 0%, var(--surface-card) 100%);
}
.step-number {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 700;
    background: var(--surface-border);
    color: var(--text-color-secondary);
    transition: all 0.2s;
    flex-shrink: 0;
}
.step-number--active {
    background: linear-gradient(135deg, #10b981, #059669) !important;
    color: white !important;
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.35);
}
.step-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-color);
}
.step-subtitle {
    font-size: 0.78rem;
    color: var(--text-color-secondary);
    margin-top: 0.1rem;
}
.step-body {
    padding: 1.25rem;
}

/* ─── ACCOUNT DROPDOWN ────────────────────────────────────────────────────── */
:deep(.account-dropdown) {
    width: 100%;
}
.account-selected {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.account-sel-icon {
    color: #10b981;
    font-size: 0.85rem;
}
.account-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.account-opt-icon {
    color: #10b981;
    font-size: 0.8rem;
    flex-shrink: 0;
}
.account-hint {
    margin-top: 0.6rem;
    font-size: 0.8rem;
    color: #059669;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

/* ─── DROP ZONE ───────────────────────────────────────────────────────────── */
.drop-zone {
    border: 2px dashed var(--surface-border);
    border-radius: 12px;
    padding: 2rem 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--surface-ground);
}
.drop-zone:hover:not(.drop-zone--disabled) {
    border-color: #10b981;
    background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
}
.drop-zone--active {
    border-color: #10b981 !important;
    background: linear-gradient(135deg, #d1fae5, #ecfdf5) !important;
    transform: scale(1.01);
}
.drop-zone--disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.drop-zone-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    margin: 0 auto 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    border: 2px solid #6ee7b7;
}
.drop-zone-icon i {
    font-size: 1.75rem;
    color: #059669;
}
.drop-zone-title {
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 0.3rem 0;
}
.drop-zone-sub {
    font-size: 0.82rem;
    color: var(--text-color-secondary);
    margin: 0 0 0.6rem 0;
}
.drop-zone-hint {
    font-size: 0.78rem;
    color: #f59e0b;
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
}

/* ─── FILE PREVIEW ────────────────────────────────────────────────────────── */
.file-preview {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.9rem 1rem;
    background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
    border: 1px solid #a7f3d0;
    border-radius: 10px;
}
.file-icon-wrapper {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #10b981, #059669);
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
}
.file-icon {
    font-size: 1.4rem;
    color: white;
}
.file-info {
    flex: 1;
    min-width: 0;
}
.file-name {
    font-weight: 600;
    color: var(--text-color);
    font-size: 0.875rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.file-meta {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    margin-top: 0.15rem;
}
.file-remove-btn {
    color: #ef4444 !important;
    flex-shrink: 0;
}

/* ─── IMPORT INFO + BUTTON ────────────────────────────────────────────────── */
.import-info-row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}
.import-info-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.75rem;
    background: color-mix(in srgb, var(--green-100) 50%, transparent);
    border: 1px solid var(--green-200);
    border-radius: 20px;
    font-size: 0.78rem;
    color: #047857;
}
.import-info-badge--egreso {
    background: color-mix(in srgb, var(--red-100) 40%, transparent);
    border-color: var(--red-200);
    color: #b91c1c;
}

.import-btn {
    width: 100%;
    background: linear-gradient(135deg, #10b981, #059669) !important;
    border: none !important;
    border-radius: 10px !important;
    font-size: 1rem !important;
    font-weight: 700 !important;
    padding: 0.75rem !important;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35) !important;
    transition: all 0.25s ease !important;
}
.import-btn:not(:disabled):hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.45) !important;
    background: linear-gradient(135deg, #059669, #047857) !important;
}
.import-btn:disabled {
    opacity: 0.55 !important;
    cursor: not-allowed !important;
}

/* ─── RESULT PANEL ────────────────────────────────────────────────────────── */
.import-result-col {
    position: sticky;
    top: 1rem;
    min-height: 400px;
    display: flex;
    flex-direction: column;
}

/* Idle */
.result-idle {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    text-align: center;
    background: var(--surface-card);
    border: 2px dashed var(--surface-border);
    border-radius: 16px;
    animation: fadeIn 0.3s ease;
}
.result-idle-icon {
    width: 72px;
    height: 72px;
    border-radius: 18px;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
}
.result-idle-icon i {
    font-size: 2rem;
    color: var(--text-color-secondary);
}
.result-idle-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 0.3rem 0;
}
.result-idle-sub {
    font-size: 0.82rem;
    color: var(--text-color-secondary);
    margin: 0;
}

/* Loading */
.result-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    text-align: center;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    animation: fadeIn 0.3s ease;
    gap: 1rem;
}
.result-loading-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0;
}
.result-loading-sub {
    font-size: 0.82rem;
    color: var(--text-color-secondary);
    margin: 0;
}

/* Result panel */
.result-panel {
    background: var(--surface-card);
    border-radius: 16px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    border: 2px solid transparent;
    animation: fadeIn 0.4s ease;
}
.result-panel--success {
    border-color: #a7f3d0;
    background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
}
.result-panel--partial {
    border-color: #fcd34d;
    background: linear-gradient(135deg, #fffbeb, #fef9c3);
}
.result-panel--error {
    border-color: #fca5a5;
    background: linear-gradient(135deg, #fff1f2, #fef2f2);
}

.result-status-icon i {
    font-size: 3rem;
}
.result-panel--success .result-status-icon i {
    color: #10b981;
}
.result-panel--partial .result-status-icon i {
    color: #d97706;
}
.result-panel--error .result-status-icon i {
    color: #ef4444;
}

.result-message {
    font-size: 0.9rem;
    text-align: center;
    color: var(--text-color);
    margin: 0;
    font-weight: 500;
}

.result-stat {
    text-align: center;
}
.result-stat-number {
    font-size: 2.5rem;
    font-weight: 800;
    color: #10b981;
    line-height: 1;
}
.result-stat-label {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    margin-top: 0.15rem;
}

/* Errors */
.result-errors {
    width: 100%;
}
.result-errors-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.82rem;
    font-weight: 700;
    color: #b45309;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    margin-bottom: 0.6rem;
}
.result-errors-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.result-error-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-color);
    padding: 0.4rem 0.7rem;
    background: var(--surface-ground);
    border-radius: 6px;
    border-left: 3px solid #ef4444;
}
.result-error-dot {
    font-size: 0.35rem;
    color: #ef4444;
    margin-top: 0.35rem;
    flex-shrink: 0;
}

.result-reset-btn {
    color: #059669 !important;
    font-weight: 600 !important;
    margin-top: 0.5rem;
}

/* ─── TEMPLATE BANNER ─────────────────────────────────────────────────────── */
.template-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1rem 1.25rem;
    margin-bottom: 1.75rem;
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    border: 1px solid #bfdbfe;
    border-radius: 12px;
}
.template-banner-info {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
}
.template-banner-icon {
    font-size: 1.1rem;
    color: #2563eb;
    margin-top: 0.1rem;
    flex-shrink: 0;
}
.template-banner-title {
    font-size: 0.88rem;
    font-weight: 700;
    color: #1e40af;
}
.template-banner-sub {
    font-size: 0.78rem;
    color: #3b82f6;
    margin-top: 0.15rem;
}
.template-download-btn {
    background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
    border: none !important;
    border-radius: 8px !important;
    font-size: 0.85rem !important;
    font-weight: 700 !important;
    white-space: nowrap;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(59, 130, 246, 0.35) !important;
    transition: all 0.2s ease !important;
}
.template-download-btn:hover {
    background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 5px 14px rgba(59, 130, 246, 0.45) !important;
}
</style>
