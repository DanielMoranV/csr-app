import axios from './axios';

/**
 * API service for Bed Reservations management.
 */
export const bedReservations = {
    /**
     * Gets a list of all bed reservations.
     * @param {object} params - Query parameters (status, bed_id, user_id, sort_by, sort_direction, paginate, per_page).
     * @returns {Promise}
     */
    getAll: (params = {}) => axios.get('/bed-reservations', { params }),

    /**
     * Creates a new bed reservation.
     * @param {object} reservationData - The data for the new reservation.
     * @param {number} reservationData.id_beds - The ID of the bed to reserve.
     * @param {number} reservationData.id_users - The ID of the user making the reservation.
     * @param {string} [reservationData.notes] - Optional notes for the reservation.
     * @returns {Promise}
     */
    create: (reservationData) => axios.post('/bed-reservations', reservationData),

    /**
     * Retrieves a specific bed reservation by its ID.
     * @param {number} id - The ID of the reservation.
     * @returns {Promise}
     */
    getById: (id) => axios.get(`/bed-reservations/${id}`),

    /**
     * Updates an existing bed reservation.
     * @param {number} id - The ID of the reservation to update.
     * @param {object} reservationData - The new data for the reservation.
     * @param {number} [reservationData.id_beds] - The ID of the bed.
     * @param {number} [reservationData.id_users] - The ID of the user.
     * @param {string} [reservationData.notes] - Optional notes.
     * @param {string} [reservationData.status] - Status ('activa', 'cancelada', 'completada').
     * @returns {Promise}
     */
    update: (id, reservationData) => axios.put(`/bed-reservations/${id}`, reservationData),

    /**
     * Cancels a bed reservation (soft delete).
     * Note: This does not delete the reservation, it marks it as 'cancelada'.
     * @param {number} id - The ID of the reservation to cancel.
     * @returns {Promise}
     */
    cancel: (id) => axios.delete(`/bed-reservations/${id}`),

    /**
     * Gets all active reservations.
     * @returns {Promise}
     */
    getActive: () => axios.get('/bed-reservations', { params: { status: 'activa' } }),

    /**
     * Gets reservations for a specific bed.
     * @param {number} bedId - The ID of the bed.
     * @param {object} params - Additional query parameters.
     * @returns {Promise}
     */
    getByBed: (bedId, params = {}) =>
        axios.get('/bed-reservations', {
            params: { bed_id: bedId, ...params }
        }),

    /**
     * Gets reservations for a specific user.
     * @param {number} userId - The ID of the user.
     * @param {object} params - Additional query parameters.
     * @returns {Promise}
     */
    getByUser: (userId, params = {}) =>
        axios.get('/bed-reservations', {
            params: { user_id: userId, ...params }
        })
};
