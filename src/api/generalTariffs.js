import axios from './axios';

/**
 * API service for General Tariffs management.
 * Gestión de tarifarios generales.
 */
export const generalTariffs = {
    /**
     * Gets a list of all general tariffs (without pagination).
     * Obtiene todos los tarifarios generales sin paginación.
     * @returns {Promise}
     */
    getAll: () => axios.get('/general-tariffs'),

    /**
     * Creates a new general tariff.
     * @param {object} tariffData - Tariff data
     * @returns {Promise}
     */
    create: (tariffData) => axios.post('/general-tariffs', tariffData),

    /**
     * Retrieves a specific general tariff by ID.
     * @param {number} id - Tariff ID
     * @returns {Promise}
     */
    getById: (id) => axios.get(`/general-tariffs/${id}`),

    /**
     * Updates an existing general tariff.
     * @param {number} id - Tariff ID
     * @param {object} tariffData - Updated tariff data
     * @returns {Promise}
     */
    update: (id, tariffData) => axios.put(`/general-tariffs/${id}`, tariffData),

    /**
     * Deletes a general tariff.
     * @param {number} id - Tariff ID
     * @returns {Promise}
     */
    delete: (id) => axios.delete(`/general-tariffs/${id}`)
};
