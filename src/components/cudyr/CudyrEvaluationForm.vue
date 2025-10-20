<script setup>
import { ref, computed, defineEmits, defineProps } from 'vue';
import { useCudyr } from '@/composables/useCudyr';
import { CUDYR_CONSTANTS } from '@/api/cudyr';
import CudyrBadge from './CudyrBadge.vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
import Divider from 'primevue/divider';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
    detailsAttentionId: {
        type: Number,
        required: true
    },
    initialEvaluation: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['success', 'cancel']);

const toast = useToast();

// Usar el composable CUDYR
const {
    state,
    formData,
    preview,
    create,
    update,
    calculatePreview,
    updateDimension,
    isEditMode,
    canSubmit,
    categoryConfig,
    isCriticalPatient,
    populateForm
} = useCudyr(props.detailsAttentionId);

// Si hay una evaluación inicial, poblar el formulario
if (props.initialEvaluation) {
    populateForm(props.initialEvaluation);
}

// Estado de acordeones
const openSections = ref({
    dependency: true,
    risk: true,
    preview: true
});

/**
 * Manejar cambio de dimensión
 */
const handleDimensionChange = (field, value) => {
    updateDimension(field, value);
};

/**
 * Enviar formulario
 */
const handleSubmit = async () => {
    let result;

    if (isEditMode.value && props.initialEvaluation?.id) {
        result = await update(props.initialEvaluation.id);
    } else {
        result = await create();
    }

    if (result.success) {
        toast.add({
            severity: 'success',
            summary: 'Éxito',
            detail: isEditMode.value
                ? 'Evaluación CUDYR actualizada correctamente'
                : 'Evaluación CUDYR creada correctamente',
            life: 3000
        });
        emit('success', result.data);
    } else {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: result.error || 'Ocurrió un error al guardar la evaluación',
            life: 5000
        });
    }
};

/**
 * Cancelar formulario
 */
const handleCancel = () => {
    emit('cancel');
};

// Computed para validar que todas las dimensiones estén completadas
const allDimensionsCompleted = computed(() => {
    const dependencyDimensions = [
        'dependency_mobility',
        'dependency_hygiene',
        'dependency_nutrition',
        'dependency_elimination',
        'dependency_psychosocial',
        'dependency_surveillance'
    ];

    const riskDimensions = [
        'risk_oxygen_therapy',
        'risk_airway_management',
        'risk_vital_signs',
        'risk_fluid_balance',
        'risk_wound_care',
        'risk_invasive_devices',
        'risk_procedures',
        'risk_medications'
    ];

    return [...dependencyDimensions, ...riskDimensions].every(
        (field) => formData[field] !== null && formData[field] !== undefined
    );
});
</script>

