import axios from './axios';

/**
 * API service for Doctors management.
 * Gestión de médicos del hospital.
 */
export const doctors = {
    /**
     * Gets a list of all doctors with filters, sorting, and pagination.
     * @param {object} params - Query parameters (document_type, payment_payroll, paginate, per_page, etc.)
     * @returns {Promise}
     */
    getAll: (params = {}) => axios.get('/doctors', { params }),

    /**
     * Creates a new doctor.
     * @param {object} doctorData - Doctor data (name, document_type, document_number, cmp, code, etc.)
     * @returns {Promise}
     */
    create: (doctorData) => axios.post('/doctors', doctorData),

    /**
     * Creates a doctor with linked user account in a single operation.
     * @param {object} data - Combined user and doctor data
     * @returns {Promise}
     */
    createWithUser: (data) => axios.post('/doctors/with-user', data),

    /**
     * Retrieves a specific doctor by ID.
     * @param {number} id - Doctor ID
     * @returns {Promise}
     */
    getById: (id) => axios.get(`/doctors/${id}`),

    /**
     * Retrieves a specific doctor by code.
     * @param {string} code - Doctor code (e.g., "MED001")
     * @returns {Promise}
     */
    getByCode: (code) => axios.get(`/doctors/code/${code}`),

    /**
     * Updates an existing doctor.
     * @param {number} id - Doctor ID
     * @param {object} doctorData - Updated doctor data
     * @returns {Promise}
     */
    update: (id, doctorData) => axios.put(`/doctors/${id}`, doctorData),

    /**
     * Deletes a doctor.
     * Note: Cannot delete doctors with active hospital attentions.
     * @param {number} id - Doctor ID
     * @returns {Promise}
     */
    delete: (id) => axios.delete(`/doctors/${id}`),

    /**
     * Searches for doctors by name, code, CMP, or document number.
     * @param {object} params - Query parameters (q, document_type, payment_payroll)
     * @returns {Promise}
     */
    search: (params = {}) => axios.get('/doctors/search', { params }),

    /**
     * Gets doctor statistics.
     * @returns {Promise}
     */
    getStats: () => axios.get('/doctors/stats'),

    /**
     * Links a doctor to a user account.
     * @param {number} doctorId - Doctor ID
     * @param {object} data - { user_id: number }
     * @returns {Promise}
     */
    linkUser: (doctorId, data) => axios.post(`/doctors/${doctorId}/link-user`, data),

    /**
     * Unlinks a doctor from their user account.
     * @param {number} doctorId - Doctor ID
     * @returns {Promise}
     */
    unlinkUser: (doctorId) => axios.delete(`/doctors/${doctorId}/unlink-user`),

    /**
     * Gets the linked user information for a doctor.
     * @param {number} doctorId - Doctor ID
     * @returns {Promise}
     */
    getLinkedUser: (doctorId) => axios.get(`/doctors/${doctorId}/linked-user`),

    /**
     * Gets all schedules for a specific doctor.
     * @param {number} doctorId - Doctor ID
     * @param {object} params - Query parameters (date, start_date, end_date, category, upcoming)
     * @returns {Promise}
     */
    getSchedules: (doctorId, params = {}) => axios.get(`/doctors/${doctorId}/schedules`, { params }),

    /**
     * Gets all absences for a specific doctor.
     * @param {number} doctorId - Doctor ID
     * @param {object} params - Query parameters (date, upcoming, past, today)
     * @returns {Promise}
     */
    getAbsences: (doctorId, params = {}) => axios.get(`/doctors/${doctorId}/absences`, { params })
};
