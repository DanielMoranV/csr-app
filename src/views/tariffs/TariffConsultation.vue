<script setup>
import { customMigrations } from '@/api';
import { medicalSpecialties } from '@/api/medicalSpecialties';
import { reservationService } from '@/api/reservations';
import ReservationDetailDialog from '@/components/reservations/ReservationDetailDialog.vue';
import { useTariffConsultation } from '@/composables/useTariffConsultation';
import MedicalFeesService from '@/services/medicalFees/MedicalFeesService';
import { useDebounceFn } from '@vueuse/core';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { computed, onMounted, ref, watch } from 'vue';
import * as XLSX from 'xlsx';

// Composable
const { tariffs, isLoading, fetchTariffs, searchTariffs } = useTariffConsultation();

const searchQuery = ref('');
const selectedSpecialty = ref(null);
const selectedDoctor = ref(null);
const specialties = ref([]);
const allDoctors = ref([]);
const loadingFilters = ref(false);
const scheduleModalVisible = ref(false);

// Reservation Logic
const reservationDialogVisible = ref(false);
const currentReservation = ref(null);
const selectedScheduleId = ref(null);
const selectedScheduleDate = ref('');

const handleScheduleClick = async (event) => {
    // event comes from DoctorScheduleModal: { id, date, doctor_id, ... }
    selectedScheduleId.value = event.id;
    // Format date for display
    const d = new Date(event.date);
    selectedScheduleDate.value = d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Check if reservation list exists for this schedule
    try {
        console.log('Checking reservation for schedule:', event.id);
        // We use the list endpoint filtering by schedule_id (as per user clarification)
        const response = await reservationService.listDocs({
            schedule_id: event.id
        });

        console.log('Reservation check response:', response.data);

        let reservations = [];
        // Handle response.data being the array directly or wrapped in data property
        if (Array.isArray(response.data)) {
            reservations = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
            reservations = response.data.data;
        }

        if (reservations.length > 0) {
            // Edit existing (take the first one found - usually 1 per schedule)
            // We need to fetch full details including patients
            const fullRes = await reservationService.getDoc(reservations[0].id);

            // Handle response structure (direct object or wrapped in data)
            currentReservation.value = fullRes.data.data || fullRes.data;
        } else {
            // New reservation
            currentReservation.value = null;
        }

        reservationDialogVisible.value = true;
    } catch (error) {
        console.error('Error checking reservation:', error);
        // On error, we might assume no reservation or show error
        // Let's allow creating new one if check fails or assume none
        currentReservation.value = null;
        reservationDialogVisible.value = true;
    }
};

const onReservationSaved = () => {
    // Optionally refresh something, or just close
    reservationDialogVisible.value = false;
};

// Shift List Logic
const shiftModalVisible = ref(false);
const shiftList = ref([]);
const loadingShifts = ref(false);
const selectedShiftDate = ref(new Date());

const showShiftList = async () => {
    if (selectedDoctor.value) {
        shiftModalVisible.value = true;
        // Reset date to today if needed or keep last selected
        if (!selectedShiftDate.value) {
            selectedShiftDate.value = new Date();
        }
        await fetchDoctorShifts();
    }
};

const fetchDoctorShifts = async () => {
    if (!selectedDoctor.value || !selectedShiftDate.value) return;

    try {
        loadingShifts.value = true;

        // Format date to YYYY-MM-DD
        const date = selectedShiftDate.value;
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        const payload = {
            codigo_servicio: selectedDoctor.value.code, // Assuming doctor.code is the service code
            start_date: formattedDate,
            end_date: formattedDate,
            dry_run: false
        };

        const response = await customMigrations.getTurnosByService(payload);

        if (response && response.success && response.data && Array.isArray(response.data.data)) {
            shiftList.value = response.data.data;
        } else {
            shiftList.value = [];
        }
    } catch (error) {
        console.error('Error fetching shifts:', error);
        shiftList.value = [];
    } finally {
        loadingShifts.value = false;
    }
};

// Watch for date changes in the modal
watch(selectedShiftDate, async (newDate) => {
    if (shiftModalVisible.value && newDate) {
        await fetchDoctorShifts();
    }
});

// Búsqueda con debounce
const debouncedSearch = useDebounceFn(async (query) => {
    // Solo buscar si hay 3 o más caracteres, o si está vacío (para mostrar todos)
    if (query.trim() === '' || query.trim().length >= 3) {
        await searchTariffs(query);
    }
}, 300);

