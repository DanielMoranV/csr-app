<script setup>
import { ATTACHMENT_MODES, CAMPAIGN_EDITABLE_STATUSES, campaignStatusInfo, useBoletas } from '@/composables/useBoletas';
import Button from 'primevue/button';
import Chip from 'primevue/chip';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Editor from 'primevue/editor';
import FileUpload from 'primevue/fileupload';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

// `id` solo llega en la ruta de edición (boletas-campaign-edit); en "nueva" es null.
const props = defineProps({ id: { type: [String, Number], default: null } });

const router = useRouter();
const confirm = useConfirm();
const {
    templates,
    documentTypes,
    employees,
    isLoadingTemplates,
    isLoadingEmployees,
    isValidating,
    isUploading,
    isUploadingAttachment,
    isPreviewing,
    isCreatingCampaign,
    isUpdatingCampaign,
    isLaunching,
    fetchTemplates,
    fetchDocumentTypes,
    fetchEmployees,
    validateRecipients,
    uploadFiles,
    uploadCampaignAttachment,
    fetchFiles,
    previewAdhoc,
    createCampaign,
    updateCampaign,
    fetchCampaign,
    fetchCampaignRecipients,
    launchCampaign
} = useBoletas();

// ── Modo edición ──────────────────────────────────────────────────────────────
// Editar una campaña draft/failed: se precarga el formulario y al guardar se
// hace PUT (vuelve a draft) + launch (reenvío a TODOS). El backend valida que
// solo draft/failed sean editables (422 en otro caso); aquí se replica el gate.
const isEdit = computed(() => props.id != null);
const isLoadingEdit = ref(false);
// Si la campaña ya tenía un PDF compartido cargado, no es obligatorio re-subirlo.
const existingAttachment = ref(false);

// ── Cabecera del envío: tipo de documento + periodo (nombre automático) ───────
const documentType = ref('boleta');
const period = ref('');
const attachmentMode = ref('per_dni');

const periodOptions = computed(() => {
    const out = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
});

const docTypeLabel = computed(() => documentTypes.value.find((d) => d.slug === documentType.value)?.label || documentType.value);
const autoName = computed(() => `${docTypeLabel.value} — ${period.value}`);

const periodToMes = (p) => {
    if (!p) return '';
    const [y, m] = String(p).split('-');
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const label = meses[parseInt(m, 10) - 1];
    return label ? `${label} ${y}` : p;
};

// ── Destinatarios ─────────────────────────────────────────────────────────────
const recipientMode = ref('padron');
const recipientModeOptions = [
    { label: 'Del padrón', value: 'padron', icon: 'pi pi-users' },
    { label: 'Importar Excel', value: 'excel', icon: 'pi pi-file-excel' }
];

// Modo padrón: selección mediante diálogo
const selectedEmployees = ref([]);
const pickerVisible = ref(false);
const employeeSearch = ref('');

const openPicker = async () => {
    pickerVisible.value = true;
    if (!employees.value.length) await loadEmployees();
};

const loadEmployees = async () => {
    try {
        await fetchEmployees({ q: employeeSearch.value, active: 1 });
    } catch {
        // notificado por el composable
    }
};

const selectAll = () => {
    selectedEmployees.value = [...employees.value];
};
const clearSelection = () => {
    selectedEmployees.value = [];
};
const removeEmployee = (dni) => {
    selectedEmployees.value = selectedEmployees.value.filter((e) => e.dni !== dni);
};

// Modo Excel
const selectedExcel = ref(null);
const validateResult = ref(null);
const onExcelSelect = (event) => {
    selectedExcel.value = event.files?.[0] || null;
    validateResult.value = null;
};
const runValidation = async () => {
    if (!selectedExcel.value) return;
    const formData = new FormData();
    formData.append('file', selectedExcel.value);
    if (period.value) formData.append('period', period.value);
    if (documentType.value) formData.append('document_type', documentType.value);
    try {
        validateResult.value = await validateRecipients(formData);
    } catch {
        validateResult.value = null;
    }
};

