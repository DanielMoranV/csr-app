<script setup>
import ScheduleDialog from '@/components/doctors/ScheduleDialog.vue';
import QuickFillPanel from '@/components/doctors/QuickFillPanel.vue';
import BatchProgressDialog from '@/components/doctors/BatchProgressDialog.vue';
import { useDoctorSchedules } from '@/composables/useDoctorSchedules';
import { useDoctors } from '@/composables/useDoctors';
import { useMedicalSpecialties } from '@/composables/useMedicalSpecialties';
import { usePdfScheduleExport } from '@/composables/usePdfScheduleExport';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';

import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, reactive, watch } from 'vue';
import { isHoliday, getHolidayInfo } from '@/data/holidays-pe';

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
    setSpecialtyFilter,
    setStartDateFilter,
    setEndDateFilter,
    clearFilters
} = useDoctorSchedules();

const { doctors, fetchDoctors } = useDoctors();
const { specialties: medicalSpecialties, fetchSpecialties } = useMedicalSpecialties();
const { generatePDF } = usePdfScheduleExport();

const confirm = useConfirm();
const toast = useToast();

// Referencia al calendario para forzar re-render
const calendarRef = ref(null);

// Estado de diálogos
const scheduleDialogVisible = ref(false);
const selectedSchedule = ref(null);
const isEditingSchedule = ref(false);
const isDeleting = ref(false);

// Filters
const specialtyFilter = ref(null);
const doctorFilter = ref(null);
const monthFilter = ref(null);
const enableDoctorFilter = ref(false); // Control if doctor filter is applied to backend

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
                isDeleting.value = true;
                await deleteSchedule(schedule.id);
                // Close the dialog on successful deletion
                scheduleDialogVisible.value = false;
                selectedSchedule.value = null;
            } catch (error) {
                // El error ya se maneja en el composable
            } finally {
                isDeleting.value = false;
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

// Note: Click handling for schedules is now done via native FullCalendar eventClick
// No manual click handler needed anymore

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
    // Set the specialty filter in the store to load schedules for all doctors of this specialty
    setSpecialtyFilter(value);
    // Refresh schedules with the new specialty filter
    fetchSchedules();
};

const handleDoctorFilter = (value) => {
    doctorFilter.value = value;
    
    // Apply doctor filter to backend only if enabled
    if (enableDoctorFilter.value && value) {
        setDoctorFilter(value);
        fetchSchedules();
    } else if (!enableDoctorFilter.value) {
        // Clear doctor filter from backend if not enabled
        setDoctorFilter(null);
        if (specialtyFilter.value) {
            fetchSchedules();
        }
    }
};

// Handle enable/disable doctor filter
const handleToggleDoctorFilter = (enabled) => {
    enableDoctorFilter.value = enabled;
    
    if (enabled && doctorFilter.value) {
        // Enable: apply doctor filter to backend
        setDoctorFilter(doctorFilter.value);
        fetchSchedules();
    } else {
        // Disable: clear doctor filter from backend, keep specialty filter
        setDoctorFilter(null);
        if (specialtyFilter.value) {
            fetchSchedules();
        }
    }
};

const handleMonthFilter = (value) => {
    monthFilter.value = value;
};

const handleClearFilters = () => {
    specialtyFilter.value = null;
    doctorFilter.value = null;
    monthFilter.value = null;
    enableDoctorFilter.value = false;
    clearFilters();
    // Refresh schedules to show all doctors
    fetchSchedules();
};

const hasActiveFilters = computed(() => {
    return specialtyFilter.value || (enableDoctorFilter.value && doctorFilter.value) || monthFilter.value;
});

// PDF Export Handler
const isExportingPDF = ref(false);

const handleExportPDF = async () => {
    if (!specialtyFilter.value) {
        toast.add({
            severity: 'warn',
            summary: 'Especialidad Requerida',
            detail: 'Debe seleccionar una especialidad antes de exportar',
            life: 3000
        });
        return;
    }

    try {
        isExportingPDF.value = true;
        
        // Get current month and year from calendar
        const calendarApi = calendarRef.value?.getApi();
        const currentDate = calendarApi?.getDate() || new Date();
        const month = currentDate.getMonth() + 1; // 0-indexed
        const year = currentDate.getFullYear();
        
        // Get selected specialty object
        const specialty = medicalSpecialties.value.find(s => s.id === specialtyFilter.value);
        
        // Generate PDF
        const fileName = generatePDF(schedules.value, specialty, month, year, medicalShifts.value);
        
        toast.add({
            severity: 'success',
            summary: 'PDF Generado',
            detail: `El archivo ${fileName} se ha descargado correctamente`,
            life: 5000
        });
    } catch (error) {
        console.error('Error al generar PDF:', error);
        toast.add({
            severity: 'error',
            summary: 'Error al Generar PDF',
            detail: error.message || 'Ocurrió un error al generar el PDF',
            life: 5000
        });
    } finally {
        isExportingPDF.value = false;
    }
};

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
        // Return letter wrapped in span with color class
        return `<span class="shift-${abbrev}">${abbrev}</span>`;
    }

    // For custom shifts, return time range
    const startTime = shift.start_time?.substring(0, 5) || '';
    const endTime = shift.end_time?.substring(0, 5) || '';
    return `${startTime}-${endTime}`;
};

const truncateDoctorName = (name, maxLength = 12) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
};

const getDoctorById = (doctorId) => {
    return doctors.value.find(d => d.id === doctorId);
};

