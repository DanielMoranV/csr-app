<script setup>
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, defineEmits, defineProps, ref, watch } from 'vue';

const props = defineProps({
    details: {
        type: Object,
        default: () => null
    },
    attentionId: {
        type: Number,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['create-details', 'update-details', 'delete-details']);

const confirm = useConfirm();
const toast = useToast();

const isEditing = ref(false);
const localDetails = ref({});
const isLoading = ref(false);

// Configuración de campos con validaciones y ayuda contextual
const detailFields = [
    {
        key: 'ram',
        label: 'Reacciones Alérgicas a Medicamentos (RAM)',
        component: 'Textarea',
        icon: 'pi pi-exclamation-triangle',
        placeholder: 'Describa cualquier reacción alérgica conocida a medicamentos...',
        required: false,
        severity: 'warn'
    },
    {
        key: 'images_exams',
        label: 'Exámenes de Imágenes',
        component: 'Textarea',
        icon: 'pi pi-image',
        placeholder: 'Radiografías, TAC, RMN, ecografías realizadas...',
        required: false
    },
    {
        key: 'laboratory_exams',
        label: 'Exámenes de Laboratorio',
        component: 'Textarea',
        icon: 'pi pi-chart-line',
        placeholder: 'Hemograma, bioquímica, marcadores, cultivos...',
        required: false
    },
    {
        key: 'interconsultation',
        label: 'Interconsultas',
        component: 'Textarea',
        icon: 'pi pi-users',
        placeholder: 'Consultas con especialistas solicitadas o realizadas...',
        required: false
    },
    {
        key: 'medical_order',
        label: 'Órdenes Médicas',
        component: 'Textarea',
        icon: 'pi pi-file-edit',
        placeholder: 'Indicaciones médicas, prescripciones, procedimientos...',
        required: false,
        severity: 'info',
        priority: 'high'
    },
    {
        key: 'intercurrences',
        label: 'Intercurrencias',
        component: 'Textarea',
        icon: 'pi pi-info-circle',
        placeholder: 'Eventos o complicaciones durante la atención...',
        required: false,
        severity: 'warn'
    }
];

const scoreFields = [
    {
        key: 'score_CUDYR',
        label: 'Score CUDYR',
        icon: 'pi pi-chart-bar',
        min: 0,
        max: 100,
        suffix: 'pts',
        help: 'Escala de evaluación funcional'
    },
    {
        key: 'thrombosis_risk_score',
        label: 'Riesgo de Trombosis',
        icon: 'pi pi-heart',
        min: 0,
        max: 10,
        suffix: 'pts',
        help: 'Evaluación del riesgo trombótico'
    },
    {
        key: 'bleeding_risk_score',
        label: 'Riesgo de Sangrado',
        icon: 'pi pi-circle',
        min: 0,
        max: 10,
        suffix: 'pts',
        help: 'Evaluación del riesgo hemorrágico'
    }
];

// Computed para validaciones - Solo id_attentions es requerido
const isFormValid = computed(() => {
    // Solo validamos que tenga id_attentions, el resto son opcionales
    return localDetails.value.id_attentions && localDetails.value.id_attentions > 0;
});

// Computed para verificar si hay algún contenido
const hasContent = computed(() => {
    const fields = [...detailFields.map((f) => f.key), ...scoreFields.map((f) => f.key)];
    return fields.some((key) => {
        const value = localDetails.value[key];
        return value !== null && value !== undefined && value !== '' && value !== 0;
    });
});

const hasUnsavedChanges = computed(() => {
    if (!props.details) return false;
    return JSON.stringify(localDetails.value) !== JSON.stringify(props.details);
});

const resetForm = () => {
    localDetails.value = {
        id_attentions: props.attentionId,
        ram: '',
        images_exams: '',
        laboratory_exams: '',
        interconsultation: '',
        medical_order: '',
        intercurrences: '',
        score_CUDYR: 0,
        thrombosis_risk_score: 0,
        bleeding_risk_score: 0
    };
};

// Watch para sincronizar props
watch(
    () => props.details,
    (newDetails) => {
        if (newDetails) {
            localDetails.value = { ...newDetails };
            isEditing.value = false;
        } else {
            resetForm();
            isEditing.value = true;
        }
    },
    { immediate: true }
);

const handleSave = async () => {
    if (!isFormValid.value) {
        toast.add({
            severity: 'warn',
            summary: 'Validación',
            detail: 'Error en la validación del formulario',
            life: 3000
        });
        return;
    }

    try {
        isLoading.value = true;

        if (props.details) {
            await emit('update-details', localDetails.value.id, localDetails.value);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Detalles actualizados correctamente',
                life: 3000
            });
        } else {
            await emit('create-details', localDetails.value);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Detalles creados correctamente',
                life: 3000
            });
        }

        isEditing.value = false;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al guardar los detalles',
            life: 3000
        });
    } finally {
        isLoading.value = false;
    }
};