const finalRecipients = computed(() => {
    if (recipientMode.value === 'padron') {
        return selectedEmployees.value.map((e) => ({ nombre: e.nombre || e.full_name, email: e.email, dni: e.dni }));
    }
    return (validateResult.value?.valid || []).map((v) => ({ nombre: v.nombre, email: v.email, dni: v.dni }));
});

// ── Adjunto: ZIP de PDFs personalizados (opcional) ────────────────────────────
const zipFile = ref(null);
const zipUploader = ref(null);
const uploadResult = ref(null);
const pdfCheck = ref({ checked: false, missing: [], available: 0 });

const onZipSelect = (event) => {
    zipFile.value = event.files?.[0] || null;
    uploadResult.value = null;
};
const clearZip = () => {
    zipFile.value = null;
    uploadResult.value = null;
    zipUploader.value?.clear?.();
};

const handleUploadZip = async () => {
    if (!zipFile.value || !period.value) return;
    const formData = new FormData();
    formData.append('period', period.value);
    formData.append('document_type', documentType.value);
    formData.append('file', zipFile.value);
    try {
        uploadResult.value = await uploadFiles(formData);
        clearZip();
        await checkPdfs();
    } catch {
        // notificado por el composable
    }
};

// Modo shared: un mismo PDF para todos. Se sube tras crear la campaña (necesita
// el id), por eso se retiene el File aquí y se envía en doSend.
const sharedPdf = ref(null);
const sharedPdfError = ref('');
const onSharedPdfSelect = (event) => {
    const f = event.files?.[0] || null;
    sharedPdfError.value = '';
    if (f && !(f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) {
        sharedPdfError.value = 'El archivo debe ser un PDF';
        sharedPdf.value = null;
        return;
    }
    if (f && f.size > 20 * 1024 * 1024) {
        sharedPdfError.value = 'El PDF supera los 20 MB';
        sharedPdf.value = null;
        return;
    }
    sharedPdf.value = f;
};
const clearSharedPdf = () => {
    sharedPdf.value = null;
    sharedPdfError.value = '';
};

const checkPdfs = async () => {
    if (!period.value || !finalRecipients.value.length) {
        pdfCheck.value = { checked: false, missing: [], available: 0 };
        return;
    }
    try {
        const data = await fetchFiles({ period: period.value, document_type: documentType.value });
        const availableDnis = new Set((data?.files || []).map((f) => String(f.dni)));
        const missing = finalRecipients.value.filter((r) => !availableDnis.has(String(r.dni))).map((r) => r.dni);
        pdfCheck.value = { checked: true, missing, available: availableDnis.size };
    } catch {
        pdfCheck.value = { checked: false, missing: [], available: 0 };
    }
};

// ── Mensaje: plantilla (precarga) + redacción con variables ───────────────────
const subject = ref('');
const body = ref('');
const selectedTemplateId = ref(null);

const templateOptions = computed(() => templates.value.map((t) => ({ label: t.is_default ? `${t.name} (por defecto)` : t.name, value: t.id })));

const applyTemplate = () => {
    const tpl = templates.value.find((t) => t.id === selectedTemplateId.value);
    if (!tpl) return;
    const fill = () => {
        subject.value = tpl.subject || '';
        body.value = tpl.body || '';
        if (tpl.document_type) documentType.value = tpl.document_type;
        // Pre-cargar el modo de adjunto de la plantilla (se puede cambiar luego).
        attachmentMode.value = tpl.attachment_mode || 'per_dni';
    };
    if (subject.value.trim() || htmlHasContent(body.value)) {
        confirm.require({
            message: 'Esto reemplazará el asunto y el cuerpo actuales con los de la plantilla. ¿Continuar?',
            header: 'Cargar plantilla',
            icon: 'pi pi-bookmark',
            acceptLabel: 'Sí, cargar',
            rejectLabel: 'Cancelar',
            accept: fill
        });
    } else {
        fill();
    }
};

// Inserción de variables (el usuario decide usarlas o no)
const insertInSubject = (token) => {
    subject.value = `${subject.value}${subject.value && !subject.value.endsWith(' ') ? ' ' : ''}${token}`;
};
const insertInBody = (token) => {
    body.value = `${body.value || ''}<span>${token}</span>`;
};

const htmlHasContent = (html) => {
    if (!html) return false;
    const text = html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();
    return text.length > 0 || /<(img|table|hr|ul|ol|blockquote)\b/i.test(html);
};

// ── Vista previa en vivo (ad-hoc) ─────────────────────────────────────────────
const previewHtml = ref('');
let previewTimer = null;

const schedulePreview = () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(runPreview, 600);
};

