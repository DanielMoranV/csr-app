<script setup>
import ScheduleDialog from '@/components/doctors/ScheduleDialog.vue';
import { useDoctorSchedules } from '@/composables/useDoctorSchedules';
import { useDoctors } from '@/composables/useDoctors';
import { useAuthStore } from '@/store/authStore';
import { usePdfScheduleExport } from '@/composables/usePdfScheduleExport';
import Button from 'primevue/button';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { isHoliday, getHolidayInfo } from '@/data/holidays-pe';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

const authStore = useAuthStore();
const confirm = useConfirm();
const toast = useToast();

// Get current authenticated doctor
const currentUser = computed(() => authStore.getUser);
const currentDoctor = computed(() => currentUser.value?.doctor);
const hasDoctorProfile = computed(() => !!currentDoctor.value);

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
    setDoctorFilter,
    setSpecialtyFilter,
    setStartDateFilter,
    setEndDateFilter,
    clearFilters
} = useDoctorSchedules();

const { doctors, fetchDoctors } = useDoctors();
const { generatePDF } = usePdfScheduleExport();

// Calendar reference
const calendarRef = ref(null);

// Dialog state
const scheduleDialogVisible = ref(false);
const selectedSchedule = ref(null);
const isEditingSchedule = ref(false);
const isDeleting = ref(false);

// Month filter
const selectedMonth = ref(new Date());

// Computed: Doctors in my specialty (for conflict detection)
const doctorsInMySpecialty = computed(() => {
    if (!hasDoctorProfile.value || !currentDoctor.value.specialties) return [];
    
    const mySpecialtyIds = currentDoctor.value.specialties.map(s => s.id);
    
    return doctors.value.filter(doctor => {
        if (!doctor.specialties || !Array.isArray(doctor.specialties)) return false;
        return doctor.specialties.some(specialty => mySpecialtyIds.includes(specialty.id));
    });
});

// Computed: My schedules vs others
const mySchedules = computed(() => {
    return schedules.value.filter(s => s.id_doctors === currentDoctor.value?.id);
});

const othersSchedules = computed(() => {
    return schedules.value.filter(s => s.id_doctors !== currentDoctor.value?.id);
});

// Statistics
const monthStats = computed(() => {
    const total = mySchedules.value.length;
    const pending = mySchedules.value.filter(s => s.status === 'pending').length;
    const confirmed = mySchedules.value.filter(s => s.status === 'confirmed').length;
    
    return { total, pending, confirmed };
});

// Load data for month
const loadDataForMonth = async () => {
    if (!hasDoctorProfile.value) {
        console.warn('⚠️ [MySchedules] No doctor profile found');
        return;
    }
    
    const firstDayOfMonth = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth(), 1);
    const lastDayOfMonth = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth() + 1, 0);
    
    // Get my specialty IDs for filtering
    const mySpecialtyIds = currentDoctor.value.specialties?.map(s => s.id) || [];
    
    console.log('🔍 [MySchedules] Loading data:', {
        doctorId: currentDoctor.value.id,
        doctorName: currentDoctor.value.name,
        specialties: currentDoctor.value.specialties,
        specialtyIds: mySpecialtyIds,
        dateRange: {
            start: firstDayOfMonth.toISOString().split('T')[0],
            end: lastDayOfMonth.toISOString().split('T')[0]
        }
    });
    
    try {
        // Set date filters
        setStartDateFilter(firstDayOfMonth.toISOString().split('T')[0]);
        setEndDateFilter(lastDayOfMonth.toISOString().split('T')[0]);
        
        // Set specialty filter to load schedules from my specialties (for conflict detection)
        if (mySpecialtyIds.length > 0) {
            console.log('🎯 [MySchedules] Setting specialty filter:', mySpecialtyIds[0]);
            // Use the first specialty for filtering
            // This will load all doctors in this specialty
            setSpecialtyFilter(mySpecialtyIds[0]);
        } else {
            console.warn('⚠️ [MySchedules] No specialties found for doctor');
        }
        
        // Load schedules with filters applied
        console.log('📡 [MySchedules] Fetching schedules...');
        await fetchSchedules();
        
        // Load doctors for display
        await fetchDoctors();
        
        console.log('📅 [MySchedules] Schedules loaded:', {
            total: schedules.value.length,
            mySchedules: mySchedules.value.length,
            othersSchedules: othersSchedules.value.length,
            currentDoctorId: currentDoctor.value.id,
            schedulesData: schedules.value.map(s => ({
                id: s.id,
                doctor_id: s.id_doctors,
                doctor_name: s.doctor?.name,
                date: s.date,
                shift: s.medical_shift?.description
            }))
        });
        
        toast.add({
            severity: 'success',
            summary: 'Datos cargados',
            detail: `${mySchedules.value.length} horarios propios encontrados`,
            life: 3000
        });
    } catch (err) {
        console.error('❌ [MySchedules] Error loading schedules:', err);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los horarios',
            life: 3000
        });
    }
};

