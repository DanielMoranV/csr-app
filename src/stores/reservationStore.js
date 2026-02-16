import { reservationService } from '@/api/reservations';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useReservationStore = defineStore('reservations', () => {
    // State
    const reservations = ref([]);
    const currentReservation = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const pagination = ref({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 15
    });

    // Actions
    async function fetchReservations(params = {}) {
        loading.value = true;
        error.value = null;
        try {
            const response = await reservationService.listDocs(params);
            // Asumiendo que la estructura de respuesta paginada cumple con el estándar de Laravel
            // Si la respuesta es directa data: [], adaptar según corresponda.
            // Basado en doc: { success: true, data: [...], ... }
            // Si es paginado usualmente data.data contiene los items y data meta-info.
            // Ajustaremos para leer response.data.data si existe, o response.data

            const resData = response.data;
            if (resData.success) {
                reservations.value = resData.data;
                // Si hay metadatos de paginación en el nivel raíz o dentro de data
                if (resData.current_page) {
                    pagination.value = {
                        current_page: resData.current_page,
                        last_page: resData.last_page,
                        total: resData.total,
                        per_page: resData.per_page
                    };
                }
            } else {
                reservations.value = [];
            }
        } catch (err) {
            console.error('Error fetching reservations:', err);
            error.value = err.response?.data?.message || 'Error al cargar las reservas';
        } finally {
            loading.value = false;
        }
    }

    async function fetchReservationById(id) {
        loading.value = true;
        error.value = null;
        currentReservation.value = null;
        try {
            const response = await reservationService.getDoc(id);
            if (response.data.success) {
                currentReservation.value = response.data.data;
            }
        } catch (err) {
            console.error(`Error fetching reservation ${id}:`, err);
            error.value = err.response?.data?.message || 'Error al cargar el detalle de la reserva';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function createReservationList(data) {
        loading.value = true;
        error.value = null;
        try {
            const response = await reservationService.createDoc(data);
            if (response.data.success) {
                // Opcional: Agregar a la lista actual si corresponde
                reservations.value.unshift(response.data.data);
            }
            return response.data;
        } catch (err) {
            console.error('Error creating reservation:', err);
            error.value = err.response?.data?.message || 'Error al crear la lista de reservas';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function updateReservationList(id, data) {
        loading.value = true;
        error.value = null;
        try {
            const response = await reservationService.updateDoc(id, data);
            if (response.data.success) {
                // Actualizar en la lista local
                const index = reservations.value.findIndex((r) => r.id === id);
                if (index !== -1) {
                    reservations.value[index] = { ...reservations.value[index], ...response.data.data };
                }
                // Actualizar detalle actual si es el mismo
                if (currentReservation.value && currentReservation.value.id === id) {
                    currentReservation.value = response.data.data;
                }
            }
            return response.data;
        } catch (err) {
            console.error(`Error updating reservation ${id}:`, err);
            error.value = err.response?.data?.message || 'Error al actualizar la lista de reservas';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    async function deleteReservationList(id) {
        loading.value = true;
        error.value = null;
        try {
            const response = await reservationService.deleteDoc(id);
            if (response.data.success) {
                reservations.value = reservations.value.filter((r) => r.id !== id);
                if (currentReservation.value && currentReservation.value.id === id) {
                    currentReservation.value = null;
                }
            }
        } catch (err) {
            console.error(`Error deleting reservation ${id}:`, err);
            error.value = err.response?.data?.message || 'Error al eliminar la lista de reservas';
            throw err;
        } finally {
            loading.value = false;
        }
    }

    return {
        reservations,
        currentReservation,
        loading,
        error,
        pagination,
        fetchReservations,
        fetchReservationById,
        createReservationList,
        updateReservationList,
        deleteReservationList
    };
});
