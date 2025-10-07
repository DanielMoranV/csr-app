<script setup>
import Badge from 'primevue/badge';
import Tag from 'primevue/tag';
import { computed, ref } from 'vue';
import BedDrawer from './BedDrawer.vue';

const props = defineProps({
    room: {
        type: Object,
        required: true
    }
});

// Estado del drawer
const drawerVisible = ref(false);
const selectedBed = ref(null);

// Función para abrir el drawer con la cama seleccionada
const openBedDrawer = (bed) => {
    selectedBed.value = bed;
    drawerVisible.value = true;
};

// Función para obtener cantidad de tareas pendientes
const getPendingTasksCount = (tasks) => {
    if (!tasks || !Array.isArray(tasks)) return 0;
    return tasks.filter((task) => task.status === 'pendiente').length;
};

// Función para truncar nombre del paciente
const truncateName = (name) => {
    if (!name) return '---';
    const maxLength = 16;
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
};

// Función para calcular días de hospitalización
const getDaysInHospital = (entryDate) => {
    if (!entryDate) return 'Sin fecha';

    const entry = new Date(entryDate);
    const now = new Date();
    const diffTime = Math.abs(now - entry);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        return diffHours < 1 ? 'Hoy' : `${diffHours}h`;
    } else if (diffDays === 1) {
        return '1 día';
    } else {
        return `${diffDays} días`;
    }
};

// Computed properties for room statistics
const roomStats = computed(() => {
    const totalBeds = props.room.beds.length;
    const occupiedBeds = props.room.beds.filter((bed) => bed.status === 'occupied').length;
    const freeBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
        totalBeds,
        occupiedBeds,
        freeBeds,
        occupancyRate
    };
});

// Get room status severity
const getRoomStatusSeverity = computed(() => {
    const rate = roomStats.value.occupancyRate;
    if (rate === 100) return 'danger';
    if (rate >= 75) return 'warn';
    if (rate >= 25) return 'info';
    return 'success';
});

// Check if room has any alerts
const hasAlerts = computed(() => {
    return props.room.beds.some((bed) => {
        if (!bed.attention) return false;
        const attentions = Array.isArray(bed.attention) ? bed.attention : [bed.attention];
        // Para datos reales, simplemente verificamos si hay atención sin salida/alta
        return attentions.some((att) => !att.discharge_date && !att.exit_date);
    });
});

// Get total pending tasks
const totalPendingTasks = computed(() => {
    let count = 0;
    props.room.beds.forEach((bed) => {
        if (bed.attention) {
            const attentions = Array.isArray(bed.attention) ? bed.attention : [bed.attention];
            attentions.forEach((att) => {
                if (att.tasks) {
                    count += att.tasks.filter((task) => task.status === 'pendiente').length;
                }
            });
        }
    });
    return count;
});
</script>

