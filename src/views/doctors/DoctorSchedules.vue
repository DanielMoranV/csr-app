<script setup>
import ScheduleDialog from '@/components/doctors/ScheduleDialog.vue';
import { useDoctorSchedules } from '@/composables/useDoctorSchedules';
import { useDoctors } from '@/composables/useDoctors';
import { useMedicalSpecialties } from '@/composables/useMedicalSpecialties'; // New import for medical specialties
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { useConfirm } from 'primevue/useconfirm';
import { computed, onMounted, ref, watch } from 'vue';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const {
    schedules,
    isLoading,
    isSaving,
    medicalShifts,
    fetchSchedules,
    fetchMedicalShifts,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    confirmSchedule,
    cancelSchedule,
    completeSchedule,
    setDoctorFilter,
    setStartDateFilter, // Added
    setEndDateFilter,   // Added
    clearFilters
} = useDoctorSchedules();

const { doctors, fetchDoctors } = useDoctors();
const { medicalSpecialties, fetchMedicalSpecialties } = useMedicalSpecialties();

const confirm = useConfirm();

// Estado de diálogos
const scheduleDialogVisible = ref(false);
const selectedSchedule = ref(null);
const isEditingSchedule = ref(false);

// Filters
const specialtyFilter = ref(null); // New ref for specialty filter
const doctorFilter = ref(null);
const monthFilter = ref(null); // New ref for month filter (Date object)

// Computed property for filtered doctors based on selected specialty
const filteredDoctors = computed(() => {
    if (!specialtyFilter.value) {
        return doctors.value;
    }
    return doctors.value.filter(doctor => doctor.medical_specialty_id === specialtyFilter.value);
});

watch(specialtyFilter, (newVal) => {
    // Clear doctorFilter if the selected specialty no longer contains the previously selected doctor
    if (doctorFilter.value && !filteredDoctors.value.some(d => d.id === doctorFilter.value)) {
        doctorFilter.value = null;
        setDoctorFilter(null);
    }
});

onMounted(async () => {
    // Initialize date filters for the current month/view
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setStartDateFilter(firstDayOfMonth.toISOString().split('T')[0]);
    setEndDateFilter(lastDayOfMonth.toISOString().split('T')[0]);

    await Promise.all([fetchSchedules(), fetchDoctors(), fetchMedicalShifts(), fetchMedicalSpecialties()]);
});

// Schedule Handlers
const openNewSchedule = () => {
    selectedSchedule.value = null;
    isEditingSchedule.value = true; // For creating new, dialog should be in creation mode
    scheduleDialogVisible.value = true;
};

const editSchedule = (schedule) => {
    selectedSchedule.value = { ...schedule };
    isEditingSchedule.value = true;
    scheduleDialogVisible.value = true;
};

const handleSaveSchedule = async (scheduleData) => {
    try {
        if (selectedSchedule.value?.id) { // Check for ID to determine if editing
            await updateSchedule(selectedSchedule.value.id, scheduleData);
        } else {
            await createSchedule(scheduleData);
        }
        scheduleDialogVisible.value = false;
        selectedSchedule.value = null;
    } catch (error) {
        // El error ya se maneja en el composable con toast
    }
};

const confirmDeleteSchedule = (schedule) => {
    const doctorName = schedule.doctor?.name || 'el médico';
    confirm.require({
        message: `¿Está seguro que desea eliminar el horario de ${doctorName} del día ${schedule.date}?`,
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await deleteSchedule(schedule.id);
            } catch (error) {
                // El error ya se maneja en el composable
            }
        }
    });
};

const handleConfirmSchedule = async (schedule) => {
    try {
        await confirmSchedule(schedule.id);
    } catch (error) {
        // El error ya se maneja en el composable
    }
};

const handleCompleteSchedule = async (schedule) => {
    try {
        await completeSchedule(schedule.id);
    } catch (error) {
        // El error ya se maneja en el composable
    }
};

