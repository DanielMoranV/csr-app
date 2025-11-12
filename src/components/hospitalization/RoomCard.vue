<script setup>
import CudyrBadge from '@/components/cudyr/CudyrBadge.vue';
import Badge from 'primevue/badge';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { computed, defineEmits, ref } from 'vue';
import BedDrawer from './BedDrawer.vue';

const props = defineProps({
    room: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['refresh-data']);

const toast = useToast();

// Función para copiar al portapapeles
const copyToClipboard = (text) => {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            toast.add({ severity: 'success', summary: 'Copiado', detail: 'Número de admisión copiado al portapapeles', life: 3000 });
        })
        .catch((err) => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo copiar el texto', life: 3000 });
        });
};

// Estado del drawer
const drawerVisible = ref(false);
const selectedBed = ref(null);

// Función para abrir el drawer con la cama seleccionada
const openBedDrawer = (bed) => {
    selectedBed.value = bed;
    drawerVisible.value = true;
};

// Manejar el evento de refresh desde el drawer
const handleRefreshData = () => {
    emit('refresh-data');
};

// Función para obtener cantidad de tareas pendientes
const getPendingTasksCount = (tasks) => {
    if (!tasks || !Array.isArray(tasks)) return 0;
    return tasks.filter((task) => task.status === 'pendiente').length;
};

const getTasksTooltip = (tasks) => {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        return 'No hay tareas asociadas';
    }
    const pendingTasksCount = getPendingTasksCount(tasks);
    if (pendingTasksCount === 0) {
        return 'Todas las tareas completadas';
    }
    return `${pendingTasksCount} de ${tasks.length} tareas pendientes`;
};

// Función para obtener el detalle más reciente (o combinado)
const getLatestDetails = (details) => {
    if (!details) return null;

    // Si es un array (nuevo formato), buscar el más reciente o combinar todos
    if (Array.isArray(details)) {
        if (details.length === 0) return null;

        // Ordenar por fecha descendente y tomar el primero
        const sorted = [...details].sort((a, b) => {
            const dateA = new Date(a.attention_date || a.created_at || 0);
            const dateB = new Date(b.attention_date || b.created_at || 0);
            return dateB - dateA;
        });

        return sorted[0];
    }

    // Si es un objeto (formato antiguo), retornarlo tal cual
    return details;
};

// Función para verificar si tiene un campo específico en los detalles
const hasDetailField = (details, field) => {
    const latestDetail = getLatestDetails(details);
    return latestDetail && latestDetail[field];
};

// Función para obtener la categoría CUDYR del detalle más reciente
const getCudyrCategory = (details) => {
    const latestDetail = getLatestDetails(details);
    return latestDetail?.cudyr_evaluation?.cudyr_category || null;
};

// Función para truncar texto
const truncateText = (text, maxLength = 16) => {
    if (!text) return '---';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

// Función para sanitizar el número de admisión (quitar ceros a la izquierda)
const sanitizeAdmissionNumber = (number) => {
    if (!number) return '---';
    // Convertir a string y quitar ceros a la izquierda
    const sanitized = String(number).replace(/^0+/, '');
    // Si después de quitar los ceros queda vacío, retornar '0'
    return sanitized || '0';
};

// Función para formatear la edad del paciente
const formatAge = (age) => {
    if (!age) return '---';
    return `${Math.floor(age)} años`;
};

// Función para obtener el ícono según el sexo
const getSexIcon = (sex) => {
    if (sex === 'M') return 'pi-mars';
    if (sex === 'F') return 'pi-venus';
    return 'pi-question';
};

// Función para obtener el label del sexo
const getSexLabel = (sex) => {
    if (sex === 'M') return 'Masculino';
    if (sex === 'F') return 'Femenino';
    return 'No especificado';
};

// Función para formatear el tipo de habitación basado en el número de camas
const formatRoomType = (beds) => {
    const count = beds.length;
    switch (count) {
        case 1:
            return 'Personal';
        case 2:
            return 'Doble';
        case 3:
            return 'Triple';
        case 4:
            return 'Cuádruple';
        default:
            return count > 4 ? 'Múltiple' : 'Sin camas';
    }
};

// Función para obtener el ícono del tipo de habitación basado en el número de camas
const getRoomTypeIcon = (beds) => {
    const count = beds.length;
    if (count === 1) {
        return 'pi-user';
    }
    if (count > 1) {
        return 'pi-users';
    }
    return 'pi-home';
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

// Función para formatear fecha de reserva
const formatReservationDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
        return 'Hace unos minutos';
    } else if (diffHours < 24) {
        return `Hace ${diffHours}h`;
    } else if (diffDays === 1) {
        return 'Hace 1 día';
    } else if (diffDays < 7) {
        return `Hace ${diffDays} días`;
    } else {
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short'
        });
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

