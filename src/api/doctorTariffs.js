import axios from './axios';

/**
 * API service for Doctor Tariffs management.
 * Gestión de tarifarios médicos.
 */
export const doctorTariffs = {
    /**
     * Gets a list of all doctor tariffs (without pagination).
     * Obtiene todos los tarifarios médicos sin paginación.
     * @returns {Promise}
     */
    getAll: () => axios.get('/doctor-tariffs'),

    /**
     * Creates a new doctor tariff.
     * @param {object} tariffData - Tariff data
     * @returns {Promise}
     */
    create: (tariffData) => axios.post('/doctor-tariffs', tariffData),

    /**
     * Retrieves a specific doctor tariff by ID.
     * @param {number} id - Tariff ID
     * @returns {Promise}
     */
    getById: (id) => axios.get(`/doctor-tariffs/${id}`),

    /**
     * Updates an existing doctor tariff.
     * @param {number} id - Tariff ID
     * @param {object} tariffData - Updated tariff data
     * @returns {Promise}
     */
    update: (id, tariffData) => axios.put(`/doctor-tariffs/${id}`, tariffData),

    /**
     * Deletes a doctor tariff.
     * @param {number} id - Tariff ID
     * @returns {Promise}
     */
    delete: (id) => axios.delete(`/doctor-tariffs/${id}`)
};