const handleCancelSchedule = (schedule) => {
    confirm.require({
        message: `¿Está seguro que desea cancelar este horario?`,
        header: 'Confirmar Cancelación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, cancelar',
        rejectLabel: 'No',
        acceptClass: 'p-button-warning',
        accept: async () => {
            try {
                await cancelSchedule(schedule.id, 'Cancelado manualmente');
            } catch (error) {
                // El error ya se maneja en el composable
            }
        }
    });
};

// Filters Handlers
const handleSpecialtyFilter = (value) => {
    specialtyFilter.value = value;
    // No direct filter in composable, as it only affects doctor options
};

const handleDoctorFilter = (value) => {
    doctorFilter.value = value;
    setDoctorFilter(value); // This will still filter schedules
};

const handleMonthFilter = (value) => {
    monthFilter.value = value;
    // FullCalendar will handle the date range based on the month,
    // so we don't directly call setDateFilter here.
    // We will update the calendar's initialDate based on this.
};

const handleClearFilters = () => {
    specialtyFilter.value = null;
    doctorFilter.value = null;
    monthFilter.value = null;
    clearFilters(); // This will clear doctor and date filters in the composable
};

const hasActiveFilters = computed(() => {
    return specialtyFilter.value || doctorFilter.value || monthFilter.value;
});

// FullCalendar Options
const calendarOptions = ref({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    editable: true,
    selectable: true,
    weekends: true,
    select: (arg) => {
        // Handle date selection for new schedule
        selectedSchedule.value = {
            date: arg.startStr,
            start_time: '08:00:00', // Default start time
            end_time: '09:00:00',   // Default end time
            doctor_id: doctorFilter.value // Pre-fill with selected doctor if any
        };
        isEditingSchedule.value = false; // Indicate creation mode
        scheduleDialogVisible.value = true;
    },
    eventClick: (arg) => {
        // Handle event click for editing schedule
        // FullCalendar event object doesn't contain all original schedule properties directly.
        // We need to find the original schedule from our 'schedules' array using the event id.
        const originalSchedule = schedules.value.find(s => s.id == arg.event.id);
        if (originalSchedule) {
            editSchedule(originalSchedule);
        }
    },
    eventDrop: async (arg) => {
        // Handle event drag-and-drop to update schedule
        const updatedScheduleData = {
            date: arg.event.startStr.split('T')[0],
            start_time: arg.event.startStr.split('T')[1]?.substring(0, 5) || '08:00',
            end_time: arg.event.endStr.split('T')[1]?.substring(0, 5) || '09:00',
            // Preserve other properties from the original schedule
            ...arg.event.extendedProps
        };
        try {
            await updateSchedule(arg.event.id, updatedScheduleData);
            // Re-fetch schedules to ensure data consistency after update
            fetchSchedules();
        } catch (error) {
            // If update fails, revert the event's position on the calendar
            arg.revert();
        }
    },
    events: computed(() => {
        // Transform schedules into FullCalendar events
        return schedules.value.map(schedule => ({
            id: schedule.id,
            title: `${schedule.doctor?.name} - ${schedule.medical_shift?.description}`,
            start: `${schedule.date}T${schedule.start_time}`,
            end: `${schedule.date}T${schedule.end_time}`,
            // Add other properties as needed for styling or data
            extendedProps: {
                doctor: schedule.doctor,
                medical_shift: schedule.medical_shift,
                status: schedule.status,
                category: schedule.category,
                // Pass all original schedule properties for easy access in eventDrop/eventClick
                ...schedule
            },
            color: schedule.doctor?.medical_specialty?.color || '#3788d8' // Use specialty color or a default
        }));
    }),
    datesSet: (dateInfo) => {
        // This callback is fired when the calendar's date range changes (e.g., prev/next, view change)
        const startDate = dateInfo.startStr.split('T')[0];
        const endDate = dateInfo.endStr.split('T')[0];
        setStartDateFilter(startDate);
        setEndDateFilter(endDate);
        // We re-fetch schedules when the date range changes
        fetchSchedules();
    }
});

