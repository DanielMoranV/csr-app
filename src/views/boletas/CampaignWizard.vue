<script setup>
import { useBoletas } from '@/composables/useBoletas';
import Button from 'primevue/button';
import Column from 'primevue/column';
import ConfirmDialog from 'primevue/confirmdialog';
import DataTable from 'primevue/datatable';
import FileUpload from 'primevue/fileupload';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import Step from 'primevue/step';
import StepList from 'primevue/steplist';
import StepPanel from 'primevue/steppanel';
import StepPanels from 'primevue/steppanels';
import Stepper from 'primevue/stepper';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const confirm = useConfirm();
const { templates, documentTypes, isLoadingTemplates, isLoadingEmployees, isValidating, isCreatingCampaign, isLaunching, fetchTemplates, fetchDocumentTypes, fetchEmployees, validateRecipients, fetchFiles, createCampaign, launchCampaign } =
    useBoletas();

const activeStep = ref('1');

// ── Paso 1: Datos ─────────────────────────────────────────────────────────────
const form = ref({ name: '', period: '', document_type: 'boleta', email_template_id: null });

const periodOptions = computed(() => {
    const out = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
});

const templateOptions = computed(() => templates.value.map((t) => ({ label: t.is_default ? `${t.name} (por defecto)` : t.name, value: t.id, document_type: t.document_type })));

onMounted(async () => {
    form.value.period = periodOptions.value[0];
    await Promise.all([fetchTemplates(), fetchDocumentTypes()]);
    // Preseleccionar plantilla por defecto si existe
    const def = templates.value.find((t) => t.is_default);
    if (def) {
        form.value.email_template_id = def.id;
        if (!form.value.document_type) form.value.document_type = def.document_type;
    }
});

const onTemplateChange = () => {
    const tpl = templates.value.find((t) => t.id === form.value.email_template_id);
    if (tpl?.document_type) form.value.document_type = tpl.document_type;
};

const step1Valid = computed(() => form.value.name.trim() && form.value.period && form.value.email_template_id);

// ── Paso 2: Destinatarios ─────────────────────────────────────────────────────
const recipientMode = ref('padron');
const modeOptions = [
    { label: 'Seleccionar del padrón', value: 'padron', icon: 'pi pi-users' },
    { label: 'Subir Excel/CSV', value: 'excel', icon: 'pi pi-file-excel' }
];

// Modo padrón
const employeeSearch = ref('');
const employees = ref([]);
const selectedEmployees = ref([]);

const employeesLoaded = ref(false);

const loadEmployees = async () => {
    try {
        employees.value = await fetchEmployees({ q: employeeSearch.value, active: 1 });
        employeesLoaded.value = true;
    } catch {
        employees.value = [];
    }
};

// Cargar el padrón automáticamente al entrar al paso 2 (modo padrón) la primera
// vez. La búsqueda manual (input/botón) sigue disponible para filtrar.
watch([activeStep, recipientMode], ([step, mode]) => {
    if (step === '2' && mode === 'padron' && !employeesLoaded.value) {
        loadEmployees();
    }
});

// Modo Excel
const excelUploader = ref(null);
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
    if (form.value.period) formData.append('period', form.value.period);
    if (form.value.document_type) formData.append('document_type', form.value.document_type);
    try {
        validateResult.value = await validateRecipients(formData);
    } catch {
        validateResult.value = null;
    }
};

// Lista final unificada de destinatarios
const finalRecipients = computed(() => {
    if (recipientMode.value === 'padron') {
        return selectedEmployees.value.map((e) => ({ nombre: e.nombre, email: e.email, dni: e.dni }));
    }
    return (validateResult.value?.valid || []).map((v) => ({ nombre: v.nombre, email: v.email, dni: v.dni }));
});

const invalidCount = computed(() => (recipientMode.value === 'excel' ? validateResult.value?.invalid?.length || 0 : 0));
const step2Valid = computed(() => finalRecipients.value.length > 0);

// Cruce contra PDFs disponibles
const pdfCheck = ref({ checked: false, missing: [], available: 0 });

