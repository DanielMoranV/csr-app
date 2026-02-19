<script setup>
import { customMigrations } from '@/api';
import { doctors as doctorsApi } from '@/api/doctors';
import { doctorSchedules } from '@/api/doctorSchedules';
import { medicalSpecialties } from '@/api/medicalSpecialties';
import { reservationDetailService, reservationService } from '@/api/reservations';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/vue3';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';

// PrimeVue Components
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import ConfirmDialog from 'primevue/confirmdialog';
import DataTable from 'primevue/datatable';
import Divider from 'primevue/divider';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';

const toast = useToast();
const confirm = useConfirm();

// Color palette for multi-doctor calendar
const DOCTOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];

// ============================================================================
// STATE: FILTERS
// ============================================================================
const specialties = ref([]);
const selectedSpecialty = ref(null);
const allDoctors = ref([]);
const filteredDoctors = ref([]);
const selectedDoctor = ref(null); // Optional — narrows calendar to one doctor

// ============================================================================
// STATE: CALENDAR
// ============================================================================
const calendarRef = ref(null);
const schedules = ref([]);
const loadingSchedules = ref(false);

// ============================================================================
// STATE: DETAIL PANEL
// ============================================================================
const selectedSchedule = ref(null);       // Schedule from the clicked calendar event
const selectedScheduleDoctor = ref(null); // Doctor who owns that schedule
const currentReservationList = ref(null);
const reservationPatients = ref([]);
const loadingReservations = ref(false);
const processingRegistration = ref(false);
const editingRows = ref([]);

// New patient add form
const showAddForm = ref(false);
const newPatient = ref({ patient_name: '', document_number: '', modality: 'presencial', phone_number: '' });

// ============================================================================
// STATE: SISCLIN
// ============================================================================
const sisclinShifts = ref([]);
const loadingSisclin = ref(false);

// ============================================================================
// COMPUTED
// ============================================================================

const doctorsInSpecialty = computed(() => {
    if (!selectedSpecialty.value) return [];
    return allDoctors.value.filter(
        (d) => Array.isArray(d.specialties) && d.specialties.some((s) => s.id === selectedSpecialty.value.id)
    );
});

const doctorColorMap = computed(() => {
    const map = {};
    doctorsInSpecialty.value.forEach((d, i) => {
        map[d.id] = DOCTOR_COLORS[i % DOCTOR_COLORS.length];
    });
    return map;
});

const calendarEvents = computed(() =>
    schedules.value.map((schedule) => ({
        id: String(schedule.id),
        title: getEventTitle(schedule),
        start: `${schedule.date}T${schedule.start_time}`,
        end: `${schedule.date}T${schedule.end_time}`,
        color: schedule.status === 'cancelled' ? '#9ca3af' : (doctorColorMap.value[schedule.doctor_id] || '#3b82f6'),
        extendedProps: { ...schedule }
    }))
);

const calendarOptions = computed(() => ({
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth' },
    locale: esLocale,
    events: calendarEvents.value,
    eventClick: handleEventClick,
    dateClick: handleDateClick,
    height: 'auto',
    selectable: true
}));

const isLocked = computed(() => currentReservationList.value?.status === 'registered');

const canRegister = computed(() =>
    currentReservationList.value &&
    !isLocked.value &&
    reservationPatients.value.length > 0
);

// ============================================================================
// FILTER LOGIC
// ============================================================================

const loadSpecialties = async () => {
    try {
        const response = await medicalSpecialties.getAll();
        if (Array.isArray(response.data)) specialties.value = response.data;
        else if (response.data?.data) specialties.value = response.data.data;
    } catch (error) {
        console.error('Error loading specialties:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las especialidades', life: 3000 });
    }
};

const loadDoctors = async () => {
    try {
        const response = await doctorsApi.getAll();
        console.log('[DEBUG] doctors.getAll() response:', response); // Verify structure
        let data = [];
        if (Array.isArray(response)) data = response;
        else if (Array.isArray(response?.data)) data = response.data;
        else if (response?.data?.data) data = response.data.data;
        allDoctors.value = data;
    } catch (error) {
        console.error('Error loading doctors:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los médicos', life: 3000 });
    }
};

const searchDoctors = (event) => {
    const query = event.query.toLowerCase();
    const source = selectedSpecialty.value
        ? allDoctors.value.filter((d) => Array.isArray(d.specialties) && d.specialties.some((s) => s.id === selectedSpecialty.value.id))
        : allDoctors.value;
    filteredDoctors.value = source.filter((d) => d.name.toLowerCase().includes(query));
};

