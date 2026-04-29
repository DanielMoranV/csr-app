<script setup>
import { useDocumentManagement } from '@/composables/useDocumentManagement';
import { useStepTemplates } from '@/composables/useStepTemplates';
import { useUsers } from '@/composables/useUsers';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    }
});

const emit = defineEmits(['update:visible', 'document-created']);

const toast = useToast();
const loading = ref(false);

const { allUsers, initializePublicUsers, initializePositions, positionOptions: apiPositionOptions } = useUsers();
const { createDocument } = useDocumentManagement();
const { templates, isLoading: templatesLoading, loadTemplates } = useStepTemplates();

/** 'manual' | 'template' */
const stepsMode = ref('manual');
const selectedTemplateId = ref(null);

const templateOptions = computed(() =>
    templates.value.map((t) => ({
        label: t.is_public ? `${t.nombre} (Pública)` : t.nombre,
        value: t.id,
        descripcion: t.descripcion,
        is_public: t.is_public
    }))
);

onMounted(async () => {
    try {
        await Promise.all([initializePublicUsers(), initializePositions(), loadTemplates()]);
    } catch (e) {
        console.warn('Error fetching data for document dialog', e);
    }
});

const userOptions = computed(() => {
    return allUsers.value.map((u) => ({
        label: `${u.name} (${u.position || 'Sin cargo'})`,
        value: u.id
    }));
});

// Referencia al input de tipo file oculto
const fileInput = ref(null);

// Estado de Drag & Drop
const isDragging = ref(false);

// Pasos del Wizard
const currentStep = ref(1);

const formData = ref({
    titulo: '',
    descripcion: '',
    file: null,
    steps: [],
    viewers: { users: [], positions: [] }
});

const touchedFields = ref({
    titulo: false,
    file: false
});

const actionTypes = [
    { label: 'Firma', value: 'Firma' },
    { label: 'Edición', value: 'Edición' },
    { label: 'Visto Bueno', value: 'Visto Bueno' },
    { label: 'VB con Sustento', value: 'VB con Sustento' }
];

const positionOptions = computed(() => {
    return apiPositionOptions.value;
});

// Validación del Paso 1
const isStep1Valid = computed(() => {
    return formData.value.titulo.trim() !== '' && formData.value.file !== null;
});

// Validación del Formulario Completo
const isFormValid = computed(() => {
    if (!isStep1Valid.value) return false;
    if (stepsMode.value === 'template') return !!selectedTemplateId.value;
    return formData.value.steps.length > 0 && formData.value.steps.every((s) => s.tipo_accion && (s.permitted_positions.length > 0 || s.permitted_users.length > 0));
});

watch(
    () => props.visible,
    (newVal) => {
        if (newVal) {
            currentStep.value = 1;
            resetForm();
        }
    }
);

const closeDialog = () => {
    emit('update:visible', false);
    resetForm();
};

const resetForm = () => {
    formData.value = {
        titulo: '',
        descripcion: '',
        file: null,
        steps: [],
        viewers: { users: [], positions: [] }
    };
    touchedFields.value = { titulo: false, file: false };
    isDragging.value = false;
    stepsMode.value = 'manual';
    selectedTemplateId.value = null;
};

// Drag & Drop Handlers
const handleDragOver = (e) => {
    e.preventDefault();
    isDragging.value = true;
};

const handleDragLeave = (e) => {
    e.preventDefault();
    isDragging.value = false;
};

const handleDrop = (e) => {
    e.preventDefault();
    isDragging.value = false;
    touchedFields.value.file = true;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
    }
};

const handleFileSelect = (e) => {
    touchedFields.value.file = true;
    if (e.target.files && e.target.files.length > 0) {
        processFile(e.target.files[0]);
    }
};

const triggerFileInput = () => {
    if (!loading.value) {
        fileInput.value.click();
    }
};