</script>

<template>
    <div class="schedules-view">
        <div class="main-card">
            <!-- Header Principal -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-calendar"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Horarios Médicos</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-clock mr-2"></i>
                        Gestión de horarios y turnos del personal médico
                    </p>
                </div>
                <Button label="Nuevo Horario" icon="pi pi-plus" class="add-button" @click="openNewSchedule" />
            </div>

            <!-- Filtros -->
            <div class="filters-section">
                <div class="filters-grid">
                    <Select v-model="specialtyFilter" :options="medicalSpecialties" optionLabel="name" optionValue="id" placeholder="Filtrar por Especialidad" class="w-full" @change="handleSpecialtyFilter($event.value)" showClear filter />

                    <Select v-model="doctorFilter" :options="filteredDoctors" :optionLabel="(option) => option.name + (option.medical_specialty ? ` (${option.medical_specialty.name})` : '')" optionValue="id" placeholder="Filtrar por Médico" class="w-full" @change="handleDoctorFilter($event.value)" showClear filter />

                    <DatePicker v-model="monthFilter" view="month" dateFormat="mm/yy" placeholder="Filtrar por Mes" class="w-full" @update:modelValue="handleMonthFilter" showIcon showButtonBar />

                    <Button v-if="hasActiveFilters" label="Limpiar Filtros" icon="pi pi-filter-slash" severity="secondary" outlined @click="handleClearFilters" />
                </div>
            </div>

            <!-- FullCalendar Component -->
            <FullCalendar :options="calendarOptions" class="mt-4" />
        </div>

        <!-- Diálogos -->
        <ScheduleDialog
            v-model:visible="scheduleDialogVisible"
            :schedule="selectedSchedule"
            :doctors="doctors"
            :medical-shifts="medicalShifts"
            :saving="isSaving"
            @save-schedule="handleSaveSchedule"
            @delete-schedule="confirmDeleteSchedule"
        />

        <ConfirmDialog />
    </div>
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

@keyframes shimmer {
    0%,
    100% {
        transform: translateX(-100%) rotate(45deg);
    }
    50% {
        transform: translateX(100%) rotate(45deg);
    }
}

@keyframes pulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
}

@keyframes gradientShift {
    0%,
    100% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
}

@keyframes iconPulse {
    0%,
    100% {
        transform: scale(1);
        box-shadow:
            0 4px 12px rgba(14, 165, 233, 0.3),
            0 2px 8px rgba(3, 105, 161, 0.2);
    }
    50% {
        transform: scale(1.05);
        box-shadow:
            0 6px 16px rgba(14, 165, 233, 0.4),
            0 3px 10px rgba(3, 105, 161, 0.3);
    }
}

/* ============================================================================
   MAIN CONTAINER
   ============================================================================ */
.schedules-view {
    padding: 1rem;
    animation: fadeIn 0.5s ease-out;
}

.main-card {
    background: linear-gradient(145deg, var(--surface-section), var(--surface-card));
    border: 1px solid var(--surface-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
}

.main-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #0ea5e9, #0284c7, #0ea5e9, #0369a1);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

:global(.dark) .main-card {
    background: linear-gradient(145deg, #1e293b, #0f172a);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* ============================================================================
   HEADER SECTION
   ============================================================================ */
.header-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.header-icon-wrapper {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%);
    box-shadow:
        0 8px 20px rgba(14, 165, 233, 0.3),
        0 4px 12px rgba(2, 132, 199, 0.4);
    animation: pulse 2s ease-in-out infinite;
    position: relative;
    overflow: hidden;
}

.header-icon-wrapper::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: shimmer 3s infinite;
}

.header-icon-wrapper i {
    font-size: 2rem;
    color: #ffffff;
    z-index: 1;
}

:global(.dark) .header-icon-wrapper {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%);
    box-shadow:
        0 8px 20px rgba(56, 189, 248, 0.4),
        0 4px 12px rgba(14, 165, 233, 0.5);
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.dark) .header-title {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.header-subtitle {
    color: var(--text-color-secondary);
    font-size: 1rem;
    display: flex;
    align-items: center;
    margin: 0;
}

.add-button {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%) !important;
    border: none !important;
    color: white !important;
    font-weight: 600;
    padding: 0.75rem 1.5rem !important;
    border-radius: 10px !important;
    box-shadow:
        0 4px 12px rgba(14, 165, 233, 0.3),
        0 2px 8px rgba(2, 132, 199, 0.2) !important;
    transition: all 0.3s ease !important;
    position: relative;
    overflow: hidden;
}

