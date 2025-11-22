<script setup>
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useMedicalSpecialties } from '@/composables/useMedicalSpecialties';
import { usePermissions } from '@/composables/usePermissions';
import { onMounted, ref, computed } from 'vue';

const {
    specialties,
    isLoading,
    isSaving,
    fetchSpecialties,
    createSpecialty,
    updateSpecialty,
    deleteSpecialty,
    setGlobalFilter,
    clearFilters
} = useMedicalSpecialties();

const { canPerformDangerousActions } = usePermissions();
const confirm = useConfirm();

// Estado de diálogos
const specialtyDialogVisible = ref(false);
const selectedSpecialty = ref(null);
const isEditingSpecialty = ref(false);

// Formulario
const specialtyForm = ref({
    name: '',
    description: ''
});

// Validación
const validationErrors = ref({});
const touchedFields = ref({});

// Filtros
const globalFilter = ref('');

onMounted(async () => {
    await fetchSpecialties();
});

// Specialty Handlers
const openNewSpecialty = () => {
    selectedSpecialty.value = null;
    isEditingSpecialty.value = false;
    resetForm();
    specialtyDialogVisible.value = true;
};

const editSpecialty = (specialty) => {
    selectedSpecialty.value = { ...specialty };
    isEditingSpecialty.value = true;
    loadSpecialtyData(specialty);
    specialtyDialogVisible.value = true;
};

const loadSpecialtyData = (specialty) => {
    specialtyForm.value = {
        name: specialty.name || '',
        description: specialty.description || ''
    };
    resetValidation();
};

const resetForm = () => {
    specialtyForm.value = {
        name: '',
        description: ''
    };
    resetValidation();
};

const resetValidation = () => {
    validationErrors.value = {};
    touchedFields.value = {};
};

const validateField = (fieldName) => {
    touchedFields.value[fieldName] = true;

    switch (fieldName) {
        case 'name':
            if (!specialtyForm.value.name.trim()) {
                validationErrors.value.name = 'El nombre es obligatorio';
            } else if (specialtyForm.value.name.trim().length < 2) {
                validationErrors.value.name = 'El nombre debe tener al menos 2 caracteres';
            } else {
                delete validationErrors.value.name;
            }
            break;
        default:
            break;
    }
};

const validateAllFields = () => {
    validateField('name');
    return Object.keys(validationErrors.value).length === 0;
};

const isFormValid = computed(() => {
    return specialtyForm.value.name.trim() && Object.keys(validationErrors.value).length === 0;
});

const handleSaveSpecialty = async () => {
    Object.keys(specialtyForm.value).forEach((field) => {
        touchedFields.value[field] = true;
    });

    if (!validateAllFields()) {
        return;
    }

    try {
        const specialtyData = {
            name: specialtyForm.value.name,
            description: specialtyForm.value.description || null
        };

        if (isEditingSpecialty.value) {
            await updateSpecialty(selectedSpecialty.value.id, specialtyData);
        } else {
            await createSpecialty(specialtyData);
        }
        specialtyDialogVisible.value = false;
        selectedSpecialty.value = null;
        resetForm();
    } catch (error) {
        // El error ya se maneja en el composable con toast
    }
};

const confirmDeleteSpecialty = (specialty) => {
    confirm.require({
        message: `¿Está seguro que desea eliminar la especialidad "${specialty.name}"?`,
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, eliminar',
        rejectLabel: 'Cancelar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await deleteSpecialty(specialty.id);
            } catch (error) {
                // El error ya se maneja en el composable
            }
        }
    });
};

const handleClose = () => {
    specialtyDialogVisible.value = false;
    selectedSpecialty.value = null;
    resetForm();
};

// Filtros
const handleGlobalFilter = (event) => {
    globalFilter.value = event.target.value;
    setGlobalFilter(event.target.value);
};

const handleClearFilters = () => {
    globalFilter.value = '';
    clearFilters();
};

const hasActiveFilters = computed(() => {
    return globalFilter.value;
});

const dialogTitle = computed(() => {
    return isEditingSpecialty.value ? 'Editar Especialidad' : 'Nueva Especialidad';
});
</script>

