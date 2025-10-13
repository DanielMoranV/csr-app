<script setup>
import { computed, defineEmits, defineProps, ref } from 'vue';

const props = defineProps({
    details: {
        type: Array,
        required: true,
        default: () => []
    },
    selectedDate: {
        type: String,
        default: null
    },
    attentionActive: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['date-selected', 'create-new']);

const localSelectedDate = ref(props.selectedDate);

// Computed para ordenar detalles por fecha (más reciente primero)
const sortedDetails = computed(() => {
    return [...props.details].sort((a, b) => {
        return new Date(b.attention_date) - new Date(a.attention_date);
    });
});

// Computed para obtener la fecha de hoy
const today = computed(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
});

// Computed para verificar si existe detalle para hoy
const hasTodayDetail = computed(() => {
    return sortedDetails.value.some((d) => d.attention_date === today.value);
});

// Seleccionar una fecha
const selectDate = (date) => {
    localSelectedDate.value = date;
    emit('date-selected', date);
};

// Crear nuevo detalle para hoy
const createToday = () => {
    emit('create-new', today.value);
};

// Formatear fecha para mostrar
const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;

        // Verificar si es hoy
        if (dateString === today.value) {
            return 'Hoy';
        }

        // Verificar si es ayer
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (dateString === yesterday.toISOString().split('T')[0]) {
            return 'Ayer';
        }

        return date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
};

// Obtener el número de día relativo (hace cuántos días)
const getDaysAgo = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Hace 1 día';
    if (diffDays > 1) return `Hace ${diffDays} días`;
    return null;
};

// Verificar si el detalle tiene contenido
const hasContent = (detail) => {
    const fields = ['ram', 'images_exams', 'laboratory_exams', 'interconsultation', 'medical_order', 'intercurrences'];
    const scores = ['score_CUDYR', 'thrombosis_risk_score', 'bleeding_risk_score'];

    const hasTextContent = fields.some((key) => {
        const value = detail[key];
        return value !== null && value !== undefined && value !== '';
    });

    const hasScores = scores.some((key) => {
        const value = detail[key];
        return value && value > 0;
    });

    return hasTextContent || hasScores;
};

// Obtener severidad basada en contenido y fecha
const getItemSeverity = (detail) => {
    if (detail.attention_date === localSelectedDate.value) return 'primary';
    if (hasContent(detail)) return 'success';
    return 'secondary';
};
</script>

<template>
    <div class="details-timeline">
        <!-- Header con botón de crear -->
        <div class="timeline-header">
            <div class="timeline-title">
                <i class="pi pi-calendar"></i>
                <span>Registros Diarios</span>
                <Badge :value="sortedDetails.length" severity="info" />
            </div>
            <!--  <Button v-if="attentionActive && !hasTodayDetail" label="Registrar Hoy" icon="pi pi-plus" size="small" @click="createToday" severity="success" /> -->
        </div>

        <!-- Empty state -->
        <div v-if="sortedDetails.length === 0" class="timeline-empty">
            <i class="pi pi-calendar"></i>
            <span>No hay registros diarios. Haz clic en "Registrar Hoy" para crear el primero.</span>
        </div>

        <!-- Timeline -->
        <div v-else class="timeline-list">
            <div v-for="detail in sortedDetails" :key="detail.id" class="timeline-item" :class="{ 'timeline-item--selected': detail.attention_date === localSelectedDate }" @click="selectDate(detail.attention_date)">
                <!-- Indicador de fecha -->
                <div class="timeline-indicator">
                    <div class="indicator-dot" :class="`indicator-dot--${getItemSeverity(detail)}`"></div>
                    <div class="indicator-line"></div>
                </div>

                <!-- Contenido -->
                <div class="timeline-content">
                    <div class="timeline-date">
                        <span class="date-main">{{ formatDisplayDate(detail.attention_date) }}</span>
                        <span class="date-secondary">{{ getDaysAgo(detail.attention_date) }}</span>
                    </div>

                    <div class="timeline-meta">
                        <div class="meta-badges">
                            <Tag v-if="hasContent(detail)" value="Con datos" severity="success" size="small" />
                            <Tag v-else value="Sin datos" severity="secondary" size="small" />
                            <Badge v-if="detail.id" :value="`#${detail.id}`" severity="info" size="small" />
                        </div>

                        <!-- Preview de scores si existen -->
                        <div v-if="detail.score_CUDYR || detail.thrombosis_risk_score || detail.bleeding_risk_score" class="meta-scores">
                            <div v-if="detail.score_CUDYR" class="score-mini">
                                <i class="pi pi-chart-bar"></i>
                                <span>{{ detail.score_CUDYR }}</span>
                            </div>
                            <div v-if="detail.thrombosis_risk_score" class="score-mini">
                                <i class="pi pi-heart"></i>
                                <span>{{ detail.thrombosis_risk_score }}</span>
                            </div>
                            <div v-if="detail.bleeding_risk_score" class="score-mini">
                                <i class="pi pi-circle"></i>
                                <span>{{ detail.bleeding_risk_score }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Timestamp de actualización -->
                    <div v-if="detail.updated_at" class="timeline-timestamp">
                        <i class="pi pi-clock"></i>
                        <span>Actualizado: {{ new Date(detail.updated_at).toLocaleString('es-ES') }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.details-timeline {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-card);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
}

/* Header */
.timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--surface-border);
}

.timeline-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
}

.timeline-title i {
    color: var(--primary-color);
}

/* Empty state */
.timeline-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem 1rem;
    text-align: center;
    color: var(--text-color-secondary);
}

.timeline-empty i {
    font-size: 2.5rem;
    color: var(--surface-400);
}

/* Timeline list */
.timeline-list {
    display: flex;
    flex-direction: column;
    gap: 0;
}

/* Timeline item */
.timeline-item {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
    position: relative;
}

.timeline-item:hover {
    background: var(--surface-50);
}

.timeline-item--selected {
    background: var(--primary-50);
    border-left: 3px solid var(--primary-color);
}

.timeline-item--selected .timeline-content {
    padding-left: 0.5rem;
}

/* Indicator */
.timeline-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 0.25rem;
}

.indicator-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--surface-border);
    background: var(--surface-card);
    z-index: 1;
}

.indicator-dot--primary {
    background: var(--primary-color);
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-50);
}

.indicator-dot--success {
    background: var(--green-500);
    border-color: var(--green-500);
}

.indicator-dot--secondary {
    background: var(--surface-300);
    border-color: var(--surface-300);
}

.indicator-line {
    flex: 1;
    width: 2px;
    background: var(--surface-200);
    margin-top: 4px;
}

.timeline-item:last-child .indicator-line {
    display: none;
}

/* Content */
.timeline-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.timeline-date {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.date-main {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-color);
}

.date-secondary {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
}

.timeline-meta {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.meta-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.meta-scores {
    display: flex;
    gap: 0.75rem;
}

.score-mini {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

.score-mini i {
    font-size: 0.7rem;
}

.timeline-timestamp {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    color: var(--text-color-secondary);
}

.timeline-timestamp i {
    font-size: 0.65rem;
}

/* Responsive */
@media (max-width: 768px) {
    .details-timeline {
        padding: 0.75rem;
    }

    .timeline-header {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
    }

    .timeline-item {
        padding: 0.5rem;
    }

    .meta-scores {
        flex-wrap: wrap;
    }
}
</style>
