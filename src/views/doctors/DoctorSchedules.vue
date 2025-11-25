<script setup>
import ScheduleDialog from '@/components/doctors/ScheduleDialog.vue';
import QuickFillPanel from '@/components/doctors/QuickFillPanel.vue';
import BatchProgressDialog from '@/components/doctors/BatchProgressDialog.vue';
import { useDoctorSchedules } from '@/composables/useDoctorSchedules';
import { useDoctors } from '@/composables/useDoctors';
import { useMedicalSpecialties } from '@/composables/useMedicalSpecialties';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import ConfirmDialog from 'primevue/confirmdialog';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { useConfirm } from 'primevue/useconfirm';
import { computed, onMounted, ref, reactive, watch } from 'vue';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

const {
    schedules,
    isLoading,
    isSaving,
    medicalShifts,
    fetchSchedules,
    fetchMedicalShifts,
    createSchedule,
    createScheduleBatch,
    updateSchedule,
    deleteSchedule,
    confirmSchedule,
    cancelSchedule,
    completeSchedule,
    setDoctorFilter,
    setStartDateFilter,
    setEndDateFilter,
    clearFilters
} = useDoctorSchedules();

const { doctors, fetchDoctors } = useDoctors();
const { specialties: medicalSpecialties, fetchSpecialties } = useMedicalSpecialties();

const confirm = useConfirm();

// Estado de diálogos
const scheduleDialogVisible = ref(false);
const selectedSchedule = ref(null);
const isEditingSchedule = ref(false);

// Filters
const specialtyFilter = ref(null);
const doctorFilter = ref(null);
const monthFilter = ref(null);

// Quick Fill Mode
const quickFillMode = ref(false);
const quickFillConfig = reactive({
    shiftId: null,
    category: 'ambulatory',
    status: 'pending',
    isPaymentPayroll: true,
    notes: ''
});
const selectedDays = ref([]); // Structure: { date, hasConflict, doctorId, doctorName, shiftIds: [], shiftDisplay }
const batchProgressVisible = ref(false);
const batchResults = ref({
    successful: [],
    failed: [],
    total: 0
});
const isSendingBatch = ref(false);

// Computed property for filtered doctors based on selected specialty
const filteredDoctors = computed(() => {
    if (!specialtyFilter.value) {
        return doctors.value;
    }
    
    // Filter doctors that have the selected specialty in their specialties array
    return doctors.value.filter(doctor => {
        // Check if doctor has specialties array
        if (!doctor.specialties || !Array.isArray(doctor.specialties)) {
            return false;
        }
        
        // Check if any specialty in the array matches the selected specialty
        return doctor.specialties.some(specialty => specialty.id === specialtyFilter.value);
    });
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

    await Promise.all([fetchSchedules(), fetchDoctors(), fetchMedicalShifts(), fetchSpecialties()]);
});

// Schedule Handlers
const openNewSchedule = () => {
    selectedSchedule.value = null;
    isEditingSchedule.value = true;
    scheduleDialogVisible.value = true;
};

const editSchedule = (schedule) => {
    selectedSchedule.value = { ...schedule };
    isEditingSchedule.value = true;
    scheduleDialogVisible.value = true;
};

