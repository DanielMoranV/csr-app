import axios from './axios';

/**
 * API service for Medical Shifts (Turnos Médicos).
 * Los turnos médicos son datos maestros predefinidos (M, T, N).
 * Este servicio es solo de lectura.
 */
export const medicalShifts = {
    /**
     * Gets a list of all medical shifts (Mañana, Tarde, Noche).
     * @returns {Promise}
     */
    getAll: () => axios.get('/medical-shifts'),

    /**
     * Retrieves a specific medical shift by ID.
     * @param {number} id - Shift ID
     * @returns {Promise}
     */
    getById: (id) => axios.get(`/medical-shifts/${id}`)

    // Nota: Los turnos médicos son de solo lectura.
    // No hay endpoints de create, update o delete.
};