const checkPdfs = async () => {
    try {
        const data = await fetchFiles({ period: form.value.period, document_type: form.value.document_type });
        const availableDnis = new Set((data?.files || []).map((f) => String(f.dni)));
        const missing = finalRecipients.value.filter((r) => !availableDnis.has(String(r.dni))).map((r) => r.dni);
        pdfCheck.value = { checked: true, missing, available: availableDnis.size };
    } catch {
        pdfCheck.value = { checked: false, missing: [], available: 0 };
    }
};

// ── Navegación entre pasos ────────────────────────────────────────────────────
const goToStep = async (step, activate) => {
    if (step === '3') await checkPdfs();
    activate(step);
};

// ── Paso 3: Confirmación y lanzamiento ────────────────────────────────────────
const templateName = computed(() => templates.value.find((t) => t.id === form.value.email_template_id)?.name || '—');
const docTypeLabel = computed(() => documentTypes.value.find((d) => d.slug === form.value.document_type)?.label || form.value.document_type);

const confirmLaunch = () => {
    confirm.require({
        message: `Se creará y lanzará la campaña "${form.value.name}" con ${finalRecipients.value.length} destinatario(s). El envío es asíncrono. ¿Continuar?`,
        header: 'Lanzar campaña',
        icon: 'pi pi-send',
        acceptLabel: 'Sí, lanzar',
        rejectLabel: 'Cancelar',
        accept: doLaunch
    });
};

const launching = computed(() => isCreatingCampaign.value || isLaunching.value);

const doLaunch = async () => {
    const payload = {
        name: form.value.name.trim(),
        period: form.value.period,
        document_type: form.value.document_type,
        email_template_id: form.value.email_template_id,
        recipients: finalRecipients.value
    };
    try {
        const campaign = await createCampaign(payload);
        const id = campaign?.id;
        if (!id) throw new Error('No se obtuvo el ID de la campaña');
        await launchCampaign(id);
        router.push({ name: 'boletas-campaign-detail', params: { id } });
    } catch {
        // notificado por el composable
    }
};
</script>

