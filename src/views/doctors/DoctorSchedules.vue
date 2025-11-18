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
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

/* ============================================================================
   HEADER SECTION
   ============================================================================ */
.header-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2rem;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    position: relative;
    overflow: hidden;
}

.header-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    animation: shimmer 3s infinite;
}

.header-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 70px;
    height: 70px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border-radius: 50%;
    font-size: 2rem;
    position: relative;
    z-index: 1;
}

.header-content {
    flex: 1;
    margin-left: 1.5rem;
    position: relative;
    z-index: 1;
}

.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-subtitle {
    margin: 0.5rem 0 0 0;
    opacity: 0.95;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
}

.add-button {
    position: relative;
    z-index: 1;
    background: white;
    color: #3b82f6;
    border: none;
    font-weight: 600;
    transition: all 0.3s ease;
}

.add-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

/* ============================================================================
   FILTERS SECTION
   ============================================================================ */
.filters-section {
    padding: 1.5rem 2rem;
    background: var(--surface-ground);
    border-bottom: 1px solid var(--surface-border);
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
        margin-left: 0;
    }

    .add-button {
        width: 100%;
    }
}

:deep(.p-datatable-sm .p-datatable-tbody > tr > td) {
    padding: 0.75rem;
}
</style>
