<script setup>
import { TreasuryService } from '@/service/TreasuryService';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';

const emit = defineEmits(['imported']);
const toast = useToast();

const visible = ref(false);
const step = ref('setup'); // 'setup' | 'preview' | 'done'
const loading = ref(false);

const importFile = ref(null);
const fileInputRef = ref(null);

const dryResult = ref(null);
const doneResult = ref(null);

// ─── Public API ───────────────────────────────────────────────────────────────
const open = () => {
    importFile.value = null;
    dryResult.value = null;
    doneResult.value = null;
    step.value = 'setup';
    visible.value = true;
};
defineExpose({ open });

// ─── File input ───────────────────────────────────────────────────────────────
const onFileChange = (e) => {
    importFile.value = e.target.files[0] || null;
};

const clearFile = () => {
    importFile.value = null;
    if (fileInputRef.value) fileInputRef.value.value = '';
};

// ─── Download template ────────────────────────────────────────────────────────
const downloadTemplate = async () => {
    try {
        const response = await TreasuryService.downloadCounterpartiesTemplate();
        const contentType = response.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const blob = new Blob([response.data], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_contrapartes.xlsx';
        a.click();
        URL.revokeObjectURL(url);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo descargar la plantilla', life: 3000 });
    }
};

// ─── Build FormData ───────────────────────────────────────────────────────────
const buildFormData = (dryRun) => {
    const fd = new FormData();
    fd.append('file', importFile.value);
    fd.append('dry_run', dryRun ? 'true' : 'false');
    return fd;
};

// ─── Validate (dry run) ───────────────────────────────────────────────────────
const handleValidate = async () => {
    if (!importFile.value) {
        toast.add({ severity: 'warn', summary: 'Requerido', detail: 'Seleccione un archivo .xlsx', life: 3000 });
        return;
    }
    loading.value = true;
    try {
        const res = await TreasuryService.importCounterparties(buildFormData(true));
        dryResult.value = {
            canImport: true,
            valid: res.data?.valid ?? 0,
            warnings: res.data?.warnings ?? 0,
            errors: res.data?.errors || [],
            warnings_detail: res.data?.warnings_detail || [],
            message: res.message
        };
        step.value = 'preview';
    } catch (err) {
        if (err?.details?.errors?.length || err?.details?.warnings_detail?.length) {
            dryResult.value = {
                canImport: false,
                valid: 0,
                warnings: 0,
                errors: err.details?.errors || [],
                warnings_detail: err.details?.warnings_detail || [],
                message: err.message
            };
            step.value = 'preview';
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: err?.message || 'Error al validar el archivo', life: 4000 });
        }
    } finally {
        loading.value = false;
    }
};

// ─── Confirm import ───────────────────────────────────────────────────────────
const handleConfirm = async () => {
    loading.value = true;
    try {
        const res = await TreasuryService.importCounterparties(buildFormData(false));
        doneResult.value = {
            created: res.data?.created ?? 0,
            warnings: res.data?.warnings ?? 0,
            warnings_detail: res.data?.warnings_detail || [],
            message: res.message
        };
        step.value = 'done';
        emit('imported');
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Error al importar', detail: err?.message || 'No se pudieron importar las contrapartes', life: 4000 });
    } finally {
        loading.value = false;
    }
};

const backToSetup = () => {
    step.value = 'setup';
    dryResult.value = null;
};

const handleClose = () => {
    visible.value = false;
};
</script>