// Create a consistent color mapping for all doctors in selectedDays
const doctorColorMap = computed(() => {
    const uniqueDoctorIds = [...new Set(selectedDays.value.map(day => day.doctorId))];
    const colorMap = {};
    uniqueDoctorIds.forEach((doctorId, index) => {
        colorMap[doctorId] = index % 6; // Cycle through 6 colors
    });
    return colorMap;
});

const groupShiftsByDoctor = (selectedDaysForDate) => {
    // Group shifts by doctor and combine their shift displays
    const grouped = {};

    selectedDaysForDate.forEach(day => {
        const key = day.doctorId;
        if (!grouped[key]) {
            grouped[key] = {
                doctorId: day.doctorId,
                doctorName: day.doctorName,
                shifts: [],
                hasConflict: false
            };
        }
        grouped[key].shifts.push(...day.shiftIds.map(id => getShiftDisplay(id)));
        grouped[key].hasConflict = grouped[key].hasConflict || day.hasConflict;
    });

    return Object.values(grouped).map(group => ({
        ...group,
        shiftsDisplay: group.shifts.join('')
    }));
};

// Helper function to force calendar re-render
const refreshCalendar = () => {
    if (calendarRef.value) {
        const calendarApi = calendarRef.value.getApi();
        if (calendarApi) {
            calendarApi.render();
        }
    }
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
    dayMaxEvents: false, // Show all events, don't limit or stack
    dayMaxEventRows: false, // Don't limit rows
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
    eventContent: (arg) => {
        // Custom event rendering to match quick-fill indicator structure
        const { extendedProps } = arg.event;
        const doctorName = extendedProps.doctor?.name || arg.event.title;
        const shiftCode = extendedProps.shiftCode || '';
        const status = extendedProps.status || 'pending';
        const isReten = extendedProps.is_payment_payroll === false;

        // Don't truncate - let CSS handle it dynamically with text-overflow: ellipsis
        // This way the name will adapt to the available space automatically

        // Status icons
        const statusIcon = status === 'pending' ? '⏳' :
                         status === 'confirmed' ? '✓' :
                         status === 'completed' ? '✓✓' :
                         status === 'cancelled' ? '✕' : '';

        // Build HTML content
        const container = document.createElement('div');
        container.className = 'calendar-event-content';

        // Doctor name div
        const nameDiv = document.createElement('div');
        nameDiv.className = 'event-doctor-name';
        nameDiv.title = doctorName; // Full name on hover
        
        // Add retén indicator BEFORE the name if applicable
        if (isReten) {
            const retenBadge = document.createElement('span');
            retenBadge.className = 'reten-badge';
            retenBadge.textContent = 'R';
            retenBadge.title = 'Turno Retén';
            nameDiv.appendChild(retenBadge);
        }
        
        // Add doctor name text
        const nameText = document.createTextNode(doctorName);
        nameDiv.appendChild(nameText);
        
        container.appendChild(nameDiv);

        // Shift display div
        if (shiftCode) {
            const shiftDiv = document.createElement('div');
            shiftDiv.className = 'event-shift-display';

            // Create the shift code span with color class
            const shiftSpan = document.createElement('span');
            shiftSpan.className = `shift-${shiftCode}`;
            shiftSpan.textContent = shiftCode;

            shiftDiv.appendChild(shiftSpan);

            // Add status icon
            if (statusIcon) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'status-icon';
                iconSpan.textContent = ` ${statusIcon}`;
                shiftDiv.appendChild(iconSpan);
            }

            container.appendChild(shiftDiv);
        }

        return { domNodes: [container] };
    },
    dayCellContent: (arg) => {
        // Always return custom HTML to ensure day numbers are always visible
        const dateStr = arg.date.toISOString().split('T')[0];
        const selectedDaysForDate = selectedDays.value.filter(d => d.date === dateStr);

        // Check if it's Sunday (0 = Sunday) or a Holiday
        const isSunday = arg.date.getDay() === 0;
        const isHol = isHoliday(dateStr);
        const isNonWorkingDay = isSunday || isHol;

        // Get holiday name if applicable
        const holidayName = isHol ? getHolidayInfo(dateStr) : null;
        const stripeTitle = isHol ? holidayName : (isSunday ? 'Domingo' : '');

        const nonWorkingDayStripe = isNonWorkingDay
            ? `<div class="sunday-stripe" title="${stripeTitle}"></div>`
            : '';

        // Build indicators HTML - ONLY for quick-fill mode
        // Existing schedules are now rendered as native FullCalendar events
        let indicatorsHtml = '';

        // Only show quick-fill indicators when in quick fill mode
        if (selectedDaysForDate.length > 0 && quickFillMode.value) {
            const groupedDoctors = groupShiftsByDoctor(selectedDaysForDate);
            const indicatorCount = groupedDoctors.length;

            indicatorsHtml = `
                <div class="quick-fill-indicators-container count-${indicatorCount}">
                    ${groupedDoctors.map((group) => {
                        const colorIndex = doctorColorMap.value[group.doctorId] || 0;
                        return `
                            <div class="quick-fill-indicator doctor-${colorIndex} ${group.hasConflict ? 'has-conflict' : ''}">
                                <div class="doctor-name" title="${group.doctorName}">${truncateDoctorName(group.doctorName, indicatorCount === 1 ? 15 : (indicatorCount === 2 ? 10 : 8))}</div>
                                <div class="shift-display">${group.shiftsDisplay}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // Always return HTML structure with day number and non-working day stripe if applicable
        return {
            html: `
                ${nonWorkingDayStripe}
                <div class="fc-daygrid-day-top">
                    <span class="fc-daygrid-day-number">${arg.dayNumberText}</span>
                </div>
                ${indicatorsHtml}
            `
        };
    },
    events: computed(() => {
        // Create a consistent color mapping for all doctors currently visible
        const visibleDoctorIds = [...new Set(schedules.value.map(s => s.id_doctors))];
        const doctorColorMapping = {};
        visibleDoctorIds.forEach((doctorId, index) => {
            doctorColorMapping[doctorId] = index % 6; // Cycle through 6 colors
        });
        
        const calendarEvents = schedules.value.map(schedule => {
            // Find the full doctor data from the doctors store to get specialty info
            const fullDoctor = doctors.value.find(d => d.id === schedule.id_doctors);
            
            // Get the first specialty's color if available
            const specialtyColor = fullDoctor?.specialties?.[0]?.color || '#3788d8';
            
            // Get consistent doctor color index
            const doctorColorIndex = doctorColorMapping[schedule.id_doctors] || 0;
            
            // Use the same date for start and end (don't extend to next day)
            const startDateTime = `${schedule.date}T${schedule.start_time}`;
            const endDateTime = `${schedule.date}T${schedule.end_time}`;
            
            // Don't truncate - let CSS handle it with text-overflow: ellipsis
            const doctorName = schedule.doctor?.name || '';

            // Build event title with shift code and color
            const shiftCode = schedule.medical_shift?.code || '';
            const shiftColorClass = shiftCode ? `shift-${shiftCode}` : '';

            return {
                id: schedule.id,
                title: doctorName, // Full name - CSS will truncate if needed
                start: startDateTime,
                end: endDateTime,
                extendedProps: {
                    doctor: schedule.doctor,
                    medical_shift: schedule.medical_shift,
                    status: schedule.status,
                    category: schedule.category,
                    fullDoctor: fullDoctor,
                    doctorColorIndex: doctorColorIndex,
                    shiftCode: shiftCode,
                    shiftColorClass: shiftColorClass,
                    ...schedule
                },
                backgroundColor: 'transparent', // Use CSS for background
                borderColor: 'transparent', // Use CSS for border
                textColor: '#1f2937', // Dark text
                // Add visual styling based on status and doctor
                classNames: [
                    `status-${schedule.status}`,
                    `doctor-color-${doctorColorIndex}`,
                    schedule.medical_shift?.crosses_midnight ? 'crosses-midnight' : '',
                    shiftColorClass
                ]
            };
        });

        console.log('📆 [Calendar Events] Eventos generados para FullCalendar:', {
            total: calendarEvents.length,
            events: calendarEvents,
            rawSchedules: schedules.value,
            doctorColorMapping: doctorColorMapping
        });

        return calendarEvents;
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

    // Force calendar re-render to show the new selection
    refreshCalendar();
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
        // Force calendar re-render to remove the visual indicator
        refreshCalendar();
    }
};

const handleClearAllDays = () => {
    selectedDays.value = [];
    // Force calendar re-render to clear all visual indicators
    refreshCalendar();
};

const handleUpdateQuickConfig = (newConfig) => {
    Object.assign(quickFillConfig, newConfig);
};

const validateDateFormat = (dateStr) => {
    // Validate YYYY-MM-DD format
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
        throw new Error(`Formato de fecha inválido: ${dateStr}. Se requiere formato YYYY-MM-DD`);
    }

    // Validate it's a valid date
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) {
        throw new Error(`Fecha inválida: ${dateStr}`);
    }

    return dateStr;
};