// Función para verificar si una cama tiene tareas vencidas
const hasOverdueTasks = (bed) => {
    if (!bed.attention) return false;
    const attention = bed.attention;
    if (!attention.tasks || !Array.isArray(attention.tasks)) return false;

    return attention.tasks.some((task) => task.status === 'pendiente' && task.alert_status === 'vencida');
};

// Función para verificar si una cama tiene tareas por vencer
const hasNearingDueTasks = (bed) => {
    if (!bed.attention) return false;
    const attention = bed.attention;
    if (!attention.tasks || !Array.isArray(attention.tasks)) return false;

    return attention.tasks.some((task) => task.status === 'pendiente' && task.alert_status === 'por_vencer');
};

// Función para verificar si una cama tiene tareas pendientes (sin alert_status o normal)
const hasPendingTasks = (bed) => {
    if (!bed.attention) return false;
    const attention = bed.attention;
    if (!attention.tasks || !Array.isArray(attention.tasks)) return false;

    return attention.tasks.some((task) => task.status === 'pendiente' && (!task.alert_status || task.alert_status === 'normal'));
};
</script>

<template>
    <div class="room-card" :class="{ 'room-card--alert': hasAlerts }">
        <!-- Room Header -->
        <div class="room-card__header">
            <!-- First row: Room info -->
            <div class="flex justify-content-between align-items-center mb-2">
                <div class="flex align-items-center gap-2">
                    <i class="pi pi-home text-xl text-primary"></i>
                    <h3 class="m-0 text-lg font-bold">{{ room.room_number }}</h3>
                    <div v-if="room.beds && room.beds.length > 0" class="room-type-badge-inline">
                        <i :class="`pi ${getRoomTypeIcon(room.beds)}`"></i>
                        <span>{{ formatRoomType(room.beds) }}</span>
                    </div>
                </div>
            </div>

            <!-- Second row: Compact stats in single horizontal line -->
            <div class="room-stats-horizontal">
                <div class="stat-item-compact">
                    <span class="stat-value-compact">{{ roomStats.occupiedBeds }}/{{ roomStats.totalBeds }}</span>
                    <span class="stat-label-compact">Ocupadas</span>
                </div>
                <span class="stat-separator">•</span>
                <div class="stat-item-compact">
                    <span class="stat-value-compact text-green-500">{{ roomStats.freeBeds }}</span>
                    <span class="stat-label-compact">Libres</span>
                </div>
                <template v-if="totalPendingTasks > 0">
                    <span class="stat-separator">•</span>
                    <div class="stat-item-compact stat-item-alert">
                        <i class="pi pi-exclamation-triangle text-red-500"></i>
                        <span class="stat-value-compact text-red-500">{{ totalPendingTasks }}</span>
                        <span class="stat-label-compact">Tareas Pend.</span>
                    </div>
                </template>
            </div>
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
                        'bed-indicator--occupied-male': bed.status === 'occupied' && bed.attention?.patient?.sex === 'M',
                        'bed-indicator--occupied-female': bed.status === 'occupied' && bed.attention?.patient?.sex === 'F',
                        'bed-indicator--reserved': (bed.status === 'reserved' || bed.status === 'reservada' || bed.is_reserved) && bed.status !== 'occupied',
                        'bed-indicator--free': (bed.status === 'free' || bed.status === 'disponible') && !bed.is_reserved && bed.status !== 'occupied' && bed.status !== 'reserved' && bed.status !== 'reservada',
                        'bed-indicator--alert': bed.attention && bed.status === 'occupied' && !bed.attention.discharge_date && !bed.attention.exit_date,
                        'bed-indicator--overdue': hasOverdueTasks(bed),
                        'bed-indicator--nearing-due': !hasOverdueTasks(bed) && hasNearingDueTasks(bed),
                        'bed-indicator--pending': !hasOverdueTasks(bed) && !hasNearingDueTasks(bed) && hasPendingTasks(bed)
                    }"
                    @click="openBedDrawer(bed)"
                >
                    <!-- Triángulo de advertencia para tareas por vencer -->
                    <div v-if="!hasOverdueTasks(bed) && hasNearingDueTasks(bed)" class="warning-triangle">
                        <i class="pi pi-exclamation-triangle"></i>
                    </div>
                    <!-- Cama Ocupada - Vista Expandida -->
                    <div v-if="bed.status === 'occupied' && bed.attention" class="bed-content bed-content--occupied">
                        <!-- Header de la cama -->
                        <div class="bed-header">
                            <div class="bed-header-left">
                                <span class="bed-number">{{ bed.bed_number }}</span>
                                <small class="entry-time">
                                    <i class="pi pi-clock mr-1"></i>
                                    {{ getDaysInHospital(bed.attention.entry_date) }}
                                </small>
                            </div>
                            <div class="bed-alerts">
                                <i v-if="bed.notes" class="pi pi-file-edit text-info" title="Tiene notas"></i>
                                <i v-if="hasDetailField(bed.attention.details, 'ram')" class="pi pi-exclamation-circle text-warning" title="Tiene RAM registradas"></i>
                                <i v-if="!bed.attention.discharge_date && !bed.attention.exit_date" class="pi pi-exclamation-triangle text-danger" title="Sin alta/salida registrada"></i>
                                <Badge v-if="getPendingTasksCount(bed.attention.tasks)" :value="getPendingTasksCount(bed.attention.tasks)" severity="danger" size="small" v-tooltip.top="getTasksTooltip(bed.attention.tasks)" />
                            </div>
                        </div>

                        <!-- Bed Notes -->
                        <div v-if="bed.notes" class="bed-notes bed-notes--occupied">
                            <div class="bed-notes__icon">
                                <i class="pi pi-file-edit"></i>
                            </div>
                            <div class="bed-notes__content">
                                <span class="bed-notes__text">{{ bed.notes }}</span>
                            </div>
                        </div>

                        <!-- Información del paciente -->
                        <div class="patient-info">
                            <div class="patient-main-info">
                                <span class="patient-name" :title="bed.attention.patient.name">
                                    {{ truncateText(bed.attention.patient.name, 20) }}
                                </span>
                            </div>
                            <div class="doctor-name" :title="bed.attention.doctor">
                                <i class="pi pi-user-md"></i>
                                <span>{{ truncateText(bed.attention.doctor, 22) }}</span>
                            </div>
                            <div class="patient-sub-info">
                                <span class="sub-info-item" :title="`Admisión: ${bed.attention.number}`">
                                    <i class="pi pi-hashtag"></i> {{ sanitizeAdmissionNumber(bed.attention.number) }}
                                    <i class="pi pi-copy copy-icon" @click.stop="copyToClipboard(bed.attention.number)" v-tooltip.top="'Copiar número de admisión'"></i>
                                </span>
                                <span class="sub-info-item" :title="bed.attention.patient.document_number"> <i class="pi pi-id-card"></i> {{ bed.attention.patient.document_number }} </span>
                                <span class="sub-info-item" :class="{ 'sex-item--male': bed.attention.patient.sex === 'M', 'sex-item--female': bed.attention.patient.sex === 'F' }" :title="getSexLabel(bed.attention.patient.sex)">
                                    <i :class="`pi ${getSexIcon(bed.attention.patient.sex)}`"></i> {{ bed.attention.patient.sex }}
                                </span>
                                <span class="sub-info-item" title="Edad"> <i class="pi pi-calendar-plus"></i> {{ formatAge(bed.attention.patient.age) }} </span>
                            </div>
                        </div>

                        <!-- Indicadores médicos importantes -->
                        <div class="medical-indicators">
                            <CudyrBadge
                                v-if="getCudyrCategory(bed.attention.details)"
                                :category="getCudyrCategory(bed.attention.details)"
                                size="small"
                                :show-icon="true"
                                :show-label="false"
                                v-tooltip.top="`Evaluación CUDYR: ${getCudyrCategory(bed.attention.details)}`"
                            />
                            <Tag v-if="hasDetailField(bed.attention.details, 'ram')" value="RAM" severity="warn" class="indicator-tag" v-tooltip.top="getLatestDetails(bed.attention.details)?.ram || 'Reacciones Alérgicas a Medicamentos'" />
                            <Tag
                                v-if="hasDetailField(bed.attention.details, 'medical_order')"
                                value="Órdenes"
                                severity="info"
                                class="indicator-tag"
                                v-tooltip.top="getLatestDetails(bed.attention.details)?.medical_order || 'Tiene órdenes médicas registradas'"
                            />
                            <Tag
                                v-if="hasDetailField(bed.attention.details, 'interconsultation')"
                                value="Interconsulta"
                                severity="secondary"
                                class="indicator-tag"
                                v-tooltip.top="getLatestDetails(bed.attention.details)?.interconsultation || 'Tiene interconsultas registradas'"
                            />
                            <Tag
                                v-if="hasDetailField(bed.attention.details, 'laboratory_exams')"
                                value="Lab"
                                severity="success"
                                class="indicator-tag"
                                v-tooltip.top="getLatestDetails(bed.attention.details)?.laboratory_exams || 'Tiene exámenes de laboratorio registrados'"
                            />
                            <Tag
                                v-if="hasDetailField(bed.attention.details, 'images_exams')"
                                value="Imágenes"
                                severity="info"
                                class="indicator-tag"
                                v-tooltip.top="getLatestDetails(bed.attention.details)?.images_exams || 'Tiene exámenes de imágenes registrados'"
                            />
                        </div>
                    </div>

                    <!-- Cama Reservada (Minimalist) -->
                    <div v-else-if="bed.is_reserved || bed.status === 'reserved' || bed.status === 'reservada'" class="bed-content bed-content--reserved-minimal">
                        <div class="bed-header">
                            <div class="bed-header-left">
                                <span class="bed-number">{{ bed.bed_number }}</span>
                            </div>
                            <div class="bed-alerts">
                                <i v-if="bed.notes || bed.reservation?.notes" class="pi pi-file-edit text-info" title="Tiene notas"></i>
                            </div>
                        </div>

                        <div class="reservation-info-minimal">
                            <div class="reservation-status-minimal">
                                <i class="pi pi-bookmark-fill"></i>
                                <span>Reservada</span>
                            </div>

                            <div v-if="bed.reservation?.reserved_by" class="reservation-detail-minimal">
                                <i class="pi pi-user"></i>
                                <span>{{ bed.reservation.reserved_by.name }}</span>
                            </div>

                            <div v-if="bed.reservation?.created_at" class="reservation-detail-minimal">
                                <i class="pi pi-clock"></i>
                                <span>{{ formatReservationDate(bed.reservation.created_at) }}</span>
                            </div>
                        </div>

                        <!-- Combined Notes -->
                        <div v-if="bed.notes || bed.reservation?.notes" class="bed-notes-minimal">
                            <p v-if="bed.reservation?.notes" class="note-item">
                                <strong class="note-label">Reserva:</strong>
                                <span class="note-text">{{ bed.reservation.notes }}</span>
                            </p>
                            <p v-if="bed.notes" class="note-item">
                                <strong class="note-label">Cama:</strong>
                                <span class="note-text">{{ bed.notes }}</span>
                            </p>
                        </div>
                    </div>

                    <!-- Cama Libre - Vista Simple -->
                    <div v-else class="bed-content bed-content--free">
                        <div class="bed-header-simple">
                            <div class="bed-header-simple-content">
                                <span class="bed-number">{{ bed.bed_number }}</span>
                                <i v-if="bed.notes" class="pi pi-file-edit text-info bed-note-indicator" title="Tiene notas"></i>
                            </div>
                        </div>
                        <div class="free-indicator">
                            <i class="pi pi-check-circle"></i>
                            <span>Disponible</span>
                        </div>
                        <!-- Bed Notes -->
                        <div v-if="bed.notes" class="bed-notes bed-notes--free">
                            <div class="bed-notes__icon">
                                <i class="pi pi-file-edit"></i>
                            </div>
                            <div class="bed-notes__content">
                                <span class="bed-notes__text">{{ bed.notes }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Drawer para gestión de la cama seleccionada -->
        <BedDrawer v-model:visible="drawerVisible" :bed="selectedBed" @refresh-data="handleRefreshData" />
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

/* Room Type Badge - Inline version */
.room-type-badge-inline {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    font-weight: 500;
    background: var(--surface-100);
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
}

.room-type-badge-inline i {
    font-size: 0.65rem;
}

/* Compact Horizontal Stats */
.room-stats-horizontal {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.5rem 0;
}

.stat-item-compact {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.stat-item-alert {
    background: var(--red-50);
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    border: 1px solid var(--red-200);
    animation: alert-pulse 2s infinite;
}

@keyframes alert-pulse {
    0%,
    100% {
        background: var(--red-50);
    }
    50% {
        background: var(--red-100);
    }
}

.stat-item-alert i {
    font-size: 0.875rem;
    animation: shake 3s infinite;
}

@keyframes shake {
    0%,
    90%,
    100% {
        transform: rotate(0deg);
    }
    92%,
    96% {
        transform: rotate(-10deg);
    }
    94%,
    98% {
        transform: rotate(10deg);
    }
}

.stat-value-compact {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-color);
}

.stat-label-compact {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    font-weight: 500;
}

.stat-separator {
    color: var(--text-color-secondary);
    font-size: 0.7rem;
    opacity: 0.5;
}

.stat-tag-compact {
    font-size: 0.75rem !important;
    padding: 0.25rem 0.5rem !important;
}

/* Occupancy Info (legacy - can be removed if not used elsewhere) */
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
    gap: 0.375rem;
    align-items: start;
    justify-content: start;
}

