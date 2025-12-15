<script setup>
import DoctorDialog from '@/components/doctors/DoctorDialog.vue';
import DoctorTable from '@/components/doctors/DoctorTable.vue';
import BulkLinkUserDialog from '@/components/doctors/BulkLinkUserDialog.vue';
import LinkUserDialog from '@/components/doctors/LinkUserDialog.vue';
import CreateDoctorWithUserDialog from '@/components/doctors/CreateDoctorWithUserDialog.vue';
import ScheduleDialog from '@/components/doctors/ScheduleDialog.vue';
import SpecialtyAssignmentDialog from '@/components/doctors/SpecialtyAssignmentDialog.vue';
import { useDoctors } from '@/composables/useDoctors';
import { useDoctorSchedules } from '@/composables/useDoctorSchedules';
import { usePermissions } from '@/composables/usePermissions';
import { useAuthStore } from '@/store/authStore';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import AutoComplete from 'primevue/autocomplete';
import { useConfirm } from 'primevue/useconfirm';
import { computed, onMounted, ref } from 'vue';
import { medicalSpecialties } from '@/api/medicalSpecialties';

const { doctors, isLoading, fetchDoctors, createDoctor, updateDoctor, deleteDoctor, documentTypeOptions, paymentPayrollOptions, setGlobalFilter, setDocumentTypeFilter, setPaymentPayrollFilter, clearFilters } = useDoctors();

const { medicalShifts, fetchMedicalShifts } = useDoctorSchedules();

const { canPerformDangerousActions } = usePermissions();
const confirm = useConfirm();

// Estado de diálogos
const doctorDialogVisible = ref(false);
const scheduleDialogVisible = ref(false);
const specialtyDialogVisible = ref(false);
const linkUserDialogVisible = ref(false);
const bulkLinkDialogVisible = ref(false);
const createWithUserDialogVisible = ref(false);
const selectedDoctor = ref(null);
const isEditingDoctor = ref(false);
const isDeletingDoctor = ref(false);

const authStore = useAuthStore();

// Permisos para vincular usuarios
const canLinkUsers = computed(() => {
    const position = authStore.getUser?.position;
    return ['DIRECTOR MEDICO', 'ADMINISTRACION', 'SISTEMAS'].includes(position);
});

// Filtros
const globalFilter = ref('');
const documentTypeFilter = ref(null);
const paymentPayrollFilter = ref(null);
const selectedSpecialty = ref(null);
const specialties = ref([]);
const filteredSpecialties = ref([]);

onMounted(async () => {
    await Promise.all([fetchDoctors(), fetchMedicalShifts(), loadSpecialties()]);
});

// Cargar especialidades
const loadSpecialties = async () => {
    try {
        const response = await medicalSpecialties.getAll();
        if (response.data) {
            specialties.value = Array.isArray(response.data) ? response.data : (response.data.data || []);
        }
    } catch (err) {
        console.error('Error al cargar especialidades:', err);
    }
};

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
    selectedDoctor.value = doctor;
    specialtyDialogVisible.value = true;
};

const handleSpecialtiesUpdated = async () => {
    // Recargar la lista de médicos para ver los cambios
    await fetchDoctors();
};

const openLinkUserDialog = (doctor) => {
    if (!canLinkUsers.value) return;
    selectedDoctor.value = doctor;
    linkUserDialogVisible.value = true;
};

const handleUserLinked = async () => {
    // Recargar la lista de médicos para ver los cambios
    await fetchDoctors();
};

const handleUserUnlinked = async () => {
    // Recargar la lista de médicos para ver los cambios
    await fetchDoctors();
};

const openBulkLinkDialog = () => {
    if (!canLinkUsers.value) return;
    bulkLinkDialogVisible.value = true;
};

const handleBulkLinkCompleted = async (results) => {
    // Recargar médicos
    await fetchDoctors();
};

const openCreateWithUserDialog = () => {
    createWithUserDialogVisible.value = true;
};