const runPreview = async () => {
    if (!subject.value.trim() && !htmlHasContent(body.value)) {
        previewHtml.value = '';
        return;
    }
    try {
        const data = await previewAdhoc({ subject: subject.value.trim(), body: body.value, mes: periodToMes(period.value) });
        previewHtml.value = data?.html || data?.body || '';
    } catch {
        previewHtml.value = '';
    }
};

watch([subject, body, period], schedulePreview);
onUnmounted(() => clearTimeout(previewTimer));

// ── Validación y envío ────────────────────────────────────────────────────────
const canSend = computed(() => {
    if (!(finalRecipients.value.length > 0 && period.value && subject.value.trim() && htmlHasContent(body.value))) return false;
    // shared exige el PDF compartido antes de poder enviar (el backend bloquea
    // el lanzamiento sin adjunto cargado). En edición vale el PDF ya cargado.
    if (attachmentMode.value === 'shared' && !sharedPdf.value && !(isEdit.value && existingAttachment.value)) return false;
    return true;
});
const sending = computed(() => isCreatingCampaign.value || isUpdatingCampaign.value || isUploadingAttachment.value || isLaunching.value);

const confirmSend = () => {
    if (!canSend.value) return;
    const message = isEdit.value
        ? `Se guardarán los cambios y se reenviará "${docTypeLabel.value}" del periodo ${period.value} a TODOS los ${finalRecipients.value.length} destinatario(s) desde cero (no solo a los fallidos). El envío es asíncrono. ¿Continuar?`
        : `Se enviará "${docTypeLabel.value}" del periodo ${period.value} a ${finalRecipients.value.length} destinatario(s). El envío es asíncrono. ¿Continuar?`;
    confirm.require({
        message,
        header: isEdit.value ? 'Guardar y reenviar' : 'Enviar correo masivo',
        icon: 'pi pi-send',
        acceptLabel: isEdit.value ? 'Sí, guardar y reenviar' : 'Sí, enviar',
        rejectLabel: 'Cancelar',
        accept: doSend
    });
};

const doSend = async () => {
    const payload = {
        name: autoName.value,
        period: period.value,
        document_type: documentType.value,
        attachment_mode: attachmentMode.value,
        subject: subject.value.trim(),
        body: body.value,
        recipients: finalRecipients.value
    };
    try {
        // Edición: PUT (vuelve a draft, contadores en 0) en vez de crear.
        // Orden requerido para shared: (crear|editar) → subir PDF → lanzar.
        const campaign = isEdit.value ? await updateCampaign(props.id, payload) : await createCampaign(payload);
        const id = campaign?.id ?? props.id;
        if (!id) throw new Error('No se obtuvo el ID de la campaña');
        // Solo se re-sube el PDF compartido si el usuario eligió uno nuevo.
        if (attachmentMode.value === 'shared' && sharedPdf.value) {
            const fd = new FormData();
            fd.append('file', sharedPdf.value);
            await uploadCampaignAttachment(id, fd);
        }
        await launchCampaign(id);
        router.push({ name: 'boletas-campaign-detail', params: { id } });
    } catch {
        // notificado por el composable; la campaña queda en draft si falló el
        // adjunto o el lanzamiento (visible en el historial para reintentar).
    }
};

