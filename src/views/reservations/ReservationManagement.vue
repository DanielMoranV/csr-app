<script setup>
import { customMigrations } from '@/api'; // Import customMigrations for Sisclin
import { doctorSchedules } from '@/api/doctorSchedules';
import { medicalSpecialties } from '@/api/medicalSpecialties';
import { reservationService } from '@/api/reservations';
import MedicalFeesService from '@/services/medicalFees/MedicalFeesService';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/vue3';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';

// PrimeVue Components
import ReservationDetailDialog from '@/components/reservations/ReservationDetailDialog.vue';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Column from 'primevue/column';
import ConfirmDialog from 'primevue/confirmdialog';
import DataTable from 'primevue/datatable';
import Dropdown from 'primevue/dropdown';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';

const toast = useToast();
const confirm = useConfirm();

// State for Filters
const specialties = ref([]);
const selectedSpecialty = ref(null);
const allDoctors = ref([]);
const filteredDoctors = ref([]);
const selectedDoctor = ref(null);
const loadingFilters = ref(false);

// State for Calendar/Schedules
const calendarRef = ref(null);
const schedules = ref([]);
const loadingSchedules = ref(false);

// State for Reservations (Local)
const selectedSchedule = ref(null); // Can be a partial object { date: '...' } or full schedule
const currentReservationList = ref(null);
const reservationPatients = ref([]);
const loadingReservations = ref(false);
const processingRegistration = ref(false);
const reservationDialogVisible = ref(false); // Dialog state

// State for Sisclin Shifts
const sisclinShifts = ref([]);
const loadingSisclin = ref(false);

// ============================================================================
// FILTERS LOGIC
// ============================================================================

const loadSpecialties = async () => {
    try {
        const response = await medicalSpecialties.getAll();
        if (response && Array.isArray(response.data)) {
            specialties.value = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
            specialties.value = response.data.data;
        }
    } catch (error) {
        console.error('Error loading specialties:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las especialidades', life: 3000 });
    }
};

const loadDoctors = async () => {
    try {
        const doctors = await MedicalFeesService.getDoctors();
        if (Array.isArray(doctors)) {
            allDoctors.value = doctors;
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los médicos', life: 3000 });
    }
};

const searchDoctors = (event) => {
    const query = event.query.toLowerCase();
    let source = allDoctors.value;

    if (selectedSpecialty.value) {
        source = source.filter((d) => Array.isArray(d.specialties) && d.specialties.some((s) => s.id === selectedSpecialty.value.id));
    }

    filteredDoctors.value = source.filter((d) => d.name.toLowerCase().includes(query));
};

watch(selectedSpecialty, () => {
    selectedDoctor.value = null;
    clearSelection();
});

watch(selectedDoctor, async (newVal) => {
    clearSelection();
    if (newVal) {
        await fetchSchedules();
    } else {
        schedules.value = [];
    }
});

const clearSelection = () => {
    schedules.value = [];
    selectedSchedule.value = null;
    currentReservationList.value = null;
    reservationPatients.value = [];
    sisclinShifts.value = [];
};

// ============================================================================
// CALENDAR LOGIC
// ============================================================================

const fetchSchedules = async () => {
    if (!selectedDoctor.value) return;

    loadingSchedules.value = true;
    try {
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().split('T')[0];

        const response = await doctorSchedules.getAll({
            doctor_id: selectedDoctor.value.id,
            start_date: startDate,
            end_date: endDate
        });

        let data = [];
        if (Array.isArray(response.data)) data = response.data;
        else if (response.data?.data) data = response.data.data;

        schedules.value = data;
    } catch (error) {
        console.error('Error fetching schedules:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar horarios', life: 3000 });
    } finally {
        loadingSchedules.value = false;
    }
};

const calendarEvents = computed(() => {
    return schedules.value.map((schedule) => ({
        id: schedule.id,
        title: getScheduleTitle(schedule),
        start: `${schedule.date}T${schedule.start_time}`,
        end: `${schedule.date}T${schedule.end_time}`,
        color: getStatusColor(schedule.status),
        extendedProps: { ...schedule }
    }));
});