.add-button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.6s ease;
}

.add-button:hover::before {
    transform: translateX(100%);
}

.add-button:hover {
    transform: translateY(-2px) !important;
    box-shadow:
        0 6px 16px rgba(14, 165, 233, 0.4),
        0 3px 10px rgba(2, 132, 199, 0.3) !important;
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
}

:global(.dark) .add-button {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%) !important;
    box-shadow:
        0 4px 12px rgba(14, 165, 233, 0.4),
        0 2px 8px rgba(2, 132, 199, 0.3) !important;
}

:global(.dark) .add-button:hover {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%) !important;
    box-shadow:
        0 6px 16px rgba(14, 165, 233, 0.5),
        0 3px 10px rgba(2, 132, 199, 0.4) !important;
}

/* ============================================================================
   TABLE HEADER
   ============================================================================ */
.table-header-modern {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, var(--surface-section) 0%, var(--surface-card) 100%);
    border-bottom: 2px solid color-mix(in srgb, #0ea5e9 20%, var(--surface-border));
    gap: 1rem;
    position: relative;
}

.table-header-modern::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #0ea5e9, #0284c7, #0ea5e9);
    background-size: 200% 100%;
    animation: gradientShift 3s ease infinite;
}

:global(.dark) .table-header-modern {
    background: linear-gradient(135deg, var(--surface-section) 0%, var(--surface-card) 100%);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.header-icon-badge {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
        0 4px 12px rgba(14, 165, 233, 0.3),
        0 2px 8px rgba(2, 132, 199, 0.2);
    position: relative;
    overflow: hidden;
    animation: iconPulse 2s ease-in-out infinite;
}

.header-icon-badge::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%);
    animation: shimmer 3s ease-in-out infinite;
}

.header-icon-badge i {
    font-size: 1.5rem;
    color: white;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

:global(.dark) .header-icon-badge {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%);
    box-shadow:
        0 4px 12px rgba(56, 189, 248, 0.4),
        0 2px 8px rgba(14, 165, 233, 0.3);
}

:global(.dark) .header-icon-badge::before {
    background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
}

.header-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.header-title-small {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-color);
    letter-spacing: -0.015em;
}

.header-count {
    font-size: 0.813rem;
    font-weight: 600;
    color: #0284c7;
    background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
    padding: 0.188rem 0.625rem;
    border-radius: 6px;
    display: inline-block;
    width: fit-content;
    border: 1px solid #7dd3fc;
    box-shadow: 0 2px 4px rgba(14, 165, 233, 0.1);
}