const handleDoctorWithUserCreated = async () => {
    // Recargar médicos
    await fetchDoctors();
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

const handleSpecialtyFilter = (value) => {
    selectedSpecialty.value = value;
};

const searchSpecialty = (event) => {
    const query = event.query.toLowerCase();
    if (!query) {
        filteredSpecialties.value = specialties.value;
    } else {
        filteredSpecialties.value = specialties.value.filter(specialty => 
            specialty.name.toLowerCase().includes(query)
        );
    }
};

const handleClearFilters = () => {
    globalFilter.value = '';
    documentTypeFilter.value = null;
    paymentPayrollFilter.value = null;
    selectedSpecialty.value = null;
    clearFilters();
};

const hasActiveFilters = computed(() => {
    return globalFilter.value || documentTypeFilter.value || paymentPayrollFilter.value || selectedSpecialty.value;
});

// Filtrar médicos por especialidad (local)
const filteredDoctorsBySpecialty = computed(() => {
    if (!selectedSpecialty.value) {
        return doctors.value;
    }
    return doctors.value.filter(doctor => {
        return doctor.specialties && doctor.specialties.some(s => s.id === selectedSpecialty.value.id);
    });
});
</script>

<template>
    <div class="doctors-view">
        <div class="main-card">
            <!-- Header Principal -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-users"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Gestión de Médicos</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-users mr-2"></i>
                        Administración del personal médico del hospital
                    </p>
                </div>
                <div class="flex gap-2">
                    <Button 
                        v-if="canLinkUsers"
                        label="Vinculación Masiva" 
                        icon="pi pi-link" 
                        severity="help"
                        outlined
                        @click="openBulkLinkDialog"
                    />
                    <Button 
                        label="Crear con Usuario" 
                        icon="pi pi-user-plus" 
                        severity="success"
                        outlined
                        @click="openCreateWithUserDialog"
                    />
                    <Button label="Nuevo Médico" icon="pi pi-plus" class="add-button" @click="openNewDoctor" />
                </div>
            </div>

            <!-- Table Header con búsqueda -->
            <div class="table-header-modern">
                <div class="header-left">
                    <div class="header-icon-badge">
                        <i class="pi pi-table"></i>
                    </div>
                    <div class="header-info">
                        <span class="header-title-small">Registro de Médicos</span>
                        <span class="header-count" v-if="doctors"> {{ doctors.length }} {{ doctors.length === 1 ? 'médico' : 'médicos' }} </span>
                    </div>
                </div>
                <div class="header-actions-modern">
                    <IconField iconPosition="left" class="search-field">
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText v-model="globalFilter" placeholder="Buscar médicos..." class="search-input-modern" @input="handleGlobalFilter" />
                    </IconField>
                </div>
            </div>

            <!-- Filtros -->
            <div class="filters-section">
                <div class="filters-grid">
                    <Select v-model="documentTypeFilter" :options="documentTypeOptions" optionLabel="label" optionValue="value" placeholder="Tipo de Documento" class="w-full" @change="handleDocumentTypeFilter($event.value)" showClear />

                    <Select v-model="paymentPayrollFilter" :options="paymentPayrollOptions" optionLabel="label" optionValue="value" placeholder="Tipo de Pago" class="w-full" @change="handlePaymentPayrollFilter($event.value)" showClear />

                    <AutoComplete 
                        v-model="selectedSpecialty" 
                        :suggestions="filteredSpecialties" 
                        @complete="searchSpecialty" 
                        optionLabel="name" 
                        placeholder="Buscar especialidad..." 
                        class="w-full"
                        @change="handleSpecialtyFilter($event.value)"
                        forceSelection
                    >
                        <template #option="slotProps">
                            <div class="flex align-items-center">
                                <i class="pi pi-tag mr-2"></i>
                                <span>{{ slotProps.option.name }}</span>
                            </div>
                        </template>
                    </AutoComplete>

                    <Button v-if="hasActiveFilters" label="Limpiar Filtros" icon="pi pi-filter-slash" severity="secondary" outlined @click="handleClearFilters" />
                </div>
            </div>

            <!-- Tabla de Médicos -->
            <DoctorTable 
                :doctors="filteredDoctorsBySpecialty" 
                :loading="isLoading" 
                @edit-doctor="editDoctor" 
                @delete-doctor="confirmDeleteDoctor" 
                @manage-schedules="manageSchedules" 
                @manage-specialties="manageSpecialties"
                @link-user="openLinkUserDialog"
            />
        </div>

        <!-- Diálogos -->
        <DoctorDialog v-model:visible="doctorDialogVisible" :doctor="selectedDoctor" @save-doctor="handleSaveDoctor" />

        <ScheduleDialog v-model:visible="scheduleDialogVisible" :doctors="doctors" :medical-shifts="medicalShifts" />

        <SpecialtyAssignmentDialog v-model:visible="specialtyDialogVisible" :doctor="selectedDoctor" @updated="handleSpecialtiesUpdated" />

        <LinkUserDialog 
            v-if="canLinkUsers"
            v-model:visible="linkUserDialogVisible" 
            :doctor="selectedDoctor" 
            @linked="handleUserLinked"
            @unlinked="handleUserUnlinked"
        />

        <BulkLinkUserDialog
            v-if="canLinkUsers"
            v-model:visible="bulkLinkDialogVisible"
            :doctors="doctors"
            @completed="handleBulkLinkCompleted"
        />

        <CreateDoctorWithUserDialog
            v-model:visible="createWithUserDialogVisible"
            @created="handleDoctorWithUserCreated"
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
            0 4px 12px rgba(59, 130, 246, 0.3),
            0 2px 8px rgba(37, 99, 235, 0.2);
    }
    50% {
        transform: scale(1.05);
        box-shadow:
            0 6px 16px rgba(59, 130, 246, 0.4),
            0 3px 10px rgba(37, 99, 235, 0.3);
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

.add-button {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
    border: none !important;
    color: white !important;
    font-weight: 600;
    padding: 0.75rem 1.5rem !important;
    border-radius: 10px !important;
    box-shadow:
        0 4px 12px rgba(59, 130, 246, 0.3),
        0 2px 8px rgba(37, 99, 235, 0.2) !important;
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
        0 6px 16px rgba(59, 130, 246, 0.4),
        0 3px 10px rgba(37, 99, 235, 0.3) !important;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
}

:global(.dark) .add-button {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
    box-shadow:
        0 4px 12px rgba(59, 130, 246, 0.4),
        0 2px 8px rgba(37, 99, 235, 0.3) !important;
}

:global(.dark) .add-button:hover {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%) !important;
    box-shadow:
        0 6px 16px rgba(59, 130, 246, 0.5),
        0 3px 10px rgba(37, 99, 235, 0.4) !important;
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
    border-bottom: 2px solid color-mix(in srgb, var(--primary-color) 20%, var(--surface-border));
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
    background: linear-gradient(90deg, #3b82f6, #2563eb, #3b82f6);
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
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
        0 4px 12px rgba(59, 130, 246, 0.3),
        0 2px 8px rgba(37, 99, 235, 0.2);
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
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
    box-shadow:
        0 4px 12px rgba(96, 165, 250, 0.4),
        0 2px 8px rgba(59, 130, 246, 0.3);
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
    color: #2563eb;
    background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
    padding: 0.188rem 0.625rem;
    border-radius: 6px;
    display: inline-block;
    width: fit-content;
    border: 1px solid #93c5fd;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

:global(.dark) .header-count {
    color: #93c5fd;
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
    border: 1px solid #60a5fa;
}

.header-actions-modern {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.search-field {
    width: 280px;
}

.search-input-modern {
    border-radius: 10px;
    border: 2px solid var(--surface-border);
    padding: 0.625rem 0.875rem 0.625rem 2.5rem;
    font-size: 0.875rem;
    transition: all 0.3s ease;
    background: var(--surface-ground);
    color: var(--text-color);
}

.search-input-modern:hover {
    border-color: #cbd5e1;
}

.search-input-modern:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 1rem;
    align-items: center;
}

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */
@media (max-width: 1024px) {
    .filters-grid {
        grid-template-columns: 1fr 1fr 1fr;
    }

    .table-header-modern {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .header-actions-modern {
        flex-direction: column;
        width: 100%;
    }

    .search-field {
        width: 100%;
    }
}

@media (max-width: 768px) {
    .doctors-view {
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
</style>
