<script setup>
import { useBedReservationsStore } from '@/store/bedReservationsStore';
import { useAuthStore } from '@/store/authStore';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: Boolean,
    reservation: Object,
    bed: Object // Para modo crear
});

const emit = defineEmits(['save', 'close', 'reservation-created', 'update:visible']);

const bedReservationsStore = useBedReservationsStore();
const authStore = useAuthStore();

const toast = useToast();

const formData = ref({});
const submitted = ref(false);
const isSaving = ref(false);

// Modo crear o editar
const isEditMode = computed(() => !!(props.reservation && props.reservation.id));
const isCreateMode = computed(() => !isEditMode.value && !!props.bed);

// Diálogo bloqueado si está completada o cancelada
const isCompleted = computed(() => formData.value.status === 'completada' || formData.value.status === 'cancelada');

// Opciones de estado según el modo
// Estados: activa, confirmada, cancelada, completada
const availableStatuses = computed(() => {
    if (!isEditMode.value) {
        // Modo crear: el estado se asigna automáticamente como 'activa'
        return ['activa'];
    }

    // Modo editar: transiciones de estado
    if (formData.value.status === 'activa') {
        // Desde activa puede ir a: confirmada, cancelada o completada
        return ['activa', 'confirmada', 'cancelada', 'completada'];
    } else if (formData.value.status === 'confirmada') {
        return ['confirmada', 'cancelada', 'completada'];
    } else if (formData.value.status === 'cancelada' || formData.value.status === 'completada') {
        // Estados finales, no editables
        return [formData.value.status];
    }
    return ['activa', 'confirmada', 'cancelada'];
});

// Título del diálogo
const dialogTitle = computed(() => {
    if (isCreateMode.value) {
        return `Reservar Cama ${props.bed?.bed_number || ''}`;
    }
    return 'Editar Reserva';
});

watch(
    () => props.visible,
    (newValue) => {
        if (newValue) {
            submitted.value = false;

            if (isEditMode.value) {
                // Modo editar: cargar datos de la reserva existente
                formData.value = {
                    ...props.reservation
                };
            } else if (isCreateMode.value) {
                // Modo crear: inicializar formulario vacío
                // API espera: id_beds, id_users (usuario autenticado), notes
                formData.value = {
                    id_beds: props.bed?.id,
                    id_users: authStore.getUser?.id,
                    notes: ''
                };
            }
        }
    }
);

const validateForm = () => {
    if (isCreateMode.value) {
        if (!formData.value.id_users) {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo obtener el usuario autenticado',
                life: 3000
            });
            return false;
        }
        if (!formData.value.id_beds) {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'La cama no está especificada',
                life: 3000
            });
            return false;
        }
    }
    return true;
};

const submit = async () => {
    submitted.value = true;

    if (!validateForm()) {
        return;
    }

    isSaving.value = true;

    try {
        if (isEditMode.value) {
            // Modo editar: solo status y notes pueden ser actualizados
            await bedReservationsStore.updateReservation(formData.value);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Reserva actualizada exitosamente',
                life: 3000
            });
            emit('save', formData.value);
        } else if (isCreateMode.value) {
            // Modo crear: solo enviar id_beds, id_users y notes
            // El status se asigna automáticamente como 'activa' en el backend
            const reservationData = {
                id_beds: formData.value.id_beds,
                id_users: formData.value.id_users,
                notes: formData.value.notes || ''
            };

            await bedReservationsStore.createReservation(reservationData);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Reserva creada exitosamente',
                life: 3000
            });
            emit('reservation-created');
            emit('save', reservationData);
        }

        closeDialog();
    } catch (error) {
        console.error('Error saving reservation:', error);

        // Manejo de errores específicos de la API
        let errorMessage = 'Error al guardar la reserva';

        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.response?.status === 422) {
            errorMessage = 'Validación fallida. Verifique los datos ingresados';
        } else if (error.response?.status === 404) {
            errorMessage = 'Cama no encontrada';
        }

        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
        });
    } finally {
        isSaving.value = false;
    }
};

const closeDialog = () => {
    // Emitir update:visible para cerrar el diálogo (v-model)
    emit('update:visible', false);
    emit('close');
};
</script>

<template>
    <Dialog :visible="visible" @update:visible="closeDialog" :modal="true" :header="dialogTitle" :style="{ width: '500px' }">
        <div class="p-fluid">
            <!-- Modo Crear: Solo notas (status se asigna automáticamente como 'activa') -->
            <template v-if="isCreateMode">
                <div class="bg-blue-50 border-l-3 border-blue-500 p-3 mb-4 text-sm">
                    <div class="flex items-center gap-2 mb-2">
                        <i class="pi pi-info-circle text-blue-500"></i>
                        <span class="font-semibold text-blue-700">Información de la reserva</span>
                    </div>
                    <ul class="list-none p-0 m-0 text-blue-600">
                        <li class="mb-1">• La reserva se creará con estado <strong>activa</strong></li>
                        <li>
                            • Reservada por: <strong>{{ authStore.getUser?.name }}</strong>
                        </li>
                    </ul>
                </div>

                <div class="field">
                    <label for="notes">Notas</label>
                    <Textarea id="notes" v-model="formData.notes" rows="5" placeholder="Agregue notas sobre esta reserva (opcional)&#10;Ejemplo: Paciente post-operatorio, requiere monitoreo especial" fluid />
                </div>
            </template>

            <!-- Modo Editar: Solo estado y notas -->
            <template v-else-if="isEditMode">
                <div class="field">
                    <label for="status">Estado</label>
                    <Select id="status" v-model="formData.status" :options="availableStatuses" placeholder="Seleccione un estado" :disabled="isCompleted" fluid />
                    <small class="p-hint">
                        <template v-if="formData.status === 'activa'"> Puede confirmar, completar o cancelar esta reserva </template>
                        <template v-else-if="formData.status === 'confirmada'"> Puede completar o cancelar esta reserva </template>
                        <template v-else-if="formData.status === 'cancelada'"> Esta reserva está cancelada y no puede ser modificada </template>
                        <template v-else-if="formData.status === 'completada'"> Esta reserva está completada y no puede ser modificada </template>
                    </small>
                </div>

                <div class="field">
                    <label for="notes">Notas</label>
                    <Textarea id="notes" v-model="formData.notes" rows="4" :disabled="isCompleted" placeholder="Notas sobre la reserva" fluid />
                </div>
            </template>
        </div>

        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" severity="secondary" text @click="closeDialog" />
            <Button :label="isCreateMode ? 'Reservar' : 'Actualizar'" :icon="isCreateMode ? 'pi pi-calendar-plus' : 'pi pi-check'" @click="submit" :loading="isSaving" :disabled="isCompleted" />
        </template>
    </Dialog>
</template>
