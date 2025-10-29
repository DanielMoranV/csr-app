<script setup>
import { useBedReservationsStore } from '@/store/bedReservationsStore';
import { storeToRefs } from 'pinia';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: Boolean,
    reservation: Object
});

const emit = defineEmits(['save', 'close']);

const bedReservationsStore = useBedReservationsStore();
const { isSaving } = storeToRefs(bedReservationsStore);

const toast = useToast();

const formData = ref({});
const statuses = ref(['confirmada', 'pendiente', 'cancelada', 'completada']);

const submitted = ref(false);

const isCompleted = computed(() => formData.value.status === 'completada');

const availableStatuses = computed(() => {
    if (formData.value.status === 'activa') {
        return ['activa', 'cancelada'];
    } else if (formData.value.status === 'pendiente') {
        return ['pendiente', 'confirmada', 'cancelada'];
    } else if (formData.value.status === 'cancelada' || formData.value.status === 'completada') {
        return [formData.value.status];
    }
    return statuses.value; // Fallback
});

watch(
    () => props.visible,
    (newValue) => {
        if (newValue) {
            submitted.value = false;
            if (props.reservation && props.reservation.id) {
                formData.value = {
                    ...props.reservation,
                    bed_id: props.reservation.id_beds,
                    patient_id: props.reservation.id_users
                };
                if (formData.value.reservation_date) {
                    formData.value.reservation_date = new Date(formData.value.reservation_date);
                }
            } else {
                // This case should ideally not happen if dialog is only for editing
                formData.value = { status: 'pendiente' };
            }
        }
    }
);

// No need to fetch users/beds if not displaying them
// onMounted(() => {
//     usersStore.fetchUsers();
//     roomsStore.fetchBeds();
// });

const submit = () => {
    submitted.value = true;
    // No client-side validation needed for notes and status
    emit('save', formData.value);
};

const closeDialog = () => {
    emit('close');
};
</script>

<template>
    <Dialog :visible="visible" @update:visible="closeDialog" :modal="true" :header="'Editar Reserva'" :style="{ width: '450px' }">
        <div class="p-fluid">
            <div class="field">
                <label for="status">Estado</label>
                <Select id="status" v-model="formData.status" :options="availableStatuses" placeholder="Seleccione un estado" :disabled="isCompleted" fluid></Select>
            </div>
            <div class="field">
                <label for="notes">Notas</label>
                <Textarea id="notes" v-model="formData.notes" rows="3" :disabled="isCompleted" fluid></Textarea>
            </div>
        </div>
        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="closeDialog" :disabled="isCompleted" />
            <Button label="Actualizar" icon="pi pi-check" @click="submit" :disabled="isSaving || isCompleted" />
        </template>
    </Dialog>
</template>