const getScheduleTitle = (schedule) => {
    if (!schedule) return 'Sin Horario';
    if (schedule.medical_shift) {
        const desc = schedule.medical_shift.description.toLowerCase();
        if (desc.includes('mañana')) return 'Mañana';
        if (desc.includes('tarde')) return 'Tarde';
        if (desc.includes('noche')) return 'Noche';
    }
    if (schedule.start_time && schedule.end_time) {
        return `${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)}`;
    }
    return 'Sin Horario';
};

const getStatusColor = (status) => {
    return status === 'cancelled' ? '#ef4444' : '#3b82f6';
};

const handleEventClick = async (info) => {
    selectedSchedule.value = info.event.extendedProps;
    await Promise.all([fetchReservations(selectedSchedule.value.id), fetchSisclinShifts(selectedSchedule.value.date)]);
};

const handleDateClick = async (info) => {
    // Check if there is an event on this date?
    // Actually, fullCalendar might trigger dateClick on background, but eventClick on events.
    // If we want to allow clicking empty days:

    const dateStr = info.dateStr;
    const existingSchedule = schedules.value.find((s) => s.date === dateStr);

    if (existingSchedule) {
        // If there's a schedule, mimic event selection (though user should ideally click the event)
        selectedSchedule.value = existingSchedule;
        await Promise.all([fetchReservations(existingSchedule.id), fetchSisclinShifts(dateStr)]);
    } else {
        // No schedule, just date selection for Sisclin check
        selectedSchedule.value = {
            date: dateStr,
            id: null // No ID means no local schedule
        };
        currentReservationList.value = null;
        reservationPatients.value = [];
        await fetchSisclinShifts(dateStr);
    }
};

const calendarOptions = computed(() => ({
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth'
    },
    locale: esLocale,
    events: calendarEvents.value,
    eventClick: handleEventClick,
    dateClick: handleDateClick,
    height: 'auto',
    selectable: true
}));

// ============================================================================
// RESERVATIONS LOGIC (LOCAL)
// ============================================================================

const fetchReservations = async (scheduleId) => {
    if (!scheduleId) return;

    loadingReservations.value = true;
    currentReservationList.value = null;
    reservationPatients.value = [];

    try {
        const response = await reservationService.listDocs({ schedule_id: scheduleId });

        let docs = [];
        if (Array.isArray(response.data)) docs = response.data;
        else if (response.data?.data) docs = response.data.data;

        if (docs.length > 0) {
            const fullRes = await reservationService.getDoc(docs[0].id);
            currentReservationList.value = fullRes.data.data || fullRes.data;
            reservationPatients.value = currentReservationList.value.details || [];
        } else {
            console.log('No reservation lists found for schedule:', scheduleId);
        }
    } catch (error) {
        console.error('Error fetching reservations:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las reservas locales', life: 3000 });
    } finally {
        loadingReservations.value = false;
    }
};

const getStatusSeverity = (status) => {
    switch (status?.toLowerCase()) {
        case 'registered':
            return 'success';
        case 'provisional':
            return 'warning';
        case 'cancelled':
            return 'danger';
        default:
            return 'info';
    }
};

const handleRegisterAttendance = () => {
    if (!currentReservationList.value) return;

    confirm.require({
        message: '¿Está seguro de registrar la asistencia para este turno? Esto validará los pacientes con Sisclin.',
        header: 'Confirmar Registro',
        icon: 'pi pi-check-circle',
        acceptClass: 'p-button-success',
        accept: async () => {
            await registerAttendance();
        }
    });
};

const openReservationDialog = () => {
    reservationDialogVisible.value = true;
};

const onReservationSaved = async () => {
    reservationDialogVisible.value = false;
    if (selectedSchedule.value?.id) {
        await fetchReservations(selectedSchedule.value.id);
    }
};