<template>
    <div class="room-card" :class="{ 'room-card--alert': hasAlerts }">
        <!-- Room Header -->
        <div class="room-card__header">
            <div class="flex align-items-center gap-2 mb-2">
                <i class="pi pi-home text-2xl text-primary"></i>
                <h3 class="m-0 text-xl font-bold">{{ room.room_number }}</h3>
                <Badge v-if="hasAlerts" value="!" severity="danger" class="ml-auto" />
            </div>

            <div class="flex justify-content-between align-items-center">
                <div class="occupancy-info">
                    <span class="occupancy-details">{{ roomStats.occupiedBeds }} ocupada{{ roomStats.occupiedBeds === 1 ? '' : 's' }}, {{ roomStats.freeBeds }} libre{{ roomStats.freeBeds === 1 ? '' : 's' }}</span>
                    <Tag :value="`${roomStats.occupancyRate}% ocupación`" :severity="getRoomStatusSeverity" class="font-semibold ml-2" />
                </div>
                <span class="text-sm text-600"> {{ roomStats.totalBeds }} {{ roomStats.totalBeds === 1 ? 'cama' : 'camas' }} </span>
            </div>
        </div>

        <!-- Tasks indicator (if any) -->
        <div v-if="totalPendingTasks > 0" class="tasks-indicator">
            <i class="pi pi-exclamation-triangle text-orange"></i>
            <span class="tasks-count">{{ totalPendingTasks }} tarea{{ totalPendingTasks === 1 ? '' : 's' }} pendiente{{ totalPendingTasks === 1 ? '' : 's' }}</span>
        </div>

        <!-- Quick Bed Status -->
        <div class="room-card__beds">
            <div class="bed-indicators">
                <div
                    v-for="bed in room.beds"
                    :key="bed.id"
                    class="bed-indicator"
                    :class="{
                        'bed-indicator--occupied': bed.status === 'occupied',
                        'bed-indicator--free': bed.status === 'free',
                        'bed-indicator--alert': bed.attention && bed.status === 'occupied' && !bed.attention.discharge_date && !bed.attention.exit_date
                    }"
                    @click="openBedDrawer(bed)"
                >
                    <!-- Cama Ocupada - Vista Expandida -->
                    <div v-if="bed.status === 'occupied' && bed.attention" class="bed-content bed-content--occupied">
                        <!-- Header de la cama -->
                        <div class="bed-header">
                            <span class="bed-number">{{ bed.bed_number }}</span>
                            <div class="bed-alerts">
                                <i v-if="bed.attention.details?.ram" class="pi pi-exclamation-circle text-warning" title="Tiene RAM registradas"></i>
                                <i v-if="!bed.attention.discharge_date && !bed.attention.exit_date" class="pi pi-exclamation-triangle text-danger" title="Sin alta/salida registrada"></i>
                                <Badge v-if="getPendingTasksCount(bed.attention.tasks)" :value="getPendingTasksCount(bed.attention.tasks)" severity="warning" size="small" title="Tareas pendientes" />
                            </div>
                        </div>

                        <!-- Información del paciente -->
                        <div class="patient-info">
                            <div class="patient-name" :title="bed.attention.patient.name">
                                {{ truncateName(bed.attention.patient.name) }}
                            </div>
                            <div class="patient-details">
                                <span class="patient-doc">{{ bed.attention.patient.document_number }}</span>
                                <Tag :value="bed.attention.number" severity="contrast" class="ml-2" />
                            </div>
                        </div>

                        <!-- Indicadores médicos importantes -->
                        <div class="medical-indicators">
                            <Tag v-if="bed.attention.details?.ram" value="RAM" severity="warn" class="indicator-tag" title="Reacciones Alérgicas a Medicamentos" />
                            <Tag v-if="bed.attention.details?.medical_order" value="Órdenes" severity="info" class="indicator-tag" />
                            <Tag v-if="bed.attention.details?.interconsultation" value="Interconsulta" severity="secondary" class="indicator-tag" />
                            <Tag v-if="bed.attention.details?.laboratory_exams" value="Lab" severity="success" class="indicator-tag" />
                            <Tag v-if="bed.attention.details?.images_exams" value="Imágenes" severity="info" class="indicator-tag" />
                        </div>

                        <!-- Footer con tiempo de estancia -->
                        <div class="bed-footer">
                            <small class="entry-time">
                                <i class="pi pi-clock mr-1"></i>
                                {{ getDaysInHospital(bed.attention.entry_date) }}
                            </small>
                        </div>
                    </div>

                    <!-- Cama Libre - Vista Simple -->
                    <div v-else class="bed-content bed-content--free">
                        <div class="bed-header-simple">
                            <span class="bed-number">{{ bed.bed_number }}</span>
                        </div>
                        <div class="free-indicator">
                            <i class="pi pi-check-circle"></i>
                            <span>Libre</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Drawer para gestión de la cama seleccionada -->
        <BedDrawer v-model:visible="drawerVisible" :bed="selectedBed" />
    </div>
</template>

<style scoped>
.room-card {
    background: linear-gradient(135deg, var(--surface-card) 0%, var(--surface-50) 100%);
    border-radius: 12px;
    border: 1px solid var(--surface-border);
    padding: 1rem;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
}

.room-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border-color: var(--primary-color);
}

.room-card--alert {
    border-color: var(--red-400);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
}

.room-card--alert::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--red-500), var(--orange-500));
}

.room-card__header {
    flex-shrink: 0;
}

/* Occupancy Info */
.occupancy-info {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.occupancy-details {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    font-weight: 500;
}

/* Tasks Indicator */
.tasks-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--orange-50);
    border: 1px solid var(--orange-200);
    border-radius: 8px;
    font-size: 0.8rem;
    color: var(--orange-700);
}

.tasks-count {
    font-weight: 600;
}

