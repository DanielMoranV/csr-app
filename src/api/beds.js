import axios from './axios';

/**
 * API service for Beds management.
 */
export const beds = {
    /**
     * Gets a list of all beds.
     * @param {object} params - Query parameters.
     * @returns {Promise}
     */
    getAll: (params = {}) => axios.get('/beds', { params }),

    /**
     * Creates a new bed.
     * @param {object} bedData - The data for the new bed.
     * @returns {Promise}
     */
    create: (bedData) => axios.post('/beds', bedData),

    /**
     * Retrieves a specific bed by its ID.
     * @param {number} id - The ID of the bed.
     * @returns {Promise}
     */
    getById: (id) => axios.get(`/beds/${id}`),

    /**
     * Updates an existing bed.
     * @param {number} id - The ID of the bed to update.
     * @param {object} bedData - The new data for the bed.
     * @returns {Promise}
     */
    update: (id, bedData) => axios.put(`/beds/${id}`, bedData),

    /**
     * Deletes a bed.
     * @param {number} id - The ID of the bed to delete.
     * @returns {Promise}
     */
    delete: (id) => axios.delete(`/beds/${id}`),

    /**
     * Toggles the is_active status of a bed.
     * @param {number} id - The ID of the bed to modify.
     * @returns {Promise}
     */
    toggleStatus: (id) => axios.patch(`/beds/${id}/toggle-status`),

    /**
     * Searches for beds.
     * @param {object} params - Query parameters.
     * @returns {Promise}
     */
    search: (params = {}) => axios.get('/beds/search', { params })
};