const registerAttendance = async () => {
    processingRegistration.value = true;
    try {
        const payload = {
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
        };

        await reservationService.updateDoc(currentReservationList.value.id, payload);
        toast.add({ severity: 'success', summary: 'Éxito', detail: 'Asistencia registrada correctamente', life: 3000 });
        await fetchReservations(selectedSchedule.value.id); // Refresh
    } catch (error) {
        console.error('Error registering attendance:', error);
        if (error.response && error.response.status === 422) {
            const msg = error.response.data.message || 'Error de validación';
            toast.add({ severity: 'error', summary: 'Error de Validación', detail: msg, life: 5000 });
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al registrar', life: 3000 });
        }
    } finally {
        processingRegistration.value = false;
    }
};

// ============================================================================
// SISCLIN LOGIC
// ============================================================================

const fetchSisclinShifts = async (date) => {
    if (!selectedDoctor.value?.code) return; // Need service code

    loadingSisclin.value = true;
    sisclinShifts.value = [];

    try {
        const payload = {
            codigo_servicio: selectedDoctor.value.code,
            start_date: date,
            end_date: date,
            dry_run: false // Changed to false to match TariffConsultation.vue
        };

        const response = await customMigrations.getTurnosByService(payload);

        // Logic matched with TariffConsultation.vue
        if (response && response.success && response.data && Array.isArray(response.data.data)) {
            sisclinShifts.value = response.data.data;
        } else {
            sisclinShifts.value = [];
        }
    } catch (error) {
        console.error('Error fetching Sisclin shifts:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los turnos de Sisclin', life: 3000 });
        sisclinShifts.value = [];
    } finally {
        loadingSisclin.value = false;
    }
};

const getSisclinStatusSeverity = (estado) => {
    const map = {
        ATENDIDO: 'success',
        PENDIENTE: 'warning',
        ANULADO: 'danger',
        CITADO: 'info'
    };
    return map[estado] || 'secondary';
};

onMounted(() => {
    loadSpecialties();
    loadDoctors();
});
</script>