.room-card__beds {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.bed-indicators {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
    align-items: start;
    justify-content: start;
}

.bed-indicator {
    border-radius: 10px;
    position: relative;
    transition: all 0.2s ease;
    cursor: pointer;
    border: 2px solid #cbd5e1;
    overflow: hidden;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.bed-indicator:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.bed-indicator--occupied {
    background-color: #ecfeff;
    border: 2px solid #67e8f9;
    color: #0e7490;
}

.bed-indicator--occupied:hover {
    background-color: #cffafe;
    border-color: #22d3ee;
}

.bed-indicator--free {
    background-color: #f0fdf4;
    border: 2px solid #86efac;
    color: #15803d;
}

.bed-indicator--free:hover {
    background-color: #dcfce7;
    border-color: #4ade80;
}

.bed-indicator--alert {
    background: var(--orange-50);
    border-color: var(--orange-400) !important;
    animation: pulse-alert 2s infinite;
}

@keyframes pulse-alert {
    0%,
    100% {
        border-color: var(--orange-400);
        box-shadow: 0 0 0 0 rgba(251, 146, 60, 0.4);
    }
    50% {
        border-color: var(--orange-500);
        box-shadow: 0 0 0 8px rgba(251, 146, 60, 0);
    }
}

/* Bed Content Styles */
.bed-content {
    padding: 0.75rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.bed-content--occupied {
    /* The background is now inherited from .bed-indicator--occupied */
}

.bed-content--free {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}

/* Bed Header */
.bed-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.375rem;
}

.bed-header-simple {
    text-align: center;
    margin-bottom: 0.375rem;
}

.bed-number {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--text-color);
    background: var(--surface-0);
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    border: 1px solid var(--surface-200);
}

.bed-alerts {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.bed-alerts i {
    font-size: 0.75rem;
}

.text-warning {
    color: var(--yellow-600) !important;
}

.text-danger {
    color: var(--red-600) !important;
}

.text-orange {
    color: var(--orange-600) !important;
}

/* Patient Information */
.patient-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-bottom: 0.375rem;
}

.patient-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-color);
    line-height: 1.2;
}

.patient-details {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
}

.patient-doc {
    background: var(--surface-100);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-family: monospace;
}

/* Medical Indicators */
.medical-indicators {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
    margin-bottom: 0.375rem;
}

.indicator-tag {
    font-size: 0.625rem !important;
    padding: 0.125rem 0.375rem !important;
    border-radius: 4px;
}

/* Bed Footer */
.bed-footer {
    margin-top: auto;
    display: flex;
    justify-content: center;
    align-items: center;
}

.entry-time {
    color: var(--text-color-secondary);
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    background: var(--surface-100);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
}

/* Free Bed Indicator */
.free-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    color: var(--green-700);
}

.free-indicator i {
    font-size: 1.5rem;
    color: var(--green-600);
}

.free-indicator span {
    font-weight: 600;
    font-size: 0.875rem;
}

/* Responsive Adjustments */
@media (max-width: 900px) {
    .room-card {
        min-width: 100%;
        padding: 0.875rem;
        gap: 0.625rem;
    }

    .bed-indicators {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.625rem;
    }

    .bed-indicator {
        min-height: 110px;
    }

    .medical-indicators {
        justify-content: center;
    }

    .occupancy-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
    }

    .tasks-indicator {
        padding: 0.375rem 0.5rem;
        font-size: 0.75rem;
    }
}

@media (max-width: 480px) {
    .room-card {
        padding: 0.75rem;
        gap: 0.625rem;
    }

    .bed-indicators {
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }

    .bed-indicator {
        min-height: 100px;
    }

    .bed-content {
        padding: 0.625rem;
        gap: 0.3rem;
    }

    .patient-name {
        font-size: 0.8rem;
    }

    .indicator-tag {
        font-size: 0.6rem !important;
    }

    .occupancy-details {
        font-size: 0.75rem;
    }

    .tasks-indicator {
        padding: 0.375rem 0.5rem;
        font-size: 0.7rem;
    }

    .free-indicator i {
        font-size: 1.25rem;
    }
}

@media (min-width: 901px) and (max-width: 1400px) {
    .bed-indicators {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.625rem;
    }

    .bed-indicator {
        min-height: 115px;
    }
}

@media (min-width: 1401px) {
    .bed-indicators {
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.75rem;
    }

    .bed-indicator {
        min-height: 120px;
    }
}

</style>
