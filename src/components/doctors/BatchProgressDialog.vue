<script setup>
import Dialog from 'primevue/dialog';
import ProgressBar from 'primevue/progressbar';
import Button from 'primevue/button';
import { computed } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    results: {
        type: Object,
        default: () => ({
            successful: [],
            failed: [],
            total: 0
        })
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:visible', 'close']);

const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const progressPercentage = computed(() => {
    if (props.results.total === 0) return 0;
    const processed = props.results.successful.length + props.results.failed.length;
    return Math.round((processed / props.results.total) * 100);
});

const isComplete = computed(() => {
    return !props.loading && props.results.total > 0;
});

const hasErrors = computed(() => {
    return props.results.failed.length > 0;
});

const successRate = computed(() => {
    if (props.results.total === 0) return 0;
    return Math.round((props.results.successful.length / props.results.total) * 100);
});

const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
};

// Group errors by error message
const groupedErrors = computed(() => {
    const groups = {};

    props.results.failed.forEach(item => {
        const errorKey = item.error || 'Error desconocido';
        if (!groups[errorKey]) {
            groups[errorKey] = {
                message: errorKey,
                count: 0,
                items: []
            };
        }
        groups[errorKey].count++;
        groups[errorKey].items.push(item);
    });

    return Object.values(groups);
});

// Get doctor name from schedule_data
const getDoctorInfo = (scheduleData) => {
    if (!scheduleData) return 'N/A';
    // The doctor info might be in different places depending on backend response
    return scheduleData.doctor_name || scheduleData.id_doctors || 'N/A';
};

// Get shift info from schedule_data
const getShiftInfo = (scheduleData) => {
    if (!scheduleData) return '';
    if (scheduleData.start_time && scheduleData.end_time) {
        return `${scheduleData.start_time.substring(0, 5)} - ${scheduleData.end_time.substring(0, 5)}`;
    }
    return '';
};

const handleClose = () => {
    emit('close');
    emit('update:visible', false);
};
</script>

