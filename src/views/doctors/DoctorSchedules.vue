<script setup>
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import ScheduleDialog from '@/components/doctors/ScheduleDialog.vue';
import { useDoctorSchedules } from '@/composables/useDoctorSchedules';
import { useDoctors } from '@/composables/useDoctors';
import { onMounted, ref, computed } from 'vue';

const {
    schedules,
    isLoading,
    isSaving,
    categoryOptions,
    statusOptions,
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
    setDateFilter,
    setCategoryFilter,
    setStatusFilter,
    clearFilters
} = useDoctorSchedules();

const { doctors, fetchDoctors } = useDoctors();

const confirm = useConfirm();

// Estado de diálogos
const scheduleDialogVisible = ref(false);
const selectedSchedule = ref(null);
const isEditingSchedule = ref(false);

// Filtros
const doctorFilter = ref(null);
const dateFilter = ref(null);
const categoryFilter = ref(null);
const statusFilter = ref(null);

onMounted(async () => {
    await Promise.all([fetchSchedules(), fetchDoctors(), fetchMedicalShifts()]);
});

// Schedule Handlers
const openNewSchedule = () => {
    selectedSchedule.value = null;
    isEditingSchedule.value = false;
    scheduleDialogVisible.value = true;
};

const editSchedule = (schedule) => {
    selectedSchedule.value = { ...schedule };
    isEditingSchedule.value = true;
    scheduleDialogVisible.value = true;
};

