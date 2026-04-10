import axios from './axios';

/**
 * API service for Bed Reservations management.
 */
export const bedReservations = {
    /**
     * Gets a list of all bed reservations.
     * @returns {Promise}
     */
    getAll: () => axios.get('/bed-reservations'),

    /**
     * Retrieves a specific bed reservation by its ID.
     * @param {number} id - The ID of the reservation.
     * @returns {Promise}
     */
    getById: (id) => axios.get(`/bed-reservations/${id}`),

    /**
     * Creates a new bed reservation.
     * @param {object} reservationData - The data for the new reservation.
     * @param {number} reservationData.bed_id - The ID of the bed to reserve.
     * @param {number} reservationData.patient_id - The ID of the patient.
     * @param {string} reservationData.reservation_date - The date of the reservation.
     * @param {string} [reservationData.status] - The status of the reservation.
     * @returns {Promise}
     */
    create: (reservationData) => axios.post('/bed-reservations', reservationData),

    /**
     * Updates an existing bed reservation.
     * @param {number} id - The ID of the reservation to update.
     * @param {object} reservationData - The new data for the reservation.
     * @returns {Promise}
     */
    update: (id, reservationData) => axios.put(`/bed-reservations/${id}`, reservationData),

    /**
     * Deletes a bed reservation.
     * @param {number} id - The ID of the reservation to delete.
     * @returns {Promise}
     */
    delete: (id) => axios.delete(`/bed-reservations/${id}`),

    /**
     * Gets the audit history for a specific bed reservation.
     * @param {number} reservationId - The ID of the reservation.
     * @param {object} [params] - Optional query params (per_page, page, etc.).
     * @returns {Promise} Resolves to { data: AuditEntry[], pagination: {...} }
     */
    getAudits: (reservationId, params = {}) =>
        axios.get('/bed-reservations/audits', {
            params: {
                bed_reservation_id: reservationId,
                per_page: 50,
                ...params
            }
        })
};

