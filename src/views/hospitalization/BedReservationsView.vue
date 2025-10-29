<script setup>
import BedReservationDialog from '@/components/hospitalization/BedReservationDialog.vue';
import BedReservationsTable from '@/components/hospitalization/BedReservationsTable.vue';
import ConfirmDeleteDialog from '@/components/rooms/ConfirmDeleteDialog.vue'; // Reusing this component
import { useBedReservationsStore } from '@/store/bedReservationsStore';
import { storeToRefs } from 'pinia';
import { onMounted, ref } from 'vue';

const bedReservationsStore = useBedReservationsStore();
const { reservations } = storeToRefs(bedReservationsStore);

const reservationDialog = ref(false);
const deleteReservationDialog = ref(false);
const reservation = ref({});

onMounted(() => {
    bedReservationsStore.fetchReservations();
});

const editReservation = (selectedReservation) => {
    reservation.value = { ...selectedReservation };
    reservationDialog.value = true;
};

const confirmDeleteReservation = (selectedReservation) => {
    reservation.value = selectedReservation;
    deleteReservationDialog.value = true;
};

const saveReservation = async (reservationData) => {
    if (reservationData.id) {
        await bedReservationsStore.updateReservation(reservationData);
    } else {
        await bedReservationsStore.createReservation(reservationData);
    }
    reservationDialog.value = false;
};

const deleteReservation = async () => {
    await bedReservationsStore.deleteReservation(reservation.value.id);
    deleteReservationDialog.value = false;
};

const hideDialog = () => {
    reservationDialog.value = false;
};
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <div class="card">
                <h3 class="text-2xl font-semibold mb-4">Gestión de Reservas de Camas Hospitalización</h3>

                <BedReservationsTable :reservations="reservations" @edit-reservation="editReservation" @delete-reservation="confirmDeleteReservation" />
            </div>

            <BedReservationDialog :reservation="reservation" :visible="reservationDialog" @save="saveReservation" @close="hideDialog" />

            <ConfirmDeleteDialog :visible="deleteReservationDialog" item-name="reserva" @close="deleteReservationDialog = false" @confirm="deleteReservation" />
        </div>
    </div>
</template>