const handleDelete = () => {
    confirm.require({
        message: '¿Está seguro de que desea eliminar estos detalles médicos?',
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        rejectClass: 'p-button-secondary p-button-outlined',
        rejectLabel: 'Cancelar',
        acceptLabel: 'Eliminar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                isLoading.value = true;
                await emit('delete-details', localDetails.value.id);
                toast.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Detalles eliminados correctamente',
                    life: 3000
                });
            } catch (error) {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al eliminar los detalles',
                    life: 3000
                });
            } finally {
                isLoading.value = false;
            }
        }
    });
};

const startEditing = () => {
    if (props.details) {
        localDetails.value = { ...props.details };
    }
    isEditing.value = true;
};

const cancelEditing = () => {
    if (hasUnsavedChanges.value) {
        confirm.require({
            message: 'Tiene cambios sin guardar. ¿Desea descartar los cambios?',
            header: 'Confirmar Cancelación',
            icon: 'pi pi-question-circle',
            rejectClass: 'p-button-secondary p-button-outlined',
            rejectLabel: 'Continuar Editando',
            acceptLabel: 'Descartar Cambios',
            accept: () => {
                if (props.details) {
                    localDetails.value = { ...props.details };
                    isEditing.value = false;
                } else {
                    resetForm();
                }
            }
        });
    } else {
        if (props.details) {
            localDetails.value = { ...props.details };
            isEditing.value = false;
        } else {
            resetForm();
        }
    }
};

const getRiskSeverity = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 70) return 'danger';
    if (percentage >= 40) return 'warn';
    return 'success';
};
</script>