watch(searchQuery, (newQuery) => {
    debouncedSearch(newQuery);
});

// Médicos filtrados por especialidad
const filteredDoctors = computed(() => {
    if (!selectedSpecialty.value) {
        return allDoctors.value;
    }

    const filtered = allDoctors.value.filter((doctor) => {
        // Los médicos tienen un array de especialidades
        if (Array.isArray(doctor.specialties)) {
            return doctor.specialties.some((specialty) => specialty.id === selectedSpecialty.value.id);
        }
        return false;
    });

    return filtered;
});

// Tarifarios filtrados
const filteredTariffs = computed(() => {
    let result = tariffs.value;

    // Filtrar por doctor seleccionado
    if (selectedDoctor.value) {
        result = result.filter((tariff) => tariff.is_personalized && tariff.doctor_code === selectedDoctor.value.code);
    }
    // Si no hay doctor pero hay especialidad, mostrar todos los tarifarios de doctores de esa especialidad
    else if (selectedSpecialty.value) {
        const specialtyDoctorCodes = filteredDoctors.value.map((d) => d.code);
        result = result.filter((tariff) => tariff.is_personalized && specialtyDoctorCodes.includes(tariff.doctor_code));
    }

    return result;
});

// Cargar especialidades
const loadSpecialties = async () => {
    try {
        loadingFilters.value = true;
        const response = await medicalSpecialties.getAll();

        // Validar que response.data sea un array
        if (response && Array.isArray(response.data)) {
            specialties.value = response.data;
        } else if (response && response.data && Array.isArray(response.data.data)) {
            specialties.value = response.data.data;
        } else {
            specialties.value = [];
        }
    } catch (error) {
        specialties.value = [];
    } finally {
        loadingFilters.value = false;
    }
};

// Cargar médicos
const loadDoctors = async () => {
    try {
        loadingFilters.value = true;
        const doctors = await MedicalFeesService.getDoctors();

        // Validar que doctors sea un array
        if (Array.isArray(doctors)) {
            allDoctors.value = doctors;
        } else {
            allDoctors.value = [];
        }
    } catch (error) {
        allDoctors.value = [];
    } finally {
        loadingFilters.value = false;
    }
};

// Limpiar filtros
const clearFilters = () => {
    selectedSpecialty.value = null;
    selectedDoctor.value = null;
    searchQuery.value = '';
};

// Watch para limpiar doctor cuando cambia especialidad
watch(selectedSpecialty, () => {
    selectedDoctor.value = null;
});

// Mostrar horarios del doctor
const showDoctorSchedules = () => {
    if (selectedDoctor.value) {
        scheduleModalVisible.value = true;
    }
};

// Inicialización
onMounted(async () => {
    await Promise.all([fetchTariffs(), loadSpecialties(), loadDoctors()]);
});

// Formateo de moneda
const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    return `S/ ${parseFloat(value).toFixed(2)}`;
};

// Helper methods for shift modal
const getEstadoSeverity = (estado) => {
    const estadoMap = {
        ATENDIDO: 'success',
        PENDIENTE: 'warning',
        CANCELADO: 'danger',
        EN_PROCESO: 'info'
    };
    return estadoMap[estado] || 'secondary';
};

const getEstadoIcon = (estado) => {
    const iconMap = {
        ATENDIDO: 'pi-check-circle',
        PENDIENTE: 'pi-clock',
        CANCELADO: 'pi-times-circle',
        EN_PROCESO: 'pi-spinner'
    };
    return iconMap[estado] || 'pi-circle';
};