// Schedule Handlers
const openNewSchedule = () => {
    selectedSchedule.value = {
        id_doctors: currentDoctor.value.id,  // Pre-set current doctor
        date: new Date().toISOString().split('T')[0],
        start_time: '08:00:00',
        end_time: '14:00:00'
    };
    isEditingSchedule.value = false;
    scheduleDialogVisible.value = true;
};

const editSchedule = (schedule) => {
    // Only allow editing own schedules
    if (schedule.id_doctors !== currentDoctor.value.id) {
        toast.add({
            severity: 'warn',
            summary: 'No autorizado',
            detail: 'Solo puedes editar tus propios horarios',
            life: 3000
        });
        return;
    }
    
    selectedSchedule.value = { ...schedule };
    isEditingSchedule.value = true;
    scheduleDialogVisible.value = true;
};

const handleSaveSchedule = async (scheduleData) => {
    try {
        // Ensure doctor_id is always the current doctor
        const payload = {
            ...scheduleData,
            id_doctors: currentDoctor.value.id
        };
        
        if (selectedSchedule.value?.id) {
            await updateSchedule(selectedSchedule.value.id, payload);
        } else {
            await createSchedule(payload);
        }
        
        scheduleDialogVisible.value = false;
        selectedSchedule.value = null;
        
        // Reload data
        await loadDataForMonth();
    } catch (error) {
        // Error handled by composable
    }
};

const confirmDeleteSchedule = (schedule) => {
    // Only allow deleting own schedules
    if (schedule.id_doctors !== currentDoctor.value.id) {
        toast.add({
            severity: 'warn',
            summary: 'No autorizado',
            detail: 'Solo puedes eliminar tus propios horarios',
            life: 3000
        });
        return;
    }
    
    confirm.require({
        message: `¿Está seguro que desea eliminar su horario del día ${schedule.date}?`,
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                isDeleting.value = true;
                await deleteSchedule(schedule.id);
                scheduleDialogVisible.value = false;
                selectedSchedule.value = null;
                await loadDataForMonth();
            } catch (error) {
                // Error handled by composable
            } finally {
                isDeleting.value = false;
            }
        }
    });
};

// PDF Export
const isExportingPDF = ref(false);