<template>
    <Dialog
        v-model:visible="dialogVisible"
        header="Creación Masiva de Horarios"
        :modal="true"
        :closable="!loading"
        :closeOnEscape="!loading"
        class="w-full md:w-[600px]"
        @hide="handleClose"
    >
        <div class="batch-progress-content">
            <!-- Loading State -->
            <div v-if="loading" class="loading-section">
                <div class="loading-icon">
                    <i class="pi pi-spin pi-spinner"></i>
                </div>
                <h3 class="loading-title">Enviando Horarios...</h3>
                <p class="loading-subtitle">Por favor espere mientras se procesan los horarios</p>
                
                <ProgressBar 
                    :value="progressPercentage" 
                    class="progress-bar"
                    :showValue="false"
                />
                
                <div class="progress-stats">
                    <span class="stat-item">
                        <i class="pi pi-check-circle text-green-500"></i>
                        {{ results.successful.length }} exitosos
                    </span>
                    <span class="stat-item">
                        <i class="pi pi-times-circle text-red-500"></i>
                        {{ results.failed.length }} fallidos
                    </span>
                    <span class="stat-item">
                        <i class="pi pi-calendar"></i>
                        {{ results.total }} total
                    </span>
                </div>
            </div>

            <!-- Complete State -->
            <div v-else-if="isComplete" class="complete-section">
                <!-- Success Icon -->
                <div class="result-icon" :class="{ 'success': !hasErrors, 'warning': hasErrors }">
                    <i v-if="!hasErrors" class="pi pi-check-circle"></i>
                    <i v-else class="pi pi-exclamation-triangle"></i>
                </div>

                <!-- Summary -->
                <h3 class="result-title">
                    {{ hasErrors ? 'Proceso Completado con Errores' : '¡Proceso Completado!' }}
                </h3>
                <p class="result-subtitle">
                    {{ results.successful.length }} de {{ results.total }} horarios creados exitosamente
                </p>

                <!-- Success Rate -->
                <div class="success-rate">
                    <div class="rate-bar">
                        <div class="rate-fill" :style="{ width: successRate + '%' }"></div>
                    </div>
                    <span class="rate-text">{{ successRate }}% de éxito</span>
                </div>

                <!-- Successful Items -->
                <div v-if="results.successful.length > 0" class="results-section">
                    <h4 class="results-title">
                        <i class="pi pi-check-circle text-green-500"></i>
                        Horarios Creados ({{ results.successful.length }})
                    </h4>
                    <div class="results-list success-list">
                        <div 
                            v-for="(item, index) in results.successful" 
                            :key="'success-' + index"
                            class="result-item success-item"
                        >
                            <i class="pi pi-check"></i>
                            <span>{{ formatDate(item.date) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Failed Items -->
                <div v-if="results.failed.length > 0" class="results-section">
                    <h4 class="results-title">
                        <i class="pi pi-times-circle text-red-500"></i>
                        Horarios Fallidos ({{ results.failed.length }})
                    </h4>
                    <div class="results-list error-list">
                        <!-- Grouped by error type -->
                        <div
                            v-for="(group, groupIndex) in groupedErrors"
                            :key="'error-group-' + groupIndex"
                            class="error-group"
                        >
                            <div class="error-group-header">
                                <i class="pi pi-exclamation-circle"></i>
                                <div class="error-group-info">
                                    <span class="error-group-message">{{ group.message }}</span>
                                    <span class="error-group-count">{{ group.count }} caso(s)</span>
                                </div>
                            </div>
                            <div class="error-group-items">
                                <div
                                    v-for="(item, itemIndex) in group.items"
                                    :key="'error-item-' + itemIndex"
                                    class="error-detail-item"
                                >
                                    <i class="pi pi-calendar"></i>
                                    <div class="error-detail-content">
                                        <div class="error-detail-row">
                                            <span class="error-detail-label">Fecha:</span>
                                            <span class="error-detail-value">{{ formatDate(item.date) }}</span>
                                        </div>
                                        <div v-if="item.schedule_data" class="error-detail-row">
                                            <span class="error-detail-label">Turno:</span>
                                            <span class="error-detail-value">{{ getShiftInfo(item.schedule_data) }}</span>
                                        </div>
                                        <div v-if="item.schedule_data && item.schedule_data.id_doctors" class="error-detail-row">
                                            <span class="error-detail-label">Médico ID:</span>
                                            <span class="error-detail-value">{{ item.schedule_data.id_doctors }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="empty-section">
                <i class="pi pi-inbox empty-icon"></i>
                <p class="empty-text">No hay resultados para mostrar</p>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end">
                <Button
                    label="Cerrar"
                    icon="pi pi-times"
                    @click="handleClose"
                    :disabled="loading"
                />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
/* ============================================================================
   ANIMATIONS
   ============================================================================ */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* ============================================================================
   MAIN CONTENT
   ============================================================================ */
.batch-progress-content {
    padding: 1rem 0;
    animation: fadeIn 0.3s ease;
}

/* ============================================================================
   LOADING SECTION
   ============================================================================ */
.loading-section {
    text-align: center;
    padding: 2rem 1rem;
}

.loading-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 1.5rem;
    border-radius: 50%;
    background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
    display: flex;
    align-items: center;
    justify-content: center;
}

.loading-icon i {
    font-size: 2.5rem;
    color: #0ea5e9;
}

:global(.dark) .loading-icon {
    background: linear-gradient(135deg, #0c4a6e 0%, #075985 100%);
}

:global(.dark) .loading-icon i {
    color: #38bdf8;
}

.loading-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
}

.loading-subtitle {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    margin: 0 0 1.5rem 0;
}

.progress-bar {
    margin-bottom: 1.5rem;
}

.progress-bar :deep(.p-progressbar-value) {
    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
}

.progress-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
}

.stat-item i {
    font-size: 1.125rem;
}

/* ============================================================================
   COMPLETE SECTION
   ============================================================================ */
.complete-section {
    padding: 1rem 0;
}

.result-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 1.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.5s ease;
}

.result-icon.success {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
}

.result-icon.success i {
    font-size: 2.5rem;
    color: #10b981;
}

