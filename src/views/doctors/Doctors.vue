<script setup>
import DoctorDialog from '@/components/doctors/DoctorDialog.vue';
import DoctorTable from '@/components/doctors/DoctorTable.vue';
import ScheduleDialog from '@/components/doctors/ScheduleDialog.vue';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useDoctors } from '@/composables/useDoctors';
import { useDoctorSchedules } from '@/composables/useDoctorSchedules';
import { usePermissions } from '@/composables/usePermissions';
import { onMounted, ref, computed } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';

const {
    doctors,
    isLoading,
    fetchDoctors,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    documentTypeOptions,
    paymentPayrollOptions,
    setGlobalFilter,
    setDocumentTypeFilter,
    setPaymentPayrollFilter,
    clearFilters
} = useDoctors();

const { medicalShifts, fetchMedicalShifts } = useDoctorSchedules();

const { canPerformDangerousActions } = usePermissions();
const confirm = useConfirm();

// Estado de diálogos
const doctorDialogVisible = ref(false);
const scheduleDialogVisible = ref(false);
const selectedDoctor = ref(null);
const isEditingDoctor = ref(false);

// Filtros
const globalFilter = ref('');
const documentTypeFilter = ref(null);
const paymentPayrollFilter = ref(null);

onMounted(async () => {
    await Promise.all([fetchDoctors(), fetchMedicalShifts()]);
});

// Doctor Handlers
const openNewDoctor = () => {
    selectedDoctor.value = null;
    isEditingDoctor.value = false;
    doctorDialogVisible.value = true;
};

const editDoctor = (doctor) => {
    selectedDoctor.value = { ...doctor };
    isEditingDoctor.value = true;
    doctorDialogVisible.value = true;
};

const handleSaveDoctor = async (doctorData) => {
    try {
        if (isEditingDoctor.value) {
            await updateDoctor(selectedDoctor.value.id, doctorData);
        } else {
            await createDoctor(doctorData);
        }
        doctorDialogVisible.value = false;
        selectedDoctor.value = null;
    } catch (error) {
        // El error ya se maneja en el composable con toast
    }
};

const confirmDeleteDoctor = (doctor) => {
    confirm.require({
        message: `¿Está seguro que desea eliminar al médico ${doctor.name}?`,
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await deleteDoctor(doctor.id);
            } catch (error) {
                // El error ya se maneja en el composable
            }
        }
    });
};

const manageSchedules = (doctor) => {
    selectedDoctor.value = doctor;
    scheduleDialogVisible.value = true;
};

const manageSpecialties = (doctor) => {
    // TODO: Implementar gestión de especialidades
    console.log('Gestionar especialidades de:', doctor.name);
};

// Filtros
const handleGlobalFilter = (event) => {
    globalFilter.value = event.target.value;
    setGlobalFilter(event.target.value);
};

const handleDocumentTypeFilter = (value) => {
    documentTypeFilter.value = value;
    setDocumentTypeFilter(value);
};

const handlePaymentPayrollFilter = (value) => {
    paymentPayrollFilter.value = value;
    setPaymentPayrollFilter(value);
};

const handleClearFilters = () => {
    globalFilter.value = '';
    documentTypeFilter.value = null;
    paymentPayrollFilter.value = null;
    clearFilters();
};

const hasActiveFilters = computed(() => {
    return globalFilter.value || documentTypeFilter.value || paymentPayrollFilter.value;
});
</script>

<template>
    <div class="doctors-view">
        <div class="main-card">
            <!-- Header Principal -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-user-md"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Gestión de Médicos</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-users mr-2"></i>
                        Administración del personal médico del hospital
                    </p>
                </div>
                <Button label="Nuevo Médico" icon="pi pi-plus" class="add-button" @click="openNewDoctor" />
            </div>

            <!-- Filtros -->
            <div class="filters-section">
                <div class="filters-grid">
                    <IconField>
                        <InputIcon class="pi pi-search" />
                        <InputText
                            v-model="globalFilter"
                            placeholder="Buscar por nombre, código, CMP o documento..."
                            class="w-full"
                            @input="handleGlobalFilter"
                        />
                    </IconField>

                    <Select
                        v-model="documentTypeFilter"
                        :options="documentTypeOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Tipo de Documento"
                        class="w-full"
                        @change="handleDocumentTypeFilter($event.value)"
                        showClear
                    />

                    <Select
                        v-model="paymentPayrollFilter"
                        :options="paymentPayrollOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Tipo de Pago"
                        class="w-full"
                        @change="handlePaymentPayrollFilter($event.value)"
                        showClear
                    />

                    <Button v-if="hasActiveFilters" label="Limpiar Filtros" icon="pi pi-filter-slash" severity="secondary" outlined @click="handleClearFilters" />
                </div>
            </div>

            <!-- Tabla de Médicos -->
            <DoctorTable
                :doctors="doctors"
                :loading="isLoading"
                @edit-doctor="editDoctor"
                @delete-doctor="confirmDeleteDoctor"
                @manage-schedules="manageSchedules"
                @manage-specialties="manageSpecialties"
            />
        </div>

        <!-- Diálogos -->
        <DoctorDialog v-model:visible="doctorDialogVisible" :doctor="selectedDoctor" @save-doctor="handleSaveDoctor" />

        <ScheduleDialog v-model:visible="scheduleDialogVisible" :doctors="doctors" :medical-shifts="medicalShifts" />

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
.doctors-view {
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
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-600) 100%);
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
    justify-center;
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
    color: var(--primary-color);
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
    grid-template-columns: 2fr 1fr 1fr auto;
    gap: 1rem;
    align-items: center;
}

@media (max-width: 1024px) {
    .filters-grid {
        grid-template-columns: 1fr 1fr;
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
        margin-left: 0;
    }

    .add-button {
        width: 100%;
    }
}
</style>