<template>
    <!-- Estado sin datos -->
    <div v-if="!isEditing && !details" class="empty-state text-center py-6">
        <div class="mb-4">
            <i class="pi pi-file-plus text-6xl text-gray-400 mb-3 block"></i>
            <h3 class="text-xl font-medium text-gray-700 mb-2">Sin Detalles Médicos Registrados</h3>
            <p class="text-gray-500 mb-4">Aún no se han registrado detalles médicos para esta atención.</p>
            <Button label="Agregar Detalles Médicos" icon="pi pi-plus" class="p-button-lg" @click="startEditing" :disabled="isLoading" />
        </div>
    </div>

    <!-- Contenido principal con datos -->
    <div v-else class="medical-details-container">
        <!-- Header con información general -->
        <div v-if="!isEditing && details" class="details-header mb-4 p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                        <i class="pi pi-file-edit text-blue-600"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 m-0">Detalles Médicos</h3>
                        <p class="text-sm text-gray-600 m-0">Información clínica registrada</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <Tag v-if="hasContent" value="Con datos" severity="success" />
                    <Tag v-else value="Sin datos" severity="warn" />
                    <Badge v-if="details.id" :value="'ID: ' + details.id" severity="info" />
                </div>
            </div>
        </div>

        <!-- Contenido en tabs -->
        <div v-if="!isEditing && details" class="view-mode">
            <Tabs value="0" class="custom-tabs">
                <TabList>
                    <Tab value="0">
                        <i class="pi pi-chart-bar mr-2"></i>
                        Evaluación de Riesgos
                    </Tab>
                    <Tab value="1">
                        <i class="pi pi-file-edit mr-2"></i>
                        Información Clínica
                    </Tab>
                </TabList>

                <TabPanels>
                    <!-- Panel de Scores -->
                    <TabPanel value="0" class="pt-4">
                        <div v-if="scoreFields.some((score) => localDetails[score.key] > 0)" class="grid">
                            <div v-for="score in scoreFields" :key="score.key" class="col-12 md:col-4">
                                <Panel class="h-full score-panel" :class="{ 'has-data': localDetails[score.key] > 0 }">
                                    <template #header>
                                        <div class="flex align-items-center gap-2">
                                            <i :class="score.icon" class="text-sm"></i>
                                            <span class="font-medium text-sm">{{ score.label }}</span>
                                        </div>
                                    </template>
                                    <div class="text-center">
                                        <div class="text-3xl font-bold mb-2" :class="'text-' + getRiskSeverity(localDetails[score.key] || 0, score.max)">{{ localDetails[score.key] || 0 }}{{ score.suffix }}</div>
                                        <ProgressBar :value="((localDetails[score.key] || 0) / score.max) * 100" :severity="getRiskSeverity(localDetails[score.key] || 0, score.max)" class="mb-2" />
                                        <small class="text-500">{{ score.help }}</small>
                                    </div>
                                </Panel>
                            </div>
                        </div>
                        <div v-else class="text-center py-6 text-gray-500">
                            <i class="pi pi-chart-bar text-4xl mb-3 block text-gray-300"></i>
                            <p class="text-lg font-medium">No hay evaluaciones de riesgo registradas</p>
                            <Button label="Añadir Evaluación" icon="pi pi-plus" severity="secondary" outlined @click="startEditing" />
                        </div>
                    </TabPanel>

                    <!-- Panel de Información Clínica -->
                    <TabPanel value="1" class="pt-4">
                        <div v-if="detailFields.some((field) => localDetails[field.key])" class="grid">
                            <div v-for="field in detailFields" :key="field.key" class="col-12">
                                <Panel v-if="localDetails[field.key]" class="mb-3 clinical-panel">
                                    <template #header>
                                        <div class="flex align-items-center gap-2">
                                            <i :class="[field.icon, 'text-' + (field.severity || 'primary')]"></i>
                                            <span class="font-medium">{{ field.label }}</span>
                                            <Badge v-if="field.priority === 'high'" value="Importante" severity="info" size="small" />
                                        </div>
                                    </template>
                                    <div class="white-space-pre-wrap line-height-3 text-gray-800">
                                        {{ localDetails[field.key] }}
                                    </div>
                                </Panel>
                            </div>
                        </div>
                        <div v-else class="text-center py-6 text-gray-500">
                            <i class="pi pi-file-edit text-4xl mb-3 block text-gray-300"></i>
                            <p class="text-lg font-medium">No hay información clínica registrada</p>
                            <Button label="Añadir Información" icon="pi pi-plus" severity="secondary" outlined @click="startEditing" />
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>

        <!-- Modo Edición/Creación -->
        <div v-else class="edit-mode">
            <div class="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div class="flex items-center gap-2">
                    <i class="pi pi-info-circle text-blue-600"></i>
                    <span class="font-medium text-blue-800">
                        {{ details ? 'Editando detalles médicos' : 'Creando nuevos detalles médicos' }}
                    </span>
                </div>
                <p class="text-sm text-blue-700 mt-1 mb-0">Todos los campos son opcionales. Complete solo la información disponible.</p>
            </div>

            <Tabs value="0" class="custom-tabs edit-tabs">
                <TabList>
                    <Tab value="0">
                        <i class="pi pi-chart-bar mr-2"></i>
                        Evaluación de Riesgos
                    </Tab>
                    <Tab value="1">
                        <i class="pi pi-file-edit mr-2"></i>
                        Información Clínica
                    </Tab>
                </TabList>

                <TabPanels>
                    <!-- Panel de Edición de Scores -->
                    <TabPanel value="0" class="pt-4">
                        <div class="grid">
                            <div v-for="score in scoreFields" :key="score.key" class="field col-12 md:col-4">
                                <label :for="score.key" class="font-medium mb-2 block">
                                    <i :class="score.icon" class="mr-1"></i>
                                    {{ score.label }}
                                </label>
                                <InputNumber
                                    :id="score.key"
                                    v-model="localDetails[score.key]"
                                    mode="decimal"
                                    :min="score.min"
                                    :max="score.max"
                                    :suffix="' ' + score.suffix"
                                    show-buttons
                                    class="w-full"
                                    :placeholder="`0 - ${score.max} ${score.suffix}`"
                                />
                                <small class="text-500 block mt-1">{{ score.help }}</small>
                            </div>
                        </div>
                    </TabPanel>

                    <!-- Panel de Edición de Información Clínica -->
                    <TabPanel value="1" class="pt-4">
                        <div class="grid">
                            <div v-for="field in detailFields" :key="field.key" class="field col-12">
                                <label :for="field.key" class="font-medium mb-2 block">
                                    <i :class="[field.icon, 'text-' + (field.severity || 'primary'), 'mr-1']"></i>
                                    {{ field.label }}
                                    <Badge v-if="field.priority === 'high'" value="Importante" severity="info" size="small" class="ml-2" />
                                </label>
                                <Textarea :id="field.key" v-model="localDetails[field.key]" :placeholder="field.placeholder" rows="4" auto-resize class="w-full" />
                            </div>
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>

        <!-- Footer con acciones -->
        <div class="details-footer mt-6 pt-4 border-t border-gray-200">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2 text-sm text-gray-500">
                    <i class="pi pi-info-circle"></i>
                    <span v-if="!isEditing && details"> Última actualización: {{ new Date().toLocaleDateString('es-ES') }} </span>
                    <span v-else> Todos los campos son opcionales </span>
                </div>

                <div class="flex gap-2">
                    <div v-if="!isEditing && details" class="flex gap-2">
                        <Button label="Editar" icon="pi pi-pencil" severity="info" :disabled="isLoading" @click="startEditing" />
                        <Button label="Eliminar" icon="pi pi-trash" severity="danger" outlined :disabled="isLoading" @click="handleDelete" />
                    </div>

                    <div v-else class="flex gap-2">
                        <Button v-if="details" label="Cancelar" icon="pi pi-times" severity="secondary" outlined :disabled="isLoading" @click="cancelEditing" />
                        <Button :label="details ? 'Actualizar' : 'Guardar'" icon="pi pi-check" :disabled="!isFormValid || isLoading" :loading="isLoading" @click="handleSave" />
                    </div>
                </div>
            </div>
        </div>
    </div>

    <ConfirmDialog />
    <Toast />