// Exportar a Excel
const exportToExcel = () => {
    if (!filteredTariffs.value.length) return;

    // Preparar datos
    const data = filteredTariffs.value.map((t) => ({
        Código: t.code,
        Nombre: t.name,
        'Comisión Clínica': t.clinic_commission ? parseFloat(t.clinic_commission) : 0,
        'Comisión Doctor': t.doctor_commission ? parseFloat(t.doctor_commission) : 0,
        Total: parseFloat(t.total),
        Doctor: t.doctor_name || '-',
        'Cód. Doctor': t.doctor_code || '-',
        Personalizado: t.is_personalized ? 'SI' : 'NO'
    }));

    // Crear hoja
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tarifarios');

    // Ajustar anchos de columna
    const wscols = [
        { wch: 15 }, // Código
        { wch: 50 }, // Nombre
        { wch: 15 }, // Com. Clínica
        { wch: 15 }, // Com. Doctor
        { wch: 15 }, // Total
        { wch: 30 }, // Doctor
        { wch: 15 }, // Cód. Doctor
        { wch: 12 } // Personalizado
    ];
    ws['!cols'] = wscols;

    // Generar archivo
    XLSX.writeFile(wb, `reporte_tarifarios_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
</script>

<template>
    <div class="tariff-consultation-view">
        <div class="main-card">
            <!-- Header Principal -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-search"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Consulta de Tarifarios</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-info-circle mr-2"></i>
                        Búsqueda de tarifarios generales y personalizados por doctor
                    </p>
                </div>
            </div>

            <!-- Filtros -->
            <div class="filters-section mb-4">
                <div class="filters-grid">
                    <!-- Filtro por Especialidad -->
                    <div class="filter-item">
                        <label class="filter-label">
                            <i class="pi pi-heart mr-2"></i>
                            Especialidad
                        </label>
                        <Dropdown
                            v-model="selectedSpecialty"
                            :options="specialties"
                            optionLabel="name"
                            placeholder="Todas las especialidades"
                            :loading="loadingFilters"
                            :showClear="true"
                            :filter="true"
                            :editable="true"
                            filterPlaceholder="Buscar especialidad..."
                            class="w-full"
                        />
                    </div>

                    <!-- Filtro por Doctor -->
                    <div class="filter-item">
                        <label class="filter-label">
                            <i class="pi pi-user mr-2"></i>
                            Doctor
                        </label>
                        <div class="doctor-filter-wrapper">
                            <Dropdown
                                v-model="selectedDoctor"
                                :options="filteredDoctors"
                                optionLabel="name"
                                placeholder="Todos los doctores"
                                :loading="loadingFilters"
                                :showClear="true"
                                :disabled="!selectedSpecialty && filteredDoctors.length === 0"
                                :filter="true"
                                :editable="true"
                                filterPlaceholder="Buscar doctor..."
                                class="flex-1"
                            >
                                <template #value="slotProps">
                                    <div v-if="slotProps.value" class="flex align-items-center gap-2">
                                        <span>{{ slotProps.value.name }}</span>
                                        <span class="text-xs text-gray-400">({{ slotProps.value.code }})</span>
                                    </div>
                                    <span v-else>{{ slotProps.placeholder }}</span>
                                </template>
                                <template #option="slotProps">
                                    <div class="flex align-items-center gap-2">
                                        <span>{{ slotProps.option.name }}</span>
                                        <span class="text-xs text-gray-400">({{ slotProps.option.code }})</span>
                                    </div>
                                </template>
                            </Dropdown>
                            <Button v-if="selectedDoctor" icon="pi pi-calendar" severity="secondary" outlined @click="showDoctorSchedules" v-tooltip.top="'Ver horarios del mes actual'" class="schedule-btn" />
                            <Button v-if="selectedDoctor" icon="pi pi-list" severity="info" outlined @click="showShiftList" v-tooltip.top="'Ver lista de turnos'" class="schedule-btn" />
                        </div>
                    </div>

                    <!-- Búsqueda -->
                    <div class="filter-item filter-search">
                        <label class="filter-label">
                            <i class="pi pi-search mr-2"></i>
                            Búsqueda
                        </label>
                        <IconField iconPosition="left" class="w-full">
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="searchQuery" placeholder="Código, nombre o doctor..." class="w-full" />
                        </IconField>
                    </div>
                </div>

                <!-- Botón limpiar filtros -->
                <div v-if="selectedSpecialty || selectedDoctor || searchQuery" class="mt-3">
                    <button @click="clearFilters" class="clear-filters-btn">
                        <i class="pi pi-times mr-2"></i>
                        Limpiar filtros
                    </button>
                </div>
            </div>

            <!-- DataTable -->
            <DataTable :value="filteredTariffs" :loading="isLoading || loadingFilters" :paginator="true" :rows="25" :rowsPerPageOptions="[25, 50, 100]" responsiveLayout="scroll" stripedRows showGridlines sortField="code" :sortOrder="1">
                <template #header>
                    <div class="flex justify-content-end">
                        <Button icon="pi pi-file-excel" label="Exportar Excel" severity="success" @click="exportToExcel" :disabled="!filteredTariffs.length" />
                    </div>
                </template>
                <template #empty>
                    <div class="text-center p-4">
                        <i class="pi pi-inbox text-4xl text-gray-400 mb-3"></i>
                        <p class="text-gray-500">No se encontraron tarifarios</p>
                        <p class="text-sm text-gray-400">Intenta con otro término de búsqueda</p>
                    </div>
                </template>

                <Column field="code" header="Código" :sortable="true" style="min-width: 120px">
                    <template #body="{ data }">
                        <span class="font-mono font-semibold">{{ data.code }}</span>
                    </template>
                </Column>

                <Column field="name" header="Nombre del Tarifario" :sortable="true" style="min-width: 300px">
                    <template #body="{ data }">
                        <div class="flex align-items-center gap-2">
                            <span>{{ data.name }}</span>
                            <i v-if="data.is_personalized" v-tooltip.top="'Tarifario personalizado por doctor'" class="pi pi-user-edit text-primary" style="font-size: 0.875rem"></i>
                        </div>
                    </template>
                </Column>

                <Column field="clinic_commission" header="Clínica" :sortable="true" style="min-width: 130px">
                    <template #body="{ data }">
                        <span :class="{ 'text-gray-400': !data.clinic_commission }">{{ formatCurrency(data.clinic_commission) }}</span>
                    </template>
                </Column>

                <Column field="doctor_commission" header="Médico" :sortable="true" style="min-width: 130px">
                    <template #body="{ data }">
                        <span :class="{ 'text-gray-400': !data.doctor_commission }">{{ formatCurrency(data.doctor_commission) }}</span>
                    </template>
                </Column>

                <Column field="total" header="Total" :sortable="true" style="min-width: 130px">
                    <template #body="{ data }">
                        <strong class="text-primary">{{ formatCurrency(data.total) }}</strong>
                    </template>
                </Column>

                <Column field="doctor_name" header="Doctor" :sortable="true" style="min-width: 250px">
                    <template #body="{ data }">
                        <div v-if="data.is_personalized" class="flex align-items-center gap-2">
                            <i class="pi pi-user text-primary"></i>
                            <span>{{ data.doctor_name }}</span>
                        </div>
                        <span v-else class="text-gray-400">-</span>
                    </template>
                </Column>

                <Column field="doctor_code" header="Cód. Doctor" :sortable="true" style="min-width: 130px">
                    <template #body="{ data }">
                        <span v-if="data.doctor_code" class="font-mono">{{ data.doctor_code }}</span>
                        <span v-else class="text-gray-400">-</span>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Doctor Schedule Modal -->
        <DoctorScheduleModal v-model:visible="scheduleModalVisible" :doctor-id="selectedDoctor?.id" :doctor-name="selectedDoctor?.name" @schedule-click="handleScheduleClick" />

        <!-- Reservation Detail Dialog -->
        <ReservationDetailDialog
            v-model:visible="reservationDialogVisible"
            :reservation="currentReservation"
            :doctor-id="selectedDoctor?.id || 0"
            :doctor-schedule-id="selectedScheduleId || 0"
            :schedule-date="selectedScheduleDate"
            @saved="onReservationSaved"
        />

        <!-- Shift List Modal -->
        <Dialog v-model:visible="shiftModalVisible" modal :style="{ width: '90vw', maxWidth: '1200px' }" :breakpoints="{ '1400px': '95vw', '960px': '98vw' }" class="shift-modal">
            <template #header>
                <div class="shift-modal-header">
                    <div class="header-top">
                        <div class="header-title-section">
                            <i class="pi pi-calendar-clock text-primary mr-2"></i>
                            <div>
                                <h3 class="modal-title">Lista de Turnos</h3>
                                <p class="modal-subtitle">{{ selectedDoctor?.name }}</p>
                            </div>
                        </div>
                        <div class="header-actions">
                            <div class="date-picker-wrapper">
                                <label class="date-label">
                                    <i class="pi pi-calendar mr-1"></i>
                                    Fecha:
                                </label>
                                <Calendar v-model="selectedShiftDate" dateFormat="dd/mm/yy" :showIcon="true" iconDisplay="input" class="compact-calendar" placeholder="Seleccionar fecha" />
                            </div>
                            <Button icon="pi pi-refresh" severity="secondary" outlined rounded @click="fetchDoctorShifts" :loading="loadingShifts" v-tooltip.top="'Actualizar lista'" />
                        </div>
                    </div>

                    <!-- Stats Bar -->
                    <div v-if="!loadingShifts && shiftList.length > 0" class="stats-bar">
                        <div class="stat-item">
                            <i class="pi pi-list"></i>
                            <span class="stat-value">{{ shiftList.length }}</span>
                            <span class="stat-label">Turnos</span>
                        </div>
                        <div class="stat-item">
                            <i class="pi pi-check-circle text-green-500"></i>
                            <span class="stat-value">{{ shiftList.filter((s) => s.estado_turno === 'ATENDIDO').length }}</span>
                            <span class="stat-label">Atendidos</span>
                        </div>
                        <div class="stat-item">
                            <i class="pi pi-clock text-orange-500"></i>
                            <span class="stat-value">{{ shiftList.filter((s) => s.estado_turno === 'PENDIENTE').length }}</span>
                            <span class="stat-label">Pendientes</span>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Loading State -->
            <div v-if="loadingShifts" class="loading-state">
                <i class="pi pi-spin pi-spinner text-5xl text-primary mb-3"></i>
                <p class="text-lg font-semibold">Cargando turnos...</p>
                <p class="text-sm text-gray-500">Por favor espere</p>
            </div>

            <!-- Data Table -->
            <DataTable v-else :value="shiftList" :paginator="true" :rows="15" :rowsPerPageOptions="[10, 15, 25, 50]" stripedRows showGridlines responsiveLayout="scroll" class="shift-table" sortField="numero_turno" :sortOrder="1">
                <template #empty>
                    <div class="empty-state">
                        <i class="pi pi-inbox text-6xl text-gray-300 mb-4"></i>
                        <h4 class="text-xl font-semibold mb-2">No hay turnos registrados</h4>
                        <p class="text-gray-500">No se encontraron turnos para la fecha seleccionada.</p>
                        <p class="text-sm text-gray-400 mt-2">Intenta seleccionar otra fecha</p>
                    </div>
                </template>

                <Column field="numero_turno" header="N° Turno" :sortable="true" style="min-width: 100px">
                    <template #body="{ data }">
                        <div class="turno-badge">
                            <i class="pi pi-hashtag text-xs"></i>
                            <span class="font-mono font-bold">{{ data.numero_turno }}</span>
                        </div>
                    </template>
                </Column>
                <!-- 
                <Column field="fecha_hora_turno" header="Hora" :sortable="true" style="min-width: 100px">
                    <template #body="{ data }">
                        <div class="time-cell">
                            <i class="pi pi-clock text-primary mr-1"></i>
                            <span>{{ data.fecha_hora_turno ? new Date(data.fecha_hora_turno).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '-' }}</span>
                        </div>
                    </template>
                </Column> -->

                <Column field="nombre_paciente" header="Paciente" :sortable="true" style="min-width: 250px">
                    <template #body="{ data }">
                        <div class="patient-cell">
                            <i class="pi pi-user text-primary mr-2"></i>
                            <span class="font-medium">{{ data.nombre_paciente }}</span>
                        </div>
                    </template>
                </Column>

                <Column field="tipo_turno" header="Tipo" :sortable="true" style="min-width: 180px">
                    <template #body="{ data }">
                        <div class="tipo-cell">
                            <i class="pi pi-tag mr-1"></i>
                            <span class="text-sm">{{ data.tipo_turno || '-' }}</span>
                        </div>
                    </template>
                </Column>

                <Column field="estado_turno" header="Estado" :sortable="true" style="min-width: 130px">
                    <template #body="{ data }">
                        <Tag :value="data.estado_turno" :severity="getEstadoSeverity(data.estado_turno)" :icon="getEstadoIcon(data.estado_turno)" />
                    </template>
                </Column>

                <Column field="usuario_creacion" header="Asignado por" :sortable="true" style="min-width: 150px">
                    <template #body="{ data }">
                        <div class="user-cell">
                            <i class="pi pi-user-edit text-gray-400 mr-1"></i>
                            <span class="text-sm">{{ data.usuario_creacion || '-' }}</span>
                        </div>
                    </template>
                </Column>
            </DataTable>

            <template #footer>
                <div class="shift-modal-footer">
                    <div class="footer-info">
                        <i class="pi pi-info-circle mr-2"></i>
                        <span v-if="shiftList.length" class="text-sm">
                            Mostrando <strong>{{ shiftList.length }}</strong> {{ shiftList.length === 1 ? 'turno' : 'turnos' }}
                        </span>
                    </div>
                    <Button label="Cerrar" icon="pi pi-times" @click="shiftModalVisible = false" text severity="secondary" />
                </div>
            </template>
        </Dialog>
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

/* ============================================================================
   MAIN CONTAINER
   ============================================================================ */
.tariff-consultation-view {
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
    background: linear-gradient(90deg, #3b82f6, #2563eb, #3b82f6, #1d4ed8);
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
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
    box-shadow:
        0 8px 20px rgba(59, 130, 246, 0.3),
        0 4px 12px rgba(37, 99, 235, 0.4);
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
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
    box-shadow:
        0 8px 20px rgba(96, 165, 250, 0.4),
        0 4px 12px rgba(59, 130, 246, 0.5);
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.dark) .header-title {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
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

/* ============================================================================
   SEARCH SECTION
   ============================================================================ */
.search-section {
    margin-bottom: 1.5rem;
}

/* ============================================================================
   FILTERS SECTION
   ============================================================================ */
.filters-section {
    margin-bottom: 1.5rem;
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
    margin-bottom: 0.5rem;
}

.filter-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.filter-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
    display: flex;
    align-items: center;
}

.filter-label i {
    color: var(--primary-color);
}

.doctor-filter-wrapper {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.doctor-filter-wrapper .flex-1 {
    flex: 1;
}

.schedule-btn {
    flex-shrink: 0;
    height: 2.75rem;
}

.clear-filters-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    color: var(--text-color);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.clear-filters-btn:hover {
    background: var(--surface-hover);
    border-color: var(--primary-color);
    color: var(--primary-color);
}

:global(.dark) .clear-filters-btn {
    background: rgba(255, 255, 255, 0.05);
}

:global(.dark) .clear-filters-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

/* ============================================================================
   FOOTER STATS
   ============================================================================ */
.footer-stats {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--surface-border);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    transition: all 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:global(.dark) .stat-card {
    background: rgba(255, 255, 255, 0.02);
}

.stat-icon {
    font-size: 2rem;
    color: var(--primary-color);
}

.stat-content {
    display: flex;
    flex-direction: column;
}

.stat-label {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    margin-bottom: 0.25rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
}

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */
@media (max-width: 768px) {
    .tariff-consultation-view {
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

    .stats-grid {
        grid-template-columns: 1fr;
    }
}

/* ============================================================================
   SHIFT MODAL STYLES
   ============================================================================ */
.shift-modal-header {
    width: 100%;
}

.header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.header-title-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.header-title-section i {
    font-size: 1.75rem;
}

.modal-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
    line-height: 1.2;
}

.modal-subtitle {
    margin: 0.25rem 0 0 0;
    font-size: 0.875rem;
    color: var(--text-color-secondary);
    font-weight: 500;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.date-picker-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.date-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
    display: flex;
    align-items: center;
    white-space: nowrap;
}

.compact-calendar {
    min-width: 180px;
}

/* Stats Bar */
.stats-bar {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-ground);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--surface-card);
    border-radius: 6px;
    flex: 1;
    min-width: 0;
}

.stat-item i {
    font-size: 1.25rem;
    color: var(--primary-color);
}

.stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
}

.stat-label {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Loading State */
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
}

/* Empty State */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
}

/* Table Cells */
.turno-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    background: var(--primary-color);
    color: white;
    border-radius: 6px;
    font-size: 0.875rem;
}

.time-cell,
.patient-cell,
.tipo-cell,
.user-cell {
    display: flex;
    align-items: center;
}

.patient-cell {
    font-size: 0.95rem;
}

.tipo-cell {
    color: var(--text-color-secondary);
}

.user-cell {
    font-size: 0.875rem;
}

/* Modal Footer */
.shift-modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 1rem;
}

.footer-info {
    display: flex;
    align-items: center;
    color: var(--text-color-secondary);
}

/* Responsive Shift Modal */
@media (max-width: 960px) {
    .header-top {
        flex-direction: column;
        align-items: stretch;
    }

    .header-actions {
        justify-content: space-between;
    }

    .stats-bar {
        flex-direction: column;
        gap: 0.5rem;
    }

    .stat-item {
        justify-content: center;
    }
}

/* Mobile Portrait Optimizations */
@media (max-width: 640px) {
    /* Modal adjustments */
    .shift-modal :deep(.p-dialog) {
        margin: 0.5rem;
    }

    .shift-modal :deep(.p-dialog-content) {
        padding: 0.75rem;
    }

    /* Compact header */
    .modal-title {
        font-size: 1.1rem;
        line-height: 1.3;
    }

    .modal-subtitle {
        font-size: 0.75rem;
        line-height: 1.2;
    }

    .header-title-section i {
        font-size: 1.25rem;
    }

    /* Stats bar - more compact */
    .stats-bar {
        padding: 0.5rem;
        gap: 0.375rem;
    }

    .stat-item {
        padding: 0.375rem 0.5rem;
        gap: 0.375rem;
    }

    .stat-item i {
        font-size: 1rem;
    }

    .stat-value {
        font-size: 1rem;
    }

    .stat-label {
        font-size: 0.65rem;
    }

    /* Date picker - full width stacked */
    .date-picker-wrapper {
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        gap: 0.375rem;
    }

    .date-label {
        font-size: 0.75rem;
    }

    .compact-calendar {
        width: 100%;
        min-width: auto;
    }

    .compact-calendar :deep(.p-inputtext) {
        font-size: 0.875rem;
        padding: 0.5rem;
    }

    /* Refresh button - full width on very small screens */
    .header-actions {
        gap: 0.5rem;
    }

    /* Table optimizations */
    .shift-table :deep(.p-datatable-wrapper) {
        font-size: 0.8rem;
    }

    .shift-table :deep(.p-datatable-thead > tr > th) {
        padding: 0.5rem 0.375rem;
        font-size: 0.75rem;
    }

    .shift-table :deep(.p-datatable-tbody > tr > td) {
        padding: 0.5rem 0.375rem;
    }

    /* Compact table cells */
    .turno-badge {
        padding: 0.2rem 0.5rem;
        font-size: 0.75rem;
    }

    .turno-badge i {
        font-size: 0.65rem;
    }

    .time-cell,
    .patient-cell,
    .tipo-cell,
    .user-cell {
        font-size: 0.8rem;
    }

    .time-cell i,
    .patient-cell i,
    .tipo-cell i,
    .user-cell i {
        font-size: 0.75rem;
        margin-right: 0.25rem;
    }

    .patient-cell {
        font-size: 0.85rem;
    }

    /* Tags smaller */
    .shift-table :deep(.p-tag) {
        font-size: 0.7rem;
        padding: 0.25rem 0.5rem;
    }

    .shift-table :deep(.p-tag .p-tag-icon) {
        font-size: 0.65rem;
    }

    /* Paginator */
    .shift-table :deep(.p-paginator) {
        padding: 0.5rem;
        font-size: 0.75rem;
    }

    .shift-table :deep(.p-paginator .p-paginator-pages .p-paginator-page) {
        min-width: 2rem;
        height: 2rem;
    }

    /* Empty and loading states */
    .empty-state,
    .loading-state {
        padding: 2rem 1rem;
    }

    .empty-state i {
        font-size: 3rem;
        margin-bottom: 1rem;
    }

    .empty-state h4 {
        font-size: 1rem;
        margin-bottom: 0.5rem;
    }

    .empty-state p {
        font-size: 0.85rem;
    }

    .loading-state i {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
    }

    .loading-state p {
        font-size: 0.9rem;
    }

    /* Footer */
    .shift-modal-footer {
        flex-direction: column;
        gap: 0.5rem;
        align-items: stretch;
    }

    .footer-info {
        justify-content: center;
        font-size: 0.8rem;
    }

    .shift-modal-footer :deep(.p-button) {
        width: 100%;
        justify-content: center;
    }
}

/* Extra small devices (< 400px) */
@media (max-width: 400px) {
    .modal-title {
        font-size: 1rem;
    }

    .stats-bar {
        padding: 0.375rem;
    }

    .stat-item {
        padding: 0.25rem 0.375rem;
        font-size: 0.7rem;
    }

    .stat-value {
        font-size: 0.9rem;
    }

    .stat-label {
        font-size: 0.6rem;
    }

    /* Hide icons in table cells to save space */
    .time-cell i,
    .tipo-cell i,
    .user-cell i {
        display: none;
    }

    /* Keep patient icon as it's important */
    .patient-cell i {
        font-size: 0.7rem;
    }

    .shift-table :deep(.p-datatable-thead > tr > th),
    .shift-table :deep(.p-datatable-tbody > tr > td) {
        padding: 0.375rem 0.25rem;
    }
}
</style>