<template>
    <Dialog v-model:visible="visible" :style="{ width: '620px' }" :modal="true" :closable="true" class="cp-import-dialog" @hide="handleClose">
        <!-- ═══ HEADER ═══ -->
        <template #header>
            <div class="dialog-header">
                <div class="dialog-header-icon">
                    <i class="pi pi-upload"></i>
                </div>
                <div>
                    <h3 class="dialog-title">
                        {{ step === 'setup' ? 'Importar Contrapartes' : step === 'preview' ? 'Vista Previa' : 'Importación Completada' }}
                    </h3>
                    <p class="dialog-subtitle">
                        {{ step === 'setup' ? 'Carga proveedores, clientes y empleados desde Excel' : step === 'preview' ? 'Revisa el resultado antes de confirmar' : 'Las contrapartes fueron registradas exitosamente' }}
                    </p>
                </div>
            </div>
        </template>

        <!-- ═══════════════════════════════════════════════════════════
             STEP 1 — SETUP
        ════════════════════════════════════════════════════════════════ -->
        <div v-if="step === 'setup'" class="dialog-body">
            <!-- Download template -->
            <div class="template-banner">
                <div class="template-banner-left">
                    <i class="pi pi-file-excel template-banner-icon"></i>
                    <div>
                        <span class="template-banner-title">Plantilla Excel</span>
                        <span class="template-banner-sub">Descarga y completa la plantilla antes de subir</span>
                    </div>
                </div>
                <Button label="Descargar" icon="pi pi-download" class="template-download-btn" @click="downloadTemplate" />
            </div>

            <!-- Column reference -->
            <div class="columns-reference">
                <div class="columns-reference-header">
                    <i class="pi pi-table mr-1"></i>
                    Columnas de la plantilla
                </div>
                <div class="columns-grid">
                    <div class="col-item">
                        <span class="col-letter">A</span>
                        <div class="col-info">
                            <span class="col-name">NOMBRE <span class="required-star">*</span></span>
                            <span class="col-desc">Texto único en el sistema</span>
                        </div>
                    </div>
                    <div class="col-item">
                        <span class="col-letter">B</span>
                        <div class="col-info">
                            <span class="col-name">DOCUMENTO</span>
                            <span class="col-desc">RUC (11 dígitos) o DNI (8 dígitos)</span>
                        </div>
                    </div>
                    <div class="col-item">
                        <span class="col-letter">C</span>
                        <div class="col-info">
                            <span class="col-name">TIPO <span class="required-star">*</span></span>
                            <span class="col-desc">Proveedor · Cliente · Empleado · Honorarios · Otro</span>
                        </div>
                    </div>
                    <div class="col-item">
                        <span class="col-letter">D</span>
                        <div class="col-info">
                            <span class="col-name">ACTIVO</span>
                            <span class="col-desc">SI o NO (por defecto: SI)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section-divider">
                <span class="section-divider-label"><i class="pi pi-sliders-h mr-1"></i>Seleccionar archivo</span>
            </div>

            <!-- File -->
            <div class="form-field">
                <label class="form-label">
                    <i class="pi pi-file-excel form-label-icon"></i>
                    Archivo Excel (.xlsx / .xls) <span class="required-star">*</span>
                </label>
                <input ref="fileInputRef" type="file" accept=".xlsx,.xls" style="display: none" @change="onFileChange" />
                <div class="file-upload-zone" :class="{ 'has-file': importFile }" @click="fileInputRef.click()">
                    <template v-if="importFile">
                        <i class="pi pi-file-excel file-zone-icon file-zone-icon--ready"></i>
                        <div class="file-zone-info">
                            <span class="file-zone-name">{{ importFile.name }}</span>
                            <span class="file-zone-size">{{ (importFile.size / 1024).toFixed(1) }} KB</span>
                        </div>
                        <Button icon="pi pi-times" class="file-clear-btn" text rounded @click.stop="clearFile" v-tooltip.top="'Quitar archivo'" />
                    </template>
                    <template v-else>
                        <i class="pi pi-cloud-upload file-zone-icon"></i>
                        <span class="file-zone-hint">Haga clic para seleccionar un archivo</span>
                        <span class="file-zone-hint-sub">Formatos: .xlsx, .xls — máx. 500 filas</span>
                    </template>
                </div>
            </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════
             STEP 2 — PREVIEW
        ════════════════════════════════════════════════════════════════ -->
        <div v-else-if="step === 'preview'" class="dialog-body">
            <!-- Summary chips -->
            <div class="preview-summary">
                <div class="summary-chip summary-chip--success">
                    <i class="pi pi-check-circle"></i>
                    <span
                        ><strong>{{ dryResult.valid }}</strong> filas válidas</span
                    >
                </div>
                <div class="summary-chip" :class="dryResult.warnings > 0 ? 'summary-chip--warn' : 'summary-chip--neutral'">
                    <i class="pi pi-exclamation-triangle"></i>
                    <span
                        ><strong>{{ dryResult.warnings }}</strong> advertencias</span
                    >
                </div>
                <div class="summary-chip" :class="dryResult.errors.length > 0 ? 'summary-chip--error' : 'summary-chip--neutral'">
                    <i class="pi pi-times-circle"></i>
                    <span
                        ><strong>{{ dryResult.errors.length }}</strong> errores</span
                    >
                </div>
            </div>

            <!-- Blocking errors -->
            <div v-if="dryResult.errors.length > 0" class="preview-section">
                <div class="preview-section-header preview-section-header--error">
                    <i class="pi pi-times-circle"></i>
                    Errores que bloquean la importación
                </div>
                <div class="message-list message-list--error">
                    <div v-for="(err, i) in dryResult.errors" :key="i" class="message-item">
                        <i class="pi pi-circle-fill message-dot"></i>
                        <span>{{ err }}</span>
                    </div>
                </div>
                <div class="error-note">
                    <i class="pi pi-info-circle mr-1"></i>
                    Corrija los errores en el archivo y vuelva a validar.
                </div>
            </div>

            <!-- Warnings -->
            <div v-if="dryResult.warnings_detail.length > 0" class="preview-section">
                <div class="preview-section-header preview-section-header--warn">
                    <i class="pi pi-exclamation-triangle"></i>
                    Advertencias — estas filas serán omitidas
                </div>
                <div class="message-list message-list--warn">
                    <div v-for="(w, i) in dryResult.warnings_detail" :key="i" class="message-item">
                        <i class="pi pi-circle-fill message-dot"></i>
                        <span>{{ w }}</span>
                    </div>
                </div>
            </div>

            <!-- All clear -->
            <div v-if="dryResult.canImport && dryResult.errors.length === 0 && dryResult.warnings_detail.length === 0" class="all-clear-banner">
                <i class="pi pi-check-circle all-clear-icon"></i>
                <div>
                    <span class="all-clear-title">Sin observaciones</span>
                    <span class="all-clear-sub">Las {{ dryResult.valid }} contrapartes se importarán sin inconvenientes.</span>
                </div>
            </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════
             STEP 3 — DONE
        ════════════════════════════════════════════════════════════════ -->
        <div v-else-if="step === 'done'" class="dialog-body done-body">
            <div class="done-icon-wrapper">
                <i class="pi pi-check-circle done-icon"></i>
            </div>
            <h3 class="done-title">{{ doneResult.message }}</h3>
            <div class="done-chips">
                <div class="summary-chip summary-chip--success">
                    <i class="pi pi-users"></i>
                    <span
                        ><strong>{{ doneResult.created }}</strong> contrapartes creadas</span
                    >
                </div>
                <div v-if="doneResult.warnings > 0" class="summary-chip summary-chip--warn">
                    <i class="pi pi-exclamation-triangle"></i>
                    <span
                        ><strong>{{ doneResult.warnings }}</strong> filas omitidas</span
                    >
                </div>
            </div>
            <div v-if="doneResult.warnings_detail.length > 0" class="preview-section" style="width: 100%">
                <div class="preview-section-header preview-section-header--warn">
                    <i class="pi pi-exclamation-triangle"></i>
                    Filas omitidas por duplicado
                </div>
                <div class="message-list message-list--warn">
                    <div v-for="(w, i) in doneResult.warnings_detail" :key="i" class="message-item">
                        <i class="pi pi-circle-fill message-dot"></i>
                        <span>{{ w }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ FOOTER ═══ -->
        <template #footer>
            <div class="dialog-footer">
                <template v-if="step === 'setup'">
                    <Button label="Cancelar" icon="pi pi-times" class="dialog-cancel-btn" text @click="handleClose" />
                    <Button label="Validar archivo" icon="pi pi-search" class="dialog-validate-btn" :loading="loading" @click="handleValidate" />
                </template>

                <template v-else-if="step === 'preview'">
                    <Button label="Volver" icon="pi pi-arrow-left" class="dialog-cancel-btn" text @click="backToSetup" :disabled="loading" />
                    <Button v-if="dryResult.canImport" label="Confirmar importación" icon="pi pi-check" class="dialog-confirm-btn" :loading="loading" @click="handleConfirm" />
                </template>

                <template v-else-if="step === 'done'">
                    <Button label="Cerrar" icon="pi pi-times" class="dialog-cancel-btn" text @click="handleClose" />
                </template>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
/* ── Dialog shell ── */
:deep(.cp-import-dialog .p-dialog-header) {
    padding: 1.5rem 1.5rem 0 1.5rem;
    border-bottom: none;
}
:deep(.cp-import-dialog .p-dialog-content) {
    padding: 0;
}
:deep(.cp-import-dialog .p-dialog-footer) {
    padding: 0;
    border-top: 1px solid var(--surface-border);
}

/* ── Header ── */
.dialog-header {
    display: flex;
    align-items: center;
    gap: 1rem;
}
.dialog-header-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.dialog-header-icon i {
    font-size: 1.5rem;
    color: #fff;
}
.dialog-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.15rem 0;
}
.dialog-subtitle {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    margin: 0;
}