const handleSaveSchedule = async (scheduleData) => {
    try {
        if (selectedSchedule.value?.id) {
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
};

const handleDoctorFilter = (value) => {
    doctorFilter.value = value;
    setDoctorFilter(value);
};

const handleMonthFilter = (value) => {
    monthFilter.value = value;
};

const handleClearFilters = () => {
    specialtyFilter.value = null;
    doctorFilter.value = null;
    monthFilter.value = null;
    clearFilters();
};

const hasActiveFilters = computed(() => {
    return specialtyFilter.value || doctorFilter.value || monthFilter.value;
});

// Helper Functions for Shift Display
const getShiftAbbreviation = (shiftDescription) => {
    if (!shiftDescription) return '';
    const desc = shiftDescription.toLowerCase();
    if (desc.includes('mañana') || desc.includes('morning')) return 'M';
    if (desc.includes('tarde') || desc.includes('afternoon')) return 'T';
    if (desc.includes('noche') || desc.includes('night')) return 'N';
    return null; // Custom shift
};

const getShiftDisplay = (shiftId) => {
    const shift = medicalShifts.value.find(s => s.id === shiftId);
    if (!shift) return '';
    
    const abbrev = getShiftAbbreviation(shift.description);
    if (abbrev) {
        return abbrev; // Return M, T, or N
    }
    
    // For custom shifts, return time range
    const startTime = shift.start_time?.substring(0, 5) || '';
    const endTime = shift.end_time?.substring(0, 5) || '';
    return `${startTime}-${endTime}`;
};

const getDoctorById = (doctorId) => {
    return doctors.value.find(d => d.id === doctorId);
};

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
    locale: esLocale,
    height: '600px',
    select: (arg) => {
        if (quickFillMode.value) {
            // Quick fill mode: Add day to queue
            handleQuickDateSelect(arg);
        } else {
            // Normal mode: Open dialog
            selectedSchedule.value = {
                date: arg.startStr,
                start_time: '08:00:00',
                end_time: '09:00:00',
                doctor_id: doctorFilter.value
            };
            isEditingSchedule.value = false;
            scheduleDialogVisible.value = true;
        }
    },
    eventClick: (arg) => {
        const originalSchedule = schedules.value.find(s => s.id == arg.event.id);
        if (originalSchedule) {
            editSchedule(originalSchedule);
        }
    },
    eventDrop: async (arg) => {
        const updatedScheduleData = {
            date: arg.event.startStr.split('T')[0],
            start_time: arg.event.startStr.split('T')[1]?.substring(0, 5) || '08:00',
            end_time: arg.event.endStr.split('T')[1]?.substring(0, 5) || '09:00',
            ...arg.event.extendedProps
        };
        try {
            await updateSchedule(arg.event.id, updatedScheduleData);
            fetchSchedules();
        } catch (error) {
            arg.revert();
        }
    },
    dayCellContent: (arg) => {
        // Custom day cell content to show selected days in Quick Fill mode
        const dateStr = arg.date.toISOString().split('T')[0];
        const selectedDaysForDate = selectedDays.value.filter(d => d.date === dateStr);
        
        if (selectedDaysForDate.length > 0 && quickFillMode.value) {
            // Combine all shift displays for this date
            const shiftsDisplay = selectedDaysForDate.map(d => d.shiftDisplay).join('');
            const doctorName = selectedDaysForDate[0].doctorName;
            const hasConflict = selectedDaysForDate.some(d => d.hasConflict);
            
            return {
                html: `
                    <div class="fc-daygrid-day-number">${arg.dayNumberText}</div>
                    <div class="quick-fill-indicator ${hasConflict ? 'has-conflict' : ''}">
                        <div class="doctor-name">${doctorName}</div>
                        <div class="shift-display">${shiftsDisplay}</div>
                    </div>
                `
            };
        }
        
        // Return undefined to use default rendering
        return undefined;
    },
    events: computed(() => {
        return schedules.value.map(schedule => ({
            id: schedule.id,
            title: `${schedule.doctor?.name} - ${schedule.medical_shift?.description}`,
            start: `${schedule.date}T${schedule.start_time}`,
            end: `${schedule.date}T${schedule.end_time}`,
            extendedProps: {
                doctor: schedule.doctor,
                medical_shift: schedule.medical_shift,
                status: schedule.status,
                category: schedule.category,
                ...schedule
            },
            color: schedule.doctor?.medical_specialty?.color || '#3788d8'
        }));
    }),
    datesSet: (dateInfo) => {
        const startDate = dateInfo.startStr.split('T')[0];
        const endDate = dateInfo.endStr.split('T')[0];
        setStartDateFilter(startDate);
        setEndDateFilter(endDate);
        fetchSchedules();
    }
});

