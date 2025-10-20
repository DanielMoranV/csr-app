<script setup>
import { computed } from 'vue';
import { CUDYR_CONSTANTS } from '@/api/cudyr';
import CudyrBadge from './CudyrBadge.vue';
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import ProgressBar from 'primevue/progressbar';

const props = defineProps({
    evaluation: {
        type: Object,
        required: true
    },
    compact: {
        type: Boolean,
        default: false
    }
});

// Computed para datos de dependencia
const dependencyData = computed(() => {
    if (!props.evaluation?.dependency) return null;
    return props.evaluation.dependency;
});

// Computed para datos de riesgo
const riskData = computed(() => {
    if (!props.evaluation?.risk) return null;
    return props.evaluation.risk;
});

// Formato de fecha
const formatDate = (dateString) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Obtener el porcentaje de un score
const getScorePercentage = (score, max) => {
    return Math.round((score / max) * 100);
};

// Obtener descripción de una dimensión
const getDimensionDescription = (dimensionKey, value, type = 'dependency') => {
    const dimensions = type === 'dependency' ? CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS : CUDYR_CONSTANTS.RISK_DIMENSIONS;

    const dimension = dimensions[dimensionKey];
    if (!dimension || !dimension.descriptions) return '';

    return dimension.descriptions[value] || '';
};

// Obtener label de una dimensión
const getDimensionLabel = (dimensionKey, type = 'dependency') => {
    const dimensions = type === 'dependency' ? CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS : CUDYR_CONSTANTS.RISK_DIMENSIONS;

    const dimension = dimensions[dimensionKey];
    return dimension?.label || dimensionKey;
};
</script>

<template>
    <div class="cudyr-evaluation-view" :class="{ 'cudyr-evaluation-view--compact': compact }">
        <!-- Header con categoría -->
        <Card v-if="!compact" class="evaluation-header">
            <template #content>
                <div class="header-content">
                    <div class="header-main">
                        <h3 class="evaluation-title">
                            <i class="pi pi-chart-bar mr-2"></i>
                            Evaluación CUDYR
                        </h3>
                        <CudyrBadge :category="evaluation.cudyr_category" size="large" />
                    </div>

                    <div class="evaluation-meta">
                        <div class="meta-item">
                            <i class="pi pi-user"></i>
                            <span>{{ evaluation.evaluated_by?.nick || 'Desconocido' }}</span>
                        </div>
                        <div class="meta-item">
                            <i class="pi pi-calendar"></i>
                            <span>{{ formatDate(evaluation.evaluated_at) }}</span>
                        </div>
                    </div>
                </div>
            </template>
        </Card>

        <!-- Vista compacta -->
        <div v-if="compact" class="compact-header">
            <CudyrBadge :category="evaluation.cudyr_category" size="small" />
            <small class="compact-date">{{ formatDate(evaluation.evaluated_at) }}</small>
        </div>

        <!-- Scores Summary -->
        <div class="scores-summary">
            <Card class="score-card score-card--dependency">
                <template #content>
                    <div class="score-content">
                        <div class="score-header">
                            <i class="pi pi-users"></i>
                            <h4>Dependencia</h4>
                        </div>
                        <div class="score-value">
                            <span class="score-number">{{ dependencyData?.total_score || 0 }}</span>
                            <span class="score-max">/18</span>
                        </div>
                        <ProgressBar :value="getScorePercentage(dependencyData?.total_score || 0, 18)" :show-value="false" class="score-progress" />
                        <p class="score-classification">
                            {{ dependencyData?.classification_text || '---' }}
                        </p>
                    </div>
                </template>
            </Card>

            <Card class="score-card score-card--risk">
                <template #content>
                    <div class="score-content">
                        <div class="score-header">
                            <i class="pi pi-exclamation-triangle"></i>
                            <h4>Riesgo</h4>
                        </div>
                        <div class="score-value">
                            <span class="score-number">{{ riskData?.total_score || 0 }}</span>
                            <span class="score-max">/24</span>
                        </div>
                        <ProgressBar :value="getScorePercentage(riskData?.total_score || 0, 24)" :show-value="false" class="score-progress" />
                        <p class="score-classification">{{ riskData?.classification_text || '---' }}</p>
                    </div>
                </template>
            </Card>
        </div>

        <!-- Dimensiones de Dependencia (solo en modo no compacto) -->
        <Card v-if="!compact && dependencyData" class="dimensions-card">
            <template #title>
                <div class="dimensions-title">
                    <i class="pi pi-list"></i>
                    <span>Dimensiones de Dependencia</span>
                </div>
            </template>
            <template #content>
                <div class="dimensions-list">
                    <div v-for="(value, key) in dependencyData.dimensions" :key="key" class="dimension-item">
                        <div class="dimension-header">
                            <span class="dimension-label">{{ getDimensionLabel(key, 'dependency') }}</span>
                            <span class="dimension-value">{{ value }}/3</span>
                        </div>
                        <p class="dimension-description">
                            {{ getDimensionDescription(key, value, 'dependency') }}
                        </p>
                        <ProgressBar :value="getScorePercentage(value, 3)" :show-value="false" class="dimension-progress" />
                    </div>
                </div>
            </template>
        </Card>

        <!-- Dimensiones de Riesgo (solo en modo no compacto) -->
        <Card v-if="!compact && riskData" class="dimensions-card">
            <template #title>
                <div class="dimensions-title">
                    <i class="pi pi-list"></i>
                    <span>Dimensiones de Riesgo</span>
                </div>
            </template>
            <template #content>
                <div class="dimensions-list">
                    <div v-for="(value, key) in riskData.dimensions" :key="key" class="dimension-item">
                        <div class="dimension-header">
                            <span class="dimension-label">{{ getDimensionLabel(key, 'risk') }}</span>
                            <span class="dimension-value">{{ value }}/3</span>
                        </div>
                        <p class="dimension-description">
                            {{ getDimensionDescription(key, value, 'risk') }}
                        </p>
                        <ProgressBar :value="getScorePercentage(value, 3)" :show-value="false" class="dimension-progress" />
                    </div>
                </div>
            </template>
        </Card>

        <!-- Notas -->
        <Card v-if="!compact && evaluation.notes" class="notes-card">
            <template #title>
                <div class="dimensions-title">
                    <i class="pi pi-file-edit"></i>
                    <span>Observaciones</span>
                </div>
            </template>
            <template #content>
                <p class="notes-text">{{ evaluation.notes }}</p>
            </template>
        </Card>
    </div>