const handleSendBatch = async () => {
    // Validation: Check if there are selected days
    if (selectedDays.value.length === 0) {
        return;
    }

    // Validation: Check if doctor is selected
    if (!doctorFilter.value) {
        return;
    }

    // Validation: Check if shift is selected
    if (!quickFillConfig.shiftId) {
        confirm.require({
            message: 'Debe seleccionar un turno antes de enviar los horarios',
            header: 'Turno Requerido',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Entendido',
            rejectLabel: null,
            rejectClass: 'hidden'
        });
        return;
    }

    // Build schedules array - each day with multiple shifts creates multiple records
    const schedulesArray = [];

    try {
        for (const day of selectedDays.value) {
            // Validate date format
            validateDateFormat(day.date);

            // Check if the day is Sunday (0 = Sunday) or Holiday
            const dayDate = new Date(day.date + 'T00:00:00');
            const isSunday = dayDate.getDay() === 0;
            const isHol = isHoliday(day.date);
            const isNonWorkingDay = isSunday || isHol;

            // Iterate through each shift for this day
            for (const shiftId of day.shiftIds) {
                const shift = medicalShifts.value.find(s => s.id === shiftId);
                if (!shift) {
                    console.warn(`Turno con ID ${shiftId} no encontrado`);
                    continue;
                }

                // Validate time formats
                if (!shift.start_time || !shift.end_time) {
                    console.warn(`Turno ${shift.description} no tiene horarios definidos`);
                    continue;
                }

                // Determine if it's a night shift
                const shiftAbbrev = getShiftAbbreviation(shift.description);
                const isNightShift = shiftAbbrev === 'N';

                // Set is_payment_payroll to false if it's:
                // - A night shift, OR
                // - A Sunday, OR
                // - A Holiday
                const shouldIncludeInPayroll = !isNightShift && !isNonWorkingDay && quickFillConfig.isPaymentPayroll;

                schedulesArray.push({
                    id_doctors: day.doctorId,
                    id_medical_shift: shiftId,
                    date: day.date,
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                    category: quickFillConfig.category,
                    status: quickFillConfig.status,
                    is_payment_payroll: shouldIncludeInPayroll, // false for night shifts, Sundays, and Holidays
                    notes: quickFillConfig.notes || null
                });
            }
        }
    } catch (error) {
        confirm.require({
            message: error.message || 'Error al validar los datos',
            header: 'Error de Validación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Entendido',
            rejectLabel: null,
            rejectClass: 'hidden'
        });
        return;
    }

    // Validation: Check if we have schedules to send
    if (schedulesArray.length === 0) {
        confirm.require({
            message: 'No hay horarios válidos para enviar. Verifique los datos seleccionados.',
            header: 'Sin Datos Válidos',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Entendido',
            rejectLabel: null,
            rejectClass: 'hidden'
        });
        return;
    }

    try {
        isSendingBatch.value = true;
        batchProgressVisible.value = true;
        
        const results = await createScheduleBatch(schedulesArray);
        
        console.log('📊 [Batch Results] Resultados recibidos:', results);
        
        // Ensure the results have the correct structure
        batchResults.value = {
            successful: results.successful || [],
            failed: results.failed || [],
            total: results.total || schedulesArray.length,
            message: results.message || ''
        };
        
        console.log('📊 [Batch Results] Resultados procesados:', batchResults.value);
        
        // Refresh schedules to show the new ones in the calendar
        await fetchSchedules();
        
        // Clear selected days on success
        if (batchResults.value.successful.length > 0) {
            selectedDays.value = [];
            // Force calendar re-render to clear visual indicators
            refreshCalendar();
        }
    } catch (error) {
        console.error('❌ [Batch Error] Error al enviar batch:', error);
        
        // Set error results
        batchResults.value = {
            successful: [],
            failed: schedulesArray.map((schedule, index) => ({
                date: schedule.date,
                error: error.message || 'Error desconocido',
                schedule_data: schedule
            })),
            total: schedulesArray.length,
            message: 'Error al procesar los horarios'
        };
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
    // Force calendar re-render when toggling quick fill mode
    refreshCalendar();
};

// Watch for quick fill mode changes
watch(quickFillMode, (newValue) => {
    if (!newValue) {
        selectedDays.value = [];
        // Clear doctor filter when exiting quick fill mode
        doctorFilter.value = null;
        setDoctorFilter(null);
        // Refresh schedules to show all doctors
        fetchSchedules();
    }
    // Force calendar re-render when toggling quick fill mode
    refreshCalendar();
});

// Initialize data on mount
onMounted(() => {
    fetchDoctors();
    fetchMedicalShifts();
    fetchSchedules();
    fetchSpecialties();
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

                    <div class="flex flex-col gap-2 w-full">
                        <Select 
                            v-model="doctorFilter" 
                            :options="filteredDoctors" 
                            :optionLabel="(option) => option.name + (option.medical_specialty ? ` (${option.medical_specialty.name})` : '')" 
                            optionValue="id" 
                            placeholder="Filtrar por Médico" 
                            class="w-full" 
                            :disabled="!specialtyFilter"
                            @change="handleDoctorFilter($event.value)" 
                            showClear 
                            filter 
                        />
                        <div class="flex items-center gap-2" v-if="doctorFilter">
                            <Checkbox 
                                v-model="enableDoctorFilter" 
                                inputId="enableDoctorFilter" 
                                binary 
                                @update:modelValue="handleToggleDoctorFilter"
                            />
                            <label for="enableDoctorFilter" class="cursor-pointer text-sm">
                                Aplicar filtro de médico
                            </label>
                        </div>
                    </div>

                    <DatePicker v-model="monthFilter" view="month" dateFormat="mm/yy" placeholder="Filtrar por Mes" class="w-full" @update:modelValue="handleMonthFilter" showIcon showButtonBar />

                    <div class="flex items-center gap-2">
                        <Checkbox v-model="quickFillMode" inputId="quickFillMode" binary />
                        <label for="quickFillMode" class="cursor-pointer font-semibold">
                            <i class="pi pi-bolt mr-2"></i>
                            Modo Llenado Rápido
                        </label>
                    </div>

                    <Button 
                        v-if="hasActiveFilters" 
                        label="Limpiar Filtros" 
                        icon="pi pi-filter-slash" 
                        severity="secondary" 
                        outlined 
                        @click="handleClearFilters" 
                    />
                    
                    <Button 
                        label="Exportar PDF" 
                        icon="pi pi-file-pdf" 
                        severity="help" 
                        :disabled="!specialtyFilter || isExportingPDF" 
                        :loading="isExportingPDF"
                        @click="handleExportPDF" 
                    />
                </div>
            </div>

            <!-- Quick Fill Panel -->
            <QuickFillPanel
                v-if="quickFillMode"
                :config="quickFillConfig"
                :selectedDays="selectedDays"
                :medicalShifts="medicalShifts"
                :conflicts="conflicts"
                :doctorColorMap="doctorColorMap"
                :disabled="isSendingBatch"
                @update:config="handleUpdateQuickConfig"
                @remove-day="handleRemoveDay"
                @clear-all="handleClearAllDays"
                @send-batch="handleSendBatch"
            />

            <!-- FullCalendar Component -->
            <FullCalendar ref="calendarRef" :options="calendarOptions" class="mt-4" />
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

/* Sunday stripe indicator */
:deep(.sunday-stripe) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #ef4444 100%);
    background-size: 200% 100%;
    animation: stripe-shimmer 3s linear infinite;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

@keyframes stripe-shimmer {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

:global(.dark) :deep(.sunday-stripe) {
    background: linear-gradient(90deg, #f87171 0%, #ef4444 50%, #f87171 100%);
    box-shadow: 0 2px 4px rgba(248, 113, 113, 0.4);
}

/* Quick Fill Indicator Styles */
:deep(.quick-fill-indicators-container) {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.25rem;
    margin-top: 0.25rem;
    justify-content: center;
    align-items: stretch;
}

/* Adaptive sizing based on number of indicators */
:deep(.quick-fill-indicators-container.count-1 .quick-fill-indicator) {
    flex: 1 1 100%;
    max-width: 100%;
    font-size: 0.75rem;
}

:deep(.quick-fill-indicators-container.count-2 .quick-fill-indicator) {
    flex: 1 1 calc(50% - 0.125rem);
    max-width: calc(50% - 0.125rem);
    font-size: 0.7rem;
}

:deep(.quick-fill-indicators-container.count-3 .quick-fill-indicator) {
    flex: 1 1 calc(33.333% - 0.167rem);
    max-width: calc(33.333% - 0.167rem);
    font-size: 0.65rem;
}

:deep(.quick-fill-indicator) {
    border-radius: 6px;
    padding: 0.35rem 0.25rem;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 42px;
}

:deep(.quick-fill-indicator:hover) {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

/* Make existing schedules (with data-schedule-id) clickable */
:deep(.quick-fill-indicator[data-schedule-id]) {
    cursor: pointer;
}

:deep(.quick-fill-indicator[data-schedule-id]:hover) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Doctor-specific colors - vibrant and distinct */
:deep(.quick-fill-indicator.doctor-0) {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    border: 2px solid #3b82f6;
}

:deep(.quick-fill-indicator.doctor-1) {
    background: linear-gradient(135deg, #fae8ff 0%, #f0abfc 100%);
    border: 2px solid #d946ef;
}

:deep(.quick-fill-indicator.doctor-2) {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    border: 2px solid #10b981;
}

:deep(.quick-fill-indicator.doctor-3) {
    background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
    border: 2px solid #f97316;
}

:deep(.quick-fill-indicator.doctor-4) {
    background: linear-gradient(135deg, #fecdd3 0%, #fda4af 100%);
    border: 2px solid #f43f5e;
}

:deep(.quick-fill-indicator.doctor-5) {
    background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%);
    border: 2px solid #a855f7;
}

@keyframes pulse-conflict {
    0%, 100% {
        box-shadow: 0 2px 4px rgba(251, 146, 60, 0.15);
    }
    50% {
        box-shadow: 0 3px 8px rgba(251, 146, 60, 0.35);
    }
}

/* Status styles for existing schedules */
:deep(.quick-fill-indicator.status-pending) {
    opacity: 0.9;
}

:deep(.quick-fill-indicator.status-confirmed) {
    border-width: 3px;
}

:deep(.quick-fill-indicator.status-completed) {
    opacity: 0.7;
    filter: grayscale(0.3);
}

:deep(.quick-fill-indicator.status-cancelled) {
    opacity: 0.5;
    text-decoration: line-through;
    background: repeating-linear-gradient(
        45deg,
        rgba(239, 68, 68, 0.1),
        rgba(239, 68, 68, 0.1) 10px,
        rgba(239, 68, 68, 0.2) 10px,
        rgba(239, 68, 68, 0.2) 20px
    ) !important;
}

/* Make existing schedule indicators clickable */
:deep(.quick-fill-indicator[data-schedule-id]) {
    cursor: pointer;
}

:deep(.quick-fill-indicator[data-schedule-id]:hover) {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

:deep(.quick-fill-indicator .doctor-name) {
    font-weight: 800;
    font-size: 0.65rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0.2rem;
    padding: 0.15rem 0.25rem;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.08);
    letter-spacing: 0.02em;
}

/* Doctor name colors for each doctor variant */
:deep(.quick-fill-indicator.doctor-0 .doctor-name) {
    color: #1e40af;
    background: rgba(59, 130, 246, 0.15);
}

:deep(.quick-fill-indicator.doctor-1 .doctor-name) {
    color: #a21caf;
    background: rgba(217, 70, 239, 0.15);
}

:deep(.quick-fill-indicator.doctor-2 .doctor-name) {
    color: #047857;
    background: rgba(16, 185, 129, 0.15);
}

:deep(.quick-fill-indicator.doctor-3 .doctor-name) {
    color: #c2410c;
    background: rgba(249, 115, 22, 0.15);
}

:deep(.quick-fill-indicator.doctor-4 .doctor-name) {
    color: #be123c;
    background: rgba(244, 63, 94, 0.15);
}

:deep(.quick-fill-indicator.doctor-5 .doctor-name) {
    color: #7c3aed;
    background: rgba(168, 85, 247, 0.15);
}

:deep(.quick-fill-indicator.has-conflict .doctor-name) {
    color: #9a3412;
    background: rgba(154, 52, 18, 0.15);
}

:deep(.quick-fill-indicator .shift-display) {
    font-weight: 700;
    color: #0284c7;
    font-size: 0.875rem;
    letter-spacing: 0.05em;
}

/* Shift type colors */
:deep(.shift-display .shift-M) {
    color: #eab308; /* Yellow for morning */
    text-shadow: 0 1px 2px rgba(234, 179, 8, 0.3);
}

:deep(.shift-display .shift-T) {
    color: #f97316; /* Orange for afternoon */
    text-shadow: 0 1px 2px rgba(249, 115, 22, 0.3);
}

:deep(.shift-display .shift-N) {
    color: #ef4444; /* Red for night */
    text-shadow: 0 1px 2px rgba(239, 68, 68, 0.3);
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

/* Force day numbers to always be visible */
.fc .fc-daygrid-day-number,
:deep(.fc-daygrid-day-number) {
    color: var(--text-color) !important;
    font-size: 0.875rem !important;
    font-weight: 600 !important;
    display: inline-block !important;
    padding: 2px 4px !important;
}

/* Ensure day frame shows the number */
.fc .fc-daygrid-day-frame {
    position: relative;
    min-height: 100px;
}

.fc .fc-daygrid-day-top {
    display: flex !important;
    justify-content: flex-end !important;
    padding: 2px 4px !important;
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

/* Dark theme for day numbers */
:global(.dark) .fc .fc-daygrid-day-number,
:global(.dark) :deep(.fc-daygrid-day-number) {
    color: var(--text-color) !important;
}

/* Dark theme for quick fill indicators */
:global(.dark) :deep(.quick-fill-indicator.doctor-0) {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%);
    border-color: #60a5fa;
}

:global(.dark) :deep(.quick-fill-indicator.doctor-1) {
    background: linear-gradient(135deg, rgba(217, 70, 239, 0.2) 0%, rgba(217, 70, 239, 0.3) 100%);
    border-color: #e879f9;
}

:global(.dark) :deep(.quick-fill-indicator.doctor-2) {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.3) 100%);
    border-color: #34d399;
}

:global(.dark) :deep(.quick-fill-indicator.doctor-3) {
    background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.3) 100%);
    border-color: #fb923c;
}

:global(.dark) :deep(.quick-fill-indicator.doctor-4) {
    background: linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(244, 63, 94, 0.3) 100%);
    border-color: #fb7185;
}

:global(.dark) :deep(.quick-fill-indicator.doctor-5) {
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.3) 100%);
    border-color: #c084fc;
}

:global(.dark) :deep(.quick-fill-indicator:hover) {
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
}

:global(.dark) :deep(.quick-fill-indicator.doctor-0 .doctor-name) {
    color: #93c5fd;
    background: rgba(59, 130, 246, 0.25);
}

:global(.dark) :deep(.quick-fill-indicator.doctor-1 .doctor-name) {
    color: #f0abfc;
    background: rgba(217, 70, 239, 0.25);
}

:global(.dark) :deep(.quick-fill-indicator.doctor-2 .doctor-name) {
    color: #6ee7b7;
    background: rgba(16, 185, 129, 0.25);
}

:global(.dark) :deep(.quick-fill-indicator.doctor-3 .doctor-name) {
    color: #fdba74;
    background: rgba(249, 115, 22, 0.25);
}

:global(.dark) :deep(.quick-fill-indicator.doctor-4 .doctor-name) {
    color: #fda4af;
    background: rgba(244, 63, 94, 0.25);
}

:global(.dark) :deep(.quick-fill-indicator.doctor-5 .doctor-name) {
    color: #d8b4fe;
    background: rgba(168, 85, 247, 0.25);
}

:global(.dark) :deep(.quick-fill-indicator.has-conflict) {
    background: linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(251, 146, 60, 0.3) 100%);
    border-color: #fb923c;
}