.bed-indicator {
    border-radius: 10px;
    position: relative;
    transition: all 0.2s ease;
    cursor: pointer;
    border: 1px solid #e2e8f0;
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
    border: 1px solid #67e8f9;
    color: #0e7490;
}

.bed-indicator--occupied:hover {
    background-color: #cffafe;
    border-color: #22d3ee;
}

/* Diferenciación por sexo del paciente - solo clases para mantener compatibilidad */
.bed-indicator--occupied-male {
    background-color: #ecfeff;
    border: 1px solid #67e8f9;
    color: #0e7490;
}

.bed-indicator--occupied-male:hover {
    background-color: #cffafe;
    border-color: #22d3ee;
}

.bed-indicator--occupied-female {
    background-color: #ecfeff;
    border: 1px solid #67e8f9;
    color: #0e7490;
}

.bed-indicator--occupied-female:hover {
    background-color: #cffafe;
    border-color: #22d3ee;
}

/* Estilos para tareas vencidas - Parpadeo rojo - DEBE IR DESPUÉS DE OCCUPIED */
.bed-indicator--overdue {
    animation: overdue-blink 1.5s ease-in-out infinite !important;
    border: 2px solid hsl(0, 70%, 50%) !important;
    position: relative;
    background: hsl(0, 80%, 90%) !important;
}

