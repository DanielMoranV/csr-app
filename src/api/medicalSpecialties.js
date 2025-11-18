import axios from './axios';

/**
 * API service for Medical Specialties management.
 * Gestión de especialidades médicas.
 */
export const medicalSpecialties = {
    /**
     * Gets a list of all medical specialties.
     * @param {object} params - Query parameters (with_doctors, with_doctors_count, popular, min_doctors)
     * @returns {Promise}
     */
    getAll: (params = {}) => axios.get('/medical-specialties', { params }),

    /**
     * Creates a new medical specialty.
     * @param {object} specialtyData - Specialty data (name, description)
     * @returns {Promise}
     */
    create: (specialtyData) => axios.post('/medical-specialties', specialtyData),

    /**
     * Retrieves a specific medical specialty by ID.
     * @param {number} id - Specialty ID
     * @returns {Promise}
     */
    getById: (id) => axios.get(`/medical-specialties/${id}`),

    /**
     * Updates an existing medical specialty.
     * @param {number} id - Specialty ID
     * @param {object} specialtyData - Updated specialty data
     * @returns {Promise}
     */
    update: (id, specialtyData) => axios.put(`/medical-specialties/${id}`, specialtyData),

    /**
     * Deletes a medical specialty.
     * Note: Cannot delete specialties with associated doctors.
     * @param {number} id - Specialty ID
     * @returns {Promise}
     */
    delete: (id) => axios.delete(`/medical-specialties/${id}`),

    /**
     * Searches for medical specialties by name or description.
     * @param {object} params - Query parameters (q)
     * @returns {Promise}
     */
    search: (params = {}) => axios.get('/medical-specialties/search', { params }),

    /**
     * Gets medical specialties statistics.
     * @returns {Promise}
     */
    getStats: () => axios.get('/medical-specialties/stats'),

    /**
     * Attaches a doctor to a medical specialty.
     * @param {number} specialtyId - Specialty ID
     * @param {object} data - { doctor_id: number }
     * @returns {Promise}
     */
    attachDoctor: (specialtyId, data) => axios.post(`/medical-specialties/${specialtyId}/attach-doctor`, data),

    /**
     * Detaches a doctor from a medical specialty.
     * @param {number} specialtyId - Specialty ID
     * @param {object} data - { doctor_id: number }
     * @returns {Promise}
     */
    detachDoctor: (specialtyId, data) => axios.post(`/medical-specialties/${specialtyId}/detach-doctor`, data),

    /**
     * Synchronizes doctors for a medical specialty (replaces entire list).
     * @param {number} specialtyId - Specialty ID
     * @param {object} data - { doctor_ids: number[] }
     * @returns {Promise}
     */
    syncDoctors: (specialtyId, data) => axios.post(`/medical-specialties/${specialtyId}/sync-doctors`, data)
};