@keyframes pulse-conflict-dark {
    0%, 100% {
        box-shadow: 0 2px 4px rgba(251, 146, 60, 0.25);
    }
    50% {
        box-shadow: 0 3px 8px rgba(251, 146, 60, 0.45);
    }
}

:global(.dark) :deep(.quick-fill-indicator.has-conflict) {
    animation: pulse-conflict-dark 2s ease-in-out infinite;
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

/* ============================================================================
   FULLCALENDAR DAY CELL - Horizontal Event Layout for Month View
   ============================================================================ */

/* Month view: Horizontal compact layout for multiple doctors */
:deep(.fc-dayGridMonth-view .fc-daygrid-day-events) {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: wrap !important;
    gap: 0.25rem !important;
    margin-top: 0.25rem !important;
    padding: 0 0.25rem 0.25rem 0.25rem !important;
}

:deep(.fc-dayGridMonth-view .fc-daygrid-event-harness) {
    position: relative !important;
    margin: 0 !important;
    flex: 1 1 auto !important;
    max-width: 100% !important;
    min-height: 26px !important; /* Altura reducida pero legible */
}

:deep(.fc-dayGridMonth-view .fc-daygrid-event) {
    margin: 0 !important;
    white-space: nowrap !important;
    min-height: 26px !important; /* Altura mínima para eventos */
    display: flex !important;
    align-items: center !important;
    width: 100% !important;
}

/* Week/Day views: Keep default vertical layout */
:deep(.fc-timeGridWeek-view .fc-event),
:deep(.fc-timeGridDay-view .fc-event) {
    margin-bottom: 2px !important;
}

/* Ensure day top (number) stays visible */
:deep(.fc-daygrid-day-top) {
    position: relative !important;
    z-index: 2 !important;
}

/* Day cell minimum height for better event display */
:deep(.fc-daygrid-day-frame) {
    min-height: 100px !important;
}

/* Base event styling for all views */
:deep(.fc-event) {
    border-radius: 6px !important;
    border-width: 2px !important;
    border-style: solid !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
}

:deep(.fc-event:hover) {
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

/* ============================================================================
   CALENDAR EVENT STYLING - Matching Quick Fill Indicators Exactly
   ============================================================================ */

/* Base event styling - matching quick-fill-indicator */
:deep(.fc-event) {
    border-radius: 6px !important;
    padding: 0.25rem 0.35rem !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
    transition: all 0.2s ease !important;
    cursor: pointer !important;
    border: 2px solid transparent !important;
    margin: 2px !important;
    min-height: 32px !important;
    display: flex !important;
    align-items: center !important;
}

:deep(.fc-event:hover) {
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15) !important;
}

/* Calendar event indicator container - horizontal layout for better space usage */
:deep(.calendar-event-indicator) {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 0.25rem;
}

/* Doctor name styling - horizontal layout */
:deep(.calendar-event-indicator .doctor-name) {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0; /* Allow text truncation */
}

/* Shift display styling - compact for horizontal layout */
:deep(.calendar-event-indicator .shift-display) {
    font-weight: 700;
    font-size: 0.875rem;
    letter-spacing: 0.05em;
    flex-shrink: 0;
}

/* ============================================================================
   NEW EVENT CONTENT STYLING for native FullCalendar events
   ============================================================================ */

/* Base event content styling - matching quick-fill-indicator */
:deep(.calendar-event-content) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0.25rem 0.35rem;
    gap: 0.2rem;
}