// Quick Fill Handlers
const handleQuickDateSelect = (dateInfo) => {
    if (!doctorFilter.value) {
        confirm.require({
            message: 'Debe seleccionar un médico antes de agregar días',
            header: 'Médico Requerido',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Entendido',
            rejectLabel: null,
            rejectClass: 'hidden'
        });
        return;
    }

    if (!quickFillConfig.shiftId) {
        confirm.require({
            message: 'Debe seleccionar un turno antes de agregar días',
            header: 'Turno Requerido',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Entendido',
            rejectLabel: null,
            rejectClass: 'hidden'
        });
        return;
    }

    const dateStr = dateInfo.startStr.split('T')[0];
    
    // Check if this exact day+shift combination already exists
    const existingDayShift = selectedDays.value.find(
        d => d.date === dateStr && d.shiftIds.includes(quickFillConfig.shiftId)
    );
    
    if (existingDayShift) {
        // This exact day+shift is already selected, ignore
        return;
    }

    // Detect conflicts
    const hasConflict = detectConflict(dateStr, quickFillConfig.shiftId);
    
    // Get doctor information
    const doctor = getDoctorById(doctorFilter.value);
    const doctorName = doctor?.name || '';
    
    // Get shift display
    const shiftDisplay = getShiftDisplay(quickFillConfig.shiftId);

    selectedDays.value.push({
        date: dateStr,
        hasConflict,
        doctorId: doctorFilter.value,
        doctorName: doctorName,
        shiftIds: [quickFillConfig.shiftId],
        shiftDisplay: shiftDisplay
    });
};

const detectConflict = (date, shiftId) => {
    if (!specialtyFilter.value) return false;

    const shift = medicalShifts.value.find(s => s.id === shiftId);
    if (!shift) return false;

    return schedules.value.some(schedule => {
        if (schedule.date !== date) return false;
        
        const doctorHasSpecialty = schedule.doctor?.specialties?.some(
            specialty => specialty.id === specialtyFilter.value
        );
        
        if (!doctorHasSpecialty) return false;
        
        const scheduleStart = schedule.start_time;
        const scheduleEnd = schedule.end_time;
        const shiftStart = shift.start_time;
        const shiftEnd = shift.end_time;

        return (shiftStart < scheduleEnd && shiftEnd > scheduleStart);
    });
};

const conflicts = computed(() => {
    return selectedDays.value.filter(day => day.hasConflict).map(day => ({
        date: day.date
    }));
});

const handleRemoveDay = (date) => {
    const index = selectedDays.value.findIndex(d => d.date === date);
    if (index !== -1) {
        selectedDays.value.splice(index, 1);
    }
};

const handleClearAllDays = () => {
    selectedDays.value = [];
};

const handleUpdateQuickConfig = (newConfig) => {
    Object.assign(quickFillConfig, newConfig);
};

const handleSendBatch = async () => {
    if (selectedDays.value.length === 0) {
        return;
    }

    if (!doctorFilter.value) {
        return;
    }

    // Build schedules array - each day with multiple shifts creates multiple records
    const schedulesArray = [];
    
    for (const day of selectedDays.value) {
        // Iterate through each shift for this day
        for (const shiftId of day.shiftIds) {
            const shift = medicalShifts.value.find(s => s.id === shiftId);
            if (!shift) continue;
            
            schedulesArray.push({
                id_doctors: day.doctorId,
                id_medical_shift: shiftId,
                date: day.date,
                start_time: shift.start_time,
                end_time: shift.end_time,
                category: quickFillConfig.category,
                status: quickFillConfig.status,
                is_payment_payroll: quickFillConfig.isPaymentPayroll,
                notes: quickFillConfig.notes || null
            });
        }
    }

    try {
        isSendingBatch.value = true;
        batchProgressVisible.value = true;
        
        const results = await createScheduleBatch(schedulesArray);
        
        batchResults.value = results;
        
        // Clear selected days on success
        if (results.successful.length > 0) {
            selectedDays.value = [];
        }
    } catch (error) {
        console.error('Error sending batch:', error);
    } finally {
        isSendingBatch.value = false;
    }
};