/* Estilos para tareas pendientes - Parpadeo naranja - DEBE IR DESPUÉS DE OCCUPIED */
.bed-indicator--pending {
    animation: pending-blink 2s ease-in-out infinite !important;
    border: 2px solid hsl(30, 90%, 50%) !important;
    position: relative;
    background: hsl(30, 90%, 85%) !important;
}

.bed-indicator--reserved {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 1px solid #fbbf24;
    color: #92400e;
}

.bed-indicator--reserved:hover {
    background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
    border-color: #f59e0b;
}

.bed-indicator--free {
    background-color: transparent;
    border: 1px solid #e2e8f0;
    color: #15803d;
}

.bed-indicator--free:hover {
    background-color: #f8fafc;
    border-color: #cbd5e1;
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

/* Keyframes para tareas vencidas */
@keyframes overdue-blink {
    0%,
    100% {
        background: hsl(0, 80%, 90%) !important;
        border-color: hsl(0, 70%, 50%);
        box-shadow:
            0 0 0 0 hsla(0, 70%, 50%, 0.7),
            0 4px 12px hsla(0, 70%, 50%, 0.3);
    }
    50% {
        background: hsl(0, 85%, 65%) !important;
        border-color: hsl(0, 75%, 40%);
        box-shadow:
            0 0 0 12px hsla(0, 70%, 50%, 0),
            0 8px 20px hsla(0, 70%, 50%, 0.5);
    }
}

/* Keyframes para tareas pendientes */
@keyframes pending-blink {
    0%,
    100% {
        background: hsl(30, 90%, 85%) !important;
        border-color: hsl(30, 90%, 50%);
        box-shadow:
            0 0 0 0 hsla(30, 90%, 50%, 0.6),
            0 4px 12px hsla(30, 90%, 50%, 0.2);
    }
    50% {
        background: hsl(30, 95%, 65%) !important;
        border-color: hsl(30, 95%, 45%);
        box-shadow:
            0 0 0 10px hsla(30, 90%, 50%, 0),
            0 6px 16px hsla(30, 90%, 50%, 0.4);
    }
}

/* Keyframes para modo oscuro - tareas vencidas */
@keyframes overdue-blink-dark {
    0%,
    100% {
        background: hsl(0, 60%, 35%) !important;
        border-color: hsl(0, 70%, 60%);
        box-shadow:
            0 0 0 0 hsla(0, 70%, 60%, 0.7),
            0 4px 12px hsla(0, 70%, 60%, 0.3);
    }
    50% {
        background: hsl(0, 70%, 50%) !important;
        border-color: hsl(0, 80%, 70%);
        box-shadow:
            0 0 0 12px hsla(0, 70%, 60%, 0),
            0 8px 20px hsla(0, 70%, 60%, 0.5);
    }
}

/* Keyframes para modo oscuro - tareas pendientes */
@keyframes pending-blink-dark {
    0%,
    100% {
        background: hsl(35, 85%, 40%) !important;
        border-color: hsl(35, 90%, 65%);
        box-shadow:
            0 0 0 0 hsla(35, 90%, 65%, 0.6),
            0 4px 12px hsla(35, 90%, 65%, 0.2);
    }
    50% {
        background: hsl(35, 90%, 55%) !important;
        border-color: hsl(35, 95%, 75%);
        box-shadow:
            0 0 0 10px hsla(35, 90%, 65%, 0),
            0 6px 16px hsla(35, 90%, 65%, 0.4);
    }
}

/* Modo oscuro para tareas vencidas */
.app-dark .bed-indicator--overdue {
    animation: overdue-blink-dark 1.5s ease-in-out infinite !important;
    background: hsl(0, 60%, 35%) !important;
    border-color: hsl(0, 70%, 60%) !important;
}

/* Modo oscuro para tareas pendientes */
.app-dark .bed-indicator--pending {
    animation: pending-blink-dark 2s ease-in-out infinite !important;
    background: hsl(35, 85%, 40%) !important;
    border-color: hsl(35, 90%, 65%) !important;
}

/* Estilos para tareas por vencer */
.bed-indicator--nearing-due {
    position: relative;
}

/* Triángulo de advertencia amarillo */
.warning-triangle {
    position: absolute;
    top: -2px;
    right: -2px;
    z-index: 10;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #78350f;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0 8px 0 0;
    clip-path: polygon(0 0, 100% 0, 100% 100%);
    box-shadow: 0 2px 8px rgba(251, 191, 36, 0.5);
    animation: warning-pulse 2s ease-in-out infinite;
}

.warning-triangle i {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 0.75rem;
    font-weight: bold;
    animation: warning-shake 3s ease-in-out infinite;
}

@keyframes warning-pulse {
    0%,
    100% {
        opacity: 1;
        filter: brightness(1);
    }
    50% {
        opacity: 0.85;
        filter: brightness(1.1);
    }
}

@keyframes warning-shake {
    0%,
    90%,
    100% {
        transform: rotate(0deg);
    }
    92%,
    96% {
        transform: rotate(-8deg);
    }
    94%,
    98% {
        transform: rotate(8deg);
    }
}

/* Bed Content Styles */
.bed-content {
    padding: 0.5rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
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
    margin-bottom: 0.25rem;
}

.bed-header-left {
    display: flex;
    align-items: center;
    gap: 0.375rem;
}

.bed-header-simple {
    text-align: center;
    margin-bottom: 0.25rem;
}

.bed-header-simple-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.bed-note-indicator {
    font-size: 0.875rem;
    animation: note-pulse 2s infinite;
}

@keyframes note-pulse {
    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.15);
        opacity: 0.8;
    }
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