</template>

<style scoped>
.cudyr-evaluation-view {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.cudyr-evaluation-view--compact {
    gap: 0.5rem;
}

/* Header */
.evaluation-header {
    background: linear-gradient(135deg, var(--surface-card), var(--surface-50));
}

.header-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

.evaluation-title {
    margin: 0;
    display: flex;
    align-items: center;
    font-size: 1.25rem;
    color: var(--text-color);
}

.evaluation-meta {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color-secondary);
    font-size: 0.875rem;
}

.meta-item i {
    color: var(--primary-color);
}

/* Compact Header */
.compact-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.compact-date {
    color: var(--text-color-secondary);
    font-size: 0.75rem;
}

/* Scores Summary */
.scores-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.score-card {
    border-left: 4px solid var(--primary-color);
}

.score-card--dependency {
    border-left-color: var(--blue-500);
}

.score-card--risk {
    border-left-color: var(--orange-500);
}

.score-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.score-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color-secondary);
}

.score-header i {
    font-size: 1.25rem;
}

.score-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
}

.score-value {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
}

.score-number {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-color);
}

.score-max {
    font-size: 1.25rem;
    color: var(--text-color-secondary);
}

.score-progress {
    height: 8px;
}

.score-classification {
    margin: 0;
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    text-align: center;
}

/* Dimensions */
.dimensions-card {
    border-top: 3px solid var(--primary-color);
}

.dimensions-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.125rem;
}

.dimensions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.dimension-item {
    padding: 0.75rem;
    background: var(--surface-50);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
}

.dimension-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.dimension-label {
    font-weight: 600;
    color: var(--text-color);
}

.dimension-value {
    font-weight: 700;
    color: var(--primary-color);
    font-size: 1.125rem;
}

.dimension-description {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    line-height: 1.5;
}

.dimension-progress {
    height: 6px;
}

/* Notes */
.notes-card {
    border-top: 3px solid var(--blue-500);
}

.notes-text {
    margin: 0;
    line-height: 1.6;
    color: var(--text-color);
    white-space: pre-wrap;
}

/* Responsive */
@media (max-width: 768px) {
    .scores-summary {
        grid-template-columns: 1fr;
    }

    .header-main {
        flex-direction: column;
        align-items: flex-start;
    }

    .score-number {
        font-size: 1.5rem;
    }

    .dimension-item {
        padding: 0.5rem;
    }
}
</style>