/* ── Body ── */
.dialog-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

/* ── Template banner ── */
.template-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.9rem 1.1rem;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border: 1px solid #86efac;
    border-radius: 10px;
}
:global(.dark) .template-banner {
    background: linear-gradient(135deg, #052e16 0%, #064e3b 100%);
    border-color: #166534;
}
.template-banner-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}
.template-banner-icon {
    font-size: 1.75rem;
    color: #16a34a;
}
.template-banner-title {
    display: block;
    font-weight: 700;
    font-size: 0.9rem;
    color: #14532d;
}
:global(.dark) .template-banner-title {
    color: #86efac;
}
.template-banner-sub {
    display: block;
    font-size: 0.78rem;
    color: #166534;
}
:global(.dark) .template-banner-sub {
    color: #4ade80;
}
.template-download-btn {
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
    border: none !important;
    border-radius: 8px !important;
    white-space: nowrap;
    flex-shrink: 0;
}

/* ── Columns reference ── */
.columns-reference {
    border: 1px solid var(--surface-border);
    border-radius: 10px;
    overflow: hidden;
}
.columns-reference-header {
    padding: 0.5rem 0.875rem;
    background: var(--surface-section);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--surface-border);
}
.columns-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
}
.col-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.875rem;
    border-bottom: 1px solid var(--surface-border);
    border-right: 1px solid var(--surface-border);
}
.col-item:nth-child(even) {
    border-right: none;
}
.col-item:nth-last-child(-n + 2) {
    border-bottom: none;
}
.col-letter {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.col-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
}
.col-name {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-color);
}
.col-desc {
    font-size: 0.72rem;
    color: var(--text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ── Form fields ── */
.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.form-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    display: flex;
    align-items: center;
    gap: 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.form-label-icon {
    font-size: 0.75rem;
    color: #10b981;
}
.required-star {
    color: #ef4444;
    font-weight: 700;
}

/* ── File upload zone ── */
.file-upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 1.5rem;
    border: 2px dashed var(--surface-border);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--surface-ground);
    min-height: 90px;
    text-align: center;
}
.file-upload-zone:hover {
    border-color: #10b981;
    background: color-mix(in srgb, var(--green-50) 40%, var(--surface-ground));
}
.file-upload-zone.has-file {
    flex-direction: row;
    justify-content: flex-start;
    padding: 0.75rem 1rem;
    border-style: solid;
    border-color: #10b981;
    background: color-mix(in srgb, var(--green-50) 30%, var(--surface-ground));
}
.file-zone-icon {
    font-size: 1.75rem;
    color: var(--text-color-secondary);
}
.file-zone-icon--ready {
    color: #16a34a;
    font-size: 1.5rem;
    flex-shrink: 0;
}
.file-zone-hint {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-color);
}
.file-zone-hint-sub {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
}
.file-zone-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
    margin-left: 0.75rem;
}
.file-zone-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.file-zone-size {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
}
.file-clear-btn {
    flex-shrink: 0;
    color: #ef4444 !important;
}

