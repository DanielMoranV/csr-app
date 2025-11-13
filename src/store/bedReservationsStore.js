import { bedReservations as bedReservationsApi } from '@/api/bedReservations';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useBedReservationsStore = defineStore('bedReservations', () => {
    const reservations = ref([]);

    async function fetchReservations() {
        try {
            const response = await bedReservationsApi.getAll();
            reservations.value = response.data.data || response.data;
        } catch (error) {
            // Error handled
        }
    }

    async function createReservation(reservationData) {
        try {
            const response = await bedReservationsApi.create(reservationData);
            reservations.value.push(response.data);
        } catch (error) {
            // Error handled
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
            // Error handled
        }
    }

    async function deleteReservation(id) {
        try {
            await bedReservationsApi.delete(id);
            reservations.value = reservations.value.filter((r) => r.id !== id);
        } catch (error) {
            throw error;
        }
    }

    async function cancelReservation(id, reservationData = {}) {
        try {
            // Construir el payload con los datos de la reserva y el status cancelada
            const payload = {
                ...reservationData,
                status: 'cancelada'
            };

            const response = await bedReservationsApi.update(id, payload);
            const index = reservations.value.findIndex((r) => r.id === id);
            if (index !== -1) {
                reservations.value[index] = response.data;
            }
            return response;
        } catch (error) {
            throw error;
        }
    }

    return {
        reservations,
        fetchReservations,
        createReservation,
        updateReservation,
        deleteReservation,
        cancelReservation
    };
});
