<script setup>
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, defineEmits, defineProps, ref, watch } from 'vue';

const props = defineProps({
    details: {
        type: Array, // SIEMPRE un array de registros diarios (nuevo formato)
        required: true,
        default: () => []
    },
    attentionId: {
        type: Number,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    },
    readOnly: {
        type: Boolean,
        default: false
    },
    selectedDate: {
        type: String, // Fecha en formato YYYY-MM-DD
        default: null
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

const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

const resetForm = () => {
    localDetails.value = {
        id_attentions: props.attentionId,
        attention_date: props.selectedDate || getTodayDate(), // Campo obligatorio nuevo
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

// Computed para obtener el detalle actual basado en selectedDate o el más reciente
const currentDetail = computed(() => {
    if (!props.details) return null;

    // details SIEMPRE debe ser un array (nuevo formato)
    if (!Array.isArray(props.details)) {
        console.error('AttentionDetails: details debe ser un array, recibido:', typeof props.details);
        return null;
    }

    if (props.details.length === 0) return null;

    // Si hay una fecha seleccionada, buscar ese detalle
    if (props.selectedDate) {
        return props.details.find((d) => d.attention_date === props.selectedDate) || null;
    }

    // Sino, retornar el más reciente (primero del array)
    return props.details[0];
});

// Watch para sincronizar props
watch(
    () => currentDetail.value,
    (newDetails) => {
        if (newDetails) {
            localDetails.value = { ...newDetails };
            // Asegurar que tenga attention_date
            if (!localDetails.value.attention_date) {
                localDetails.value.attention_date = props.selectedDate || getTodayDate();
            }
            isEditing.value = false;
        } else {
            resetForm();
            isEditing.value = true;
        }
    },
    { immediate: true }
);

// Watch para la fecha seleccionada
watch(
    () => props.selectedDate,
    (newDate) => {
        if (newDate && localDetails.value) {
            localDetails.value.attention_date = newDate;
        }
    }
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

    // Asegurar que attention_date esté presente
    if (!localDetails.value.attention_date) {
        localDetails.value.attention_date = props.selectedDate || getTodayDate();
    }

    try {
        isLoading.value = true;

        if (currentDetail.value) {
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
    if (currentDetail.value) {
        localDetails.value = { ...currentDetail.value };
    } else {
        resetForm();
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
                if (currentDetail.value) {
                    localDetails.value = { ...currentDetail.value };
                    isEditing.value = false;
                } else {
                    resetForm();
                }
            }
        });
    } else {
        if (currentDetail.value) {
            localDetails.value = { ...currentDetail.value };
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

// Función para calcular porcentaje seguro
const getScorePercentage = (score, maxScore) => {
    if (!score || !maxScore || maxScore === 0) return 0;
    const percentage = Math.round((score / maxScore) * 100);
    return Math.min(Math.max(percentage, 0), 100); // Asegurar que esté entre 0 y 100
};

// Función para obtener el valor del score de forma segura
const getScoreValue = (score) => {
    return score && typeof score === 'number' ? score : 0;
};

const formatAuditDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
};
</script>

<template>
    <!-- Estado sin datos -->
    <div v-if="!isEditing && !currentDetail" class="empty-state text-center py-6">
        <div class="mb-4">
            <i class="pi pi-file-plus text-6xl text-gray-400 mb-3 block"></i>
            <h3 class="text-xl font-medium text-gray-700 mb-2">Sin Detalles Médicos Registrados</h3>
            <p class="text-gray-500 mb-4">{{ readOnly ? 'No hay detalles médicos registrados para esta atención.' : 'Aún no se han registrado detalles médicos para esta atención.' }}</p>
            <Button v-if="!readOnly" label="Agregar Detalles Médicos" icon="pi pi-plus" class="p-button-lg" @click="startEditing" :disabled="isLoading" />
        </div>
    </div>

    <!-- Contenido principal con datos -->
    <div v-else class="medical-details-container">
        <!-- Header compacto con información general -->
        <div v-if="!isEditing && currentDetail" class="details-header-compact">
            <div class="header-content">
                <div class="header-info">
                    <i class="pi pi-file-edit header-icon"></i>
                    <div class="header-text">
                        <h3 class="header-title">Detalles Médicos</h3>
                        <span class="header-subtitle">Información clínica</span>
                    </div>
                </div>
                <div class="header-badges">
                    <Tag v-if="currentDetail && currentDetail.attention_date" :value="formatAuditDate(currentDetail.attention_date)" severity="info" size="small" />
                    <Tag v-if="hasContent" value="Con datos" severity="success" size="small" />
                    <Tag v-else value="Sin datos" severity="warn" size="small" />
                    <Badge v-if="currentDetail && currentDetail.id" :value="currentDetail.id" severity="info" size="small" />
                </div>
            </div>
        </div>

        <!-- Contenido en tabs -->
        <div v-if="!isEditing && currentDetail" class="view-mode">
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
                    <!-- Panel de Scores Compacto -->
                    <TabPanel value="0" class="pt-3">
                        <div v-if="scoreFields.some((score) => getScoreValue(localDetails[score.key]) > 0)" class="scores-container">
                            <div v-for="score in scoreFields" :key="score.key" class="score-card" :class="{ 'score-card--active': getScoreValue(localDetails[score.key]) > 0 }">
                                <div class="score-header">
                                    <i :class="score.icon" class="score-icon"></i>
                                    <span class="score-title">{{ score.label }}</span>
                                </div>
                                <div class="score-body">
                                    <div class="score-value" :class="'score-value--' + getRiskSeverity(getScoreValue(localDetails[score.key]), score.max)">{{ getScoreValue(localDetails[score.key]) }}{{ score.suffix }}</div>
                                    <div class="score-progress">
                                        <ProgressBar :value="getScorePercentage(getScoreValue(localDetails[score.key]), score.max)" :severity="getRiskSeverity(getScoreValue(localDetails[score.key]), score.max)" />
                                    </div>
                                    <div class="score-percentage">{{ getScorePercentage(getScoreValue(localDetails[score.key]), score.max) }}% de {{ score.max }}{{ score.suffix }}</div>
                                    <small class="score-help">{{ score.help }}</small>
                                </div>
                            </div>
                        </div>
                        <div v-else class="empty-scores">
                            <i class="pi pi-chart-bar"></i>
                            <span>No hay evaluaciones de riesgo</span>
                            <Button v-if="!readOnly" label="Añadir" icon="pi pi-plus" size="small" severity="secondary" outlined @click="startEditing" />
                        </div>
                    </TabPanel>

                    <!-- Panel de Información Clínica Compacta -->
                    <TabPanel value="1" class="pt-3">
                        <div v-if="detailFields.some((field) => field && localDetails[field.key])" class="clinical-grid">
                            <template v-for="field in detailFields" :key="field?.key || 'unknown'">
                                <div v-if="field && localDetails[field.key]" class="clinical-item">
                                    <div class="clinical-header">
                                        <i :class="[field.icon, 'clinical-icon', 'text-' + (field.severity || 'primary')]"></i>
                                        <span class="clinical-title">{{ field.label }}</span>
                                        <Badge v-if="field.priority === 'high'" value="Importante" severity="info" size="small" />
                                    </div>
                                    <div class="clinical-content">
                                        {{ localDetails[field.key] }}
                                    </div>
                                </div>
                            </template>
                        </div>
                        <div v-else class="empty-clinical">
                            <i class="pi pi-file-edit"></i>
                            <span>No hay información clínica</span>
                            <Button v-if="!readOnly" label="Añadir" icon="pi pi-plus" size="small" severity="secondary" outlined @click="startEditing" />
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>

        <!-- Modo Edición/Creación Compacto -->
        <div v-else class="edit-mode-compact">
            <div class="edit-info">
                <i class="pi pi-info-circle"></i>
                <span>{{ currentDetail ? 'Editando detalles médicos' : 'Creando nuevos detalles médicos' }}</span>
                <small>Fecha: {{ localDetails.attention_date || 'Hoy' }}</small>
            </div>

            <div class="edit-content">
                <!-- Campo de fecha (solo visible al crear) -->
                <div v-if="!currentDetail" class="edit-section">
                    <h4 class="edit-section-title">
                        <i class="pi pi-calendar"></i>
                        Fecha del Registro
                    </h4>
                    <div class="field">
                        <label for="attention_date" class="field-label">
                            <i class="pi pi-calendar"></i>
                            Fecha de Atención *
                        </label>
                        <Calendar id="attention_date" v-model="localDetails.attention_date" dateFormat="yy-mm-dd" :showIcon="true" class="w-full" />
                        <small class="field-help">Seleccione la fecha para este registro diario</small>
                    </div>
                </div>

                <!-- Sección de Scores -->
                <div class="edit-section">
                    <h4 class="edit-section-title">
                        <i class="pi pi-chart-bar"></i>
                        Evaluación de Riesgos
                    </h4>
                    <div class="scores-edit-grid">
                        <div v-for="score in scoreFields" :key="score.key" class="score-edit-field">
                            <label :for="score.key" class="field-label">
                                <i :class="score.icon"></i>
                                {{ score.label }}
                            </label>
                            <InputNumber :id="score.key" v-model="localDetails[score.key]" mode="decimal" :min="score.min" :max="score.max" :suffix="' ' + score.suffix" show-buttons size="small" class="w-full" :placeholder="`0-${score.max}`" />
                            <small class="field-help">{{ score.help }}</small>
                        </div>
                    </div>
                </div>

                <!-- Sección de Información Clínica -->
                <div class="edit-section">
                    <h4 class="edit-section-title">
                        <i class="pi pi-file-edit"></i>
                        Información Clínica
                    </h4>
                    <div class="clinical-edit-grid">
                        <div v-for="field in detailFields" :key="field.key" class="clinical-edit-field">
                            <label :for="field.key" class="field-label">
                                <i :class="[field.icon, 'text-' + (field.severity || 'primary')]"></i>
                                {{ field.label }}
                                <Badge v-if="field.priority === 'high'" value="Importante" severity="info" size="small" />
                            </label>
                            <Textarea :id="field.key" v-model="localDetails[field.key]" :placeholder="field.placeholder" rows="3" auto-resize class="w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer compacto con acciones -->
        <div class="details-footer-compact">
            <div class="footer-content">
                <div class="footer-info">
                    <i class="pi pi-info-circle"></i>
                    <span v-if="!isEditing && currentDetail">Actualizado: {{ formatAuditDate(currentDetail.updated_at) }}</span>
                    <span v-else>Campos opcionales - Fecha: {{ localDetails.attention_date }}</span>
                </div>
                <div class="footer-actions">
                    <template v-if="!isEditing && currentDetail && !readOnly">
                        <Button label="Editar" icon="pi pi-pencil" severity="info" size="small" :disabled="isLoading" @click="startEditing" />
                        <Button label="Eliminar" icon="pi pi-trash" severity="danger" outlined size="small" :disabled="isLoading" @click="handleDelete" />
                    </template>
                    <template v-else-if="!readOnly">
                        <Button v-if="currentDetail" label="Cancelar" icon="pi pi-times" severity="secondary" outlined size="small" :disabled="isLoading" @click="cancelEditing" />
                        <Button :label="currentDetail ? 'Actualizar' : 'Guardar'" icon="pi pi-check" size="small" :disabled="!isFormValid || isLoading" :loading="isLoading" @click="handleSave" />
                    </template>
                </div>
            </div>
        </div>
    </div>

    <ConfirmDialog />
    <Toast />
</template>

<style scoped>
/* Contenedor principal compacto */
.medical-details-container {
    padding: 0.75rem;
    background: var(--surface-card);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
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

/* ===== NUEVOS ESTILOS COMPACTOS ===== */

/* Header Compacto */
.details-header-compact {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--surface-50);
    border: 1px solid var(--surface-200);
    border-radius: 8px;
}

.header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.header-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.header-icon {
    color: var(--primary-color);
    font-size: 1.25rem;
}

.header-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.header-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-color);
}

.header-subtitle {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

.header-badges {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* Scores Compactos */
.scores-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 0.5rem;
}

.score-card {
    flex: 1;
    min-width: 180px;
    background: var(--surface-card);
    border: 1px solid var(--surface-200);
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s ease;
}

.score-card--active {
    border-color: var(--primary-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.score-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.score-icon {
    font-size: 0.9rem;
    color: var(--text-color-secondary);
}

.score-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-color);
}

.score-body {
    text-align: center;
}

.score-value {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.score-value--success {
    color: var(--green-600);
}

.score-value--warn {
    color: var(--orange-600);
}

.score-value--danger {
    color: var(--red-600);
}

.score-progress {
    margin-bottom: 0.5rem;
}

.score-help {
    color: var(--text-color-secondary);
    font-size: 0.75rem;
    display: block;
}

.score-percentage {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    text-align: center;
    margin-bottom: 0.25rem;
    font-weight: 500;
}

.empty-scores {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
    text-align: center;
    color: var(--text-color-secondary);
}

.empty-scores i {
    font-size: 2rem;
    color: var(--surface-400);
}

/* Información Clínica Compacta */
.clinical-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.clinical-item {
    background: var(--surface-card);
    border: 1px solid var(--surface-200);
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s ease;
}

.clinical-item:hover {
    border-color: var(--primary-color-text);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.clinical-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.clinical-icon {
    font-size: 0.9rem;
}

.clinical-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-color);
}

.clinical-content {
    font-size: 0.9rem;
    line-height: 1.4;
    color: var(--text-color);
    white-space: pre-wrap;
}

.empty-clinical {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
    text-align: center;
    color: var(--text-color-secondary);
}

.empty-clinical i {
    font-size: 2rem;
    color: var(--surface-400);
}

/* Modo Edición Compacto */
.edit-mode-compact {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.edit-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--blue-50);
    border: 1px solid var(--blue-200);
    border-radius: 6px;
    font-size: 0.9rem;
}

.edit-info i {
    color: var(--blue-600);
}

.edit-info span {
    font-weight: 500;
    color: var(--blue-800);
}

.edit-info small {
    color: var(--blue-700);
    margin-left: auto;
}

.edit-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.edit-section {
    background: var(--surface-50);
    border: 1px solid var(--surface-200);
    border-radius: 8px;
    padding: 1rem;
}

.edit-section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
}

.edit-section-title i {
    color: var(--primary-color);
}

/* Grid de Scores en Edición */
.scores-edit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.score-edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* Grid de Clínica en Edición */
.clinical-edit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
}

.clinical-edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.field-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-color);
}