.result-icon.warning {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.result-icon.warning i {
    font-size: 2.5rem;
    color: #f59e0b;
}

:global(.dark) .result-icon.success {
    background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
}

:global(.dark) .result-icon.success i {
    color: #34d399;
}

:global(.dark) .result-icon.warning {
    background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
}

:global(.dark) .result-icon.warning i {
    color: #fbbf24;
}

.result-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
    text-align: center;
}

.result-subtitle {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    margin: 0 0 1.5rem 0;
    text-align: center;
}

/* ============================================================================
   SUCCESS RATE
   ============================================================================ */
.success-rate {
    margin-bottom: 2rem;
}

.rate-bar {
    height: 8px;
    background: var(--surface-border);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.rate-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
    transition: width 0.5s ease;
}

.rate-text {
    display: block;
    text-align: center;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color-secondary);
}

/* ============================================================================
   RESULTS SECTIONS
   ============================================================================ */
.results-section {
    margin-bottom: 1.5rem;
}

.results-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 1rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.results-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    padding: 0.5rem;
}

.result-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: 6px;
    margin-bottom: 0.5rem;
    animation: slideIn 0.3s ease;
    transition: background 0.2s ease;
}

.result-item:last-child {
    margin-bottom: 0;
}

.result-item:hover {
    background: var(--surface-hover);
}

.success-item {
    border-left: 3px solid #10b981;
}

.success-item i {
    color: #10b981;
    font-weight: 700;
}

.error-item {
    border-left: 3px solid #ef4444;
}

.error-item i {
    color: #ef4444;
    font-weight: 700;
}

.error-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
}

.error-date {
    font-weight: 600;
    color: var(--text-color);
}

.error-message {
    font-size: 0.813rem;
    color: var(--text-color-secondary);
}

/* ============================================================================
   ERROR GROUPS
   ============================================================================ */
.error-group {
    margin-bottom: 1rem;
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--surface-card);
}

.error-group:last-child {
    margin-bottom: 0;
}

.error-group-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border-bottom: 1px solid #fecaca;
}

:global(.dark) .error-group-header {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.15) 100%);
    border-bottom-color: rgba(239, 68, 68, 0.3);
}

.error-group-header i {
    color: #ef4444;
    font-size: 1.125rem;
    flex-shrink: 0;
}

.error-group-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
}

.error-group-message {
    font-weight: 600;
    font-size: 0.875rem;
    color: #991b1b;
    line-height: 1.4;
}

:global(.dark) .error-group-message {
    color: #fca5a5;
}

.error-group-count {
    font-size: 0.75rem;
    color: #dc2626;
    font-weight: 500;
}

:global(.dark) .error-group-count {
    color: #f87171;
}

.error-group-items {
    padding: 0.5rem;
}

.error-detail-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 6px;
    background: var(--surface-ground);
    margin-bottom: 0.5rem;
    transition: all 0.2s ease;
}

.error-detail-item:last-child {
    margin-bottom: 0;
}

.error-detail-item:hover {
    background: var(--surface-hover);
    transform: translateX(4px);
}

.error-detail-item > i {
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.2rem;
    flex-shrink: 0;
}

.error-detail-content {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
}

.error-detail-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.813rem;
}

.error-detail-label {
    font-weight: 600;
    color: var(--text-color-secondary);
    min-width: 70px;
}

.error-detail-value {
    color: var(--text-color);
    font-weight: 500;
}

/* ============================================================================
   EMPTY SECTION
   ============================================================================ */
.empty-section {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-color-secondary);
}

.empty-icon {
    font-size: 3rem;
    opacity: 0.3;
    margin-bottom: 1rem;
}

.empty-text {
    font-size: 0.875rem;
    margin: 0;
}

/* ============================================================================
   SCROLLBAR
   ============================================================================ */
.results-list::-webkit-scrollbar {
    width: 6px;
}

.results-list::-webkit-scrollbar-track {
    background: var(--surface-ground);
    border-radius: 3px;
}

.results-list::-webkit-scrollbar-thumb {
    background: var(--surface-border);
    border-radius: 3px;
}

.results-list::-webkit-scrollbar-thumb:hover {
    background: var(--text-color-secondary);
}
</style>