const handleExportPDF = async () => {
    if (!hasDoctorProfile.value) return;
    
    try {
        isExportingPDF.value = true;
        
        const currentDate = calendarRef.value?.getApi()?.getDate() || new Date();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        
        // Get first specialty for PDF header
        const specialty = currentDoctor.value.specialties?.[0];
        
        // Generate PDF with only my schedules
        const fileName = generatePDF(mySchedules.value, specialty, month, year, medicalShifts.value);
        
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

// FullCalendar Options
const calendarOptions = ref({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek'
    },
    editable: false,  // No drag & drop for doctors
    selectable: true,
    weekends: true,
    locale: esLocale,
    height: '600px',
    select: (arg) => {
        selectedSchedule.value = {
            id_doctors: currentDoctor.value.id,
            date: arg.startStr,
            start_time: '08:00:00',
            end_time: '14:00:00'
        };
        isEditingSchedule.value = false;
        scheduleDialogVisible.value = true;
    },
    eventClick: (arg) => {
        const originalSchedule = schedules.value.find(s => s.id == arg.event.id);
        if (originalSchedule) {
            editSchedule(originalSchedule);
        }
    },
    eventContent: (arg) => {
        const { extendedProps } = arg.event;
        const doctorName = extendedProps.doctor?.name || arg.event.title;
        const shiftCode = extendedProps.shiftCode || '';
        const status = extendedProps.status || 'pending';
        const isMySchedule = extendedProps.id_doctors === currentDoctor.value?.id;
        const isReten = extendedProps.is_payment_payroll === false;

        const statusIcon = status === 'pending' ? '⏳' :
                         status === 'confirmed' ? '✓' :
                         status === 'completed' ? '✓✓' :
                         status === 'cancelled' ? '✕' : '';

        const container = document.createElement('div');
        container.className = 'calendar-event-content';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'event-doctor-name';
        nameDiv.title = doctorName;
        
        if (isReten) {
            const retenBadge = document.createElement('span');
            retenBadge.className = 'reten-badge';
            retenBadge.textContent = 'R';
            retenBadge.title = 'Turno Retén';
            nameDiv.appendChild(retenBadge);
        }
        
        // Add "Yo" indicator for my schedules
        if (isMySchedule) {
            const myBadge = document.createElement('span');
            myBadge.className = 'my-badge';
            myBadge.textContent = '👤';
            myBadge.title = 'Mi horario';
            nameDiv.appendChild(myBadge);
        }
        
        const nameText = document.createTextNode(doctorName);
        nameDiv.appendChild(nameText);
        container.appendChild(nameDiv);

        if (shiftCode) {
            const shiftDiv = document.createElement('div');
            shiftDiv.className = 'event-shift-display';

            const shiftSpan = document.createElement('span');
            shiftSpan.className = `shift-${shiftCode}`;
            shiftSpan.textContent = shiftCode;
            shiftDiv.appendChild(shiftSpan);

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
        const dateStr = arg.date.toISOString().split('T')[0];
        const isSunday = arg.date.getDay() === 0;
        const isHol = isHoliday(dateStr);
        const isNonWorkingDay = isSunday || isHol;

        const holidayName = isHol ? getHolidayInfo(dateStr) : null;
        const stripeTitle = isHol ? holidayName : (isSunday ? 'Domingo' : '');

        const nonWorkingDayStripe = isNonWorkingDay
            ? `<div class="sunday-stripe" title="${stripeTitle}"></div>`
            : '';

        return {
            html: `
                ${nonWorkingDayStripe}
                <div class="fc-daygrid-day-top">
                    <span class="fc-daygrid-day-number">${arg.dayNumberText}</span>
                </div>
            `
        };
    },
    events: computed(() => {
        return schedules.value.map(schedule => {
            const isMySchedule = schedule.id_doctors === currentDoctor.value?.id;
            const startDateTime = `${schedule.date}T${schedule.start_time}`;
            const endDateTime = `${schedule.date}T${schedule.end_time}`;
            const doctorName = schedule.doctor?.name || '';
            const shiftCode = schedule.medical_shift?.code || '';

            return {
                id: schedule.id,
                title: doctorName,
                start: startDateTime,
                end: endDateTime,
                extendedProps: {
                    doctor: schedule.doctor,
                    medical_shift: schedule.medical_shift,
                    status: schedule.status,
                    shiftCode: shiftCode,
                    ...schedule
                },
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                textColor: '#1f2937',
                classNames: [
                    `status-${schedule.status}`,
                    isMySchedule ? 'my-schedule' : 'other-schedule',
                    shiftCode ? `shift-${shiftCode}` : ''
                ]
            };
        });
    }),
    datesSet: (dateInfo) => {
        // Use the view's current date (middle of visible range) instead of start
        // This ensures we get the actual month being displayed, not the first visible date
        const currentDate = dateInfo.view.currentStart || dateInfo.start;
        selectedMonth.value = new Date(currentDate);
        loadDataForMonth();
    }
});

// Mounted
onMounted(async () => {
    if (!hasDoctorProfile.value) {
        toast.add({
            severity: 'warn',
            summary: 'Perfil incompleto',
            detail: 'No se encontró un perfil de médico asociado a su cuenta',
            life: 5000
        });
        return;
    }
    
    console.log('🚀 [MySchedules] Component mounted, doctor ID:', currentDoctor.value.id);
    
    try {
        // First, fetch medical shifts
        await fetchMedicalShifts();
        
        // Then, fetch all doctors to get the full doctor profile with specialties
        await fetchDoctors();
        
        // Find the current doctor in the fetched doctors list to get specialties
        const fullDoctorProfile = doctors.value.find(d => d.id === currentDoctor.value.id);
        
        if (fullDoctorProfile && fullDoctorProfile.specialties) {
            console.log('✅ [MySchedules] Full doctor profile loaded:', {
                id: fullDoctorProfile.id,
                name: fullDoctorProfile.name,
                specialties: fullDoctorProfile.specialties
            });
            
            // Update currentDoctor with full profile including specialties
            // We need to update the authStore user object
            currentUser.value.doctor = fullDoctorProfile;
        } else {
            console.warn('⚠️ [MySchedules] Doctor profile found but no specialties:', fullDoctorProfile);
        }
        
        // Now load schedules with the updated doctor profile
        await loadDataForMonth();
    } catch (error) {
        console.error('❌ [MySchedules] Error in onMounted:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo inicializar la vista',
            life: 5000
        });
    }
});
</script>

<template>
    <div class="my-schedules-view">
        <div class="main-card">
            <!-- Header Section -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-calendar-plus"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Mis Horarios</h1>
                    <p class="header-subtitle" v-if="hasDoctorProfile">
                        <i class="pi pi-user mr-2"></i>
                        {{ currentDoctor.name }}
                        <span v-if="currentDoctor.specialties && currentDoctor.specialties.length > 0" class="ml-2">
                            - {{ currentDoctor.specialties.map(s => s.name).join(', ') }}
                        </span>
                    </p>
                    <p class="header-subtitle" v-else>
                        <i class="pi pi-exclamation-triangle mr-2"></i>
                        Sin perfil de médico asociado
                    </p>
                </div>
            </div>

            <!-- Warning if no doctor profile -->
            <Message v-if="!hasDoctorProfile" severity="warn" :closable="false" class="mb-4">
                <p class="m-0">
                    <strong>Perfil incompleto:</strong> Su cuenta de usuario no tiene un perfil de médico asociado. 
                    Por favor, contacte al administrador del sistema.
                </p>
            </Message>

            <!-- Content Section -->
            <template v-if="hasDoctorProfile">
                <!-- Control Panel -->
                <Card class="control-panel">
                    <template #title>
                        <i class="pi pi-sliders-h"></i> Panel de Control
                    </template>
                    <template #content>
                        <div class="control-grid">
                            <div class="control-item">
                                <label>Mes</label>
                                <DatePicker 
                                    v-model="selectedMonth" 
                                    view="month" 
                                    dateFormat="MM yy"
                                    @date-select="loadDataForMonth"
                                    placeholder="Seleccionar mes"
                                    class="w-full"
                                />
                            </div>
                            
                            <div class="control-item">
                                <label>&nbsp;</label>
                                <div class="flex gap-2">
                                    <Button 
                                        label="Nuevo Horario"
                                        icon="pi pi-plus" 
                                        @click="openNewSchedule"
                                        :disabled="isLoading"
                                    />
                                    <Button 
                                        icon="pi pi-file-pdf" 
                                        v-tooltip.top="'Exportar PDF'"
                                        @click="handleExportPDF" 
                                        severity="danger"
                                        :disabled="mySchedules.length === 0 || isExportingPDF"
                                        :loading="isExportingPDF"
                                    />
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>

                <!-- Statistics -->
                <div class="summary-cards" v-if="mySchedules.length > 0">
                    <Card class="summary-card">
                        <template #content>
                            <div class="summary-content">
                                <i class="pi pi-calendar summary-icon"></i>
                                <div>
                                    <div class="summary-label">Total Horarios</div>
                                    <div class="summary-value">{{ monthStats.total }}</div>
                                </div>
                            </div>
                        </template>
                    </Card>
                    
                    <Card class="summary-card">
                        <template #content>
                            <div class="summary-content">
                                <i class="pi pi-clock summary-icon warning"></i>
                                <div>
                                    <div class="summary-label">Pendientes</div>
                                    <div class="summary-value">{{ monthStats.pending }}</div>
                                </div>
                            </div>
                        </template>
                    </Card>
                    
                    <Card class="summary-card">
                        <template #content>
                            <div class="summary-content">
                                <i class="pi pi-check-circle summary-icon success"></i>
                                <div>
                                    <div class="summary-label">Confirmados</div>
                                    <div class="summary-value">{{ monthStats.confirmed }}</div>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>

                <!-- Calendar -->
                <Card class="calendar-card">
                    <template #title>
                        <div class="flex align-items-center justify-content-between">
                            <span>
                                <i class="pi pi-calendar"></i> Calendario de Horarios
                            </span>
                            <div class="legend">
                                <span class="legend-item">
                                    <span class="legend-color my-schedule-color"></span>
                                    Mis horarios
                                </span>
                                <span class="legend-item">
                                    <span class="legend-color other-schedule-color"></span>
                                    Otros médicos (mi especialidad)
                                </span>
                            </div>
                        </div>
                    </template>
                    <template #content>
                        <FullCalendar ref="calendarRef" :options="calendarOptions" />
                    </template>
                </Card>
            </template>
        </div>

        <!-- Schedule Dialog -->
        <ScheduleDialog
            v-model:visible="scheduleDialogVisible"
            :schedule="selectedSchedule"
            :is-editing="isEditingSchedule"
            :doctors="[currentDoctor]"
            :medical-shifts="medicalShifts"
            :is-saving="isSaving"
            :is-deleting="isDeleting"
            :read-only-doctor="true"
            @save="handleSaveSchedule"
            @delete="confirmDeleteSchedule"
        />
    </div>
</template>

<style scoped>
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

.my-schedules-view {
    padding: 1.5rem;
    min-height: 100vh;
}

.main-card {
    background: var(--surface-card);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    animation: fadeIn 0.3s ease-out;
}

/* Header */
.header-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid var(--surface-border);
}

