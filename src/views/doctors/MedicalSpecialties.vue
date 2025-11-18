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

            <!-- Filtros -->
            <div class="filters-section">
                <div class="filters-grid">
                    <IconField>
                        <InputIcon class="pi pi-search" />
                        <InputText
                            v-model="globalFilter"
                            placeholder="Buscar especialidades..."
                            class="w-full"
                            @input="handleGlobalFilter"
                        />
                    </IconField>

                    <Button
                        v-if="hasActiveFilters"
                        label="Limpiar Filtros"
                        icon="pi pi-filter-slash"
                        severity="secondary"
                        outlined
                        @click="handleClearFilters"
                    />
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
    background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
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
    color: #ec4899;
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
    grid-template-columns: 1fr auto;
    gap: 1rem;
    align-items: center;
}

.field {
    display: flex;
    flex-direction: column;
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