const handleCloseBatchProgress = () => {
    batchProgressVisible.value = false;
    batchResults.value = {
        successful: [],
        failed: [],
        total: 0
    };
};

// Watch for quick fill mode changes
watch(quickFillMode, (newValue) => {
    if (!newValue) {
        selectedDays.value = [];
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

                    <div class="flex items-center gap-2">
                        <Checkbox v-model="quickFillMode" inputId="quickFillMode" binary />
                        <label for="quickFillMode" class="cursor-pointer font-semibold">
                            <i class="pi pi-bolt mr-2"></i>
                            Modo Llenado Rápido
                        </label>
                    </div>

                    <Button v-if="hasActiveFilters" label="Limpiar Filtros" icon="pi pi-filter-slash" severity="secondary" outlined @click="handleClearFilters" />
                </div>
            </div>

            <!-- Quick Fill Panel -->
            <QuickFillPanel
                v-if="quickFillMode"
                :config="quickFillConfig"
                :selectedDays="selectedDays"
                :medicalShifts="medicalShifts"
                :conflicts="conflicts"
                :disabled="isSendingBatch"
                @update:config="handleUpdateQuickConfig"
                @remove-day="handleRemoveDay"
                @clear-all="handleClearAllDays"
                @send-batch="handleSendBatch"
            />

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

        <BatchProgressDialog
            v-model:visible="batchProgressVisible"
            :results="batchResults"
            :loading="isSendingBatch"
            @close="handleCloseBatchProgress"
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
   FULLCALENDAR CUSTOMIZATION
   ============================================================================ */
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
    background-color: var(--primary-color);
    border: none;
    color: var(--primary-color-text);
    white-space: normal;
}

.fc .fc-timegrid-event {
    border-radius: var(--border-radius);
    padding: 0.25rem;
    font-size: 0.8rem;
    background-color: var(--primary-color);
    border: none;
    color: var(--primary-color-text);
}

.fc-event-title {
    font-weight: 600;
}

.fc-event-time {
    font-weight: 400;
}

/* Quick Fill Indicator Styles */
:deep(.quick-fill-indicator) {
    background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
    border: 2px solid #0ea5e9;
    border-radius: 6px;
    padding: 0.25rem;
    margin-top: 0.25rem;
    font-size: 0.7rem;
    text-align: center;
}

:deep(.quick-fill-indicator.has-conflict) {
    background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
    border-color: #fb923c;
}

:deep(.quick-fill-indicator .doctor-name) {
    font-weight: 700;
    color: #0369a1;
    font-size: 0.65rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

:deep(.quick-fill-indicator.has-conflict .doctor-name) {
    color: #9a3412;
}

:deep(.quick-fill-indicator .shift-display) {
    font-weight: 600;
    color: #0284c7;
    font-size: 0.75rem;
    margin-top: 0.125rem;
}

:deep(.quick-fill-indicator.has-conflict .shift-display) {
    color: #c2410c;
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

:global(.dark) :deep(.quick-fill-indicator) {
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(14, 165, 233, 0.3) 100%);
    border-color: #38bdf8;
}

:global(.dark) :deep(.quick-fill-indicator .doctor-name) {
    color: #7dd3fc;
}

:global(.dark) :deep(.quick-fill-indicator .shift-display) {
    color: #38bdf8;
}

:global(.dark) :deep(.quick-fill-indicator.has-conflict) {
    background: linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(251, 146, 60, 0.3) 100%);
    border-color: #fb923c;
}

:global(.dark) :deep(.quick-fill-indicator.has-conflict .doctor-name),
:global(.dark) :deep(.quick-fill-indicator.has-conflict .shift-display) {
    color: #fdba74;
}

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */
@media (max-width: 1024px) {
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
</style>