.text-red-500 {
    color: var(--red-500) !important;
}

.text-orange {
    color: var(--orange-600) !important;
}

.text-info {
    color: var(--blue-600) !important;
}

/* Patient Information */
.patient-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-bottom: 0.25rem;
}

.patient-main-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.25rem;
}

.patient-name {
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--text-color);
    line-height: 1.3;
}

.doctor-name {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-style: italic;
    margin-top: -2px;
}

.patient-sub-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2px 8px;
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    margin-top: 4px;
}

.sub-info-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sex-item--male {
    color: #2563eb;
    font-weight: 600;
}

.sex-item--female {
    color: #db2777;
    font-weight: 600;
}

.copy-icon {
    cursor: pointer;
    margin-left: 0.5rem;
    color: var(--primary-color);
    font-size: 0.8rem;
}

.copy-icon:hover {
    color: var(--primary-600);
}

.sex-icon {
    font-weight: bold;
}

.sex-icon--m {
    color: #2563eb;
}

.sex-icon--f {
    color: #db2777;
}

/* Modo oscuro - Mejorar contraste de información de paciente */
.app-dark .patient-name {
    color: #ffffff !important;
}

.app-dark .doctor-name {
    color: #d1d5db !important;
}

.app-dark .doctor-name i {
    color: #d1d5db !important;
}