<template>
    <div class="specialties-view">
        <div class="main-card">
            <!-- Header Principal -->
            <div class="header-section">
                <div class="header-icon-wrapper">
                    <i class="pi pi-heart"></i>
                </div>
                <div class="header-content">
                    <h1 class="header-title">Especialidades Médicas</h1>
                    <p class="header-subtitle">
                        <i class="pi pi-star mr-2"></i>
                        Gestión de especialidades médicas del hospital
                    </p>
                </div>
                <Button label="Nueva Especialidad" icon="pi pi-plus" class="add-button" @click="openNewSpecialty" />
            </div>

            <!-- Table Header con búsqueda -->
            <div class="table-header-modern">
                <div class="header-left">
                    <div class="header-icon-badge">
                        <i class="pi pi-table"></i>
                    </div>
                    <div class="header-info">
                        <span class="header-title-small">Registro de Especialidades</span>
                        <span class="header-count" v-if="specialties">
                            {{ specialties.length }} {{ specialties.length === 1 ? 'especialidad' : 'especialidades' }}
                        </span>
                    </div>
                </div>
                <div class="header-actions-modern">
                    <IconField iconPosition="left" class="search-field">
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText v-model="globalFilter" placeholder="Buscar especialidades..." class="search-input-modern" @input="handleGlobalFilter" />
                    </IconField>
                    <Button v-if="hasActiveFilters" label="Limpiar" icon="pi pi-filter-slash" severity="secondary" outlined @click="handleClearFilters" class="clear-button" />
                </div>
            </div>

            <!-- Tabla de Especialidades -->
            <DataTable
                :value="specialties"
                :loading="isLoading"
                :rows="25"
                :paginator="specialties.length > 25"
                :rowsPerPageOptions="[10, 25, 50, 100]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} especialidades"
                responsiveLayout="scroll"
                emptyMessage="No se encontraron especialidades"
                stripedRows
                class="p-datatable-sm"
            >
                <!-- Nombre -->
                <Column field="name" header="Especialidad" :sortable="true" style="min-width: 250px">
                    <template #body="{ data }">
                        <div class="flex items-center gap-3">
                            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-pink-100 text-pink-600">
                                <i class="pi pi-heart text-lg"></i>
                            </div>
                            <span class="font-semibold">{{ data.name }}</span>
                        </div>
                    </template>
                </Column>

                <!-- Descripción -->
                <Column field="description" header="Descripción" style="min-width: 300px">
                    <template #body="{ data }">
                        <span v-if="data.description" class="text-muted">{{ data.description }}</span>
                        <span v-else class="text-muted italic">Sin descripción</span>
                    </template>
                </Column>

                <!-- Médicos -->
                <Column header="Médicos Asignados" style="min-width: 150px">
                    <template #body="{ data }">
                        <Tag v-if="data.doctors_count > 0" :value="`${data.doctors_count} médicos`" severity="info" />
                        <span v-else class="text-muted text-sm">Sin médicos</span>
                    </template>
                </Column>

                <!-- Acciones -->
                <Column header="Acciones" style="min-width: 120px">
                    <template #body="{ data }">
                        <div class="flex gap-1">
                            <Button
                                icon="pi pi-pencil"
                                size="small"
                                rounded
                                severity="success"
                                outlined
                                v-tooltip.top="'Editar'"
                                @click="editSpecialty(data)"
                            />
                            <Button
                                icon="pi pi-trash"
                                size="small"
                                rounded
                                severity="danger"
                                outlined
                                v-tooltip.top="'Eliminar'"
                                @click="confirmDeleteSpecialty(data)"
                                :disabled="!canPerformDangerousActions"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Diálogo de Especialidad -->
        <Dialog
            v-model:visible="specialtyDialogVisible"
            :header="dialogTitle"
            :modal="true"
            :closable="!isSaving"
            :closeOnEscape="!isSaving"
            class="w-full md:w-[600px]"
            @hide="handleClose"
        >
            <div class="flex flex-col gap-6 py-4">
                <!-- Nombre -->
                <div class="field">
                    <label for="name" class="font-semibold mb-2 block">
                        Nombre de la Especialidad
                        <span class="text-red-500">*</span>
                    </label>
                    <InputText
                        id="name"
                        v-model="specialtyForm.name"
                        placeholder="Ej: Cardiología"
                        class="w-full"
                        :class="{ 'p-invalid': touchedFields.name && validationErrors.name }"
                        :disabled="isSaving"
                        @blur="validateField('name')"
                        @input="validateField('name')"
                    />
                    <small v-if="touchedFields.name && validationErrors.name" class="p-error">
                        {{ validationErrors.name }}
                    </small>
                </div>

                <!-- Descripción -->
                <div class="field">
                    <label for="description" class="font-semibold mb-2 block"> Descripción </label>
                    <Textarea
                        id="description"
                        v-model="specialtyForm.description"
                        rows="4"
                        placeholder="Descripción de la especialidad (opcional)"
                        class="w-full"
                        :disabled="isSaving"
                    />
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="Cancelar" severity="secondary" @click="handleClose" :disabled="isSaving" />
                    <Button
                        :label="isEditingSpecialty ? 'Actualizar' : 'Guardar'"
                        :loading="isSaving"
                        :disabled="!isFormValid || isSaving"
                        @click="handleSaveSpecialty"
                    />
                </div>
            </template>
        </Dialog>

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
            0 4px 12px rgba(236, 72, 153, 0.3),
            0 2px 8px rgba(219, 39, 119, 0.2);
    }
    50% {
        transform: scale(1.05);
        box-shadow:
            0 6px 16px rgba(236, 72, 153, 0.4),
            0 3px 10px rgba(219, 39, 119, 0.3);
    }
}