const processFile = (file) => {
    if (file.type === 'application/pdf') {
        if (file.size <= 10 * 1024 * 1024) {
            // 10MB limit
            formData.value.file = file;
        } else {
            toast.add({ severity: 'error', summary: 'Archivo muy grande', detail: 'El archivo excede los 10MB permitidos', life: 3000 });
            formData.value.file = null;
        }
    } else {
        toast.add({ severity: 'error', summary: 'Formato inválido', detail: 'Solo se permiten archivos PDF', life: 3000 });
        formData.value.file = null;
    }

    // Limpiar input para permitir seleccionar el mismo archivo de nuevo si fue removido
    if (fileInput.value) {
        fileInput.value.value = '';
    }
};

const removeFile = (e) => {
    e.stopPropagation();
    formData.value.file = null;
};

// Flujo de pasos
const addStep = () => {
    formData.value.steps.push({
        orden: formData.value.steps.length + 1,
        tipo_accion: null,
        permitted_positions: [],
        permitted_users: []
    });
};

const removeStepAction = (index) => {
    formData.value.steps.splice(index, 1);
    // Recalcular orden
    formData.value.steps.forEach((step, idx) => {
        step.orden = idx + 1;
    });
};

const nextStep = () => {
    touchedFields.value.titulo = true;
    touchedFields.value.file = true;

    if (isStep1Valid.value) {
        currentStep.value = 2;
        if (stepsMode.value === 'manual' && formData.value.steps.length === 0) {
            addStep(); // Agregar un paso vacío por defecto al avanzar en modo manual
        }
    }
};

const prevStep = () => {
    currentStep.value = 1;
};