/* Month view: Horizontal compact layout */
:deep(.fc-dayGridMonth-view .calendar-event-content) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0.2rem 0.3rem;
    min-height: 22px;
    width: 100%;
}

/* Doctor name styling - Flexible truncation */
:deep(.event-doctor-name) {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.35rem;
    border-radius: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1 1 auto; /* Allow flexible growth */
    min-width: 0; /* Critical for text truncation to work */
    max-width: 100%; /* Don't exceed container */
    line-height: 1.3;
}

/* Month view: Even more compact */
:deep(.fc-dayGridMonth-view .event-doctor-name) {
    font-size: 0.65rem;
    padding: 0.1rem 0.3rem;
}

/* Shift display styling */
:deep(.event-shift-display) {
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    flex-shrink: 0; /* Don't shrink */
    flex-grow: 0; /* Don't grow */
    display: flex;
    align-items: center;
    gap: 0.15rem;
    white-space: nowrap;
}

/* Month view: More compact */
:deep(.fc-dayGridMonth-view .event-shift-display) {
    font-size: 0.7rem;
}

/* Status icon styling */
:deep(.status-icon) {
    font-size: 0.6rem;
    opacity: 0.85;
}

/* Retén badge styling */
:deep(.reten-badge) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    background-color: #dc2626;
    color: white;
    border-radius: 50%;
    font-size: 0.55rem;
    font-weight: 700;
    margin-right: 4px;
    flex-shrink: 0;
    vertical-align: middle;
}