// Precarga el formulario con los datos de la campaña a editar y sus destinatarios.
const loadForEdit = async () => {
    isLoadingEdit.value = true;
    try {
        const c = await fetchCampaign(props.id);
        // Gate de editabilidad (el backend también lo valida con 422).
        if (!CAMPAIGN_EDITABLE_STATUSES.includes(c?.status)) {
            confirm.require({
                message: `Esta campaña está en estado "${campaignStatusInfo(c?.status).label}" y no se puede editar. Volverás al detalle.`,
                header: 'No editable',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Entendido',
                rejectClass: 'hidden',
                accept: () => router.replace({ name: 'boletas-campaign-detail', params: { id: props.id } }),
                onHide: () => router.replace({ name: 'boletas-campaign-detail', params: { id: props.id } })
            });
            return;
        }
        documentType.value = c.document_type || 'boleta';
        if (c.period) period.value = c.period;
        attachmentMode.value = c.attachment_mode || 'per_dni';
        subject.value = c.subject || '';
        body.value = c.body || '';
        existingAttachment.value = !!c.has_attachment;
        // Destinatarios actuales → se cargan como seleccionados del padrón (editables).
        const res = await fetchCampaignRecipients(props.id, { per_page: 1000 });
        recipientMode.value = 'padron';
        selectedEmployees.value = (res.items || []).map((r) => ({ nombre: r.nombre, email: r.email, dni: r.dni }));
        runPreview();
    } catch {
        // notificado por el composable
    } finally {
        isLoadingEdit.value = false;
    }
};

onMounted(async () => {
    period.value = periodOptions.value[0];
    await Promise.all([fetchTemplates(), fetchDocumentTypes()]);

    if (isEdit.value) {
        await loadForEdit();
        return;
    }

    // Creación: preseleccionar plantilla por defecto y precargar su cuerpo
    const def = templates.value.find((t) => t.is_default);
    if (def) {
        selectedTemplateId.value = def.id;
        subject.value = def.subject || '';
        body.value = def.body || '';
        if (def.document_type) documentType.value = def.document_type;
        attachmentMode.value = def.attachment_mode || 'per_dni';
    }
});
</script>