const submitDocument = async () => {
    if (!isFormValid.value) return;

    loading.value = true;
    try {
        const data = new FormData();
        data.append('titulo', formData.value.titulo);
        if (formData.value.descripcion) {
            data.append('descripcion', formData.value.descripcion);
        }
        data.append('file', formData.value.file);

        // Viewers (opcional)
        const { users: vUsers, positions: vPos } = formData.value.viewers;
        if (vUsers.length > 0) {
            vUsers.forEach((id) => data.append('viewers[users][]', id));
        }
        if (vPos.length > 0) {
            vPos.forEach((p) => data.append('viewers[positions][]', p));
        }

        if (stepsMode.value === 'template') {
            // Opción B: desde plantilla
            data.append('template_id', selectedTemplateId.value);
        } else {
            // Opción A: pasos manuales
            formData.value.steps.forEach((step, index) => {
                data.append(`steps[${index}][orden]`, step.orden);
                data.append(`steps[${index}][tipo_accion]`, step.tipo_accion);

                step.permitted_positions.forEach((pos) => {
                    data.append(`steps[${index}][permitted_positions][]`, pos);
                });

                step.permitted_users.forEach((userId) => {
                    data.append(`steps[${index}][permitted_users][]`, userId);
                });
            });
        }

        await createDocument(data);

        emit('document-created');
        closeDialog();
    } catch (error) {
        // La notificación ya la hace el composable
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const getActionIcon = (action) => {
    switch (action) {
        case 'Firma':
            return 'pi pi-pencil text-blue-500';
        case 'Edición':
            return 'pi pi-file-edit text-orange-500';
        case 'Visto Bueno':
            return 'pi pi-check-circle text-green-500';
        case 'VB con Sustento':
            return 'pi pi-paperclip text-teal-500';
        default:
            return 'pi pi-cog text-gray-400';
    }
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="(val) => emit('update:visible', val)"
        modal
        :header="currentStep === 1 ? 'Detalles del Documento' : 'Flujo de Aprobación'"
        :style="{ width: '600px' }"
        :breakpoints="{ '1024px': '75vw', '768px': '90vw', '641px': '100vw' }"
        @hide="resetForm"
        class="wizard-modern-dialog"
        :closeOnEscape="!loading"
        :closable="!loading"
    >
        <template #header>
            <div class="modern-header">
                <div class="header-top">
                    <div class="header-brand">
                        <div class="brand-icon">
                            <i class="pi pi-file-arrow-up"></i>
                        </div>
                        <div class="brand-text">
                            <h3>Crear Documento</h3>
                            <p>Configura tu archivo y el proceso de firmas</p>
                        </div>
                    </div>
                </div>

                <!-- Sleek Modern Stepper -->
                <div class="modern-stepper">
                    <div class="stepper-item" :class="{ active: currentStep === 1, completed: currentStep > 1 }" @click="currentStep = 1">
                        <div class="step-dot">
                            <span v-if="currentStep > 1"><i class="pi pi-check text-[10px]"></i></span>
                            <span v-else>1</span>
                        </div>
                        <span class="step-label">Información</span>
                    </div>
                    <div class="step-connector" :class="{ completed: currentStep > 1 }"></div>
                    <div class="stepper-item" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
                        <div class="step-dot">2</div>
                        <span class="step-label">Flujo de Firmas</span>
                    </div>
                </div>
            </div>
        </template>

        <div class="wizard-content">
            <!-- ===== PASO 1: Detalles ===== -->
            <transition name="modern-slide">
                <div v-if="currentStep === 1" class="step-modern-container">
                    <div class="modern-form">
                        <div class="form-group mb-4">
                            <label for="titulo" class="modern-label">Título del Documento</label>
                            <div class="modern-input-wrapper" :class="{ 'is-invalid': touchedFields.titulo && !formData.titulo.trim() }">
                                <i class="pi pi-pencil input-prefix"></i>
                                <input id="titulo" v-model="formData.titulo" autocomplete="off" placeholder="Ej: Cotización 2026" class="modern-input" :disabled="loading" @blur="touchedFields.titulo = true" />
                            </div>
                            <small v-if="touchedFields.titulo && !formData.titulo.trim()" class="modern-error">El título es requerido para continuar.</small>
                        </div>

                        <div class="form-group mb-5">
                            <label for="descripcion" class="modern-label">Descripción <span class="label-optional">(Opcional)</span></label>
                            <div class="modern-input-wrapper">
                                <textarea id="descripcion" v-model="formData.descripcion" rows="2" placeholder="Agregue una nota breve sobre el documento..." class="modern-input modern-textarea" :disabled="loading"></textarea>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="modern-label">Documento PDF</label>

                            <input type="file" ref="fileInput" accept="application/pdf" class="hidden" @change="handleFileSelect" :disabled="loading" />

                            <div
                                class="modern-drop-zone"
                                :class="{
                                    dragging: isDragging,
                                    'has-file': formData.file !== null,
                                    invalid: touchedFields.file && formData.file === null
                                }"
                                @dragover="handleDragOver"
                                @dragleave="handleDragLeave"
                                @drop="handleDrop"
                                @click="triggerFileInput"
                            >
                                <div v-if="!formData.file" class="drop-zone-placeholder">
                                    <div class="upload-icon-pulse">
                                        <i class="pi pi-cloud-upload"></i>
                                    </div>
                                    <div class="upload-texts">
                                        <p class="main-text">Arrastra tu PDF aquí o haz clic</p>
                                        <p class="sub-text">Formatos permitidos: PDF (máx. 10MB)</p>
                                    </div>
                                </div>

                                <div v-else class="file-preview-card" @click.stop>
                                    <div class="file-icon-bg">
                                        <i class="pi pi-file-pdf"></i>
                                    </div>
                                    <div class="file-details">
                                        <span class="file-name">{{ formData.file.name }}</span>
                                        <span class="file-size">{{ formatFileSize(formData.file.size) }}</span>
                                    </div>
                                    <button class="remove-file-btn" @click="removeFile" :disabled="loading" title="Quitar archivo">
                                        <i class="pi pi-times"></i>
                                    </button>
                                </div>
                            </div>
                            <small v-if="touchedFields.file && formData.file === null" class="modern-error block mt-2">Es necesario adjuntar un documento.</small>
                        </div>

                        <!-- Visualizadores (opcional) -->
                        <div class="form-group viewers-section">
                            <label class="modern-label"> Visualizadores <span class="label-optional">(Opcional)</span> </label>
                            <p class="viewers-hint">Usuarios o cargos que podrán ver el documento, pero no actuar en los pasos.</p>
                            <div class="viewers-selects">
                                <MultiSelect
                                    v-model="formData.viewers.users"
                                    :options="userOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Usuarios visualizadores..."
                                    display="chip"
                                    :filter="true"
                                    class="w-full"
                                    :maxSelectedLabels="2"
                                    :disabled="loading"
                                />
                                <MultiSelect
                                    v-model="formData.viewers.positions"
                                    :options="positionOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Cargos visualizadores..."
                                    display="chip"
                                    :filter="true"
                                    class="w-full"
                                    :maxSelectedLabels="2"
                                    :disabled="loading"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </transition>

            <!-- ===== PASO 2: Flujo ===== -->
            <transition name="modern-slide">
                <div v-if="currentStep === 2" class="step-modern-container">
                    <!-- Selector de modo: manual / plantilla -->
                    <div class="flow-mode-selector">
                        <button :class="['flow-mode-btn', stepsMode === 'manual' ? 'active' : '']" @click="stepsMode = 'manual'"><i class="pi pi-list"></i> Pasos manuales</button>
                        <button :class="['flow-mode-btn', stepsMode === 'template' ? 'active' : '']" @click="stepsMode = 'template'"><i class="pi pi-bookmark"></i> Desde plantilla</button>
                    </div>

                    <!-- Modo plantilla -->
                    <div v-if="stepsMode === 'template'" class="template-selector-container">
                        <label class="item-label">Selecciona una plantilla de pasos</label>
                        <Dropdown
                            v-model="selectedTemplateId"
                            :options="templateOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Elegir plantilla..."
                            :loading="templatesLoading"
                            :disabled="loading || templatesLoading"
                            class="modern-dropdown w-full mt-1"
                            :filter="true"
                        >
                            <template #option="{ option }">
                                <div class="flex flex-column gap-1">
                                    <span class="font-semibold text-sm">{{ option.label }}</span>
                                    <span v-if="option.descripcion" class="text-xs text-gray-500">{{ option.descripcion }}</span>
                                </div>
                            </template>
                        </Dropdown>
                        <small v-if="templateOptions.length === 0 && !templatesLoading" class="text-gray-400 text-xs mt-2 block"> No hay plantillas disponibles. Usa pasos manuales o crea una plantilla primero. </small>
                        <div v-if="selectedTemplateId" class="template-preview">
                            <p class="text-xs text-gray-500 mt-2">Los pasos de la plantilla se copiarán al documento. Cambios futuros en la plantilla no afectarán este documento.</p>
                        </div>
                    </div>

                    <!-- Modo manual -->
                    <template v-else>
                        <div class="flow-header">
                            <div class="flow-info">
                                <h4>Pipeline de Aprobación</h4>
                                <p>Configura los pasos y responsables del documento.</p>
                            </div>
                            <Button label="Añadir Paso" icon="pi pi-plus" size="small" outlined severity="primary" @click="addStep" :disabled="loading" class="modern-add-btn" />
                        </div>

                        <div v-if="formData.steps.length === 0" class="flow-empty">
                            <div class="empty-visual">
                                <i class="pi pi-share-alt"></i>
                            </div>
                            <p>No has definido un flujo aún</p>
                            <Button label="Empezar a diseñar" text size="small" @click="addStep" />
                        </div>

                        <div v-else class="modern-flow-pipeline">
                            <div v-for="(step, index) in formData.steps" :key="index" class="pipeline-step">
                                <div class="step-vertical-connector" v-if="index < formData.steps.length - 1"></div>

                                <div class="step-card-modern">
                                    <div class="step-badge-modern">{{ step.orden }}</div>

                                    <div class="step-fields">
                                        <div class="step-row">
                                            <div class="field-item">
                                                <label class="item-label">Tipo de Acción</label>
                                                <Dropdown v-model="step.tipo_accion" :options="actionTypes" optionLabel="label" optionValue="value" placeholder="Seleccionar..." :disabled="loading" class="modern-dropdown">
                                                    <template #value="slotProps">
                                                        <div v-if="slotProps.value" class="flex align-items-center gap-2">
                                                            <i :class="getActionIcon(slotProps.value)"></i>
                                                            <span class="text-sm font-medium">{{ slotProps.value }}</span>
                                                        </div>
                                                        <span v-else class="text-sm text-gray-400">{{ slotProps.placeholder }}</span>
                                                    </template>
                                                    <template #option="slotProps">
                                                        <div class="flex align-items-center gap-2">
                                                            <i :class="getActionIcon(slotProps.option.value)"></i>
                                                            <span class="text-sm">{{ slotProps.option.label }}</span>
                                                        </div>
                                                    </template>
                                                </Dropdown>
                                            </div>
                                        </div>

                                        <div class="step-row mt-3">
                                            <div class="field-item">
                                                <label class="item-label">Responsables</label>
                                                <div class="responsibles-grid">
                                                    <MultiSelect
                                                        v-model="step.permitted_positions"
                                                        :options="positionOptions"
                                                        optionLabel="label"
                                                        optionValue="value"
                                                        placeholder="Por Cargos..."
                                                        display="chip"
                                                        :filter="true"
                                                        :disabled="loading"
                                                        class="modern-multiselect"
                                                        :maxSelectedLabels="3"
                                                    />
                                                    <MultiSelect
                                                        v-model="step.permitted_users"
                                                        :options="userOptions"
                                                        optionLabel="label"
                                                        optionValue="value"
                                                        placeholder="Por Usuarios..."
                                                        display="chip"
                                                        :filter="true"
                                                        :disabled="loading"
                                                        class="modern-multiselect mt-1"
                                                        :maxSelectedLabels="3"
                                                    />
                                                </div>
                                                <small v-if="step.permitted_positions.length === 0 && step.permitted_users.length === 0" class="text-orange-500 text-[10px] mt-1 block"> * Se notificará a los responsables asignados. </small>
                                            </div>
                                        </div>
                                    </div>

                                    <button class="step-delete-btn" @click="removeStepAction(index)" :disabled="loading" title="Eliminar paso">
                                        <i class="pi pi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div> </template
                    ><!-- end v-else manual -->
                </div>
            </transition>
        </div>

        <template #footer>
            <div class="modern-footer">
                <Button label="Cancelar" text severity="danger" @click="closeDialog" :disabled="loading" class="modern-cancel-btn" />

                <div class="footer-actions">
                    <Button v-if="currentStep === 2" label="Volver" icon="pi pi-arrow-left" text @click="prevStep" :disabled="loading" class="modern-back-btn" />

                    <Button v-if="currentStep === 1" label="Continuar" icon="pi pi-arrow-right" iconPos="right" @click="nextStep" :disabled="!isStep1Valid || loading" class="modern-primary-btn" />

                    <Button v-if="currentStep === 2" label="Crear Documento" icon="pi pi-check-circle" @click="submitDocument" :loading="loading" :disabled="!isFormValid" class="modern-submit-btn" />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
/* ─── Selector de modo (manual / plantilla) ────────────────────── */
.flow-mode-selector {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
    background: #f1f5f9;
    border-radius: 10px;
    padding: 0.25rem;
}
.flow-mode-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: transparent;
    color: #64748b;
    transition: all 0.2s;
}
.flow-mode-btn.active {
    background: #ffffff;
    color: #0284c7;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
.template-selector-container {
    padding: 0.5rem 0 1rem;
}
.template-preview {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    margin-top: 0.75rem;
}

/* Design Tokens */
.wizard-modern-dialog {
    --primary-color: #0ea5e9;
    --primary-hover: #0284c7;
    --bg-surface: #ffffff;
    --text-main: #1e293b;
    --text-muted: #64748b;
    --border-soft: #f1f5f9;
    --input-bg: #f8fafc;
    --radius-lg: 16px;
    --radius-md: 12px;
    --shadow-soft: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
}

:deep(.p-dialog-content) {
    padding: 0 !important;
    overflow-x: hidden;
}

:deep(.p-dialog-header) {
    padding: 1.5rem 1.5rem 0 1.5rem !important;
}

/* Header & Stepper */
.modern-header {
    width: 100%;
    margin-bottom: 1.5rem;
}

.header-brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
}

.brand-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.4rem;
    box-shadow: 0 8px 16px -4px rgba(59, 130, 246, 0.3);
}