.header-icon-wrapper {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.header-icon-wrapper i {
    font-size: 2rem;
    color: white;
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

/* Control Panel */
.control-panel {
    margin-bottom: 1.5rem;
}

.control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.control-item label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--text-color);
}

/* Summary Cards */
.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.summary-card {
    animation: fadeIn 0.4s ease-out;
}

.summary-content {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.summary-icon {
    font-size: 2.5rem;
    color: #667eea;
}

.summary-icon.success {
    color: #48bb78;
}

.summary-icon.warning {
    color: #ed8936;
}

.summary-label {
    font-size: 0.875rem;
    color: #718096;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.summary-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #2d3748;
    margin-top: 0.25rem;
}

/* Calendar */
.calendar-card {
    margin-top: 1.5rem;
}

.legend {
    display: flex;
    gap: 1.5rem;
    font-size: 0.875rem;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.legend-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid #ddd;
}

.my-schedule-color {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.other-schedule-color {
    background: #e2e8f0;
}

/* Calendar Event Styles */
:deep(.my-schedule) {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%) !important;
    border-left: 4px solid #667eea !important;
    font-weight: 600;
}

:deep(.other-schedule) {
    background: rgba(226, 232, 240, 0.5) !important;
    border-left: 2px solid #cbd5e0 !important;
    opacity: 0.7;
}

:deep(.calendar-event-content) {
    padding: 2px 4px;
    font-size: 0.75rem;
}

:deep(.event-doctor-name) {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

:deep(.my-badge) {
    margin-right: 4px;
    font-size: 0.8rem;
}

:deep(.reten-badge) {
    background: #e53e3e;
    color: white;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: bold;
    margin-right: 4px;
}

:deep(.event-shift-display) {
    font-size: 0.7rem;
    margin-top: 2px;
}

:deep(.shift-M) {
    color: #3182ce;
    font-weight: bold;
}

:deep(.shift-T) {
    color: #d69e2e;
    font-weight: bold;
}

:deep(.shift-N) {
    color: #805ad5;
    font-weight: bold;
}

:deep(.sunday-stripe) {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #e53e3e 0%, #fc8181 100%);
    z-index: 1;
}
</style>
