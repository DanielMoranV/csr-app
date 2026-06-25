<script setup>
import { ATTACHMENT_MODES, useBoletas } from '@/composables/useBoletas';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Editor from 'primevue/editor';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { onMounted, onUnmounted, ref, watch } from 'vue';

const { canManage, templates, documentTypes, isLoadingTemplates, isSavingTemplate, isDeletingTemplate, isPreviewing, fetchTemplates, fetchTemplate, fetchDocumentTypes, previewTemplate, createTemplate, updateTemplate, deleteTemplate } = useBoletas();
const confirm = useConfirm();

onMounted(async () => {
    await Promise.all([fetchTemplates(), fetchDocumentTypes()]);
});

const documentTypeLabel = (slug) => documentTypes.value.find((d) => d.slug === slug)?.label || slug || '—';

// ── Editor de plantilla ────────────────────────────────────────────────────
const dialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const form = ref({ name: '', document_type: 'boleta', attachment_mode: 'per_dni', subject: '', body: '', is_default: false });
const errors = ref({});

const resetForm = () => {
    form.value = { name: '', document_type: 'boleta', attachment_mode: 'per_dni', subject: '', body: '', is_default: false };
    errors.value = {};
    previewHtml.value = '';
};

const openNew = () => {
    isEditing.value = false;
    editingId.value = null;
    resetForm();
    dialogVisible.value = true;
    schedulePreview();
};

const openEdit = (tpl) => {
    isEditing.value = true;
    editingId.value = tpl.id;
    form.value = {
        name: tpl.name || '',
        document_type: tpl.document_type || 'boleta',
        attachment_mode: tpl.attachment_mode || 'per_dni',
        subject: tpl.subject || '',
        body: tpl.body || '',
        is_default: !!tpl.is_default
    };
    errors.value = {};
    dialogVisible.value = true;
    schedulePreview();
};

// El Editor (Quill) nunca devuelve string vacío: al borrar todo deja
// "<p><br></p>". Se comprueba contenido real (texto, o un nodo significativo
// como imagen/tabla) en lugar de un simple trim sobre el HTML.
const htmlHasContent = (html) => {
    if (!html) return false;
    const text = html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();
    return text.length > 0 || /<(img|table|hr|ul|ol|blockquote)\b/i.test(html);
};

const validate = () => {
    errors.value = {};
    if (!form.value.name.trim()) errors.value.name = 'El nombre es obligatorio';
    if (!form.value.subject.trim()) errors.value.subject = 'El asunto es obligatorio';
    if (!htmlHasContent(form.value.body)) errors.value.body = 'El cuerpo es obligatorio';
    return Object.keys(errors.value).length === 0;
};

const handleSave = async () => {
    if (!validate()) return;
    const payload = {
        name: form.value.name.trim(),
        document_type: form.value.document_type,
        attachment_mode: form.value.attachment_mode,
        subject: form.value.subject.trim(),
        body: form.value.body,
        is_default: form.value.is_default
    };
    try {
        if (isEditing.value) {
            await updateTemplate(editingId.value, payload);
        } else {
            await createTemplate(payload);
        }
        dialogVisible.value = false;
        resetForm();
    } catch {
        // notificado por el composable
    }
};

const confirmDelete = (tpl) => {
    confirm.require({
        message: `¿Eliminar la plantilla "${tpl.name}"?`,
        header: 'Confirmar eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await deleteTemplate(tpl.id);
            } catch {
                // notificado por el composable
            }
        }
    });
};

const markDefault = async (tpl) => {
    if (tpl.is_default) return;
    try {
        // La fila de la lista puede no incluir el HTML completo (subject/body);
        // se obtiene la plantilla completa para no sobrescribirla con datos
        // parciales al hacer el PUT.
        const full = (await fetchTemplate(tpl.id)) || tpl;
        await updateTemplate(tpl.id, {
            name: full.name,
            document_type: full.document_type,
            attachment_mode: full.attachment_mode || 'per_dni',
            subject: full.subject,
            body: full.body,
            is_default: true
        });
    } catch {
        // notificado por el composable
    }
};