.brand-text h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-main);
}

.brand-text p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-muted);
}

.modern-stepper {
    display: flex;
    align-items: center;
    padding: 0 0.5rem;
}

.stepper-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.step-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--border-soft);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    transition: all 0.3s ease;
    border: 2px solid transparent;
}

.step-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted);
    transition: all 0.3s ease;
}

.stepper-item.active .step-dot {
    background: white;
    border-color: var(--primary-color);
    color: var(--primary-color);
    box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
}

.stepper-item.active .step-label {
    color: var(--primary-color);
}

.stepper-item.completed .step-dot {
    background: var(--primary-color);
    color: white;
}

.step-connector {
    flex: 1;
    height: 2px;
    background: var(--border-soft);
    margin: 0 1rem;
    border-radius: 2px;
}

.step-connector.completed {
    background: var(--primary-color);
}

/* Wizard Content */
.wizard-content {
    padding: 0 1.5rem 1.5rem 1.5rem;
    min-height: 380px;
    position: relative;
}

/* Modern Form Elements */
.modern-label {
    display: block;
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
}

.label-optional {
    color: var(--text-muted);
    font-weight: 400;
    text-transform: none;
}

.modern-input-wrapper {
    display: flex;
    align-items: center;
    background: var(--input-bg);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: 0 0.875rem;
    transition: all 0.2s ease;
}

