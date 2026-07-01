import axios from './axios';

/**
 * API service del módulo de Admisión (ventanilla).
 *
 * Por ahora cubre el "escaneo de paciente": la admisionista busca por documento
 * (DNI, código de paciente o número de historia) y obtiene de un vistazo quién
 * es el paciente, su financiamiento, sus citas de hoy y su historial. El header
 * `Authorization: Bearer` lo agrega el interceptor de axios.
 *
 * Las respuestas siguen el formato estándar `{ success, data, message, errors }`.
 */
export const admision = {
    /**
     * Escanear/buscar un paciente por documento para admisión en ventanilla.
     *
     * @param {string} documento - DNI, código de paciente o número de historia
     *   (3-50 chars). El backend busca por los tres campos automáticamente.
     * @param {number} [limitUltimas=5] - cuántas atenciones históricas traer (1-20).
     * @returns {Promise} data: { paciente, financiamiento_default, citas_hoy[], ultimas_citas[] }
     *   404 si no existe un paciente con ese documento; 422 en validación.
     */
    scanPatient: (documento, limitUltimas) =>
        axios.get('/admision/scan', {
            params: { documento, limit_ultimas: limitUltimas }
        })
};