const handleSaveSchedule = async (scheduleData) => {
    try {
        if (isEditingSchedule.value) {
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

// Filtros
const handleDoctorFilter = (value) => {
    doctorFilter.value = value;
    setDoctorFilter(value);
};

const handleDateFilter = (value) => {
    dateFilter.value = value;
    const dateStr = value ? value.toISOString().split('T')[0] : null;
    setDateFilter(dateStr);
};

const handleCategoryFilter = (value) => {
    categoryFilter.value = value;
    setCategoryFilter(value);
};

const handleStatusFilter = (value) => {
    statusFilter.value = value;
    setStatusFilter(value);
};

const handleClearFilters = () => {
    doctorFilter.value = null;
    dateFilter.value = null;
    categoryFilter.value = null;
    statusFilter.value = null;
    clearFilters();
};

const hasActiveFilters = computed(() => {
    return doctorFilter.value || dateFilter.value || categoryFilter.value || statusFilter.value;
});

// Helpers
const getCategorySeverity = (category) => {
    const severityMap = {
        emergency: 'danger',
        ambulatory: 'info',
        hospitable: 'success'
    };
    return severityMap[category] || 'secondary';
};

const getStatusSeverity = (status) => {
    const severityMap = {
        pending: 'warn',
        confirmed: 'success',
        cancelled: 'danger',
        completed: 'secondary'
    };
    return severityMap[status] || 'secondary';
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const formatTime = (timeString) => {
    return timeString?.substring(0, 5) || '';
};
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

            <!-- Table Header -->
            <div class="table-header-modern">
                <div class="header-left">
                    <div class="header-icon-badge">
                        <i class="pi pi-table"></i>
                    </div>
                    <div class="header-info">
                        <span class="header-title-small">Registro de Horarios</span>
                        <span class="header-count" v-if="schedules">
                            {{ schedules.length }} {{ schedules.length === 1 ? 'horario' : 'horarios' }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Filtros -->
            <div class="filters-section">
                <div class="filters-grid">
                    <Select
                        v-model="doctorFilter"
                        :options="doctors"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Filtrar por Médico"
                        class="w-full"
                        @change="handleDoctorFilter($event.value)"
                        showClear
                        filter
                    />

                    <DatePicker
                        v-model="dateFilter"
                        dateFormat="dd/mm/yy"
                        placeholder="Filtrar por Fecha"
                        class="w-full"
                        @update:modelValue="handleDateFilter"
                        showIcon
                        showButtonBar
                    />

                    <Select
                        v-model="categoryFilter"
                        :options="categoryOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Categoría"
                        class="w-full"
                        @change="handleCategoryFilter($event.value)"
                        showClear
                    />

                    <Select
                        v-model="statusFilter"
                        :options="statusOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Estado"
                        class="w-full"
                        @change="handleStatusFilter($event.value)"
                        showClear
                    />

                    <Button
                        v-if="hasActiveFilters"
                        label="Limpiar"
                        icon="pi pi-filter-slash"
                        severity="secondary"
                        outlined
                        @click="handleClearFilters"
                    />
                </div>
            </div>

            <!-- Tabla de Horarios -->
            <DataTable
                :value="schedules"
                :loading="isLoading"
                :rows="25"
                :paginator="schedules.length > 25"
                :rowsPerPageOptions="[10, 25, 50, 100]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} horarios"
                responsiveLayout="scroll"
                emptyMessage="No se encontraron horarios"
                stripedRows
                class="p-datatable-sm"
            >
                <!-- Médico -->
                <Column field="doctor.name" header="Médico" :sortable="true" style="min-width: 200px">
                    <template #body="{ data }">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-user text-primary"></i>
                            <span class="font-semibold">{{ data.doctor?.name || 'N/A' }}</span>
                        </div>
                    </template>
                </Column>

                <!-- Fecha -->
                <Column field="date" header="Fecha" :sortable="true" style="min-width: 120px">
                    <template #body="{ data }">
                        {{ formatDate(data.date) }}
                    </template>
                </Column>

                <!-- Horario -->
                <Column header="Horario" style="min-width: 150px">
                    <template #body="{ data }">
                        <div class="flex flex-col">
                            <span class="font-medium">{{ formatTime(data.start_time) }} - {{ formatTime(data.end_time) }}</span>
                            <span v-if="data.medical_shift" class="text-sm text-muted">
                                {{ data.medical_shift.description }}
                            </span>
                        </div>
                    </template>
                </Column>

                <!-- Categoría -->
                <Column field="category" header="Categoría" :sortable="true" style="min-width: 130px">
                    <template #body="{ data }">
                        <Tag :value="data.category_label" :severity="getCategorySeverity(data.category)" />
                    </template>
                </Column>

                <!-- Estado -->
                <Column field="status" header="Estado" :sortable="true" style="min-width: 130px">
                    <template #body="{ data }">
                        <Tag :value="data.status_label" :severity="getStatusSeverity(data.status)" />
                    </template>
                </Column>

                <!-- Pago -->
                <Column field="is_payment_payroll" header="Planilla" style="min-width: 100px">
                    <template #body="{ data }">
                        <i v-if="data.is_payment_payroll" class="pi pi-check-circle text-green-500" v-tooltip="'Incluido en planilla'"></i>
                        <i v-else class="pi pi-times-circle text-gray-400" v-tooltip="'No en planilla'"></i>
                    </template>
                </Column>

                <!-- Acciones -->
                <Column header="Acciones" style="min-width: 200px">
                    <template #body="{ data }">
                        <div class="flex gap-1">
                            <Button
                                v-if="data.status === 'pending'"
                                icon="pi pi-check"
                                size="small"
                                rounded
                                severity="success"
                                outlined
                                v-tooltip.top="'Confirmar'"
                                @click="handleConfirmSchedule(data)"
                            />
                            <Button
                                v-if="data.status === 'confirmed'"
                                icon="pi pi-check-circle"
                                size="small"
                                rounded
                                severity="info"
                                outlined
                                v-tooltip.top="'Completar'"
                                @click="handleCompleteSchedule(data)"
                            />
                            <Button
                                v-if="data.status === 'pending' || data.status === 'confirmed'"
                                icon="pi pi-times"
                                size="small"
                                rounded
                                severity="warning"
                                outlined
                                v-tooltip.top="'Cancelar'"
                                @click="handleCancelSchedule(data)"
                            />
                            <Button
                                icon="pi pi-pencil"
                                size="small"
                                rounded
                                severity="success"
                                outlined
                                v-tooltip.top="'Editar'"
                                @click="editSchedule(data)"
                            />
                            <Button
                                icon="pi pi-trash"
                                size="small"
                                rounded
                                severity="danger"
                                outlined
                                v-tooltip.top="'Eliminar'"
                                @click="confirmDeleteSchedule(data)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Diálogos -->
        <ScheduleDialog
            v-model:visible="scheduleDialogVisible"
            :schedule="selectedSchedule"
            :doctors="doctors"
            :medical-shifts="medicalShifts"
            :saving="isSaving"
            @save-schedule="handleSaveSchedule"
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
</style>
