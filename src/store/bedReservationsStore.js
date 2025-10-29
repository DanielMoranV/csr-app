import { bedReservations as bedReservationsApi } from '@/api/bedReservations';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useBedReservationsStore = defineStore('bedReservations', () => {
    const reservations = ref([]);

    async function fetchReservations() {
        try {
            const response = await bedReservationsApi.getAll();
            console.log(response);
            reservations.value = response.data.data || response.data;
        } catch (error) {
            console.error('Error fetching reservations:', error);
        }
    }

    async function createReservation(reservationData) {
        try {
            const response = await bedReservationsApi.create(reservationData);
            reservations.value.push(response.data);
        } catch (error) {
            console.error('Error creating reservation:', error);
        }
    }

    async function updateReservation(reservationData) {
        try {
            const response = await bedReservationsApi.update(reservationData.id, reservationData);
            const index = reservations.value.findIndex((r) => r.id === reservationData.id);
            if (index !== -1) {
                reservations.value[index] = response.data;
            }
        } catch (error) {
            console.error('Error updating reservation:', error);
        }
    }

    async function deleteReservation(id) {
        try {
            await bedReservationsApi.delete(id);
            reservations.value = reservations.value.filter((r) => r.id !== id);
        } catch (error) {
            console.error('Error deleting reservation:', error);
        }
    }

    return {
        reservations,
        fetchReservations,
        createReservation,
        updateReservation,
        deleteReservation
    };
});