/* Month view: Smaller badge */
:deep(.fc-dayGridMonth-view .reten-badge) {
    width: 12px;
    height: 12px;
    font-size: 0.5rem;
    margin-right: 3px;
}

/* Week and Day views: Larger, more visible badge */
:deep(.fc-timeGridWeek-view .reten-badge),
:deep(.fc-timeGridDay-view .reten-badge) {
    width: 16px;
    height: 16px;
    font-size: 0.6rem;
    margin-right: 5px;
}

/* Ensure event-doctor-name displays inline with badge */
:deep(.event-doctor-name) {
    display: flex;
    align-items: center;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.35rem;
    border-radius: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1 1 auto;
    min-width: 0;
    max-width: 100%;
    line-height: 1.3;
}

/* Week and Day views: Larger text */
:deep(.fc-timeGridWeek-view .event-doctor-name),
:deep(.fc-timeGridDay-view .event-doctor-name) {
    font-size: 0.8rem;
    padding: 0.2rem 0.4rem;
}

/* Shift type colors with background for better contrast */
:deep(.shift-display .shift-M),
:deep(.event-shift-display .shift-M) {
    color: #854d0e; /* Dark yellow/brown for better contrast */
    background: rgba(250, 204, 21, 0.3); /* Light yellow background */
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-weight: 800;
}