// ── Vista previa en vivo ────────────────────────────────────────────────────
const previewMes = ref('JUNIO 2026');
const previewHtml = ref('');
let previewTimer = null;

const schedulePreview = () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(runPreview, 600);
};

const runPreview = async () => {
    // El endpoint de preview requiere un id de plantilla; para una plantilla
    // nueva (sin id) se hace una previsualización local aproximada.
    if (!form.value.subject && !form.value.body) {
        previewHtml.value = '';
        return;
    }
    if (isEditing.value && editingId.value) {
        try {
            const data = await previewTemplate(editingId.value, { subject: form.value.subject, body: form.value.body, mes: previewMes.value });
            previewHtml.value = data?.html || data?.body || '';
            return;
        } catch {
            // si falla, caer a preview local
        }
    }
    previewHtml.value = localPreview();
};

const localPreview = () => {
    const replace = (s) => (s || '').replaceAll('{NOMBRE}', 'JUAN PÉREZ').replaceAll('{MES}', previewMes.value);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,Helvetica,sans-serif;color:#222;padding:16px;}</style></head>
      <body><p style="color:#888;font-size:12px;margin-bottom:12px;"><em>Asunto:</em> ${replace(form.value.subject)}</p><hr/>${replace(form.value.body)}</body></html>`;
};

watch([() => form.value.subject, () => form.value.body, previewMes], schedulePreview);

onUnmounted(() => clearTimeout(previewTimer));
</script>

<template>
    <div class="boletas-view">
        <div class="main-card">
            <div class="header-section">
                <div class="header-icon-wrapper"><i class="pi pi-envelope"></i></div>
                <div class="header-content">
                    <h1 class="header-title">Plantillas de correo</h1>
                    <p class="header-subtitle"><i class="pi pi-info-circle mr-2"></i>Asunto y cuerpo HTML con variables <code>{NOMBRE}</code> y <code>{MES}</code></p>
                </div>
                <div class="header-actions">
                    <Button v-if="canManage" label="Nueva plantilla" icon="pi pi-plus" @click="openNew" />
                </div>
            </div>

            <DataTable :value="templates" :loading="isLoadingTemplates" responsiveLayout="scroll" stripedRows class="p-datatable-sm" emptyMessage="No hay plantillas registradas.">
                <Column field="name" header="Nombre" :sortable="true" style="min-width: 220px">
                    <template #body="{ data }"
                        ><span class="font-semibold">{{ data.name }}</span></template
                    >
                </Column>
                <Column header="Tipo de documento" style="min-width: 180px">
                    <template #body="{ data }"><Tag :value="documentTypeLabel(data.document_type)" severity="info" /></template>
                </Column>
                <Column header="Por defecto" style="min-width: 130px">
                    <template #body="{ data }">
                        <Tag v-if="data.is_default" value="Por defecto" severity="success" icon="pi pi-star-fill" />
                        <Button v-else-if="canManage" label="Marcar" icon="pi pi-star" size="small" text @click="markDefault(data)" />
                        <span v-else class="text-muted">—</span>
                    </template>
                </Column>
                <Column v-if="canManage" header="Acciones" style="min-width: 130px">
                    <template #body="{ data }">
                        <div class="flex gap-1">
                            <Button icon="pi pi-pencil" size="small" rounded severity="success" outlined v-tooltip.top="'Editar'" @click="openEdit(data)" />
                            <Button icon="pi pi-trash" size="small" rounded severity="danger" outlined v-tooltip.top="'Eliminar'" :loading="isDeletingTemplate" @click="confirmDelete(data)" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Diálogo crear/editar con vista previa en vivo -->
        <Dialog v-model:visible="dialogVisible" :header="isEditing ? 'Editar plantilla' : 'Nueva plantilla'" :modal="true" :closable="!isSavingTemplate" class="w-full xl:w-[1100px]" :style="{ maxWidth: '95vw' }">
            <div class="editor-grid">
                <!-- Columna formulario -->
                <div class="editor-form">
                    <div class="field">
                        <label class="field-label">Nombre <span class="req">*</span></label>
                        <InputText v-model="form.name" class="w-full" :class="{ 'p-invalid': errors.name }" placeholder="Ej: Boleta estándar" @input="errors.name = ''" />
                        <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
                    </div>
                    <div class="field">
                        <label class="field-label">Tipo de documento</label>
                        <Select v-model="form.document_type" :options="documentTypes" optionLabel="label" optionValue="slug" class="w-full" placeholder="Seleccione un tipo" />
                    </div>
                    <div class="field">
                        <label class="field-label">¿Lleva documento adjunto?</label>
                        <Select v-model="form.attachment_mode" :options="ATTACHMENT_MODES" optionLabel="label" optionValue="value" class="w-full" />
                        <small class="text-muted">Por defecto del envío al usar esta plantilla (se puede cambiar al enviar).</small>
                    </div>
                    <div class="field">
                        <label class="field-label">Asunto <span class="req">*</span></label>
                        <InputText v-model="form.subject" class="w-full" :class="{ 'p-invalid': errors.subject }" placeholder="Boleta de {MES}" @input="errors.subject = ''" />
                        <small v-if="errors.subject" class="p-error">{{ errors.subject }}</small>
                    </div>
                    <div class="field">
                        <label class="field-label">Cuerpo <span class="req">*</span></label>
                        <Editor v-model="form.body" editorStyle="height: 240px" :class="{ 'p-invalid': errors.body }" @text-change="errors.body = ''" />
                        <small class="text-muted">Variables disponibles: <code>{NOMBRE}</code>, <code>{MES}</code>. El HTML se sanea en el servidor.</small>
                        <small v-if="errors.body" class="p-error block">{{ errors.body }}</small>
                    </div>
                    <div class="field-inline">
                        <Checkbox v-model="form.is_default" :binary="true" inputId="tpl-default" />
                        <label for="tpl-default">Marcar como plantilla por defecto</label>
                    </div>
                </div>

                <!-- Columna vista previa -->
                <div class="editor-preview">
                    <div class="preview-toolbar">
                        <span class="preview-title"><i class="pi pi-eye mr-2"></i>Vista previa <i v-if="isPreviewing" class="pi pi-spin pi-spinner ml-2"></i></span>
                        <div class="preview-mes">
                            <label>MES:</label>
                            <InputText v-model="previewMes" class="w-40" />
                        </div>
                    </div>
                    <Message v-if="!isEditing" severity="info" :closable="false" class="mb-2">Previsualización local aproximada. Al guardar, el servidor aplica el maquetado corporativo (logo + pie).</Message>
                    <iframe v-if="previewHtml" :srcdoc="previewHtml" class="preview-frame" title="Vista previa del correo"></iframe>
                    <div v-else class="preview-empty"><i class="pi pi-inbox"></i><span>Escribe el asunto y el cuerpo para ver la vista previa.</span></div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="Cancelar" severity="secondary" :disabled="isSavingTemplate" @click="dialogVisible = false" />
                    <Button :label="isEditing ? 'Actualizar' : 'Guardar'" icon="pi pi-save" :loading="isSavingTemplate" @click="handleSave" />
                </div>
            </template>
        </Dialog>

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
.editor-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    padding-top: 0.5rem;
}
.editor-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}
.field-label {
    font-weight: 600;
    color: var(--text-color);
}
.req {
    color: var(--red-500, #ef4444);
}
.field-inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.editor-preview {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1rem;
    background: var(--surface-ground);
}
.preview-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    gap: 0.5rem;
}
.preview-title {
    font-weight: 700;
    color: var(--text-color);
}
.preview-mes {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
}
.preview-frame {
    width: 100%;
    flex: 1;
    min-height: 360px;
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    background: #fff;
}
.preview-empty {
    flex: 1;
    min-height: 360px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: var(--text-color-secondary);
}
.preview-empty i {
    font-size: 2rem;
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
@media (max-width: 992px) {
    .editor-grid {
        grid-template-columns: 1fr;
    }
}
</style>