<template>
    <div class="boletas-view">
        <div class="main-card">
            <div class="header-section">
                <Button
                    icon="pi pi-arrow-left"
                    rounded
                    text
                    @click="router.push(isEdit ? { name: 'boletas-campaign-detail', params: { id: props.id } } : { name: 'boletas-campaigns' })"
                    v-tooltip.bottom="isEdit ? 'Volver al detalle' : 'Volver al historial'"
                />
                <div class="header-icon-wrapper"><i :class="isEdit ? 'pi pi-pencil' : 'pi pi-envelope'"></i></div>
                <div class="header-content">
                    <h1 class="header-title">{{ isEdit ? 'Editar envío masivo' : 'Nuevo envío masivo' }}</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-info-circle mr-2"></i>Redacta y envía como un correo. Campaña: <strong>{{ autoName }}</strong>
                    </p>
                </div>
                <div class="header-actions">
                    <Button :label="isEdit ? 'Guardar y reenviar' : 'Enviar'" icon="pi pi-send" :loading="sending" :disabled="!canSend" @click="confirmSend" />
                </div>
            </div>

            <Message v-if="isEdit" severity="warn" :closable="false" class="mb-4">
                <i class="pi pi-exclamation-triangle mr-2"></i>Al guardar, la campaña volverá a <strong>borrador</strong> y se relanzará: el reenvío irá a <strong>todos</strong> los destinatarios, no solo a los fallidos. Para reenviar únicamente los
                fallidos con el mismo contenido, usa <strong>"Reintentar fallidos"</strong> en el detalle.
            </Message>

            <div class="compose-grid">
                <!-- ───── Columna izquierda: redacción ───── -->
                <div class="compose-form">
                    <!-- Para -->
                    <div class="row-block">
                        <label class="field-label">Para <span class="req">*</span></label>
                        <SelectButton v-model="recipientMode" :options="recipientModeOptions" optionLabel="label" optionValue="value" :allowEmpty="false" class="mb-2">
                            <template #option="{ option }"><i :class="option.icon" class="mr-2"></i>{{ option.label }}</template>
                        </SelectButton>

                        <!-- Padrón -->
                        <div v-if="recipientMode === 'padron'">
                            <div class="recipients-chips" v-if="selectedEmployees.length">
                                <Chip v-for="e in selectedEmployees.slice(0, 30)" :key="e.dni" :label="e.nombre || e.full_name" removable @remove="removeEmployee(e.dni)" />
                                <span v-if="selectedEmployees.length > 30" class="more-count">+{{ selectedEmployees.length - 30 }} más</span>
                            </div>
                            <div class="recipients-actions">
                                <Button label="Seleccionar destinatarios" icon="pi pi-users" outlined size="small" @click="openPicker" />
                                <Button v-if="selectedEmployees.length" label="Quitar todos" icon="pi pi-times" text size="small" severity="secondary" @click="clearSelection" />
                                <Tag :value="`${selectedEmployees.length} seleccionado(s)`" :severity="selectedEmployees.length ? 'success' : 'secondary'" />
                            </div>
                        </div>

                        <!-- Excel -->
                        <div v-else>
                            <Message severity="info" :closable="false" class="mb-2">El archivo debe tener columnas <strong>nombre</strong>, <strong>email</strong> y <strong>dni</strong>. Se valida sin guardar.</Message>
                            <div class="inline-row">
                                <FileUpload mode="basic" accept=".xlsx,.xls,.csv" :maxFileSize="10485760" :auto="false" chooseLabel="Seleccionar archivo" @select="onExcelSelect" />
                                <span v-if="selectedExcel" class="mono">{{ selectedExcel.name }}</span>
                                <Button label="Validar" icon="pi pi-check-circle" size="small" :disabled="!selectedExcel" :loading="isValidating" @click="runValidation" />
                            </div>
                            <div v-if="validateResult" class="summary-row mt-2">
                                <Tag :value="`${validateResult.summary?.valid ?? validateResult.valid?.length ?? 0} válidos`" severity="success" icon="pi pi-check" />
                                <Tag :value="`${validateResult.summary?.invalid ?? validateResult.invalid?.length ?? 0} con error`" :severity="(validateResult.invalid?.length || 0) > 0 ? 'danger' : 'secondary'" icon="pi pi-times" />
                            </div>
                        </div>
                    </div>

                    <!-- Tipo de documento + periodo -->
                    <div class="row-inline">
                        <div class="field flex-1">
                            <label class="field-label">Tipo de documento</label>
                            <Select v-model="documentType" :options="documentTypes" optionLabel="label" optionValue="slug" class="w-full" placeholder="Seleccione un tipo" />
                        </div>
                        <div class="field flex-1">
                            <label class="field-label">Periodo <span class="req">*</span></label>
                            <Select v-model="period" :options="periodOptions" editable placeholder="2026-06" class="w-full" />
                        </div>
                    </div>

                    <!-- Modo de adjunto -->
                    <div class="row-block">
                        <label class="field-label">¿Lleva documento adjunto?</label>
                        <SelectButton v-model="attachmentMode" :options="ATTACHMENT_MODES" optionLabel="label" optionValue="value" :allowEmpty="false" class="mb-2">
                            <template #option="{ option }"><i :class="option.icon" class="mr-2"></i>{{ option.label }}</template>
                        </SelectButton>

                        <!-- per_dni: ZIP con {dni}.pdf -->
                        <div v-if="attachmentMode === 'per_dni'">
                            <small class="text-muted block mb-2"
                                >Archivos <code>{dni}.pdf</code> (8 dígitos). Se asocian al periodo <strong>{{ period }}</strong> y tipo <strong>{{ docTypeLabel }}</strong
                                >.</small
                            >
                            <div class="inline-row">
                                <FileUpload ref="zipUploader" mode="basic" accept=".zip,application/zip,application/x-zip-compressed" :maxFileSize="52428800" :auto="false" chooseLabel="Seleccionar ZIP" @select="onZipSelect" />
                                <span v-if="zipFile" class="mono">{{ zipFile.name }}</span>
                                <Button v-if="zipFile" icon="pi pi-times" text rounded severity="danger" size="small" @click="clearZip" />
                                <Button label="Subir ZIP" icon="pi pi-cloud-upload" size="small" :disabled="!zipFile || !period" :loading="isUploading" @click="handleUploadZip" />
                            </div>
                            <Message v-if="uploadResult" severity="success" :closable="false" class="mt-2">
                                <strong>{{ uploadResult.stored }}</strong> PDF(s) subido(s). Disponibles: <strong>{{ uploadResult.total_available }}</strong
                                >.
                                <span v-if="uploadResult.invalid?.length"> · {{ uploadResult.invalid.length }} rechazado(s).</span>
                            </Message>
                        </div>

                        <!-- shared: un mismo PDF para todos -->
                        <div v-else-if="attachmentMode === 'shared'">
                            <small class="text-muted block mb-2">Un mismo PDF para todos los destinatarios (máx. 20&nbsp;MB). Se adjunta al enviar.</small>
                            <div class="inline-row">
                                <FileUpload mode="basic" accept="application/pdf,.pdf" :maxFileSize="20971520" :auto="false" chooseLabel="Seleccionar PDF" @select="onSharedPdfSelect" />
                                <span v-if="sharedPdf" class="mono">{{ sharedPdf.name }}</span>
                                <Button v-if="sharedPdf" icon="pi pi-times" text rounded severity="danger" size="small" @click="clearSharedPdf" />
                            </div>
                            <small v-if="sharedPdfError" class="p-error">{{ sharedPdfError }}</small>
                        </div>

                        <!-- none: sin adjunto -->
                        <div v-else>
                            <small class="text-muted">Sin adjunto: se enviará solo el cuerpo del correo.</small>
                        </div>
                    </div>

                    <!-- Mensaje -->
                    <div class="row-block">
                        <label class="field-label">Mensaje</label>
                        <div class="inline-row mb-2">
                            <Select v-model="selectedTemplateId" :options="templateOptions" optionLabel="label" optionValue="value" :loading="isLoadingTemplates" class="flex-1" placeholder="Cargar desde una plantilla…" showClear />
                            <Button label="Cargar" icon="pi pi-download" size="small" outlined :disabled="!selectedTemplateId" @click="applyTemplate" />
                        </div>

                        <div class="field mb-2">
                            <label class="field-label-sm">Asunto <span class="req">*</span></label>
                            <InputText v-model="subject" class="w-full" placeholder="Tu boleta de {MES}" />
                            <div class="var-row">
                                <span class="var-hint">Insertar:</span>
                                <Button label="{NOMBRE}" size="small" text @click="insertInSubject('{NOMBRE}')" />
                                <Button label="{MES}" size="small" text @click="insertInSubject('{MES}')" />
                            </div>
                        </div>

                        <div class="field">
                            <label class="field-label-sm">Cuerpo <span class="req">*</span></label>
                            <Editor v-model="body" editorStyle="height: 240px" />
                            <div class="var-row">
                                <span class="var-hint">Insertar:</span>
                                <Button label="{NOMBRE}" size="small" text @click="insertInBody('{NOMBRE}')" />
                                <Button label="{MES}" size="small" text @click="insertInBody('{MES}')" />
                                <small class="text-muted ml-2">Decide si usar las variables o no. El HTML se sanea en el servidor.</small>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ───── Columna derecha: vista previa ───── -->
                <div class="compose-preview">
                    <div class="preview-head"><i class="pi pi-eye mr-2"></i>Vista previa <i v-if="isPreviewing" class="pi pi-spin pi-spinner ml-2"></i></div>
                    <iframe v-if="previewHtml" :srcdoc="previewHtml" class="preview-frame" title="Vista previa del correo"></iframe>
                    <div v-else class="preview-empty"><i class="pi pi-inbox"></i><span>Escribe el asunto y el cuerpo para ver la vista previa.</span></div>

                    <!-- Aviso de PDFs faltantes (solo modo personalizado por DNI) -->
                    <template v-if="attachmentMode === 'per_dni'">
                        <div v-if="pdfCheck.checked" class="pdf-check">
                            <Message v-if="pdfCheck.missing.length === 0" severity="success" :closable="false">Todos los destinatarios tienen su PDF para {{ period }}.</Message>
                            <Message v-else severity="warn" :closable="false">
                                <strong>{{ pdfCheck.missing.length }}</strong> destinatario(s) sin PDF en {{ period }} ({{ docTypeLabel }}); esos envíos podrían omitirse.
                            </Message>
                        </div>
                        <Button label="Comprobar PDFs disponibles" icon="pi pi-search" size="small" text class="mt-2" :disabled="!finalRecipients.length || !period" @click="checkPdfs" />
                    </template>
                </div>
            </div>
        </div>

        <!-- Diálogo selector de padrón -->
        <Dialog v-model:visible="pickerVisible" header="Seleccionar destinatarios del padrón" :modal="true" class="w-full xl:w-[900px]" :style="{ maxWidth: '95vw' }">
            <div class="search-row mb-3">
                <IconField class="flex-1">
                    <InputIcon class="pi pi-search" />
                    <InputText v-model="employeeSearch" placeholder="Buscar por nombre, DNI o email…" class="w-full" @keyup.enter="loadEmployees" />
                </IconField>
                <Button label="Buscar" icon="pi pi-search" :loading="isLoadingEmployees" @click="loadEmployees" />
                <Button label="Seleccionar todos" icon="pi pi-check-square" outlined @click="selectAll" />
            </div>
            <DataTable
                v-model:selection="selectedEmployees"
                :value="employees"
                :loading="isLoadingEmployees"
                dataKey="dni"
                responsiveLayout="scroll"
                stripedRows
                class="p-datatable-sm"
                :paginator="employees.length > 10"
                :rows="10"
                emptyMessage="Busca empleados en el padrón."
            >
                <Column selectionMode="multiple" headerStyle="width: 3rem" />
                <Column field="nombre" header="Nombre" style="min-width: 200px">
                    <template #body="{ data }">{{ data.nombre || data.full_name }}</template>
                </Column>
                <Column field="dni" header="DNI" style="min-width: 120px">
                    <template #body="{ data }"
                        ><span class="mono">{{ data.dni }}</span></template
                    >
                </Column>
                <Column field="email" header="Email" style="min-width: 220px" />
                <Column field="area" header="Área" style="min-width: 140px" />
            </DataTable>
            <template #footer>
                <Tag :value="`${selectedEmployees.length} seleccionado(s)`" severity="info" class="mr-auto" />
                <Button label="Listo" icon="pi pi-check" @click="pickerVisible = false" />
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
    gap: 1rem;
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
    min-width: 200px;
}
.header-title {
    font-size: 1.5rem;
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
    flex-wrap: wrap;
}
.compose-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 1.5rem;
}
.compose-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}
.row-block {
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1rem;
    background: var(--surface-ground);
}
.row-inline {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}
.field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}
.flex-1 {
    flex: 1;
}
.field-label {
    font-weight: 700;
    color: var(--text-color);
    display: block;
    margin-bottom: 0.5rem;
}
.field-label-sm {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-color);
}
.req {
    color: var(--red-500, #ef4444);
}
.opt {
    font-weight: 400;
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}
.recipients-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
    max-height: 140px;
    overflow: auto;
}
.more-count {
    align-self: center;
    font-size: 0.85rem;
    color: var(--text-color-secondary);
}
.recipients-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}
.inline-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}
.summary-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}
.search-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
}
.var-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
}
.var-hint {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}
.compose-preview {
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1rem;
    background: var(--surface-ground);
    position: sticky;
    top: 1rem;
    align-self: start;
}
.preview-head {
    font-weight: 700;
    color: var(--text-color);
    margin-bottom: 0.75rem;
}
.preview-frame {
    width: 100%;
    min-height: 420px;
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    background: #fff;
}
.preview-empty {
    min-height: 420px;
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
.pdf-check {
    margin-top: 0.75rem;
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
@media (max-width: 992px) {
    .compose-grid {
        grid-template-columns: 1fr;
    }
    .compose-preview {
        position: static;
    }
    .main-card {
        padding: 1rem;
    }
}
</style>