.field-label i {
    font-size: 0.85rem;
}

.field-help {
    color: var(--text-color-secondary);
    font-size: 0.75rem;
    line-height: 1.3;
}

/* Footer Compacto */
.details-footer-compact {
    margin-top: 1rem;
    padding: 0.75rem;
    background: var(--surface-50);
    border: 1px solid var(--surface-200);
    border-radius: 6px;
}

.footer-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.footer-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

.footer-info i {
    font-size: 0.75rem;
}

.footer-actions {
    display: flex;
    gap: 0.5rem;
}

/* Responsive para diseño compacto */
@media (max-width: 768px) {
    .medical-details-container {
        padding: 0.5rem;
    }

    .header-content {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
    }

    .scores-container {
        flex-direction: column;
    }

    .score-card {
        min-width: auto;
    }

    .scores-edit-grid {
        grid-template-columns: 1fr;
    }

    .clinical-edit-grid {
        grid-template-columns: 1fr;
    }

    .footer-content {
        flex-direction: column;
        align-items: stretch;
    }

    .footer-actions {
        justify-content: center;
    }

    .edit-info {
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
    }

    .edit-info small {
        margin-left: 0;
        margin-top: 0.25rem;
    }
}

@media (max-width: 480px) {
    .footer-actions {
        flex-direction: column;
    }

    .scores-edit-grid,
    .clinical-edit-grid {
        grid-template-columns: 1fr;
    }
}

