<script setup>
import { useDocumentManagement } from '@/composables/useDocumentManagement';
import { useUsers } from '@/composables/useUsers';
import { POSITIONS } from '@/config/permissions';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Textarea from 'primevue/textarea';
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

const { allUsers, initializeUsers } = useUsers();
const { createDocument } = useDocumentManagement();
onMounted(async () => {
    // Inicializar usuarios para el selector
    try {
        await initializeUsers(false);
    } catch (e) {
        console.warn('Error fetching users for document dialog', e);
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
    steps: []
});

const touchedFields = ref({
    titulo: false,
    file: false
});

const actionTypes = [
    { label: 'Firma', value: 'Firma' },
    { label: 'Edición', value: 'Edición' },
    { label: 'Visto Bueno', value: 'Visto Bueno' }
];

const positionOptions = computed(() => {
    return Object.values(POSITIONS).map((pos) => ({ label: pos, value: pos }));
});

// Validación del Paso 1
const isStep1Valid = computed(() => {
    return formData.value.titulo.trim() !== '' && formData.value.file !== null;
});

// Validación del Formulario Completo
const isFormValid = computed(() => {
    return isStep1Valid.value && formData.value.steps.length > 0 && formData.value.steps.every((s) => s.tipo_accion && (s.permitted_positions.length > 0 || s.permitted_users.length > 0));
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
        steps: []
    };
    touchedFields.value = { titulo: false, file: false };
    isDragging.value = false;
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
        if (formData.value.steps.length === 0) {
            addStep(); // Agregar un paso vacío por defecto al avanzar
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
        :header="currentStep === 1 ? 'Paso 1: Información del Documento' : 'Paso 2: Flujo de Aprobación'"
        :style="{ width: '60vw' }"
        :breakpoints="{ '1024px': '75vw', '768px': '90vw', '641px': '100vw' }"
        @hide="resetForm"
        class="wizard-dialog"
        :closeOnEscape="!loading"
        :closable="!loading"
    >
        <template #header>
            <div class="flex flex-column w-full">
                <div class="flex items-center gap-3 mb-4">
                    <div class="flex items-center justify-center w-12 h-12 rounded-xl popup-icon">
                        <i class="pi pi-file-import text-2xl text-white"></i>
                    </div>
                    <div>
                        <h2 class="m-0 text-xl font-bold bg-clip-text text-transparent popup-gradient-text">Crear Nuevo Documento</h2>
                        <span class="text-sm text-gray-500">Configura el archivo y su flujo de firmas</span>
                    </div>
                </div>

                <!-- Custom Stepper Progress -->
                <div class="flex align-items-center w-full px-2">
                    <div class="flex-1 flex flex-column align-items-center relative">
                        <div class="step-circle" :class="{ active: currentStep >= 1 }">1</div>
                        <span class="text-xs mt-2 font-medium" :class="currentStep >= 1 ? 'text-primary' : 'text-gray-400'">Detalles</span>
                    </div>
                    <div class="step-line" :class="{ active: currentStep >= 2 }"></div>
                    <div class="flex-1 flex flex-column align-items-center relative">
                        <div class="step-circle" :class="{ active: currentStep >= 2 }">2</div>
                        <span class="text-xs mt-2 font-medium" :class="currentStep >= 2 ? 'text-primary' : 'text-gray-400'">Flujo</span>
                    </div>
                </div>
            </div>
        </template>

        <div class="py-4 overflow-hidden relative" style="min-height: 400px">
            <!-- ===== PASO 1: Detalles ===== -->
            <transition name="slide-fade">
                <div v-show="currentStep === 1" class="step-container">
                    <div class="grid formgrid p-fluid">
                        <div class="field col-12">
                            <label for="titulo" class="font-semibold block mb-2">Título del Documento <span class="text-red-500">*</span></label>
                            <InputText
                                id="titulo"
                                v-model="formData.titulo"
                                placeholder="Ej: Política de Seguridad 2026"
                                :disabled="loading"
                                :class="{ 'p-invalid': touchedFields.titulo && !formData.titulo.trim() }"
                                @blur="touchedFields.titulo = true"
                                fluid
                            />
                            <small v-if="touchedFields.titulo && !formData.titulo.trim()" class="p-error">El título es obligatorio.</small>
                        </div>

                        <div class="field col-12">
                            <label for="descripcion" class="font-semibold block mb-2">Descripción <span class="text-gray-400 font-normal">(Opcional)</span></label>
                            <Textarea id="descripcion" v-model="formData.descripcion" rows="3" placeholder="Proporciona contexto sobre este documento..." :disabled="loading" fluid />
                        </div>

                        <div class="field col-12 mt-2">
                            <label class="font-semibold block mb-2">Archivo PDF <span class="text-red-500">*</span></label>

                            <!-- Input oculto -->
                            <input type="file" ref="fileInput" accept="application/pdf" class="hidden" @change="handleFileSelect" :disabled="loading" />

                            <!-- Zona de Drop -->
                            <div
                                class="drop-zone"
                                :class="{
                                    'is-dragging': isDragging,
                                    'has-file': formData.file !== null,
                                    'is-invalid': touchedFields.file && formData.file === null
                                }"
                                @dragover="handleDragOver"
                                @dragleave="handleDragLeave"
                                @drop="handleDrop"
                                @click="triggerFileInput"
                            >
                                <div v-if="!formData.file" class="flex flex-column align-items-center justify-content-center py-5">
                                    <div class="cloud-icon mb-3">
                                        <i class="pi pi-cloud-upload text-4xl"></i>
                                    </div>
                                    <p class="m-0 font-semibold text-lg text-gray-700">Arrastra tu PDF aquí o haz clic</p>
                                    <p class="m-0 text-sm text-gray-400 mt-1">Máximo 10MB</p>
                                </div>

                                <div v-else class="flex align-items-center justify-content-between p-3 w-full border-round surface-ground shadow-1 relative z-1">
                                    <div class="flex align-items-center gap-3">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" alt="PDF Icon" width="40" />
                                        <div class="flex flex-column text-left">
                                            <span class="font-bold text-gray-800 text-overflow-ellipsis overflow-hidden" style="max-width: 300px; white-space: nowrap">{{ formData.file.name }}</span>
                                            <span class="text-xs text-gray-500">{{ formatFileSize(formData.file.size) }}</span>
                                        </div>
                                    </div>
                                    <Button icon="pi pi-trash" severity="danger" rounded text @click="removeFile" v-tooltip="'Remover PDF'" :disabled="loading" />
                                </div>
                            </div>
                            <small v-if="touchedFields.file && formData.file === null" class="p-error block mt-1">Debe adjuntar un documento PDF.</small>
                        </div>
                    </div>
                </div>
            </transition>

            <!-- ===== PASO 2: Flujo ===== -->
            <transition name="slide-fade">
                <div v-show="currentStep === 2" class="step-container">
                    <div class="flex justify-content-between align-items-center mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-round">
                        <div class="flex flex-column">
                            <span class="font-semibold text-blue-800 dark:text-blue-300">Configura el orden de firmas</span>
                            <span class="text-sm text-blue-600 dark:text-blue-400">Las personas asignadas recibirán una notificación en el orden establecido.</span>
                        </div>
                        <Button label="Agregar Paso" icon="pi pi-plus" size="small" @click="addStep" :disabled="loading" class="shadow-2" />
                    </div>

                    <div v-if="formData.steps.length === 0" class="text-center p-5 border-round bg-gray-50 border-1 border-dashed surface-border">
                        <div class="empty-icon-pulse mb-3 mx-auto">
                            <i class="pi pi-sitemap text-3xl text-gray-400"></i>
                        </div>
                        <p class="text-gray-600 font-medium m-0">No hay pasos configurados</p>
                        <p class="text-gray-500 text-sm mt-1">Haz clic en "Agregar Paso" para comenzar a diseñar el flujo.</p>
                    </div>

                    <div v-else class="flex flex-column gap-3 overflow-y-auto" style="max-height: 40vh; padding-right: 5px">
                        <div v-for="(step, index) in formData.steps" :key="index" class="step-card">
                            <!-- Badge Ordinal -->
                            <div class="step-ordinal">
                                {{ step.orden }}
                            </div>

                            <!-- Remove Button -->
                            <Button icon="pi pi-times" class="remove-step-btn p-button-rounded p-button-text p-button-danger" @click="removeStepAction(index)" :disabled="loading" v-tooltip="'Remover'" />

                            <div class="grid formgrid p-fluid mt-2 ml-4">
                                <div class="field col-12 md:col-4">
                                    <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción <span class="text-red-500">*</span></label>
                                    <Dropdown
                                        v-model="step.tipo_accion"
                                        :options="actionTypes"
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Elegir..."
                                        :disabled="loading"
                                        class="w-full"
                                        :class="{ 'p-invalid': !step.tipo_accion && touchedFields.titulo }"
                                    >
                                        <template #value="slotProps">
                                            <div v-if="slotProps.value" class="flex align-items-center gap-2">
                                                <i :class="getActionIcon(slotProps.value)"></i>
                                                <span class="font-medium">{{ slotProps.value }}</span>
                                            </div>
                                            <span v-else>{{ slotProps.placeholder }}</span>
                                        </template>
                                        <template #option="slotProps">
                                            <div class="flex align-items-center gap-2">
                                                <i :class="getActionIcon(slotProps.option.value)"></i>
                                                <span>{{ slotProps.option.label }}</span>
                                            </div>
                                        </template>
                                    </Dropdown>
                                </div>

                                <div class="field col-12 md:col-8">
                                    <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsables <span class="text-red-500">*</span></label>
                                    <div class="flex flex-column gap-2">
                                        <MultiSelect
                                            v-model="step.permitted_positions"
                                            :options="positionOptions"
                                            optionLabel="label"
                                            optionValue="value"
                                            placeholder="Por Cargos (Ej: Sistemas, RRHH)"
                                            display="chip"
                                            :filter="true"
                                            :disabled="loading"
                                            class="w-full"
                                            :class="{ 'p-invalid': step.permitted_positions.length === 0 && step.permitted_users.length === 0 && touchedFields.titulo }"
                                        />
                                        <MultiSelect
                                            v-model="step.permitted_users"
                                            :options="userOptions"
                                            optionLabel="label"
                                            optionValue="value"
                                            placeholder="Por Usuarios Específicos"
                                            display="chip"
                                            :filter="true"
                                            :disabled="loading"
                                            class="w-full"
                                        />
                                    </div>
                                    <small v-if="step.permitted_positions.length === 0 && step.permitted_users.length === 0 && touchedFields.titulo" class="p-error"> Debes seleccionar al menos un cargo o usuario. </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </transition>
        </div>

        <template #footer>
            <div class="flex justify-content-between align-items-center w-full border-t border-gray-200 dark:border-gray-700 pt-3">
                <Button label="Cancelar" icon="pi pi-times" severity="secondary" text @click="closeDialog" :disabled="loading" />

                <div class="flex gap-2">
                    <Button v-if="currentStep === 2" label="Atrás" icon="pi pi-arrow-left" severity="secondary" outlined @click="prevStep" :disabled="loading" />

                    <Button v-if="currentStep === 1" label="Siguiente" iconPos="right" icon="pi pi-arrow-right" @click="nextStep" class="p-button-primary bg-blue-600 hover:bg-blue-700" />

                    <Button v-if="currentStep === 2" label="Crear e Iniciar Flujo" icon="pi pi-send" @click="submitDocument" :loading="loading" :disabled="!isFormValid" class="p-button-success" />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
/* Transiciones */
.slide-fade-enter-active {
    transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
    transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
    position: absolute;
    width: 100%;
}
.slide-fade-enter-from {
    transform: translateX(20px);
    opacity: 0;
}
.slide-fade-leave-to {
    transform: translateX(-20px);
    opacity: 0;
}

.step-container {
    width: 100%;
}

/* Header & Icons */
.wizard-dialog :deep(.p-dialog-header) {
    background: var(--surface-section);
    border-bottom: 1px solid var(--surface-border);
    padding-bottom: 0;
}

.wizard-dialog :deep(.p-dialog-content) {
    background: var(--surface-section);
}

.wizard-dialog :deep(.p-dialog-footer) {
    background: var(--surface-section);
    border-top: none;
}

.popup-icon {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.popup-gradient-text {
    background-image: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}
:global(.dark) .popup-gradient-text {
    background-image: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
}

/* Stepper Custom */
.step-circle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface-ground);
    border: 2px solid var(--surface-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: var(--text-color-secondary);
    transition: all 0.4s ease;
    z-index: 2;
}

.step-circle.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.step-line {
    flex: 1;
    height: 3px;
    background: var(--surface-border);
    margin: 0 -15px;
    transform: translateY(-10px);
    transition: all 0.4s ease;
    z-index: 1;
}

.step-line.active {
    background: #3b82f6;
}

/* Drag & Drop Zone */
.drop-zone {
    border: 2px dashed var(--surface-border);
    border-radius: 12px;
    background: var(--surface-card);
    transition: all 0.3s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;
}

.drop-zone:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.02);
}

.drop-zone.is-dragging {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
    transform: scale(1.01);
}

.drop-zone.has-file {
    border-style: solid;
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
}

.drop-zone.is-invalid {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
}

.cloud-icon i {
    background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    transition: all 0.3s ease;
}

.drop-zone:hover .cloud-icon i,
.drop-zone.is-dragging .cloud-icon i {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    transform: translateY(-5px);
}

/* Pasos dinámicos */
.step-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1.5rem 1rem 1rem 1rem;
    position: relative;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    transition: all 0.2s ease;
    border-left: 4px solid #3b82f6;
}

.step-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.step-ordinal {
    position: absolute;
    top: -12px;
    left: -12px;
    width: 28px;
    height: 28px;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.8rem;
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}

.remove-step-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 2rem;
    height: 2rem;
}

.empty-icon-pulse i {
    animation: pulseIcon 2s infinite ease-in-out;
}

@keyframes pulseIcon {
    0% {
        transform: scale(1);
        opacity: 0.5;
    }
    50% {
        transform: scale(1.1);
        opacity: 1;
    }
    100% {
        transform: scale(1);
        opacity: 0.5;
    }
}

:global(.dark) .step-card {
    background: rgba(255, 255, 255, 0.02);
}
</style>