// ============================================================================
// WATCHERS
// ============================================================================

watch(selectedSpecialty, async (newVal) => {
    selectedDoctor.value = null;
    clearDetailPanel();
    schedules.value = [];
    if (newVal) await fetchSchedulesForView();
});

watch(selectedDoctor, async () => {
    clearDetailPanel();
    if (selectedSpecialty.value) await fetchSchedulesForView();
});

// ============================================================================
// CALENDAR / SCHEDULE LOGIC
// ============================================================================

const getDateRange = () => {
    const today = new Date();
    return {
        startDate: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0],
        endDate: new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().split('T')[0]
    };
};

const fetchSchedulesForView = async () => {
    if (!selectedSpecialty.value) return;
    loadingSchedules.value = true;
    schedules.value = [];

    const { startDate, endDate } = getDateRange();

    try {
        if (selectedDoctor.value) {
            // Single doctor mode
            const response = await doctorSchedules.getAll({
                doctor_id: selectedDoctor.value.id,
                start_date: startDate,
                end_date: endDate
            });
            const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
            console.log('[DEBUG] Single doctor schedule sample:', data[0]); // Verify doctor_id field
            schedules.value = data.map((s) => ({ ...s, doctor_id: s.doctor_id ?? selectedDoctor.value.id }));
        } else {
            // Multi-doctor mode: parallel requests for each doctor in the specialty
            const doctorIds = doctorsInSpecialty.value.map((d) => d.id);
            if (!doctorIds.length) return;

            const results = await Promise.allSettled(
                doctorIds.map((id) => doctorSchedules.getAll({ doctor_id: id, start_date: startDate, end_date: endDate }))
            );

            const merged = [];
            results.forEach((result, i) => {
                if (result.status === 'fulfilled') {
                    const res = result.value;
                    const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                    data.forEach((s) => merged.push({ ...s, doctor_id: s.doctor_id ?? doctorIds[i] }));
                }
            });

            console.log('[DEBUG] Multi-doctor schedule sample:', merged[0]); // Verify structure
            schedules.value = merged;
        }
    } catch (error) {
        console.error('Error fetching schedules:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar horarios', life: 3000 });
    } finally {
        loadingSchedules.value = false;
    }
};

const getShiftLabel = (schedule) => {
    if (!schedule) return '';
    if (schedule.medical_shift?.description) {
        const desc = schedule.medical_shift.description.toLowerCase();
        if (desc.includes('mañana')) return 'Mañana';
        if (desc.includes('tarde')) return 'Tarde';
        if (desc.includes('noche')) return 'Noche';
    }
    if (schedule.start_time && schedule.end_time) {
        return `${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)}`;
    }
    return 'Sin turno';
};

const getEventTitle = (schedule) => {
    const shiftLabel = getShiftLabel(schedule);
    // In multi-doctor mode, prefix with doctor's last name for quick identification
    if (!selectedDoctor.value && doctorsInSpecialty.value.length > 1) {
        const doctor = allDoctors.value.find((d) => d.id === schedule.doctor_id);
        const lastName = doctor ? doctor.name.split(' ').slice(-1)[0] : '?';
        return `${lastName} · ${shiftLabel}`;
    }
    return shiftLabel;
};

// ============================================================================
// CALENDAR CLICK HANDLERS
// ============================================================================

const handleEventClick = async (info) => {
    const schedule = info.event.extendedProps;
    console.log('[DEBUG] handleEventClick — schedule extendedProps:', schedule); // Verify doctor_id

    selectedSchedule.value = schedule;
    selectedScheduleDoctor.value = allDoctors.value.find((d) => d.id === schedule.doctor_id) || selectedDoctor.value;

    clearDetailPanel();

    if (schedule.id) {
        await Promise.all([fetchReservations(schedule.id), fetchSisclinShifts(schedule.date)]);
    }
};

const handleDateClick = async (info) => {
    const dateStr = info.dateStr;
    const existingSchedule = schedules.value.find((s) => s.date === dateStr);

    if (existingSchedule) {
        selectedSchedule.value = existingSchedule;
        selectedScheduleDoctor.value = allDoctors.value.find((d) => d.id === existingSchedule.doctor_id) || selectedDoctor.value;
        clearDetailPanel();
        await Promise.all([fetchReservations(existingSchedule.id), fetchSisclinShifts(dateStr)]);
    } else {
        selectedSchedule.value = { date: dateStr, id: null };
        selectedScheduleDoctor.value = selectedDoctor.value;
        clearDetailPanel();
        await fetchSisclinShifts(dateStr);
    }
};