<template>
    <div class="reservation-management">
        <div class="card mb-4 filter-card">
            <h2 class="text-xl font-bold mb-3">Gestión de Reservas</h2>
            <div class="flex flex-wrap gap-4 align-items-end">
                <div class="flex-column gap-2 flex">
                    <label class="font-bold text-sm">Especialidad</label>
                    <Dropdown v-model="selectedSpecialty" :options="specialties" optionLabel="name" placeholder="Seleccione Especialidad" filter showClear class="w-full md:w-20rem" />
                </div>
                <div class="flex-column gap-2 flex">
                    <label class="font-bold text-sm">Médico</label>
                    <AutoComplete v-model="selectedDoctor" :suggestions="filteredDoctors" @complete="searchDoctors" optionLabel="name" dropdown placeholder="Buscar Médico" class="w-full md:w-20rem" />
                </div>
            </div>
        </div>

        <div v-if="selectedDoctor" class="grid fadein animation-duration-300">
            <!-- LEFT PANEL: CALENDAR -->
            <div class="col-12 xl:col-5">
                <Card>
                    <template #title>Calendario de Turnos</template>
                    <template #content>
                        <div class="calendar-wrapper">
                            <FullCalendar ref="calendarRef" :options="calendarOptions" />
                        </div>
                    </template>
                </Card>
            </div>

            <!-- RIGHT PANEL: DETAILS -->
            <div class="col-12 xl:col-7">
                <Card class="h-full" :pt="{ body: { class: 'p-0' }, content: { class: 'h-full p-0' } }">
                    <template #title>
                        <div class="p-3 border-bottom-1 surface-border">
                            <span>
                                Detalle del Turno
                                <span v-if="selectedSchedule" class="text-base font-normal text-500 ml-2"> {{ selectedSchedule.date }} ({{ getScheduleTitle(selectedSchedule) }}) </span>
                            </span>
                        </div>
                    </template>
                    <template #content>
                        <div v-if="!selectedSchedule" class="flex flex-column align-items-center justify-content-center p-5 text-gray-500 h-full">
                            <i class="pi pi-calendar text-4xl mb-3"></i>
                            <p>Seleccione un día del calendario para ver los detalles.</p>
                        </div>

                        <Splitter v-else class="border-none h-full" style="min-height: 600px">
                            <!-- PANEL 1: LOCAL RESERVATIONS -->
                            <SplitterPanel :size="50" class="overflow-auto custom-scrollbar">
                                <div class="p-3">
                                    <div class="flex align-items-center justify-content-between mb-3">
                                        <h3 class="text-lg font-bold m-0 text-700">
                                            <i class="pi pi-file-edit mr-2 text-primary"></i>
                                            Gestión de Asistencia
                                        </h3>
                                        <div v-if="selectedSchedule.id" class="flex align-items-center gap-2">
                                            <Button v-if="!currentReservationList || currentReservationList.status !== 'registered'" label="Gestionar Pacientes" icon="pi pi-users" size="small" @click="openReservationDialog" />

                                            <div v-if="currentReservationList" class="flex align-items-center gap-2">
                                                <Tag :value="currentReservationList.status" :severity="getStatusSeverity(currentReservationList.status)" />
                                                <Button
                                                    v-if="currentReservationList.status !== 'registered'"
                                                    label="Cerrar y Registrar"
                                                    icon="pi pi-check-circle"
                                                    severity="success"
                                                    size="small"
                                                    @click="handleRegisterAttendance"
                                                    :loading="processingRegistration"
                                                    :disabled="reservationPatients.length === 0"
                                                />
                                                <Tag v-else severity="success" value="Validado" icon="pi pi-lock" />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- NO SCHEDULE / EMPTY STATE -->
                                    <div v-if="!selectedSchedule.id" class="text-center p-4 surface-50 border-round border-1 surface-border">
                                        <i class="pi pi-info-circle text-orange-500 text-2xl mb-2"></i>
                                        <p class="font-medium m-0">No hay horario local.</p>
                                    </div>

                                    <!-- LOADING / NO DATA for Existing Schedule -->
                                    <div v-else-if="loadingReservations" class="flex justify-content-center p-3">
                                        <i class="pi pi-spin pi-spinner text-2xl"></i>
                                    </div>
                                    <div v-else-if="!currentReservationList" class="text-center p-4">
                                        <p class="text-gray-500">No se han registrado pacientes.</p>
                                    </div>

                                    <!-- DATA TABLE -->
                                    <DataTable v-else :value="reservationPatients" stripedRows responsiveLayout="scroll" class="p-datatable-sm text-sm" sortField="turn_number" :sortOrder="1" scrollable scrollHeight="250px">
                                        <Column field="turn_number" header="Turno" sortable style="width: 4rem">
                                            <template #body="{ data }">
                                                <div class="flex justify-content-center font-bold">{{ data.turn_number }}</div>
                                            </template>
                                        </Column>
                                        <Column field="patient_name" header="Paciente" sortable></Column>
                                        <Column field="document_number" header="DNI/Doc" sortable style="width: 7rem"></Column>
                                        <Column field="modality" header="Modalidad" style="width: 7rem">
                                            <template #body="{ data }">
                                                <Tag :value="data.modality" :severity="data.modality === 'presencial' ? 'info' : 'warning'" style="font-size: 0.75rem" />
                                            </template>
                                        </Column>
                                        <Column header="Validación" style="width: 5rem" v-if="currentReservationList.status === 'registered'">
                                            <template #body="{ data }">
                                                <i v-if="data.is_out_of_schedule" class="pi pi-exclamation-triangle text-orange-500" v-tooltip="'Encontrado pero fuera de horario'"></i>
                                                <i v-else class="pi pi-check text-green-500" v-tooltip="'Validado OK'"></i>
                                            </template>
                                        </Column>
                                    </DataTable>
                                </div>
                            </SplitterPanel>

                            <!-- PANEL 2: SISCLIN SHIFTS -->
                            <SplitterPanel :size="50" class="overflow-auto custom-scrollbar">
                                <div class="p-3 bg-blue-50 h-full">
                                    <div class="flex justify-content-between align-items-center mb-3">
                                        <h3 class="text-lg font-bold m-0 text-700">
                                            <i class="pi pi-cloud mr-2 text-blue-600"></i>
                                            Turnos en Sisclin
                                        </h3>
                                        <div class="flex align-items-center gap-2">
                                            <span class="text-sm text-gray-600 font-medium"> Total: {{ sisclinShifts.length }} </span>
                                            <Button icon="pi pi-refresh" text rounded severity="secondary" @click="fetchSisclinShifts(selectedSchedule.date)" v-tooltip="'Actualizar'" />
                                        </div>
                                    </div>

                                    <div v-if="loadingSisclin" class="flex justify-content-center p-3">
                                        <i class="pi pi-spin pi-spinner text-2xl text-blue-500"></i>
                                    </div>

                                    <DataTable v-else :value="sisclinShifts" stripedRows responsiveLayout="scroll" class="p-datatable-sm text-sm shadow-1" paginator :rows="100" sortField="numero_turno" :sortOrder="1" scrollable scrollHeight="flex">
                                        <template #empty>
                                            <div class="text-center p-3 text-gray-500">No hay turnos registrados en Sisclin.</div>
                                        </template>

                                        <Column field="numero_turno" header="Turno" sortable style="width: 4rem">
                                            <template #body="{ data }">
                                                <span class="font-bold text-blue-700">{{ data.numero_turno }}</span>
                                            </template>
                                        </Column>
                                        <Column field="hora_turno" header="Hora" sortable style="width: 5rem">
                                            <template #body="{ data }">
                                                {{ data.fecha_hora_turno ? new Date(data.fecha_hora_turno).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-' }}
                                            </template>
                                        </Column>
                                        <Column field="nombre_paciente" header="Paciente" sortable></Column>
                                        <Column field="estado_turno" header="Estado" sortable style="width: 7rem">
                                            <template #body="{ data }">
                                                <Tag :value="data.estado_turno" :severity="getSisclinStatusSeverity(data.estado_turno)" style="font-size: 0.75rem" />
                                            </template>
                                        </Column>
                                        <Column field="numero_documento" header="Admisión" sortable style="width: 6rem">
                                            <template #body="{ data }">{{ data.numero_documento || '-' }}</template>
                                        </Column>
                                    </DataTable>
                                </div>
                            </SplitterPanel>
                        </Splitter>
                    </template>
                </Card>
            </div>
        </div>

        <div v-else class="flex flex-column align-items-center justify-content-center p-8 mt-4 surface-card border-round shadow-1">
            <i class="pi pi-user-edit text-6xl text-primary-300 mb-4"></i>
            <h2 class="text-2xl font-medium text-900 mb-2">Seleccione un Médico</h2>
            <p class="text-500 text-center max-w-sm">Para comenzar a gestionar reservas, primero seleccione una especialidad y un médico utilizando los filtros superiores.</p>
        </div>

        <ConfirmDialog />

        <!-- DIALOG COMPONENT -->
        <ReservationDetailDialog
            v-if="selectedDoctor && selectedSchedule"
            v-model:visible="reservationDialogVisible"
            :reservation="currentReservationList"
            :doctor-id="selectedDoctor.id"
            :doctor-schedule-id="selectedSchedule.id || 0"
            :schedule-date="selectedSchedule.date"
            @saved="onReservationSaved"
        />
    </div>
</template>

<style scoped>
.filter-card {
    border-top: 4px solid var(--primary-color);
}

.calendar-wrapper {
    /* Style local overrides for FullCalendar if needed */
    --fc-border-color: var(--surface-border);
    --fc-button-bg-color: var(--primary-color);
    --fc-button-border-color: var(--primary-color);
    --fc-button-hover-bg-color: var(--primary-600);
}

:deep(.fc-daygrid-day) {
    cursor: pointer;
    transition: background-color 0.2s;
}

:deep(.fc-daygrid-day:hover) {
    background-color: var(--surface-hover);
}
</style>