/* ── Section divider ── */
.section-divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}
.section-divider::before,
.section-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--surface-border);
}
.section-divider-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    white-space: nowrap;
    display: flex;
    align-items: center;
}

/* ── Preview summary chips ── */
.preview-summary {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}
.summary-chip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    border: 1px solid transparent;
}
.summary-chip--success {
    background: #f0fdf4;
    border-color: #86efac;
    color: #15803d;
}
.summary-chip--warn {
    background: #fffbeb;
    border-color: #fcd34d;
    color: #b45309;
}
.summary-chip--error {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #b91c1c;
}
.summary-chip--neutral {
    background: var(--surface-ground);
    border-color: var(--surface-border);
    color: var(--text-color-secondary);
}
:global(.dark) .summary-chip--success {
    background: #052e16;
    border-color: #166534;
    color: #86efac;
}
:global(.dark) .summary-chip--warn {
    background: #451a03;
    border-color: #92400e;
    color: #fbbf24;
}
:global(.dark) .summary-chip--error {
    background: #450a0a;
    border-color: #991b1b;
    color: #fca5a5;
}

/* ── Preview sections ── */
.preview-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.preview-section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--surface-border);
}
.preview-section-header--error {
    color: #b91c1c;
}
.preview-section-header--warn {
    color: #b45309;
}