.modern-input-wrapper:focus-within {
    background: white;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.05);
}

.modern-input-wrapper.is-invalid {
    border-color: #ef4444;
}

.input-prefix {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-right: 0.75rem;
}

.modern-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0.75rem 0;
    font-size: 0.9375rem;
    color: var(--text-main);
    outline: none;
}

.modern-input::placeholder {
    color: #94a3b8;
}

.modern-textarea {
    resize: none;
}

.modern-error {
    color: #ef4444;
    font-size: 0.75rem;
    margin-top: 0.375rem;
}

/* Modern Drop Zone */
.modern-drop-zone {
    border: 2px dashed #e2e8f0;
    border-radius: var(--radius-lg);
    background: var(--input-bg);
    padding: 2.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modern-drop-zone:hover {
    border-color: var(--primary-color);
    background: rgba(14, 165, 233, 0.02);
}

.modern-drop-zone.dragging {
    border-color: var(--primary-color);
    background: rgba(14, 165, 233, 0.1);
    transform: scale(1.02);
}

.modern-drop-zone.has-file {
    border: 2px solid #10b981;
    background: rgba(16, 185, 129, 0.03);
    padding: 1.5rem;
}

.modern-drop-zone.invalid {
    border-color: #ef4444;
}

.upload-icon-pulse i {
    font-size: 2.5rem;
    color: var(--primary-color);
    margin-bottom: 1rem;
    display: inline-block;
    animation: bounceSlow 3s infinite;
}

.main-text {
    margin: 0;
    font-weight: 700;
    color: var(--text-main);
    font-size: 1rem;
}

.sub-text {
    margin: 0.25rem 0 0 0;
    font-size: 0.8125rem;
    color: var(--text-muted);
}

.file-preview-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: white;
    padding: 0.75rem;
    border-radius: var(--radius-md);
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.file-icon-bg {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: #fef2f2;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ef4444;
    font-size: 1.25rem;
}

.file-details {
    flex: 1;
    text-align: left;
    display: flex;
    flex-direction: column;
}

.file-name {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--text-main);
    word-break: break-all;
}