:deep(.shift-display .shift-T),
:deep(.event-shift-display .shift-T) {
    color: #c2410c; /* Dark orange for better contrast */
    background: rgba(251, 146, 60, 0.3); /* Light orange background */
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-weight: 800;
}

:deep(.shift-display .shift-N),
:deep(.event-shift-display .shift-N) {
    color: #b91c1c; /* Dark red for better contrast */
    background: rgba(239, 68, 68, 0.3); /* Light red background */
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-weight: 800;
}

/* Dark mode: Lighter colors for better contrast on dark backgrounds */
:global(.dark) :deep(.shift-display .shift-M),
:global(.dark) :deep(.event-shift-display .shift-M) {
    color: #fde047; /* Bright yellow */
    background: rgba(133, 77, 14, 0.4); /* Dark yellow background */
}

:global(.dark) :deep(.shift-display .shift-T),
:global(.dark) :deep(.event-shift-display .shift-T) {
    color: #fdba74; /* Bright orange */
    background: rgba(194, 65, 12, 0.4); /* Dark orange background */
}

:global(.dark) :deep(.shift-display .shift-N),
:global(.dark) :deep(.event-shift-display .shift-N) {
    color: #fca5a5; /* Bright red */
    background: rgba(185, 28, 28, 0.4); /* Dark red background */
}

/* Doctor-specific colors - exact same as quick-fill indicators */
:deep(.fc-event.doctor-color-0) {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
    border-color: #3b82f6 !important;
}

:deep(.fc-event.doctor-color-0 .doctor-name),
:deep(.fc-event.doctor-color-0 .event-doctor-name) {
    color: #1e40af;
    background: rgba(59, 130, 246, 0.15);
}

:deep(.fc-event.doctor-color-1) {
    background: linear-gradient(135deg, #fae8ff 0%, #f0abfc 100%) !important;
    border-color: #d946ef !important;
}

:deep(.fc-event.doctor-color-1 .doctor-name),
:deep(.fc-event.doctor-color-1 .event-doctor-name) {
    color: #a21caf;
    background: rgba(217, 70, 239, 0.15);
}

:deep(.fc-event.doctor-color-2) {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%) !important;
    border-color: #10b981 !important;
}