/* ── Message list ── */
.message-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.75rem;
    border-radius: 8px;
    max-height: 160px;
    overflow-y: auto;
}
.message-list--error {
    background: #fef2f2;
    border: 1px solid #fecaca;
}
.message-list--warn {
    background: #fffbeb;
    border: 1px solid #fde68a;
}
:global(.dark) .message-list--error {
    background: #450a0a;
    border-color: #991b1b;
}
:global(.dark) .message-list--warn {
    background: #451a03;
    border-color: #92400e;
}
.message-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--text-color);
}
.message-dot {
    font-size: 0.4rem;
    flex-shrink: 0;
    margin-top: 0.4rem;
    color: var(--text-color-secondary);
}
.error-note {
    font-size: 0.78rem;
    color: #b91c1c;
    font-style: italic;
    display: flex;
    align-items: center;
}

/* ── All-clear banner ── */
.all-clear-banner {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border: 1px solid #86efac;
    border-radius: 10px;
}
:global(.dark) .all-clear-banner {
    background: linear-gradient(135deg, #052e16 0%, #064e3b 100%);
    border-color: #166534;
}
.all-clear-icon {
    font-size: 2rem;
    color: #16a34a;
    flex-shrink: 0;
}
.all-clear-title {
    display: block;
    font-weight: 700;
    font-size: 0.9rem;
    color: #14532d;
}
:global(.dark) .all-clear-title {
    color: #86efac;
}
.all-clear-sub {
    display: block;
    font-size: 0.8rem;
    color: #166534;
}
:global(.dark) .all-clear-sub {
    color: #4ade80;
}

/* ── Done step ── */
.done-body {
    align-items: center;
    text-align: center;
    padding: 2rem 1.5rem;
}
.done-icon-wrapper {
    margin-bottom: 0.5rem;
}
.done-icon {
    font-size: 3.5rem;
    color: #10b981;
}
.done-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0.5rem 0;
    max-width: 400px;
}
.done-chips {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 0.5rem;
}

/* ── Footer ── */
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
}
.dialog-cancel-btn {
    color: var(--text-color-secondary) !important;
    border-radius: 8px !important;
}
.dialog-validate-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border: none !important;
    border-radius: 8px !important;
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3) !important;
    font-weight: 600 !important;
}
.dialog-validate-btn:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
}
.dialog-confirm-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    border: none !important;
    border-radius: 8px !important;
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3) !important;
    font-weight: 600 !important;
}
.dialog-confirm-btn:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 5px 14px rgba(16, 185, 129, 0.4) !important;
    background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
}
</style>