:global(.dark) .header-count {
    color: #7dd3fc;
    background: linear-gradient(135deg, #075985 0%, #0c4a6e 100%);
    border: 1px solid #38bdf8;
}

/* ============================================================================
   FILTERS SECTION
   ============================================================================ */
.filters-section {
    padding: 1.5rem 1.5rem;
    background: var(--surface-card);
    border-bottom: 1px solid var(--surface-border);
}

:global(.dark) .filters-section {
    background: var(--surface-ground);
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    align-items: center;
}

.text-muted {
    color: var(--text-color-secondary);
}

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */
@media (max-width: 1024px) {
    .table-header-modern {
        padding: 1rem;
    }

    .filters-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .schedules-view {
        padding: 0.5rem;
    }

    .main-card {
        padding: 1rem;
        border-radius: 12px;
    }

    .header-section {
        gap: 1rem;
    }

    .header-icon-wrapper {
        width: 48px;
        height: 48px;
    }

    .header-icon-wrapper i {
        font-size: 1.5rem;
    }

    .header-title {
        font-size: 1.25rem;
    }

    .header-subtitle {
        font-size: 0.875rem;
    }

    .table-header-modern {
        padding: 1rem;
    }

    .header-icon-badge {
        width: 40px;
        height: 40px;
    }

    .header-icon-badge i {
        font-size: 1.25rem;
    }

    .header-title-small {
        font-size: 1rem;
    }
}

@media (max-width: 640px) {
    .filters-grid {
        grid-template-columns: 1fr;
    }

    .header-section {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
    }

    .header-content {
        text-align: center;
    }

    .header-subtitle {
        justify-content: center;
    }

    .add-button {
        width: 100% !important;
    }
}

:deep(.p-datatable-sm .p-datatable-tbody > tr > td) {
    padding: 0.75rem;
}

/* FullCalendar Specific Styles */
.fc {
    font-family: var(--font-family);
    border-radius: 12px;
    background-color: var(--surface-card);
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.fc .fc-toolbar-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
}

.fc .fc-button {
    background-color: var(--primary-color);
    color: var(--primary-color-text);
    border: 1px solid var(--primary-color);
    border-radius: var(--border-radius);
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    transition: all 0.2s;
}

.fc .fc-button:hover {
    background-color: var(--primary-400);
    border-color: var(--primary-400);
}

.fc .fc-button-active {
    background-color: var(--primary-darker-color);
    border-color: var(--primary-darker-color);
}

.fc .fc-daygrid-event {
    border-radius: var(--border-radius);
    padding: 0.25rem 0.5rem;
    margin-bottom: 2px;
    font-size: 0.8rem;
    background-color: var(--primary-color); /* Default event color */
    border: none;
    color: var(--primary-color-text);
    white-space: normal;
}

.fc .fc-timegrid-event {
    border-radius: var(--border-radius);
    padding: 0.25rem;
    font-size: 0.8rem;
    background-color: var(--primary-color); /* Default event color */
    border: none;
    color: var(--primary-color-text);
}

.fc-event-title {
    font-weight: 600;
}

.fc-event-time {
    font-weight: 400;
}

/* Dark theme adjustments */
:global(.dark) .fc {
    background-color: var(--surface-ground);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

:global(.dark) .fc .fc-toolbar-title {
    color: var(--surface-0);
}

:global(.dark) .fc .fc-button {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--primary-color-text);
}
:global(.dark) .fc .fc-button:hover {
    background-color: var(--primary-darker-color);
    border-color: var(--primary-darker-color);
}
:global(.dark) .fc .fc-button-active {
    background-color: var(--primary-lighter-color);
    border-color: var(--primary-lighter-color);
}

/* Day/Week headers */
.fc .fc-col-header-cell,
.fc .fc-timegrid-slot-label {
    background-color: var(--surface-hover);
    color: var(--text-color);
}

.fc .fc-daygrid-day.fc-day-today {
    background-color: var(--primary-50);
}

:global(.dark) .fc .fc-daygrid-day.fc-day-today {
    background-color: var(--surface-800);
}

.fc .fc-daygrid-day-number {
    color: var(--text-color-secondary);
}

/* Border styling for calendar cells */
.fc .fc-daygrid-body-unbalanced .fc-daygrid-day > .fc-daygrid-day-frame {
    border: 1px solid var(--surface-border);
}

.fc-theme-standard td,
.fc-theme-standard th {
    border-color: var(--surface-border);
}

.fc .fc-scrollgrid-sync-table {
    border-collapse: collapse;
}
</style>
