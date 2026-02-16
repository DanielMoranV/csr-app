import axios from './axios';

/**
 * Servicio API para la gestión de listas de reservas médicas.
 */
export const reservationService = {
    /**
     * Obtiene una lista paginada de reservas.
     * @param {Object} params - Parámetros de filtro (doctor_id, date, page).
     * @returns {Promise}
     */
    listDocs: (params = {}) => axios.get('/reservations', { params }),

    /**
     * Crea una nueva lista de reservas.
     * @param {Object} data - Datos de la reserva (doctor_id, doctor_schedule_id, notes, patients).
     * @returns {Promise}
     */
    createDoc: (data) => axios.post('/reservations', data),

    /**
     * Obtiene el detalle completo de una reserva específica.
     * @param {number|string} id - ID de la reserva.
     * @returns {Promise}
     */
    getDoc: (id) => axios.get(`/reservations/${id}`),

    /**
     * Actualiza una lista de reservas existente.
     * @param {number|string} id - ID de la reserva.
     * @param {Object} data - Datos a actualizar (notes, patients).
     * @returns {Promise}
     */
    updateDoc: (id, data) => axios.put(`/reservations/${id}`, data),

    /**
     * Elimina permanentemente una lista de reservas.
     * @param {number|string} id - ID de la reserva.
     * @returns {Promise}
     */
    deleteDoc: (id) => axios.delete(`/reservations/${id}`)
};