<template>
    <div class="boletas-view">
        <div class="main-card">
            <div class="header-section">
                <Button icon="pi pi-arrow-left" rounded text @click="router.push({ name: 'boletas-campaigns' })" v-tooltip.bottom="'Volver al historial'" />
                <div class="header-icon-wrapper"><i class="pi pi-plus"></i></div>
                <div class="header-content">
                    <h1 class="header-title">Nueva campaña</h1>
                    <p class="header-subtitle"><i class="pi pi-info-circle mr-2"></i>Configura el envío masivo en 3 pasos.</p>
                </div>
            </div>

            <Stepper v-model:value="activeStep" linear>
                <StepList>
                    <Step value="1">Datos</Step>
                    <Step value="2">Destinatarios</Step>
                    <Step value="3">Confirmación</Step>
                </StepList>

                <StepPanels>
                    <!-- ───── PASO 1: DATOS ───── -->
                    <StepPanel v-slot="{ activateCallback }" value="1">
                        <div class="step-body">
                            <div class="form-grid">
                                <div class="field">
                                    <label class="field-label">Nombre de la campaña <span class="req">*</span></label>
                                    <InputText v-model="form.name" class="w-full" placeholder="Ej: Boletas Junio 2026" />
                                </div>
                                <div class="field">
                                    <label class="field-label">Periodo <span class="req">*</span></label>
                                    <Select v-model="form.period" :options="periodOptions" editable placeholder="2026-06" class="w-full" />
                                </div>
                                <div class="field">
                                    <label class="field-label">Tipo de documento</label>
                                    <Select v-model="form.document_type" :options="documentTypes" optionLabel="label" optionValue="slug" class="w-full" placeholder="Seleccione un tipo" />
                                </div>
                                <div class="field">
                                    <label class="field-label">Plantilla de correo <span class="req">*</span></label>
                                    <Select
                                        v-model="form.email_template_id"
                                        :options="templateOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        :loading="isLoadingTemplates"
                                        class="w-full"
                                        placeholder="Seleccione una plantilla"
                                        @change="onTemplateChange"
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="step-footer">
                            <span></span>
                            <Button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" :disabled="!step1Valid" @click="activateCallback('2')" />
                        </div>
                    </StepPanel>

                    <!-- ───── PASO 2: DESTINATARIOS ───── -->
                    <StepPanel v-slot="{ activateCallback }" value="2">
                        <div class="step-body">
                            <SelectButton v-model="recipientMode" :options="modeOptions" optionLabel="label" optionValue="value" :allowEmpty="false" class="mb-4">
                                <template #option="{ option }"><i :class="option.icon" class="mr-2"></i>{{ option.label }}</template>
                            </SelectButton>

                            <!-- Modo padrón -->
                            <div v-if="recipientMode === 'padron'">
                                <div class="search-row">
                                    <IconField class="flex-1">
                                        <InputIcon class="pi pi-search" />
                                        <InputText v-model="employeeSearch" placeholder="Buscar por nombre, DNI o email…" class="w-full" @keyup.enter="loadEmployees" />
                                    </IconField>
                                    <Button label="Buscar" icon="pi pi-search" :loading="isLoadingEmployees" @click="loadEmployees" />
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
                                    emptyMessage="Busca empleados en el padrón para seleccionarlos."
                                >
                                    <Column selectionMode="multiple" headerStyle="width: 3rem" />
                                    <Column field="nombre" header="Nombre" style="min-width: 200px" />
                                    <Column field="dni" header="DNI" style="min-width: 120px"
                                        ><template #body="{ data }"
                                            ><span class="mono">{{ data.dni }}</span></template
                                        ></Column
                                    >
                                    <Column field="email" header="Email" style="min-width: 220px" />
                                    <Column field="area" header="Área" style="min-width: 150px" />
                                </DataTable>
                            </div>

                            <!-- Modo Excel -->
                            <div v-else>
                                <Message severity="info" :closable="false" class="mb-3">El archivo debe tener columnas <strong>nombre</strong>, <strong>email</strong> y <strong>dni</strong>. Se validará sin guardar nada.</Message>
                                <div class="upload-row">
                                    <FileUpload ref="excelUploader" mode="basic" accept=".xlsx,.xls,.csv" :maxFileSize="10485760" :auto="false" chooseLabel="Seleccionar archivo" @select="onExcelSelect" />
                                    <span v-if="selectedExcel" class="mono">{{ selectedExcel.name }}</span>
                                    <Button label="Validar" icon="pi pi-check-circle" :disabled="!selectedExcel" :loading="isValidating" @click="runValidation" />
                                </div>

                                <div v-if="validateResult" class="validate-result">
                                    <div class="summary-row">
                                        <Tag :value="`${validateResult.summary?.valid ?? validateResult.valid?.length ?? 0} válidos`" severity="success" icon="pi pi-check" />
                                        <Tag :value="`${validateResult.summary?.invalid ?? invalidCount} con error`" :severity="invalidCount > 0 ? 'danger' : 'secondary'" icon="pi pi-times" />
                                        <Tag :value="`${validateResult.summary?.total ?? 0} total`" severity="info" />
                                    </div>

                                    <DataTable :value="validateResult.valid" responsiveLayout="scroll" stripedRows class="p-datatable-sm mt-3" :paginator="(validateResult.valid?.length || 0) > 10" :rows="10" emptyMessage="No hay filas válidas.">
                                        <Column field="row" header="Fila" style="width: 80px" />
                                        <Column field="nombre" header="Nombre" style="min-width: 200px" />
                                        <Column field="dni" header="DNI" style="min-width: 120px"
                                            ><template #body="{ data }"
                                                ><span class="mono">{{ data.dni }}</span></template
                                            ></Column
                                        >
                                        <Column field="email" header="Email" style="min-width: 220px" />
                                    </DataTable>

                                    <Message v-if="invalidCount > 0" severity="warn" :closable="false" class="mt-3">
                                        <div>
                                            <strong>{{ invalidCount }}</strong> fila(s) con error (se omitirán):
                                            <ul class="invalid-list">
                                                <li v-for="(inv, i) in validateResult.invalid" :key="i">
                                                    Fila {{ inv.row }} — {{ inv.nombre || '(sin nombre)' }}: <span class="text-danger">{{ inv.error_reason }}</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </Message>
                                </div>
                            </div>

                            <div class="selected-summary">
                                <Tag :value="`${finalRecipients.length} destinatario(s) seleccionado(s)`" :severity="step2Valid ? 'success' : 'secondary'" icon="pi pi-users" />
                            </div>
                        </div>
                        <div class="step-footer">
                            <Button label="Atrás" icon="pi pi-arrow-left" severity="secondary" @click="activateCallback('1')" />
                            <Button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" :disabled="!step2Valid" @click="goToStep('3', activateCallback)" />
                        </div>
                    </StepPanel>

                    <!-- ───── PASO 3: CONFIRMACIÓN ───── -->
                    <StepPanel v-slot="{ activateCallback }" value="3">
                        <div class="step-body">
                            <h3 class="block-title">Resumen</h3>
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <span class="summary-label">Campaña</span><span class="summary-value">{{ form.name }}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">Periodo</span><span class="summary-value mono">{{ form.period }}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">Tipo de documento</span><span class="summary-value">{{ docTypeLabel }}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">Plantilla</span><span class="summary-value">{{ templateName }}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">Destinatarios</span><span class="summary-value">{{ finalRecipients.length }}</span>
                                </div>
                            </div>

                            <!-- Cruce de PDFs -->
                            <div v-if="pdfCheck.checked" class="pdf-check">
                                <Message v-if="pdfCheck.missing.length === 0" severity="success" :closable="false"
                                    >Todos los destinatarios tienen su PDF disponible para el periodo <strong>{{ form.period }}</strong
                                    >.</Message
                                >
                                <Message v-else severity="warn" :closable="false">
                                    <div>
                                        <strong>{{ pdfCheck.missing.length }}</strong> destinatario(s) no tienen PDF en el periodo <strong>{{ form.period }}</strong> ({{ docTypeLabel }}). Esos envíos podrían omitirse.
                                        <div class="missing-dnis">
                                            DNIs sin PDF: <span class="mono">{{ pdfCheck.missing.slice(0, 30).join(', ') }}</span
                                            ><span v-if="pdfCheck.missing.length > 30"> …</span>
                                        </div>
                                    </div>
                                </Message>
                            </div>

                            <Message severity="info" :closable="false" class="mt-2"
                                ><i class="pi pi-clock mr-2"></i>El envío es asíncrono: al lanzar, la campaña queda <strong>encolada</strong>. Verás el progreso en tiempo real en la pantalla de seguimiento.</Message
                            >
                        </div>
                        <div class="step-footer">
                            <Button label="Atrás" icon="pi pi-arrow-left" severity="secondary" @click="activateCallback('2')" />
                            <Button label="Crear y lanzar" icon="pi pi-send" :loading="launching" :disabled="!step1Valid || !step2Valid" @click="confirmLaunch" />
                        </div>
                    </StepPanel>
                </StepPanels>
            </Stepper>
        </div>

        <ConfirmDialog />
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
}
.step-body {
    padding: 1.5rem 0.5rem;
    min-height: 240px;
}
.step-footer {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--surface-border);
}
.form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
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
.search-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    margin-bottom: 1rem;
}
.upload-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}
.summary-row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}
.validate-result {
    margin-top: 0.5rem;
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
.selected-summary {
    margin-top: 1.25rem;
}
.block-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    color: var(--text-color);
}
.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.summary-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem;
    border: 1px solid var(--surface-border);
    border-radius: 10px;
    background: var(--surface-ground);
}
.summary-label {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
}
.summary-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color);
}
.missing-dnis {
    margin-top: 0.5rem;
    font-size: 0.85rem;
}
.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.text-danger {
    color: var(--red-600, #dc2626);
}
@media (max-width: 768px) {
    .form-grid {
        grid-template-columns: 1fr;
    }
    .main-card {
        padding: 1rem;
    }
}
</style>
