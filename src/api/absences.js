import axios from './axios';

/**
 * API service for Doctor Absences management.
 * Gestión de ausencias de médicos.
 */
export const absences = {
    /**
     * Gets a list of all absences with filters.
     * @param {object} params - Query parameters (doctor_id, date, upcoming, past, today)
     * @returns {Promise}
     */
    getAll: (params = {}) => axios.get('/absences', { params }),

    /**
     * Creates a new absence record.
     * @param {object} absenceData - Absence data (id_doctor, date, start_time, end_time, reason)
     * @returns {Promise}
     */
    create: (absenceData) => axios.post('/absences', absenceData),

    /**
     * Retrieves a specific absence by ID.
     * @param {number} id - Absence ID
     * @returns {Promise}
     */
    getById: (id) => axios.get(`/absences/${id}`),

    /**
     * Updates an existing absence.
     * @param {number} id - Absence ID
     * @param {object} absenceData - Updated absence data
     * @returns {Promise}
     */
    update: (id, absenceData) => axios.put(`/absences/${id}`, absenceData),

    /**
     * Deletes an absence.
     * @param {number} id - Absence ID
     * @returns {Promise}
     */
    delete: (id) => axios.delete(`/absences/${id}`),

    /**
     * Gets absences statistics.
     * @returns {Promise}
     */
    getStats: () => axios.get('/absences/stats')
};
