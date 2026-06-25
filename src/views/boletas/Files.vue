<script setup>
import { useBoletas } from '@/composables/useBoletas';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import FileUpload from 'primevue/fileupload';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { computed, onMounted, ref } from 'vue';

const { canManage, files, filesMeta, documentTypes, isLoadingFiles, isUploading, isDeletingFile, fetchFiles, fetchDocumentTypes, uploadFiles, deleteFile } = useBoletas();
const confirm = useConfirm();

// ── Filtros: periodo y tipo de documento ────────────────────────────────────
// El periodo es un string libre; se ofrece un desplegable editable con los
// últimos 12 meses en formato YYYY-MM por consistencia con la creación de campañas.
const periodOptions = computed(() => {
    const out = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
});

const selectedPeriod = ref(periodOptions.value[0]);
const selectedType = ref('boleta');

onMounted(async () => {
    await fetchDocumentTypes();
    if (documentTypes.value.length && !documentTypes.value.some((d) => d.slug === selectedType.value)) {
        selectedType.value = documentTypes.value[0].slug;
    }
    await loadFiles();
});

const loadFiles = async () => {
    if (!selectedPeriod.value) return;
    try {
        await fetchFiles({ period: selectedPeriod.value, document_type: selectedType.value });
    } catch {
        // notificado por el composable
    }
};

// ── Subida de ZIP ────────────────────────────────────────────────────────────
const fileUploader = ref(null);
const selectedZip = ref(null);
const uploadResult = ref(null);

const onZipSelect = (event) => {
    selectedZip.value = event.files?.[0] || null;
    uploadResult.value = null;
};

const clearZip = () => {
    selectedZip.value = null;
    uploadResult.value = null;
    fileUploader.value?.clear?.();
};

const handleUpload = async () => {
    if (!selectedZip.value || !selectedPeriod.value) return;
    const formData = new FormData();
    formData.append('period', selectedPeriod.value);
    formData.append('document_type', selectedType.value);
    formData.append('file', selectedZip.value);
    try {
        uploadResult.value = await uploadFiles(formData);
        clearZip();
        await loadFiles();
    } catch {
        // notificado por el composable
    }
};

// ── Eliminar PDF ─────────────────────────────────────────────────────────────
const confirmDelete = (file) => {
    confirm.require({
        message: `¿Eliminar el PDF del DNI ${file.dni} (periodo ${filesMeta.value.period})?`,
        header: 'Confirmar eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await deleteFile(filesMeta.value.period, file.dni, filesMeta.value.document_type);
            } catch {
                // notificado por el composable
            }
        }
    });
};

const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return '—';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};
</script>

