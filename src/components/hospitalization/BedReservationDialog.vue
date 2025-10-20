<script setup>
import { useBedReservationsStore } from '@/store/bedReservationsStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    bed: {
        type: Object,
        required: true
    },
    reservation: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['update:visible', 'reservation-created', 'reservation-updated']);

const reservationsStore = useBedReservationsStore();
const authStore = useAuthStore();
const toast = useToast();

// Form state
const formData = ref({
    id_beds: null,
    id_users: null,
    notes: ''
});

const isLoading = ref(false);
const isEditMode = computed(() => props.reservation !== null);

// Watch for prop changes to populate form
watch(
    () => props.visible,
    (newValue) => {
        if (newValue) {
            if (isEditMode.value) {
                formData.value = {
                    id_beds: props.reservation.id_beds,
                    id_users: props.reservation.id_users,
                    notes: props.reservation.notes || ''
                };
            } else {
                // Obtener el ID del usuario del estado del authStore
                const userId = authStore.state.user?.id || authStore.getUser?.id || null;

                formData.value = {
                    id_beds: props.bed?.id || null,
                    id_users: userId,
                    notes: ''
                };

                // Debug: Mostrar información del usuario
                console.log('[BedReservationDialog] Usuario actual:', authStore.state.user);
                console.log('[BedReservationDialog] ID del usuario:', userId);
            }
        }
    },
    { immediate: true }
);

// Actions
const handleClose = () => {
    emit('update:visible', false);
    resetForm();
};

const resetForm = () => {
    formData.value = {
        id_beds: null,
        id_users: null,
        notes: ''
    };
};

const handleSubmit = async () => {
    // Validation
    if (!formData.value.id_beds) {
        toast.add({
            severity: 'warn',
            summary: 'Validación',
            detail: 'Selecciona una cama',
            life: 3000
        });
        return;
    }

    if (!formData.value.id_users) {
        toast.add({
            severity: 'warn',
            summary: 'Validación',
            detail: 'Usuario no identificado',
            life: 3000
        });
        return;
    }

    isLoading.value = true;

    try {
        if (isEditMode.value) {
            // Update existing reservation
            await reservationsStore.updateReservation(props.reservation.id, formData.value);

            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Reserva actualizada exitosamente',
                life: 3000
            });

            emit('reservation-updated');
        } else {
            // Create new reservation
            await reservationsStore.createReservation(formData.value);

            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Reserva creada exitosamente',
                life: 3000
            });

            emit('reservation-created');
        }

        handleClose();
    } catch (error) {
        console.error('Error saving reservation:', error);

        // Handle specific errors from API
        let errorMessage = 'Error al guardar la reserva';

        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }

        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
        });
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <Dialog :visible="visible" @update:visible="handleClose" :modal="true" :closable="!isLoading" :dismissableMask="!isLoading" :draggable="false" :style="{ width: '500px' }" class="reservation-dialog">
        <template #header>
            <div class="dialog-header">
                <i class="pi pi-calendar-plus dialog-header-icon"></i>
                <div>
                    <h3 class="dialog-title">{{ isEditMode ? 'Editar Reserva' : 'Nueva Reserva' }}</h3>
                    <p class="dialog-subtitle">{{ bed?.bed_number || 'Cama' }} - Habitación {{ bed?.room?.room_number || '' }}</p>
                </div>
            </div>
        </template>

        <div class="reservation-form">
            <!-- Bed Info (read-only) -->
            <div class="form-field">
                <label class="form-label">
                    <i class="pi pi-bed mr-2"></i>
                    Cama
                </label>
                <div class="bed-info-display">
                    <div class="bed-badge">
                        {{ bed?.bed_number || 'N/A' }}
                    </div>
                    <span class="bed-details">Habitación {{ bed?.room?.room_number || 'N/A' }} - {{ bed?.room?.room_type || 'N/A' }}</span>
                </div>
            </div>

            <!-- User Info (read-only) -->
            <div class="form-field">
                <label class="form-label">
                    <i class="pi pi-user mr-2"></i>
                    Reservado por
                </label>
                <div class="user-info-display">
                    <i class="pi pi-user-edit user-icon"></i>
                    <span class="user-name">{{ authStore.state.user?.name || authStore.getUser?.name || 'Usuario actual' }}</span>
                </div>
            </div>

            <!-- Notes (editable) -->
            <div class="form-field">
                <label for="notes" class="form-label">
                    <i class="pi pi-file-edit mr-2"></i>
                    Notas <span class="optional">(Opcional)</span>
                </label>
                <Textarea id="notes" v-model="formData.notes" rows="4" placeholder="Agregar notas sobre la reserva (ej: para cirugía programada, traslado, etc.)" :disabled="isLoading" class="notes-textarea" />
                <small class="notes-hint">Las notas ayudan a otros usuarios a entender el propósito de la reserva</small>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <Button label="Cancelar" icon="pi pi-times" @click="handleClose" :disabled="isLoading" severity="secondary" outlined />
                <Button :label="isEditMode ? 'Actualizar' : 'Reservar'" icon="pi pi-check" @click="handleSubmit" :loading="isLoading" :disabled="isLoading" />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.reservation-dialog {
    font-family: var(--font-family);
}

.dialog-header {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.dialog-header-icon {
    font-size: 1.5rem;
    color: var(--primary-color);
    background: var(--primary-50);
    padding: 0.75rem;
    border-radius: 8px;
}

.dialog-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-color);
}

.dialog-subtitle {
    margin: 0.25rem 0 0 0;
    font-size: 0.875rem;
    color: var(--text-color-secondary);
}

.reservation-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 0.5rem 0;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-label {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-color);
    display: flex;
    align-items: center;
}

.optional {
    margin-left: 0.375rem;
    font-weight: 400;
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    font-style: italic;
}

/* Bed Info Display */
.bed-info-display {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--surface-50);
    border: 1px solid var(--surface-200);
    border-radius: 8px;
}

.bed-badge {
    background: var(--primary-color);
    color: white;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.875rem;
}

.bed-details {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
}

/* User Info Display */
.user-info-display {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem;
    background: var(--surface-50);
    border: 1px solid var(--surface-200);
    border-radius: 8px;
}

.user-icon {
    font-size: 1.125rem;
    color: var(--primary-color);
}

.user-name {
    font-size: 0.875rem;
    color: var(--text-color);
    font-weight: 500;
}

/* Notes Textarea */
.notes-textarea {
    width: 100%;
    resize: vertical;
}

.notes-hint {
    display: block;
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    font-style: italic;
}

/* Dialog Footer */
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 0;
}

/* Responsive */
@media (max-width: 576px) {
    .reservation-dialog {
        width: 95% !important;
    }

    .dialog-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
    }

    .dialog-title {
        font-size: 1.125rem;
    }

    .dialog-subtitle {
        font-size: 0.8rem;
    }

    .dialog-footer {
        flex-direction: column-reverse;
        gap: 0.5rem;
    }

    .dialog-footer button {
        width: 100%;
    }
}
</style>
