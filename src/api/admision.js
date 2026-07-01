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
     * Buscar un paciente MIGRANDO fresco desde Sisclin antes de responder
     * (endpoint principal de admisión). Tarda ~5 s → mostrar spinner.
     *
     * @param {object} payload
     * @param {string} payload.documento - DNI, número de historia o número de
     *   admisión (3-50 chars).
     * @param {'dni'|'historia'|'num_admision'} [payload.tipo] - si se omite, el
     *   backend lo auto-detecta por longitud (8→dni, 9→historia, 10→num_admision).
     * @param {number} [payload.limitUltimas] - atenciones históricas a traer (1-20).
     * @returns {Promise} data: { paciente, financiamiento_default, citas_hoy[], ultimas_citas[] }
     *   404 no encontrado en Sisclin; 409 sync en curso; 422 validación; 503/504
     *   microservicio no disponible / timeout.
     */
    syncPatient: ({ documento, tipo, limitUltimas } = {}) =>
        axios.post('/admision/paciente/sync', {
            documento,
            // omitir `tipo` cuando es auto → el backend lo detecta por longitud
            tipo: tipo || undefined,
            limit_ultimas: limitUltimas
        }),

    /**
     * Lectura rápida SIN migrar (instantánea). No refleja cambios recién hechos
     * en Sisclin; usar solo para relecturas de un paciente ya cargado.
     *
     * @param {string} documento - DNI, código de paciente o número de historia.
     * @param {number} [limitUltimas] - atenciones históricas a traer (1-20).
     * @returns {Promise} misma forma de respuesta que `syncPatient`.
     */
    scanPatient: (documento, limitUltimas) =>
        axios.get('/admision/scan', {
            params: { documento, limit_ultimas: limitUltimas }
        })
};