/* Optimizaciones de espacio */
.custom-tabs :deep(.p-tablist) {
    margin-bottom: 0.75rem;
    padding: 0.25rem;
}

.custom-tabs :deep(.p-tab) {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
}

.custom-tabs :deep(.p-tabpanel) {
    padding: 0;
}

/* Progress Bar Optimizada */
:deep(.p-progressbar) {
    height: 14px;
    border-radius: 7px;
    background-color: var(--surface-200);
    overflow: hidden;
    border: 1px solid var(--surface-300);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

:deep(.p-progressbar .p-progressbar-value) {
    border-radius: 6px;
    transition: width 0.3s ease;
    position: relative;
    overflow: hidden;
}

/* Efecto de brillo en la barra */
:deep(.p-progressbar .p-progressbar-value::after) {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1));
    border-radius: 6px 6px 0 0;
}

/* Colores específicos para los diferentes niveles de severidad */
:deep(.p-progressbar.p-progressbar-success .p-progressbar-value) {
    background: linear-gradient(90deg, var(--green-500), var(--green-400));
}

:deep(.p-progressbar.p-progressbar-warn .p-progressbar-value) {
    background: linear-gradient(90deg, var(--orange-500), var(--orange-400));
}

:deep(.p-progressbar.p-progressbar-danger .p-progressbar-value) {
    background: linear-gradient(90deg, var(--red-500), var(--red-400));
}

:deep(.p-inputnumber-input) {
    padding: 0.5rem;
}

:deep(.p-inputtextarea) {
    padding: 0.5rem;
    font-size: 0.9rem;
}
</style>