// ============================================================================
// RESERVATIONS — INLINE EDITING
// ============================================================================

const clearDetailPanel = () => {
    currentReservationList.value = null;
    reservationPatients.value = [];
    sisclinShifts.value = [];
    editingRows.value = [];
    showAddForm.value = false;
    newPatient.value = { patient_name: '', document_number: '', modality: 'presencial', phone_number: '' };
};

const fetchReservations = async (scheduleId) => {
    if (!scheduleId) return;
    loadingReservations.value = true;

    try {
        const response = await reservationService.listDocs({ schedule_id: scheduleId });
        const docs = Array.isArray(response.data) ? response.data : (response.data?.data || []);

        if (docs.length > 0) {
            const fullRes = await reservationService.getDoc(docs[0].id);
            currentReservationList.value = fullRes.data.data || fullRes.data;
            reservationPatients.value = currentReservationList.value.details || [];
            console.log('[DEBUG] currentReservationList:', currentReservationList.value); // Verify details structure
        }
    } catch (error) {
        console.error('Error fetching reservations:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las reservas', life: 3000 });
    } finally {
        loadingReservations.value = false;
    }
};

const onRowEditSave = async (event) => {
    const { newData, index } = event;

    if (newData.id) {
        // Existing patient → use the individual detail endpoint (no full-list update needed)
        await updatePatientDetail(newData, index);
    } else {
        // New patient (no id yet) → fall back to full list save
        reservationPatients.value[index] = { ...newData };
        await saveReservation();
    }
};

const updatePatientDetail = async (patient, index) => {
    processingRegistration.value = true;
    try {
        const payload = {
            patient_name: patient.patient_name,
            document_number: patient.document_number,
            turn_number: patient.turn_number,
            modality: patient.modality,
            observations: patient.observations || ''
        };
        const response = await reservationDetailService.update(patient.id, payload);
        const updated = response?.data?.data || response?.data || patient;
        reservationPatients.value[index] = updated;
        toast.add({ severity: 'success', summary: 'Guardado', detail: 'Paciente actualizado', life: 1500 });
    } catch (error) {
        console.error('Error updating patient detail:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el paciente', life: 3000 });
    } finally {
        processingRegistration.value = false;
    }
};

const registerPatient = async (patient) => {
    try {
        const response = await reservationDetailService.changeStatus(patient.id, 'registered');
        const updated = response?.data?.data || response?.data || patient;
        const idx = reservationPatients.value.findIndex((p) => p.id === patient.id);
        if (idx !== -1) reservationPatients.value[idx] = updated;

        if (updated.is_out_of_schedule) {
            toast.add({ severity: 'warn', summary: 'Registrado (fuera de horario)', detail: `${patient.patient_name} registrado, pero no se encontró una cita en el rango exacto del turno.`, life: 5000 });
        } else {
            toast.add({ severity: 'success', summary: 'Registrado', detail: `${patient.patient_name} validado correctamente con Sisclin.`, life: 2500 });
        }
    } catch (error) {
        console.error('Error registering patient detail:', error);
        if (error.response?.status === 400) {
            const msg = error.response.data?.message || 'Error de validación con Sisclin';
            toast.add({ severity: 'error', summary: 'No se puede registrar', detail: msg, life: 7000, closable: true });
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cambiar el estado del paciente', life: 3000 });
        }
    }
};

const cancelPatient = async (patient) => {
    try {
        const response = await reservationDetailService.changeStatus(patient.id, 'cancelled');
        const updated = response?.data?.data || response?.data || patient;
        const idx = reservationPatients.value.findIndex((p) => p.id === patient.id);
        if (idx !== -1) reservationPatients.value[idx] = updated;
        toast.add({ severity: 'info', summary: 'Cancelado', detail: `${patient.patient_name} marcado como cancelado.`, life: 2000 });
    } catch (error) {
        console.error('Error cancelling patient detail:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cancelar el paciente', life: 3000 });
    }
};

const getDetailStatusSeverity = (status) => {
    return { registered: 'success', pending: 'warning', cancelled: 'danger' }[status?.toLowerCase()] || 'secondary';
};