.file-size {
    font-size: 0.75rem;
    color: var(--text-muted);
}

.remove-file-btn {
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s;
}

.remove-file-btn:hover {
    background: #f1f5f9;
    color: #ef4444;
}

/* Step 2: Flow Pipeline */
.flow-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
}

.flow-info h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-main);
}

.flow-info p {
    margin: 0.125rem 0 0 0;
    font-size: 0.8125rem;
    color: var(--text-muted);
}

.flow-empty {
    padding: 3rem 1rem;
    text-align: center;
    background: var(--input-bg);
    border-radius: var(--radius-lg);
    border: 2px dashed #e2e8f0;
}

.empty-visual {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #eee;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin: 0 auto 1rem auto;
}

.modern-flow-pipeline {
    padding: 0.5rem 0.5rem 1rem 0.5rem;
    max-height: 480px;
    overflow-y: auto;
}

.pipeline-step {
    position: relative;
    padding-bottom: 0.75rem;
}

.step-vertical-connector {
    position: absolute;
    top: 1.5rem;
    left: 1rem;
    width: 2px;
    height: calc(100% - 0.5rem);
    background: #e2e8f0;
    z-index: 0;
}

.step-card-modern {
    display: flex;
    gap: 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: var(--radius-md);
    padding: 0.75rem 1rem;
    position: relative;
    z-index: 1;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.step-card-modern:hover {
    border-color: var(--primary-color);
    box-shadow: 0 8px 20px -10px rgba(0, 0, 0, 0.1);
}

.step-badge-modern {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    background: #f1f5f9;
    color: #1e293b;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 0.875rem;
    border: 2px solid white;
    box-shadow: 0 0 0 1px #e2e8f0;
}

.step-fields {
    flex: 1;
}

.item-label {
    display: block;
    font-size: 0.6875rem;
    font-weight: 800;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 0.375rem;
}

.modern-dropdown,
.modern-multiselect {
    border: 1px solid transparent !important;
    background: var(--input-bg) !important;
    border-radius: 8px !important;
    font-size: 0.8125rem !important;
}

:deep(.p-multiselect-chip) {
    padding: 2px 8px !important;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

:deep(.p-multiselect-chip-label) {
    font-size: 0.75rem !important;
    overflow: hidden;
    text-overflow: ellipsis;
}

:deep(.p-dropdown),
:deep(.p-multiselect) {
    background: var(--input-bg) !important;
    border: none !important;
}

:deep(.p-dropdown:hover),
:deep(.p-multiselect:hover) {
    background: #eff6ff !important;
}

.step-delete-btn {
    border: none;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    align-self: flex-start;
    padding: 0.5rem;
    border-radius: 8px;
    transition: all 0.2s;
}

.step-delete-btn:hover {
    background: #fef2f2;
    color: #ef4444;
}

/* Footer */
.modern-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 1rem 1.5rem 1.5rem 1.5rem;
}

.footer-actions {
    display: flex;
    gap: 0.75rem;
}

.modern-primary-btn,
.modern-submit-btn {
    background: #0ea5e9 !important;
    border-color: #0ea5e9 !important;
    color: #ffffff !important;
    border-radius: 10px !important;
    padding: 0.625rem 1.25rem !important;
    font-weight: 600 !important;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2) !important;
}

