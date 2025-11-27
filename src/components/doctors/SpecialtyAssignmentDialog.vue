<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import Chip from 'primevue/chip';
import { useMedicalSpecialties } from '@/composables/useMedicalSpecialties';
import { medicalSpecialties as medicalSpecialtiesAPI } from '@/api/medicalSpecialties';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    doctor: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['update:visible', 'updated']);

const toast = useToast();
const { specialties, fetchSpecialties } = useMedicalSpecialties();

const selectedSpecialties = ref([]);
const isSaving = ref(false);
const isLoading = ref(false);

// Computed
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const doctorName = computed(() => props.doctor?.name || '');

const currentSpecialtyIds = computed(() => {
    return props.doctor?.specialties?.map(s => s.id) || [];
});

const availableSpecialties = computed(() => {
    return specialties.value.map(specialty => ({
        id: specialty.id,
        name: specialty.name,
        description: specialty.description
    }));
});

// Methods
const loadDoctorSpecialties = () => {
    if (props.doctor?.specialties) {
        selectedSpecialties.value = props.doctor.specialties.map(s => s.id);
    } else {
        selectedSpecialties.value = [];
    }
};

const handleSave = async () => {
    if (!props.doctor) return;

    try {
        isSaving.value = true;

        // Determinar qué especialidades agregar y cuáles quitar
        const currentIds = new Set(currentSpecialtyIds.value);
        const selectedIds = new Set(selectedSpecialties.value);

        const toAttach = [...selectedIds].filter(id => !currentIds.has(id));
        const toDetach = [...currentIds].filter(id => !selectedIds.has(id));

        // Ejecutar attach y detach
        const promises = [];

        for (const specialtyId of toAttach) {
            promises.push(
                medicalSpecialtiesAPI.attachDoctor(specialtyId, {
                    doctor_id: props.doctor.id
                })
            );
        }

        for (const specialtyId of toDetach) {
            promises.push(
                medicalSpecialtiesAPI.detachDoctor(specialtyId, {
                    doctor_id: props.doctor.id
                })
            );
        }

        await Promise.all(promises);

        toast.add({
            severity: 'success',
            summary: 'Especialidades Actualizadas',
            detail: `Las especialidades de ${props.doctor.name} han sido actualizadas`,
            life: 3000
        });

        emit('updated');
        dialogVisible.value = false;
    } catch (error) {
        console.error('Error al actualizar especialidades:', error);
        toast.add({
            severity: 'error',
            summary: 'Error al Actualizar',
            detail: error.response?.data?.message || 'No se pudieron actualizar las especialidades',
            life: 5000
        });
    } finally {
        isSaving.value = false;
    }
};

const handleClose = () => {
    dialogVisible.value = false;
};

// Watchers
watch(() => props.visible, (visible) => {
    if (visible) {
        loadDoctorSpecialties();
    }
});

// Lifecycle
onMounted(async () => {
    if (specialties.value.length === 0) {
        await fetchSpecialties();
    }
});
</script>