const getDetailStatusLabel = (status) => {
    return { registered: 'Registrado', pending: 'Pendiente', cancelled: 'Cancelado' }[status?.toLowerCase()] || status || 'Pendiente';
};

const saveNewPatient = async () => {
    if (!newPatient.value.patient_name.trim()) return;
    const maxTurn = reservationPatients.value.reduce((max, p) => Math.max(max, p.turn_number || 0), 0);
    reservationPatients.value.push({
        id: null,
        ...newPatient.value,
        turn_number: maxTurn + 1,
        is_additional: false
    });
    newPatient.value = { patient_name: '', document_number: '', modality: 'presencial', phone_number: '' };
    showAddForm.value = false;
    await saveReservation();
};

const removePatient = async (index) => {
    reservationPatients.value.splice(index, 1);
    reservationPatients.value.forEach((p, i) => { p.turn_number = i + 1; });
    await saveReservation();
};

const saveReservation = async () => {
    if (!selectedSchedule.value?.id || !selectedScheduleDoctor.value) return;

    processingRegistration.value = true;
    try {
        const payload = {
            doctor_id: selectedScheduleDoctor.value.id,
            doctor_schedule_id: selectedSchedule.value.id,
            notes: currentReservationList.value?.notes || '',
            patients: reservationPatients.value.map((p) => ({
                ...(p.id ? { id: p.id } : {}),
                patient_name: p.patient_name,
                document_number: p.document_number,
                turn_number: p.turn_number,
                modality: p.modality,
                phone_number: p.phone_number || '',
                is_additional: p.is_additional || false
            }))
        };

        if (currentReservationList.value?.id) {
            await reservationService.updateDoc(currentReservationList.value.id, payload);
        } else {
            const res = await reservationService.createDoc(payload);
            currentReservationList.value = res.data?.data || res.data;
        }

        toast.add({ severity: 'success', summary: 'Guardado', detail: 'Lista actualizada', life: 1500 });
        await fetchReservations(selectedSchedule.value.id);
    } catch (error) {
        console.error('Error saving reservation:', error);
        if (error.response?.status === 422) {
            toast.add({ severity: 'error', summary: 'Validación', detail: error.response.data.message || 'Error de validación', life: 5000 });
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la lista', life: 3000 });
        }
    } finally {
        processingRegistration.value = false;
    }
};

const handleRegisterAttendance = () => {
    if (!currentReservationList.value) return;
    confirm.require({
        message: '¿Confirma el registro de asistencia? Los pacientes serán validados contra Sisclin.',
        header: 'Confirmar Registro',
        icon: 'pi pi-check-circle',
        acceptClass: 'p-button-success',
        accept: async () => {
            processingRegistration.value = true;
            try {
                await reservationService.updateDoc(currentReservationList.value.id, {
                    status: 'registered',
                    notes: currentReservationList.value.notes,
                    patients: reservationPatients.value.map((p) => ({
                        id: p.id,
                        patient_name: p.patient_name,
                        document_number: p.document_number,
                        turn_number: p.turn_number,
                        modality: p.modality,
                        phone_number: p.phone_number,
                        is_additional: p.is_additional
                    }))
                });
                toast.add({ severity: 'success', summary: 'Éxito', detail: 'Asistencia registrada correctamente', life: 3000 });
                await fetchReservations(selectedSchedule.value.id);
            } catch (error) {
                console.error('Error registering attendance:', error);
                toast.add({ severity: 'error', summary: 'Error', detail: 'Error al registrar la asistencia', life: 3000 });
            } finally {
                processingRegistration.value = false;
            }
        }
    });
};

// ============================================================================
// SISCLIN LOGIC
// ============================================================================

const fetchSisclinShifts = async (date) => {
    const doctor = selectedScheduleDoctor.value || selectedDoctor.value;
    if (!doctor?.code) {
        console.log('[DEBUG] fetchSisclinShifts: no doctor.code available. Doctor object:', doctor); // Verify code field
        return;
    }

    loadingSisclin.value = true;
    sisclinShifts.value = [];

    try {
        const payload = { codigo_servicio: doctor.code, start_date: date, end_date: date, dry_run: false };
        const response = await customMigrations.getTurnosByService(payload);
        if (response?.success && Array.isArray(response.data?.data)) {
            sisclinShifts.value = response.data.data;
        }
    } catch (error) {
        console.error('Error fetching Sisclin shifts:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los turnos de Sisclin', life: 3000 });
    } finally {
        loadingSisclin.value = false;
    }
};