.app-dark .patient-sub-info {
    color: #d1d5db !important;
}

.app-dark .sub-info-item {
    color: #d1d5db !important;
}

.app-dark .sub-info-item i {
    color: #d1d5db !important;
}

.app-dark .sex-item--male {
    color: #60a5fa !important;
}

.app-dark .sex-item--female {
    color: #f472b6 !important;
}

.app-dark .sex-icon--m {
    color: #60a5fa !important;
}

.app-dark .sex-icon--f {
    color: #f472b6 !important;
}

.app-dark .entry-time {
    color: #d1d5db !important;
    background: rgba(0, 0, 0, 0.3) !important;
}

.app-dark .copy-icon {
    color: #60a5fa !important;
}

.app-dark .copy-icon:hover {
    color: #93c5fd !important;
}

/* Modo oscuro - Ajustar hover de las tarjetas de habitación */
.app-dark .room-card:hover {
    background: var(--surface-800);
    border-color: #60a5fa;
    box-shadow: 0 4px 16px rgba(96, 165, 250, 0.2);
}

/* Modo oscuro - Ajustar hover de los indicadores de cama */
.app-dark .bed-indicator:hover {
    background: var(--surface-700) !important;
    box-shadow: 0 4px 12px rgba(96, 165, 250, 0.25);
    transform: translateY(-2px);
}