:deep(.fc-event.doctor-color-2 .doctor-name),
:deep(.fc-event.doctor-color-2 .event-doctor-name) {
    color: #047857;
    background: rgba(16, 185, 129, 0.15);
}

:deep(.fc-event.doctor-color-3) {
    background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%) !important;
    border-color: #f97316 !important;
}

:deep(.fc-event.doctor-color-3 .doctor-name),
:deep(.fc-event.doctor-color-3 .event-doctor-name) {
    color: #c2410c;
    background: rgba(249, 115, 22, 0.15);
}

:deep(.fc-event.doctor-color-4) {
    background: linear-gradient(135deg, #fecdd3 0%, #fda4af 100%) !important;
    border-color: #f43f5e !important;
}

:deep(.fc-event.doctor-color-4 .doctor-name),
:deep(.fc-event.doctor-color-4 .event-doctor-name) {
    color: #be123c;
    background: rgba(244, 63, 94, 0.15);
}

:deep(.fc-event.doctor-color-5) {
    background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%) !important;
    border-color: #a855f7 !important;
}

:deep(.fc-event.doctor-color-5 .doctor-name),
:deep(.fc-event.doctor-color-5 .event-doctor-name) {
    color: #7c3aed;
    background: rgba(168, 85, 247, 0.15);
}

/* Status overlays - keep only icons, no moon emoji */
:deep(.fc-event.status-pending)::before {
    content: '⏳';
    position: absolute;
    top: 2px;
    right: 4px;
    font-size: 0.7em;
    opacity: 0.7;
    z-index: 1;
}

:deep(.fc-event.status-confirmed) {
    border-width: 3px !important;
}

:deep(.fc-event.status-confirmed)::before {
    content: '✓';
    position: absolute;
    top: 2px;
    right: 4px;
    font-size: 0.8em;
    color: #10b981;
    font-weight: bold;
    z-index: 1;
}

:deep(.fc-event.status-completed) {
    opacity: 0.7 !important;
    filter: grayscale(0.3);
}

:deep(.fc-event.status-completed)::before {
    content: '✓✓';
    position: absolute;
    top: 2px;
    right: 4px;
    font-size: 0.7em;
    color: #6b7280;
    z-index: 1;
}

:deep(.fc-event.status-cancelled) {
    opacity: 0.5 !important;
    text-decoration: line-through !important;
    background: repeating-linear-gradient(
        45deg,
        rgba(239, 68, 68, 0.1),
        rgba(239, 68, 68, 0.1) 10px,
        rgba(239, 68, 68, 0.2) 10px,
        rgba(239, 68, 68, 0.2) 20px
    ) !important;
}

:deep(.fc-event.status-cancelled)::before {
    content: '✕';
    position: absolute;
    top: 2px;
    right: 4px;
    font-size: 0.8em;
    color: #ef4444;
    font-weight: bold;
    z-index: 1;
}

/* Make events more compact in month view */
:deep(.fc-daygrid-event) {
    margin: 1px 2px !important;
    padding: 0.25rem 0.35rem !important;
}

/* Time grid events (week/day view) */
:deep(.fc-timegrid-event) {
    padding: 0.25rem 0.35rem !important;
}

/* Dark mode adjustments */
:global(.dark) :deep(.fc-event.doctor-color-0) {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%) !important;
    border-color: #60a5fa !important;
}

:global(.dark) :deep(.fc-event.doctor-color-0 .doctor-name) {
    color: #93c5fd;
    background: rgba(96, 165, 250, 0.2);
}

:global(.dark) :deep(.fc-event.doctor-color-1) {
    background: linear-gradient(135deg, #581c87 0%, #6b21a8 100%) !important;
    border-color: #e879f9 !important;
}

:global(.dark) :deep(.fc-event.doctor-color-1 .doctor-name) {
    color: #f0abfc;
    background: rgba(232, 121, 249, 0.2);
}

:global(.dark) :deep(.fc-event.doctor-color-2) {
    background: linear-gradient(135deg, #065f46 0%, #047857 100%) !important;
    border-color: #34d399 !important;
}

:global(.dark) :deep(.fc-event.doctor-color-2 .doctor-name) {
    color: #6ee7b7;
    background: rgba(52, 211, 153, 0.2);
}

:global(.dark) :deep(.fc-event.doctor-color-3) {
    background: linear-gradient(135deg, #9a3412 0%, #c2410c 100%) !important;
    border-color: #fb923c !important;
}

:global(.dark) :deep(.fc-event.doctor-color-3 .doctor-name) {
    color: #fdba74;
    background: rgba(251, 146, 60, 0.2);
}

:global(.dark) :deep(.fc-event.doctor-color-4) {
    background: linear-gradient(135deg, #881337 0%, #9f1239 100%) !important;
    border-color: #fb7185 !important;
}

:global(.dark) :deep(.fc-event.doctor-color-4 .doctor-name) {
    color: #fda4af;
    background: rgba(251, 113, 133, 0.2);
}

:global(.dark) :deep(.fc-event.doctor-color-5) {
    background: linear-gradient(135deg, #581c87 0%, #6b21a8 100%) !important;
    border-color: #c084fc !important;
}

:global(.dark) :deep(.fc-event.doctor-color-5 .doctor-name) {
    color: #d8b4fe;
    background: rgba(192, 132, 252, 0.2);
}


</style>