<template>
    <div class="cudyr-evaluation-form">
        <!-- Error General -->
        <Message v-if="state.error" severity="error" :closable="false">
            {{ state.error }}
        </Message>

        <!-- Preview Card (fijo arriba) -->
        <Card v-if="allDimensionsCompleted && preview" class="preview-card" :class="{ 'preview-card--critical': isCriticalPatient }">
            <template #title>
                <div class="preview-title">
                    <i class="pi pi-chart-line"></i>
                    <span>Resultado de Evaluación</span>
                </div>
            </template>
            <template #content>
                <div class="preview-content">
                    <div class="preview-category">
                        <label>Categoría CUDYR:</label>
                        <CudyrBadge :category="preview.cudyr_category" size="large" />
                    </div>

                    <Divider />

                    <div class="preview-scores">
                        <div class="preview-score">
                            <i class="pi pi-users"></i>
                            <div class="preview-score-content">
                                <span class="preview-score-label">Dependencia</span>
                                <span class="preview-score-value">{{ preview.dependency?.total_score || 0 }}/18</span>
                                <span class="preview-score-text">{{ preview.dependency?.classification_text }}</span>
                            </div>
                        </div>

                        <div class="preview-score">
                            <i class="pi pi-exclamation-triangle"></i>
                            <div class="preview-score-content">
                                <span class="preview-score-label">Riesgo</span>
                                <span class="preview-score-value">{{ preview.risk?.total_score || 0 }}/24</span>
                                <span class="preview-score-text">{{ preview.risk?.classification_text }}</span>
                            </div>
                        </div>
                    </div>

                    <Message v-if="isCriticalPatient" severity="warn" :closable="false" class="mt-3">
                        <i class="pi pi-exclamation-triangle mr-2"></i>
                        Paciente de ALTO RIESGO - Requiere atención prioritaria
                    </Message>
                </div>
            </template>
        </Card>

        <!-- Sección de Dependencia -->
        <Card class="section-card">
            <template #title>
                <div class="section-title" @click="openSections.dependency = !openSections.dependency">
                    <div class="section-title-content">
                        <i class="pi pi-users"></i>
                        <span>Escala de Dependencia (6 dimensiones)</span>
                    </div>
                    <i :class="['pi', openSections.dependency ? 'pi-chevron-up' : 'pi-chevron-down']"></i>
                </div>
            </template>
            <template #content>
                <div v-show="openSections.dependency" class="dimensions-container">
                    <!-- Movilización -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.mobility.label }}
                            <span class="dimension-value-badge">{{ formData.dependency_mobility }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.mobility.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.dependency_mobility === index }"
                                @click="handleDimensionChange('dependency_mobility', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.dependency_mobility" class="p-error">{{ state.validationErrors.dependency_mobility[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Higiene -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.hygiene.label }}
                            <span class="dimension-value-badge">{{ formData.dependency_hygiene }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.hygiene.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.dependency_hygiene === index }"
                                @click="handleDimensionChange('dependency_hygiene', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.dependency_hygiene" class="p-error">{{ state.validationErrors.dependency_hygiene[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Alimentación -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.nutrition.label }}
                            <span class="dimension-value-badge">{{ formData.dependency_nutrition }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.nutrition.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.dependency_nutrition === index }"
                                @click="handleDimensionChange('dependency_nutrition', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.dependency_nutrition" class="p-error">{{ state.validationErrors.dependency_nutrition[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Eliminación -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.elimination.label }}
                            <span class="dimension-value-badge">{{ formData.dependency_elimination }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.elimination.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.dependency_elimination === index }"
                                @click="handleDimensionChange('dependency_elimination', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.dependency_elimination" class="p-error">{{ state.validationErrors.dependency_elimination[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Apoyo Psicosocial -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.psychosocial.label }}
                            <span class="dimension-value-badge">{{ formData.dependency_psychosocial }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.psychosocial.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.dependency_psychosocial === index }"
                                @click="handleDimensionChange('dependency_psychosocial', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.dependency_psychosocial" class="p-error">{{ state.validationErrors.dependency_psychosocial[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Vigilancia -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.surveillance.label }}
                            <span class="dimension-value-badge">{{ formData.dependency_surveillance }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.surveillance.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.dependency_surveillance === index }"
                                @click="handleDimensionChange('dependency_surveillance', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.dependency_surveillance" class="p-error">{{ state.validationErrors.dependency_surveillance[0] }}</span>
                    </div>
                </div>
            </template>
        </Card>

        <!-- Sección de Riesgo -->
        <Card class="section-card">
            <template #title>
                <div class="section-title" @click="openSections.risk = !openSections.risk">
                    <div class="section-title-content">
                        <i class="pi pi-exclamation-triangle"></i>
                        <span>Escala de Riesgo (8 dimensiones)</span>
                    </div>
                    <i :class="['pi', openSections.risk ? 'pi-chevron-up' : 'pi-chevron-down']"></i>
                </div>
            </template>
            <template #content>
                <div v-show="openSections.risk" class="dimensions-container">
                    <!-- Oxigenoterapia -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.oxygen_therapy.label }}
                            <span class="dimension-value-badge">{{ formData.risk_oxygen_therapy }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.oxygen_therapy.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.risk_oxygen_therapy === index }"
                                @click="handleDimensionChange('risk_oxygen_therapy', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.risk_oxygen_therapy" class="p-error">{{ state.validationErrors.risk_oxygen_therapy[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Manejo de Vía Aérea -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.airway_management.label }}
                            <span class="dimension-value-badge">{{ formData.risk_airway_management }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.airway_management.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.risk_airway_management === index }"
                                @click="handleDimensionChange('risk_airway_management', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.risk_airway_management" class="p-error">{{ state.validationErrors.risk_airway_management[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Signos Vitales -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.vital_signs.label }}
                            <span class="dimension-value-badge">{{ formData.risk_vital_signs }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.vital_signs.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.risk_vital_signs === index }"
                                @click="handleDimensionChange('risk_vital_signs', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.risk_vital_signs" class="p-error">{{ state.validationErrors.risk_vital_signs[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Balance Hídrico -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.fluid_balance.label }}
                            <span class="dimension-value-badge">{{ formData.risk_fluid_balance }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.fluid_balance.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.risk_fluid_balance === index }"
                                @click="handleDimensionChange('risk_fluid_balance', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.risk_fluid_balance" class="p-error">{{ state.validationErrors.risk_fluid_balance[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Curaciones -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.wound_care.label }}
                            <span class="dimension-value-badge">{{ formData.risk_wound_care }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.wound_care.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.risk_wound_care === index }"
                                @click="handleDimensionChange('risk_wound_care', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.risk_wound_care" class="p-error">{{ state.validationErrors.risk_wound_care[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Elementos Invasivos -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.invasive_devices.label }}
                            <span class="dimension-value-badge">{{ formData.risk_invasive_devices }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.invasive_devices.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.risk_invasive_devices === index }"
                                @click="handleDimensionChange('risk_invasive_devices', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.risk_invasive_devices" class="p-error">{{ state.validationErrors.risk_invasive_devices[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Procedimientos -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.procedures.label }}
                            <span class="dimension-value-badge">{{ formData.risk_procedures }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.procedures.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.risk_procedures === index }"
                                @click="handleDimensionChange('risk_procedures', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.risk_procedures" class="p-error">{{ state.validationErrors.risk_procedures[0] }}</span>
                    </div>

                    <Divider />

                    <!-- Medicamentos -->
                    <div class="dimension-field">
                        <label class="dimension-label">
                            {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.medications.label }}
                            <span class="dimension-value-badge">{{ formData.risk_medications }}/3</span>
                        </label>
                        <div class="dimension-options">
                            <div
                                v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.medications.descriptions"
                                :key="index"
                                class="dimension-option"
                                :class="{ 'dimension-option--selected': formData.risk_medications === index }"
                                @click="handleDimensionChange('risk_medications', index)"
                            >
                                <div class="option-radio">
                                    <span class="option-number">{{ index }}</span>
                                </div>
                                <span class="option-description">{{ description }}</span>
                            </div>
                        </div>
                        <span v-if="state.validationErrors.risk_medications" class="p-error">{{ state.validationErrors.risk_medications[0] }}</span>
                    </div>
                </div>
            </template>
        </Card>

        <!-- Notas -->
        <Card class="section-card">
            <template #title>
                <div class="section-title">
                    <div class="section-title-content">
                        <i class="pi pi-file-edit"></i>
                        <span>Observaciones (Opcional)</span>
                    </div>
                </div>
            </template>
            <template #content>
                <Textarea v-model="formData.notes" rows="4" placeholder="Ingrese observaciones adicionales sobre la evaluación..." class="w-full" />
            </template>
        </Card>

        <!-- Botones de acción -->
        <div class="form-actions">
            <Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined @click="handleCancel" :disabled="state.isSaving" />
            <Button
                :label="isEditMode ? 'Actualizar Evaluación' : 'Guardar Evaluación'"
                icon="pi pi-check"
                :loading="state.isSaving"
                :disabled="!canSubmit || !allDimensionsCompleted"
                @click="handleSubmit"
            />
        </div>
    </div>
</template>

<style scoped>
.cudyr-evaluation-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* Preview Card */
.preview-card {
    position: sticky;
    top: 1rem;
    z-index: 10;
    background: linear-gradient(135deg, var(--primary-50), var(--surface-card));
    border: 2px solid var(--primary-color);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.preview-card--critical {
    border-color: var(--red-500);
    background: linear-gradient(135deg, var(--red-50), var(--surface-card));
}

.preview-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.125rem;
}

.preview-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.preview-category {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
}

.preview-category label {
    font-weight: 600;
    font-size: 1rem;
}

.preview-scores {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.preview-score {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
}

.preview-score i {
    font-size: 1.5rem;
    color: var(--primary-color);
}

.preview-score-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.preview-score-label {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    font-weight: 600;
}

.preview-score-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
}

.preview-score-text {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
}

/* Section Card */
.section-card {
    border-left: 4px solid var(--primary-color);
}

.section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
}

.section-title-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.125rem;
}

.dimensions-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* Dimension Field */
.dimension-field {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.dimension-label {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.dimension-value-badge {
    background: var(--primary-color);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 700;
}

.dimension-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.dimension-option {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem;
    background: var(--surface-50);
    border: 2px solid var(--surface-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.dimension-option:hover {
    background: var(--surface-100);
    border-color: var(--primary-color);
    transform: translateX(4px);
}

.dimension-option--selected {
    background: var(--primary-50);
    border-color: var(--primary-color);
    box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2);
}

.option-radio {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface-card);
    border: 2px solid var(--surface-border);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.dimension-option--selected .option-radio {
    background: var(--primary-color);
    border-color: var(--primary-color);
}

.option-number {
    font-weight: 700;
    font-size: 1rem;
    color: var(--text-color-secondary);
}

.dimension-option--selected .option-number {
    color: white;
}

.option-description {
    flex: 1;
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--text-color);
}

/* Form Actions */
.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid var(--surface-border);
    position: sticky;
    bottom: 0;
    background: var(--surface-ground);
    padding-bottom: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
    .preview-card {
        position: relative;
        top: 0;
    }

    .preview-scores {
        grid-template-columns: 1fr;
    }

    .form-actions {
        flex-direction: column;
    }

    .form-actions button {
        width: 100%;
    }

    .dimension-option {
        padding: 0.75rem;
    }

    .option-radio {
        width: 28px;
        height: 28px;
    }

    .option-description {
        font-size: 0.8125rem;
    }
}
</style>