/* Modo oscuro - Hover para camas ocupadas */
.app-dark .bed-indicator--occupied:hover {
    background-color: rgba(6, 182, 212, 0.2) !important;
    border-color: #22d3ee;
}

/* Modo oscuro - Hover para camas reservadas */
.app-dark .bed-indicator--reserved:hover {
    background: linear-gradient(135deg, hsl(45, 50%, 30%) 0%, hsl(45, 55%, 35%) 100%) !important;
    border-color: #fbbf24;
}

/* Modo oscuro - Hover para camas libres */
.app-dark .bed-indicator--free:hover {
    background-color: rgba(34, 197, 94, 0.1) !important;
    border-color: #22c55e;
}

/* Medical Indicators */
.medical-indicators {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
    margin-bottom: 0.25rem;
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
    gap: 0.25rem;
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

/* Bed Notes - Mejorado */
.bed-notes {
    padding: 0.4rem 0.5rem;
    border-radius: 8px;
    margin-top: 0.25rem;
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    position: relative;
    animation: note-appear 0.3s ease;
    transition: all 0.25s ease;
    cursor: help;
    border: 2px solid transparent;
}

@keyframes note-appear {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.bed-notes:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.bed-notes__icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    transition: all 0.2s ease;
}

.bed-notes:hover .bed-notes__icon {
    transform: rotate(-5deg) scale(1.1);
}

.bed-notes__content {
    flex: 1;
    display: flex;
    align-items: center;
}

.bed-notes__text {
    font-size: 0.7rem;
    line-height: 1.4;
    word-break: break-word;
    font-weight: 500;
}

/* Notas en camas ocupadas */
.bed-notes--occupied {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    border-color: #60a5fa;
    box-shadow: 0 3px 8px rgba(59, 130, 246, 0.25);
}

.bed-notes--occupied .bed-notes__icon {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}

.bed-notes--occupied .bed-notes__label {
    color: #1e40af;
}

.bed-notes--occupied .bed-notes__text {
    color: #1e3a8a;
}

.bed-notes--occupied:hover {
    background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%);
    border-color: #3b82f6;
}

