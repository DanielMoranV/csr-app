<template>
    <Dialog :visible="visible" @update:visible="emit('update:visible', $event)" modal :header="`Horarios de ${doctorName}`" :style="{ width: '90vw', maxWidth: '900px' }" :closable="true" @hide="handleClose">
        <div class="schedule-modal-content">
            <!-- Loading State -->
            <div v-if="isLoading" class="loading-container">
                <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
                <p>Cargando horarios...</p>
            </div>

            <!-- No Schedules State -->
            <div v-else-if="!isLoading && schedules.length === 0" class="empty-state">
                <i class="pi pi-calendar-times" style="font-size: 3rem; color: var(--text-color-secondary)"></i>
                <p class="mt-3">No hay horarios disponibles para este mes</p>
            </div>

            <!-- Calendar -->
            <div v-else class="calendar-container">
                <FullCalendar ref="calendarRef" :options="calendarOptions" />
            </div>
        </div>
    </Dialog>
</template>

<script setup>
import { doctorSchedules } from '@/api/doctorSchedules';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/vue3';
import Dialog from 'primevue/dialog';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    doctorId: {
        type: Number,
        default: null
    },
    doctorName: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['update:visible', 'schedule-click']);

const schedules = ref([]);
const isLoading = ref(false);
const calendarRef = ref(null);

// Calendar options
const calendarOptions = computed(() => ({
    plugins: [dayGridPlugin, timeGridPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
        left: 'title',
        center: '',
        right: 'prev,next'
    },
    locale: esLocale,
    height: 600,
    dayMaxEvents: false,
    events: schedules.value.map((schedule) => {
        const shift = schedule.medical_shift;
        let displayText = '';
        let shiftType = 'custom'; // default

        // Determinar si es turno estándar o personalizado
        if (shift) {
            const desc = shift.description?.toLowerCase() || '';
            if (desc.includes('mañana') || desc.includes('morning')) {
                displayText = 'M';
                shiftType = 'morning';
            } else if (desc.includes('tarde') || desc.includes('afternoon')) {
                displayText = 'T';
                shiftType = 'afternoon';
            } else if (desc.includes('noche') || desc.includes('night')) {
                displayText = 'N';
                shiftType = 'night';
            } else {
                // Turno personalizado - mostrar horas
                displayText = `${schedule.start_time?.substring(0, 5)}-${schedule.end_time?.substring(0, 5)}`;
                shiftType = 'custom';
            }
        } else {
            // Sin turno médico asignado (Personalizado puro)
            displayText = `${schedule.start_time?.substring(0, 5)}-${schedule.end_time?.substring(0, 5)}`;
            shiftType = 'custom';
        }

        return {
            id: schedule.id,
            title: displayText,
            start: `${schedule.date}T${schedule.start_time}`,
            end: `${schedule.date}T${schedule.end_time}`,
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            classNames: [`shift-${shiftType}`, `status-${schedule.status}`],
            extendedProps: {
                status: schedule.status,
                category: schedule.category,
                shift: shift,
                shiftType: shiftType,
                statusIcon: getStatusIcon(schedule.status)
            }
        };
    }),
    eventContent: (arg) => {
        const statusIcon = arg.event.extendedProps.statusIcon;

        return {
            html: `
                <div class="compact-event">
                    <span class="shift-code">${arg.event.title}</span>
                    <span class="status-icon">${statusIcon}</span>
                </div>
            `
        };
    },
    eventClick: (info) => {
        const event = info.event;
        const extendedProps = event.extendedProps;

        emit('schedule-click', {
            id: parseInt(event.id),
            date: event.start, // Date object
            doctor_id: props.doctorId,
            // Pass other relevant info if needed
            status: extendedProps.status,
            shift: extendedProps.shift
        });
    }
}));

// Fetch schedules when doctor changes
watch(
    () => props.doctorId,
    async (newDoctorId) => {
        if (newDoctorId && props.visible) {
            await fetchSchedules();
        }
    },
    { immediate: true }
);

watch(
    () => props.visible,
    async (isVisible) => {
        if (isVisible && props.doctorId) {
            await fetchSchedules();
        }
    }
);

const fetchSchedules = async () => {
    if (!props.doctorId) return;

    try {
        isLoading.value = true;

        // Get current month date range
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const startDate = firstDay.toISOString().split('T')[0];
        const endDate = lastDay.toISOString().split('T')[0];

        const response = await doctorSchedules.getAll({
            doctor_id: props.doctorId,
            start_date: startDate,
            end_date: endDate
        });

        // Handle different response formats
        if (Array.isArray(response.data)) {
            schedules.value = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
            schedules.value = response.data.data;
        } else {
            schedules.value = [];
        }
    } catch (error) {
        schedules.value = [];
    } finally {
        isLoading.value = false;
    }
};

const getStatusColor = (status) => {
    const colors = {
        pending: '#f59e0b',
        confirmed: '#10b981',
        completed: '#3b82f6',
        cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
};

const getStatusIcon = (status) => {
    const icons = {
        pending: '⏳',
        confirmed: '✓',
        completed: '✓✓',
        cancelled: '✕'
    };
    return icons[status] || '';
};

const handleClose = () => {
    emit('update:visible', false);
    schedules.value = [];
};
</script>

<style scoped>
.schedule-modal-content {
    min-height: 400px;
}

.loading-container,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: var(--text-color-secondary);
}

.calendar-container {
    padding: 0;
}

:deep(.fc) {
    font-family: inherit;
}

:deep(.fc-toolbar-title) {
    font-size: 1.25rem;
    font-weight: 600;
}

:deep(.fc-button) {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    text-transform: capitalize;
}

:deep(.fc-button:hover) {
    background-color: var(--primary-600);
    border-color: var(--primary-600);
}

:deep(.fc-event) {
    cursor: default;
    padding: 1px 3px;
    border-radius: 3px;
    font-size: 0.7rem;
    cursor: pointer; /* Change cursor to indicate interactivity */
}

/* Colores por tipo de turno */
:deep(.fc-event.shift-morning) {
    background-color: #fbbf24 !important;
    border-color: #f59e0b !important;
    color: #78350f !important;
}

:deep(.fc-event.shift-afternoon) {
    background-color: #60a5fa !important;
    border-color: #3b82f6 !important;
    color: #1e3a8a !important;
}

:deep(.fc-event.shift-night) {
    background-color: #a78bfa !important;
    border-color: #8b5cf6 !important;
    color: #4c1d95 !important;
}

:deep(.fc-event.shift-custom) {
    background-color: #34d399 !important;
    border-color: #10b981 !important;
    color: #064e3b !important;
}

.compact-event {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-weight: 600;
    line-height: 1;
}

.shift-code {
    font-size: 0.75rem;
}

.status-icon {
    font-size: 0.65rem;
}
</style>