<template>
    <Dialog
        v-model:visible="dialogVisible"
        :header="`Gestionar Especialidades - ${doctorName}`"
        :modal="true"
        :closable="!isSaving"
        :style="{ width: '600px' }"
        class="specialty-assignment-dialog"
    >
        <div class="dialog-content">
            <!-- Doctor Info -->
            <div class="doctor-info">
                <div class="doctor-avatar">
                    <i class="pi pi-user-md"></i>
                </div>
                <div class="doctor-details">
                    <h3>{{ doctorName }}</h3>
                    <p class="text-muted">
                        <i class="pi pi-star mr-2"></i>
                        {{ currentSpecialtyIds.length }} {{ currentSpecialtyIds.length === 1 ? 'especialidad asignada' : 'especialidades asignadas' }}
                    </p>
                </div>
            </div>

            <!-- Current Specialties -->
            <div v-if="currentSpecialtyIds.length > 0" class="current-specialties mb-4">
                <label class="mb-2">Especialidades actuales:</label>
                <div class="specialty-chips">
                    <Chip
                        v-for="specialty in doctor?.specialties"
                        :key="specialty.id"
                        :label="specialty.name"
                        icon="pi pi-heart"
                        class="specialty-chip"
                    />
                </div>
            </div>

            <!-- Specialty Selection -->
            <div class="field">
                <label for="specialties" class="font-semibold">Seleccionar Especialidades</label>
                <MultiSelect
                    v-model="selectedSpecialties"
                    :options="availableSpecialties"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Seleccione las especialidades"
                    :loading="isLoading"
                    :disabled="isSaving"
                    filter
                    class="w-full"
                    display="chip"
                >
                    <template #option="{ option }">
                        <div class="specialty-option">
                            <i class="pi pi-heart mr-2"></i>
                            <div>
                                <div class="font-semibold">{{ option.name }}</div>
                                <div v-if="option.description" class="text-sm text-muted">{{ option.description }}</div>
                            </div>
                        </div>
                    </template>
                </MultiSelect>
                <small class="text-muted">Puede seleccionar múltiples especialidades</small>
            </div>

            <!-- Summary -->
            <div v-if="selectedSpecialties.length > 0" class="summary-box mt-4">
                <div class="summary-header">
                    <i class="pi pi-info-circle mr-2"></i>
                    Resumen de cambios
                </div>
                <div class="summary-content">
                    <p>
                        <strong>{{ selectedSpecialties.length }}</strong>
                        {{ selectedSpecialties.length === 1 ? 'especialidad seleccionada' : 'especialidades seleccionadas' }}
                    </p>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <Button
                    label="Cancelar"
                    icon="pi pi-times"
                    class="p-button-text"
                    @click="handleClose"
                    :disabled="isSaving"
                />
                <Button
                    label="Guardar Cambios"
                    icon="pi pi-check"
                    @click="handleSave"
                    :loading="isSaving"
                    :disabled="isSaving"
                />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.specialty-assignment-dialog {
    max-width: 90vw;
}

.dialog-content {
    padding: 1rem 0;
}

.doctor-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: linear-gradient(135deg, var(--surface-100) 0%, var(--surface-50) 100%);
    border-radius: 12px;
    margin-bottom: 1.5rem;
    border: 1px solid var(--surface-border);
}

.doctor-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.75rem;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.doctor-details h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
}

.doctor-details p {
    margin: 0;
    font-size: 0.875rem;
}

.text-muted {
    color: var(--text-color-secondary);
}

.current-specialties label {
    display: block;
    font-weight: 600;
    color: var(--text-color);
}

.specialty-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.specialty-chip {
    background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
    color: white;
    border: none;
}

.specialty-chip :deep(.p-chip-text) {
    color: white;
    font-weight: 600;
}

.specialty-chip :deep(.pi) {
    color: white;
}

.field {
    margin-bottom: 1rem;
}

.field label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-color);
}

.specialty-option {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
}

.specialty-option i {
    color: #ec4899;
    margin-top: 0.25rem;
}

.summary-box {
    padding: 1rem;
    background: var(--surface-50);
    border-left: 4px solid #3b82f6;
    border-radius: 8px;
}

.summary-header {
    font-weight: 700;
    color: #3b82f6;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
}

.summary-content p {
    margin: 0;
    color: var(--text-color);
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
}

:global(.dark) .doctor-info {
    background: linear-gradient(135deg, var(--surface-800) 0%, var(--surface-900) 100%);
}

:global(.dark) .doctor-avatar {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
    box-shadow: 0 4px 12px rgba(96, 165, 250, 0.4);
}

:global(.dark) .summary-box {
    background: var(--surface-800);
    border-left-color: #60a5fa;
}

:global(.dark) .summary-header {
    color: #60a5fa;
}

/* Responsive */
@media (max-width: 768px) {
    .specialty-assignment-dialog {
        width: 95vw !important;
        margin: 1rem;
    }

    .doctor-info {
        flex-direction: column;
        text-align: center;
    }

    .doctor-avatar {
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
    }
}
</style>