<template>
    <div class="boletas-view">
        <div class="main-card">
            <div class="header-section">
                <div class="header-icon-wrapper"><i class="pi pi-file-pdf"></i></div>
                <div class="header-content">
                    <h1 class="header-title">Archivos PDF</h1>
                    <p class="header-subtitle"><i class="pi pi-info-circle mr-2"></i>Los archivos dentro del ZIP deben llamarse <code>{dni}.pdf</code> (8 dígitos)</p>
                </div>
            </div>

            <!-- Filtros -->
            <div class="filters-bar">
                <div class="filter">
                    <label>Periodo</label>
                    <Select v-model="selectedPeriod" :options="periodOptions" editable placeholder="2026-06" class="w-44" @change="loadFiles" @blur="loadFiles" />
                </div>
                <div class="filter">
                    <label>Tipo de documento</label>
                    <Select v-model="selectedType" :options="documentTypes" optionLabel="label" optionValue="slug" class="w-56" @change="loadFiles" />
                </div>
                <Button label="Actualizar" icon="pi pi-refresh" outlined :loading="isLoadingFiles" @click="loadFiles" />
            </div>

            <!-- Subida (solo manage) -->
            <div v-if="canManage" class="upload-block">
                <h3 class="block-title"><i class="pi pi-upload mr-2"></i>Subir ZIP de PDFs</h3>
                <div class="upload-row">
                    <FileUpload ref="fileUploader" mode="basic" accept=".zip,application/zip,application/x-zip-compressed" :maxFileSize="52428800" :auto="false" chooseLabel="Seleccionar ZIP" @select="onZipSelect" />
                    <span v-if="selectedZip" class="selected-zip"><i class="pi pi-file-arrow-up"></i> {{ selectedZip.name }} ({{ formatSize(selectedZip.size) }})</span>
                    <Button v-if="selectedZip" icon="pi pi-times" text rounded severity="danger" @click="clearZip" />
                    <Button label="Subir" icon="pi pi-cloud-upload" :disabled="!selectedZip || !selectedPeriod" :loading="isUploading" @click="handleUpload" />
                </div>
                <small class="text-muted"
                    >Periodo destino: <strong>{{ selectedPeriod }}</strong> · Tipo: <strong>{{ selectedType }}</strong> · Máx. 50&nbsp;MB.</small
                >

                <!-- Resumen de subida -->
                <div v-if="uploadResult" class="upload-result">
                    <Message severity="success" :closable="false" class="mb-2"
                        ><strong>{{ uploadResult.stored }}</strong> archivo(s) subido(s). Total disponible: <strong>{{ uploadResult.total_available }}</strong
                        >.</Message
                    >
                    <Message v-if="uploadResult.invalid?.length" severity="warn" :closable="false">
                        <div>
                            <strong>{{ uploadResult.invalid.length }}</strong> archivo(s) rechazado(s):
                            <ul class="invalid-list">
                                <li v-for="(inv, i) in uploadResult.invalid" :key="i">
                                    <span class="mono">{{ inv.file }}</span> — {{ inv.reason }}
                                </li>
                            </ul>
                        </div>
                    </Message>
                </div>
            </div>

            <!-- Lista de PDFs -->
            <div class="list-block">
                <div class="list-header">
                    <h3 class="block-title"><i class="pi pi-list mr-2"></i>PDFs disponibles</h3>
                    <Tag :value="`${filesMeta.count ?? files.length} archivo(s)`" severity="info" />
                </div>
                <DataTable
                    :value="files"
                    :loading="isLoadingFiles"
                    responsiveLayout="scroll"
                    stripedRows
                    class="p-datatable-sm"
                    :paginator="files.length > 25"
                    :rows="25"
                    :rowsPerPageOptions="[25, 50, 100]"
                    emptyMessage="No hay PDFs para el periodo y tipo seleccionados."
                >
                    <Column field="dni" header="DNI" :sortable="true" style="min-width: 160px">
                        <template #body="{ data }"
                            ><span class="mono font-semibold">{{ data.dni }}</span></template
                        >
                    </Column>
                    <Column header="Tamaño" :sortable="true" field="size" style="min-width: 140px">
                        <template #body="{ data }">{{ formatSize(data.size) }}</template>
                    </Column>
                    <Column v-if="canManage" header="Acciones" style="min-width: 110px">
                        <template #body="{ data }">
                            <Button icon="pi pi-trash" size="small" rounded severity="danger" outlined v-tooltip.top="'Eliminar PDF'" :loading="isDeletingFile" @click="confirmDelete(data)" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>

    </div>
</template>

<style scoped>
.boletas-view {
    padding: 1rem;
}
.main-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
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
.filters-bar {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
}
.filter {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}
.filter label {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-color-secondary);
}
.upload-block,
.list-block {
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1.25rem;
    background: var(--surface-ground);
    margin-bottom: 1.5rem;
}
.block-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 0.75rem 0;
    color: var(--text-color);
}
.upload-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
}
.selected-zip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
    color: var(--text-color);
}
.upload-result {
    margin-top: 1rem;
}
.invalid-list {
    margin: 0.5rem 0 0 0;
    padding-left: 1.2rem;
    max-height: 200px;
    overflow: auto;
}
.invalid-list li {
    padding: 0.15rem 0;
    font-size: 0.85rem;
}
.list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
}
.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.text-muted {
    color: var(--text-color-secondary);
}
code {
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    padding: 0.05rem 0.35rem;
    border-radius: 4px;
    font-size: 0.85em;
}
@media (max-width: 768px) {
    .main-card {
        padding: 1rem;
    }
}
</style>