const getSisclinStatusSeverity = (estado) => {
    return { ATENDIDO: 'success', PENDIENTE: 'warning', ANULADO: 'danger', CITADO: 'info' }[estado] || 'secondary';
};

const getStatusSeverity = (status) => {
    return { registered: 'success', provisional: 'warning', cancelled: 'danger' }[status?.toLowerCase()] || 'info';
};

// ============================================================================
// LIFECYCLE
// ============================================================================

onMounted(() => {
    loadSpecialties();
    loadDoctors();
});
</script>

<template>
    <div class="reservation-management">
        <!-- ================================================================ -->
        <!-- FILTER BAR                                                        -->
        <!-- ================================================================ -->
        <div class="filter-card card mb-3">
            <div class="flex flex-wrap gap-3 align-items-center">
                <h2 class="text-xl font-bold m-0 mr-1">Gestión de Reservas</h2>
                <Divider layout="vertical" class="mx-1 hidden md:block" style="height: 1.5rem" />

                <div class="flex align-items-center gap-2">
                    <label class="font-medium text-sm white-space-nowrap">Especialidad</label>
                    <Dropdown v-model="selectedSpecialty" :options="specialties" optionLabel="name" placeholder="Seleccionar..." filter showClear class="w-14rem" />
                </div>

                <div v-if="selectedSpecialty" class="flex align-items-center gap-2">
                    <label class="font-medium text-sm white-space-nowrap">Médico</label>
                    <AutoComplete v-model="selectedDoctor" :suggestions="filteredDoctors" @complete="searchDoctors" optionLabel="name" dropdown placeholder="Todos" showClear class="w-14rem" />
                </div>

                <div v-if="loadingSchedules" class="flex align-items-center gap-2 text-500 ml-auto">
                    <i class="pi pi-spin pi-spinner text-sm"></i>
                    <span class="text-sm">Cargando horarios...</span>
                </div>
            </div>
        </div>

        <!-- ================================================================ -->
        <!-- EMPTY STATE                                                       -->
        <!-- ================================================================ -->
        <div v-if="!selectedSpecialty" class="flex flex-column align-items-center justify-content-center p-8 surface-card border-round shadow-1">
            <i class="pi pi-calendar text-6xl text-primary-300 mb-4"></i>
            <h2 class="text-2xl font-medium text-900 mb-2">Seleccione una Especialidad</h2>
            <p class="text-500 text-center" style="max-width: 26rem">Elija una especialidad para visualizar el calendario de turnos de todos sus médicos y gestionar reservas.</p>
        </div>

        <!-- ================================================================ -->
        <!-- MAIN CONTENT                                                      -->
        <!-- ================================================================ -->
        <div v-else>
            <!-- CALENDAR + DOCTOR LEGEND -->
            <Card class="mb-3">
                <template #content>
                    <div class="flex gap-3 align-items-start">
                        <!-- FullCalendar (takes remaining width) -->
                        <div class="flex-1 min-w-0">
                            <FullCalendar ref="calendarRef" :options="calendarOptions" />
                        </div>

                        <!-- Legend: only visible in multi-doctor mode -->
                        <div v-if="!selectedDoctor && doctorsInSpecialty.length > 1" class="legend-panel flex-shrink-0">
                            <p class="text-xs font-bold text-500 uppercase mb-2 m-0 pb-2 border-bottom-1 surface-border">Médicos</p>
                            <div v-for="doctor in doctorsInSpecialty" :key="doctor.id" class="flex align-items-center gap-2 mt-2">
                                <span class="border-circle flex-shrink-0" :style="{ width: '10px', height: '10px', backgroundColor: doctorColorMap[doctor.id] }"></span>
                                <span class="text-sm text-700">{{ doctor.name }}</span>
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- ============================================================ -->
            <!-- DETAIL PANEL (slides in when a calendar event is clicked)    -->
            <!-- ============================================================ -->
            <transition name="slide-down">
                <Card v-if="selectedSchedule" class="detail-card">
                    <!-- DETAIL HEADER -->
                    <template #header>
                        <div class="flex flex-wrap justify-content-between align-items-center p-3 border-bottom-1 surface-border gap-2">
                            <!-- Left: schedule metadata -->
                            <div class="flex align-items-center flex-wrap gap-2">
                                <span v-if="selectedScheduleDoctor" class="font-bold text-base">
                                    {{ selectedScheduleDoctor.name }}
                                </span>
                                <span v-if="selectedScheduleDoctor" class="text-300 hidden sm:inline">|</span>
                                <span class="text-600 text-sm">{{ selectedSchedule.date }}</span>
                                <Tag :value="getShiftLabel(selectedSchedule)" severity="info" class="text-xs" />
                                <Tag v-if="selectedSchedule.id" :value="`Turno #${selectedSchedule.id}`" severity="secondary" class="text-xs" />
                                <Tag v-if="currentReservationList" :value="currentReservationList.status" :severity="getStatusSeverity(currentReservationList.status)" class="text-xs" />
                                <Tag v-if="isLocked" severity="success" value="Validado" icon="pi pi-lock" class="text-xs" />
                            </div>

                            <!-- Right: primary action -->
                            <Button
                                v-if="canRegister"
                                label="Cerrar y Registrar"
                                icon="pi pi-check-circle"
                                severity="success"
                                size="small"
                                :loading="processingRegistration"
                                @click="handleRegisterAttendance"
                            />
                        </div>
                    </template>

                    <template #content>
                        <div class="grid m-0">
                            <!-- -------------------------------------------- -->
                            <!-- LEFT PANEL: LOCAL RESERVATIONS (Inline Edit)  -->
                            <!-- -------------------------------------------- -->
                            <div class="col-12 md:col-6 pr-0 md:pr-3 border-bottom-1 md:border-bottom-none md:border-right-1 surface-border pb-3 md:pb-0">
                                <div class="flex justify-content-between align-items-center mb-3">
                                    <h3 class="text-xs font-bold m-0 text-500 uppercase" style="letter-spacing: 0.06em">
                                        <i class="pi pi-file-edit mr-2 text-primary"></i>
                                        Reservas Locales
                                        <span v-if="reservationPatients.length" class="normal-case font-normal ml-1">({{ reservationPatients.length }})</span>
                                    </h3>
                                    <Button
                                        v-if="selectedSchedule.id && !isLocked"
                                        icon="pi pi-plus"
                                        label="Agregar"
                                        text
                                        size="small"
                                        severity="primary"
                                        :disabled="processingRegistration"
                                        @click="showAddForm = !showAddForm"
                                    />
                                </div>

                                <!-- No local schedule for this date -->
                                <div v-if="!selectedSchedule.id" class="text-center p-4 surface-50 border-round border-1 surface-border">
                                    <i class="pi pi-info-circle text-orange-400 text-2xl mb-2 block"></i>
                                    <p class="m-0 text-sm text-600">No hay horario local para esta fecha.</p>
                                </div>

                                <!-- Loading -->
                                <div v-else-if="loadingReservations" class="flex justify-content-center p-5">
                                    <i class="pi pi-spin pi-spinner text-2xl text-primary"></i>
                                </div>

                                <!-- Patient table + add form -->
                                <template v-else>
                                    <DataTable
                                        v-model:editingRows="editingRows"
                                        :value="reservationPatients"
                                        editMode="row"
                                        dataKey="id"
                                        @row-edit-save="onRowEditSave"
                                        stripedRows
                                        class="p-datatable-sm text-sm"
                                        sortField="turn_number"
                                        :sortOrder="1"
                                        scrollable
                                        scrollHeight="320px"
                                    >
                                        <template #empty>
                                            <div class="text-center p-5 text-500">
                                                <i class="pi pi-users text-3xl mb-2 block text-300"></i>
                                                <span class="text-sm">Sin pacientes. Haga clic en "Agregar" para comenzar.</span>
                                            </div>
                                        </template>

                                        <Column field="turn_number" header="#" style="width: 3rem" sortable>
                                            <template #body="{ data }">
                                                <span class="font-bold text-center block">{{ data.turn_number }}</span>
                                            </template>
                                            <template #editor="{ data, field }">
                                                <InputNumber v-model="data[field]" :min="1" inputStyle="width:3rem" />
                                            </template>
                                        </Column>

                                        <Column field="patient_name" header="Paciente" sortable>
                                            <template #editor="{ data, field }">
                                                <InputText v-model="data[field]" class="w-full p-inputtext-sm" />
                                            </template>
                                        </Column>

                                        <Column field="document_number" header="DNI" style="width: 6.5rem" sortable>
                                            <template #editor="{ data, field }">
                                                <InputText v-model="data[field]" class="w-full p-inputtext-sm" />
                                            </template>
                                        </Column>

                                        <Column field="modality" header="Mod." style="width: 4.5rem">
                                            <template #body="{ data }">
                                                <Tag
                                                    :value="data.modality === 'presencial' ? 'P' : 'V'"
                                                    :severity="data.modality === 'presencial' ? 'info' : 'warning'"
                                                    style="font-size: 0.65rem; padding: 0.15rem 0.4rem"
                                                />
                                            </template>
                                            <template #editor="{ data, field }">
                                                <Dropdown v-model="data[field]" :options="['presencial', 'virtual']" style="width: 8.5rem" />
                                            </template>
                                        </Column>

                                        <!-- Status column: state tag + per-patient Sisclin action -->
                                        <Column header="Estado" style="width: 9rem">
                                            <template #body="{ data }">
                                                <div class="flex align-items-center gap-1">
                                                    <!-- Status tag -->
                                                    <Tag
                                                        :value="getDetailStatusLabel(data.status)"
                                                        :severity="getDetailStatusSeverity(data.status)"
                                                        style="font-size: 0.62rem; padding: 0.15rem 0.35rem; white-space: nowrap"
                                                    />

                                                    <!-- Sisclin validation indicator when registered -->
                                                    <template v-if="data.status === 'registered'">
                                                        <i
                                                            v-if="data.is_out_of_schedule"
                                                            class="pi pi-exclamation-triangle text-orange-500 text-xs"
                                                            v-tooltip.top="'Registrado, pero la cita no está en el rango exacto del turno'"
                                                        ></i>
                                                        <i
                                                            v-else
                                                            class="pi pi-verified text-green-500 text-xs"
                                                            v-tooltip.top="'Validado correctamente con Sisclin'"
                                                        ></i>
                                                    </template>

                                                    <!-- Register button (only for pending patients with ID) -->
                                                    <Button
                                                        v-if="data.id && data.status !== 'registered' && data.status !== 'cancelled' && !isLocked"
                                                        icon="pi pi-check"
                                                        v-tooltip.top="'Validar con Sisclin y registrar'"
                                                        text
                                                        rounded
                                                        severity="success"
                                                        size="small"
                                                        style="width: 1.4rem; height: 1.4rem"
                                                        @click="registerPatient(data)"
                                                    />

                                                    <!-- Cancel button (only for pending patients) -->
                                                    <Button
                                                        v-if="data.id && data.status !== 'cancelled' && !isLocked"
                                                        icon="pi pi-ban"
                                                        v-tooltip.top="'Marcar como cancelado'"
                                                        text
                                                        rounded
                                                        severity="secondary"
                                                        size="small"
                                                        style="width: 1.4rem; height: 1.4rem"
                                                        @click="cancelPatient(data)"
                                                    />
                                                </div>
                                            </template>
                                        </Column>

                                        <!-- Row edit controls (hidden when locked) -->
                                        <Column v-if="!isLocked" :rowEditor="true" style="width: 5rem; text-align: center" />
                                        <Column v-if="!isLocked" style="width: 2.5rem; text-align: center">
                                            <template #body="{ index }">
                                                <Button icon="pi pi-trash" text rounded severity="danger" size="small" @click="removePatient(index)" />
                                            </template>
                                        </Column>
                                    </DataTable>

                                    <!-- ADD PATIENT INLINE FORM -->
                                    <transition name="slide-down">
                                        <div v-if="showAddForm && !isLocked" class="add-patient-form mt-2 p-2 surface-50 border-round border-1 surface-border">
                                            <div class="flex gap-2 align-items-center flex-wrap">
                                                <InputText
                                                    v-model="newPatient.patient_name"
                                                    placeholder="Nombre del paciente"
                                                    class="flex-1 p-inputtext-sm"
                                                    style="min-width: 9rem"
                                                    @keyup.enter="saveNewPatient"
                                                    autofocus
                                                />
                                                <InputText
                                                    v-model="newPatient.document_number"
                                                    placeholder="DNI"
                                                    class="p-inputtext-sm"
                                                    style="width: 6rem"
                                                    @keyup.enter="saveNewPatient"
                                                />
                                                <Dropdown v-model="newPatient.modality" :options="['presencial', 'virtual']" style="width: 8.5rem" class="p-inputtext-sm" />
                                                <Button icon="pi pi-check" severity="success" size="small" :disabled="!newPatient.patient_name.trim()" :loading="processingRegistration" @click="saveNewPatient" />
                                                <Button icon="pi pi-times" text severity="secondary" size="small" @click="showAddForm = false" />
                                            </div>
                                        </div>
                                    </transition>
                                </template>
                            </div>

                            <!-- -------------------------------------------- -->
                            <!-- RIGHT PANEL: SISCLIN SHIFTS                   -->
                            <!-- -------------------------------------------- -->
                            <div class="col-12 md:col-6 pl-0 md:pl-3 pt-3 md:pt-0">
                                <div class="flex justify-content-between align-items-center mb-3">
                                    <h3 class="text-xs font-bold m-0 text-500 uppercase" style="letter-spacing: 0.06em">
                                        <i class="pi pi-cloud mr-2 text-blue-600"></i>
                                        Turnos Sisclin
                                        <span v-if="sisclinShifts.length" class="normal-case font-normal ml-1">({{ sisclinShifts.length }})</span>
                                    </h3>
                                    <Button icon="pi pi-refresh" text rounded severity="secondary" size="small" :loading="loadingSisclin" @click="fetchSisclinShifts(selectedSchedule.date)" v-tooltip="'Actualizar desde Sisclin'" />
                                </div>

                                <div v-if="loadingSisclin" class="flex justify-content-center p-5">
                                    <i class="pi pi-spin pi-spinner text-2xl text-blue-500"></i>
                                </div>

                                <DataTable
                                    v-else
                                    :value="sisclinShifts"
                                    stripedRows
                                    class="p-datatable-sm text-sm"
                                    sortField="numero_turno"
                                    :sortOrder="1"
                                    scrollable
                                    scrollHeight="320px"
                                    :paginator="sisclinShifts.length > 50"
                                    :rows="50"
                                >
                                    <template #empty>
                                        <div class="text-center p-5 text-500">
                                            <i class="pi pi-inbox text-3xl mb-2 block text-300"></i>
                                            <span class="text-sm">No hay turnos en Sisclin para esta fecha.</span>
                                        </div>
                                    </template>

                                    <Column field="numero_turno" header="#" sortable style="width: 3rem">
                                        <template #body="{ data }">
                                            <span class="font-bold text-blue-700">{{ data.numero_turno }}</span>
                                        </template>
                                    </Column>

                                    <Column header="Hora" style="width: 4.5rem" sortField="fecha_hora_turno" sortable>
                                        <template #body="{ data }">
                                            {{ data.fecha_hora_turno ? new Date(data.fecha_hora_turno).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-' }}
                                        </template>
                                    </Column>

                                    <Column field="nombre_paciente" header="Paciente" sortable></Column>

                                    <Column field="estado_turno" header="Estado" sortable style="width: 6.5rem">
                                        <template #body="{ data }">
                                            <Tag :value="data.estado_turno" :severity="getSisclinStatusSeverity(data.estado_turno)" style="font-size: 0.65rem" />
                                        </template>
                                    </Column>

                                    <Column field="numero_documento" header="Doc." style="width: 5rem">
                                        <template #body="{ data }">{{ data.numero_documento || '-' }}</template>
                                    </Column>
                                </DataTable>
                            </div>
                        </div>
                    </template>
                </Card>
            </transition>
        </div>

        <ConfirmDialog />
    </div>
</template>

<style scoped>
.filter-card {
    border-top: 4px solid var(--primary-color);
}

.detail-card {
    border-top: 3px solid var(--primary-color);
}

.legend-panel {
    padding: 0.75rem;
    background: var(--surface-50);
    border-radius: var(--border-radius);
    border: 1px solid var(--surface-border);
    min-width: 160px;
}

/* Calendar hover effect */
:deep(.fc-daygrid-day) {
    cursor: pointer;
    transition: background-color 0.15s;
}
:deep(.fc-daygrid-day:hover) {
    background-color: var(--surface-hover);
}
:deep(.fc-event) {
    cursor: pointer;
    border-radius: 4px;
    font-size: 0.75rem;
}

/* Detail panel slide-in transition */
.slide-down-enter-active {
    transition: all 0.25s ease-out;
}
.slide-down-leave-active {
    transition: all 0.15s ease-in;
}
.slide-down-enter-from,
.slide-down-leave-to {
    opacity: 0;
    transform: translateY(-12px);
}

/* Add patient form fade-in */
.add-patient-form {
    animation: fadeIn 0.15s ease-out;
}
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