/* ============================================================================
   MAIN CONTAINER
   ============================================================================ */
.specialties-view {
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
    background: linear-gradient(90deg, #ec4899, #db2777, #ec4899, #be185d);
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
    background: linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%);
    box-shadow:
        0 8px 20px rgba(236, 72, 153, 0.3),
        0 4px 12px rgba(219, 39, 119, 0.4);
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
    background: linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #db2777 100%);
    box-shadow:
        0 8px 20px rgba(244, 114, 182, 0.4),
        0 4px 12px rgba(236, 72, 153, 0.5);
}

.header-content {
    flex: 1;
}

.header-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

:global(.dark) .header-title {
    background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%);
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
    background: linear-gradient(135deg, #ec4899 0%, #db2777 100%) !important;
    border: none !important;
    color: white !important;
    font-weight: 600;
    padding: 0.75rem 1.5rem !important;
    border-radius: 10px !important;
    box-shadow:
        0 4px 12px rgba(236, 72, 153, 0.3),
        0 2px 8px rgba(219, 39, 119, 0.2) !important;
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
        0 6px 16px rgba(236, 72, 153, 0.4),
        0 3px 10px rgba(219, 39, 119, 0.3) !important;
    background: linear-gradient(135deg, #db2777 0%, #be185d 100%) !important;
}

:global(.dark) .add-button {
    background: linear-gradient(135deg, #ec4899 0%, #db2777 100%) !important;
    box-shadow:
        0 4px 12px rgba(236, 72, 153, 0.4),
        0 2px 8px rgba(219, 39, 119, 0.3) !important;
}

:global(.dark) .add-button:hover {
    background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%) !important;
    box-shadow:
        0 6px 16px rgba(236, 72, 153, 0.5),
        0 3px 10px rgba(219, 39, 119, 0.4) !important;
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
    border-bottom: 2px solid color-mix(in srgb, #ec4899 20%, var(--surface-border));
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
    background: linear-gradient(90deg, #ec4899, #db2777, #ec4899);
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
    background: linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
        0 4px 12px rgba(236, 72, 153, 0.3),
        0 2px 8px rgba(219, 39, 119, 0.2);
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
    background: linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #db2777 100%);
    box-shadow:
        0 4px 12px rgba(244, 114, 182, 0.4),
        0 2px 8px rgba(236, 72, 153, 0.3);
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
    color: #db2777;
    background: linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%);
    padding: 0.188rem 0.625rem;
    border-radius: 6px;
    display: inline-block;
    width: fit-content;
    border: 1px solid #f9a8d4;
    box-shadow: 0 2px 4px rgba(236, 72, 153, 0.1);
}

:global(.dark) .header-count {
    color: #f9a8d4;
    background: linear-gradient(135deg, #831843 0%, #9f1239 100%);
    border: 1px solid #f472b6;
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
    border-color: #ec4899;
    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
}

.clear-button {
    white-space: nowrap;
}

/* ============================================================================
   RESPONSIVE DESIGN
   ============================================================================ */
.field {
    display: flex;
    flex-direction: column;
}

.text-muted {
    color: var(--text-color-secondary);
}

@media (max-width: 1024px) {
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
    .specialties-view {
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