.modern-primary-btn:hover,
.modern-submit-btn:hover,
.modern-primary-btn:not(:disabled):hover,
.modern-submit-btn:not(:disabled):hover {
    background: #0284c7 !important;
    background-color: #0284c7 !important;
    border-color: #0284c7 !important;
    color: #ffffff !important;
    transform: translateY(-1px);
}

.modern-back-btn {
    color: var(--text-muted) !important;
}

/* Animations */
@keyframes bounceSlow {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-3px);
    }
}

.modern-slide-enter-active,
.modern-slide-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modern-slide-enter-from {
    opacity: 0;
    transform: translateX(15px);
}

.modern-slide-leave-to {
    opacity: 0;
    transform: translateX(-15px);
    position: absolute;
    width: calc(100% - 3rem);
}

/* Scrollbar refine */
.modern-flow-pipeline::-webkit-scrollbar {
    width: 6px;
}
.modern-flow-pipeline::-webkit-scrollbar-track {
    background: transparent;
}
.modern-flow-pipeline::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
}
.modern-flow-pipeline::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
}

/* Animations and polish */
:deep(.p-dialog) {
    border-radius: 20px !important;
    border: none !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}

/* Viewers section */
.viewers-section {
    margin-top: 1rem;
}

.viewers-hint {
    font-size: 0.78rem;
    color: #94a3b8;
    margin: 0.15rem 0 0.6rem 0;
    line-height: 1.4;
}

.viewers-selects {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>