/* Notas en camas libres */
.bed-notes--free {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    border-color: #34d399;
    box-shadow: 0 3px 8px rgba(16, 185, 129, 0.25);
}

.bed-notes--free .bed-notes__icon {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
}

.bed-notes--free .bed-notes__label {
    color: #065f46;
}

.bed-notes--free .bed-notes__text {
    color: #064e3b;
}

.bed-notes--free:hover {
    background: linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%);
    border-color: #10b981;
}

/* Minimalist Reserved Bed */
.bed-content--reserved-minimal {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    justify-content: space-between;
    height: 100%;
}

.reservation-info-minimal {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 0.25rem;
}

.reservation-status-minimal {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 0.9rem;
    color: #92400e;
}

.reservation-status-minimal i {
    font-size: 1rem;
}

.reservation-detail-minimal {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.7rem;
    color: #a16207;
}

.reservation-detail-minimal i {
    font-size: 0.7rem;
}

.bed-notes-minimal {
    font-size: 0.7rem;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 6px;
    padding: 0.375rem 0.5rem;
    border-top: 2px solid #fcd34d;
}

.bed-notes-minimal .note-item {
    margin: 0;
    line-height: 1.4;
    color: #78350f;
}

.bed-notes-minimal .note-label {
    font-weight: 600;
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
        gap: 0.375rem;
    }

    .bed-indicator {
        min-height: 110px;
    }

    .medical-indicators {
        justify-content: center;
    }

    .room-stats-horizontal {
        gap: 0.375rem;
        padding: 0.375rem 0;
    }

    .stat-value-compact {
        font-size: 0.8rem;
    }

    .stat-label-compact {
        font-size: 0.65rem;
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
        gap: 0.375rem;
    }

    .bed-indicator {
        min-height: 100px;
    }

    .bed-content {
        padding: 0.5rem;
        gap: 0.25rem;
    }

    .patient-name {
        font-size: 0.8rem;
    }

    .indicator-tag {
        font-size: 0.6rem !important;
    }

    .room-stats-horizontal {
        gap: 0.25rem;
        padding: 0.25rem 0;
    }

    .stat-value-compact {
        font-size: 0.75rem;
    }

    .stat-label-compact {
        font-size: 0.625rem;
    }

    .stat-separator {
        font-size: 0.625rem;
    }

    .room-type-badge-inline {
        font-size: 0.65rem;
        padding: 0.2rem 0.4rem;
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

    .bed-notes {
        padding: 0.4rem 0.5rem;
        gap: 0.4rem;
    }

    .bed-notes__icon {
        width: 20px;
        height: 20px;
        font-size: 0.65rem;
    }

    .bed-notes__text {
        font-size: 0.65rem;
    }
}

@media (min-width: 901px) and (max-width: 1400px) {
    .bed-indicators {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.375rem;
    }

    .bed-indicator {
        min-height: 115px;
    }

    .bed-notes {
        padding: 0.45rem 0.55rem;
        gap: 0.45rem;
    }

    .bed-notes__icon {
        width: 21px;
        height: 21px;
        font-size: 0.675rem;
    }

    .bed-notes__text {
        font-size: 0.675rem;
    }
}

@media (min-width: 1401px) {
    .bed-indicators {
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.375rem;
    }

    .bed-indicator {
        min-height: 120px;
    }
}
</style>