</template>

<style scoped>
/* Contenedor principal */
.medical-details-container {
    padding: 1rem;
}

/* Estado vacío */
.empty-state {
    padding: 3rem 1rem;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    border-radius: 12px;
    border: 2px dashed #cbd5e1;
}

.empty-state .p-button-lg {
    padding: 0.875rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
}

/* Header de detalles */
.details-header {
    border: 1px solid #e2e8f0;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

/* Tabs personalizados */
.custom-tabs :deep(.p-tablist) {
    background: #f8fafc;
    border-radius: 8px;
    padding: 4px;
    border: 1px solid #e2e8f0;
}

.custom-tabs :deep(.p-tab) {
    border-radius: 6px;
    margin: 0 2px;
    transition: all 0.2s ease;
}

.custom-tabs :deep(.p-tab:hover) {
    background: #e2e8f0;
}

.custom-tabs :deep(.p-tab[aria-selected='true']) {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
}

.custom-tabs :deep(.p-tabpanel) {
    padding: 0;
}

/* Panels mejorados */
.score-panel {
    transition: all 0.3s ease;
    border: 1px solid #e2e8f0;
}

.score-panel.has-data {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1);
}

.score-panel:deep(.p-panel-header) {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 0.75rem 1rem;
}

.score-panel:deep(.p-panel-content) {
    padding: 1.25rem;
}

.clinical-panel {
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
}

.clinical-panel:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.clinical-panel:deep(.p-panel-header) {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem;
}

.clinical-panel:deep(.p-panel-content) {
    padding: 1.25rem;
}

/* Modo edición */
.edit-mode .field {
    margin-bottom: 1.5rem;
}

.edit-mode .field label {
    color: #374151;
    font-weight: 500;
}

.edit-tabs :deep(.p-tablist) {
    background: #eff6ff;
    border-color: #bfdbfe;
}

.edit-tabs :deep(.p-tab[aria-selected='true']) {
    background: #dbeafe;
    border-color: #3b82f6;
}

/* Footer */
.details-footer {
    background: #f8fafc;
    border-radius: 8px;
    padding: 1rem;
    margin: 0 -1rem -1rem -1rem;
}

/* Progress bars mejoradas */
:deep(.p-progressbar) {
    height: 8px;
    border-radius: 4px;
}

:deep(.p-progressbar .p-progressbar-value) {
    border-radius: 4px;
}

/* Responsive */
@media (max-width: 768px) {
    .medical-details-container {
        padding: 0.5rem;
    }

    .details-header {
        padding: 1rem;
    }

    .details-header .flex {
        flex-direction: column;
        align-items: flex-start !important;
        gap: 1rem;
    }

    .details-footer {
        margin: 1rem -0.5rem -0.5rem -0.5rem;
    }

    .details-footer .flex {
        flex-direction: column;
        gap: 1rem;
    }

    .details-footer .flex:last-child {
        width: 100%;
    }

    .details-footer .flex:last-child > div {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
    }

    .details-footer button {
        width: 100%;
    }

    .custom-tabs :deep(.p-tablist) {
        flex-wrap: wrap;
    }

    .custom-tabs :deep(.p-tab) {
        flex: 1;
        min-width: 120px;
    }
}

/* Animaciones suaves */
.medical-details-container,
.empty-state {
    animation: fadeInUp 0.4s ease-out;
}

.score-panel,
.clinical-panel {
    animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Estados de carga */
.p-button:disabled {
    opacity: 0.6;
}

/* Mejoras de accesibilidad */
.custom-tabs :deep(.p-tab:focus) {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

/* Colores de severidad personalizados */
.text-success {
    color: #10b981;
}
.text-warn {
    color: #f59e0b;
}
.text-danger {
    color: #ef4444;
}
.text-primary {
    color: #3b82f6;
}

/* Utilidades */
.bg-gray-50 {
    background-color: #f9fafb;
}
.border-gray-200 {
    border-color: #e5e7eb;
}
.text-gray-400 {
    color: #9ca3af;
}
.text-gray-500 {
    color: #6b7280;
}
.text-gray-600 {
    color: #4b5563;
}
.text-gray-700 {
    color: #374151;
}
.text-gray-800 {
    color: #1f2937;
}
</style>
