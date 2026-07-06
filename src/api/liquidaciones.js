import axios from './axios';

/**
 * API service del módulo de Liquidación de Servicios.
 *
 * El backend (csr-api) arma al vuelo el PDF de liquidación de una hospitalización
 * a partir de un número de admisión; el frontend solo dispara la petición y
 * muestra/descarga el binario. El header `Authorization: Bearer` lo agrega el
 * interceptor de axios.
 *
 * La respuesta 200 es binaria (`application/pdf`): se pide como **blob**, por lo
 * que el interceptor devuelve la respuesta axios completa (`response.data` es el
 * Blob y `response.headers` incluye `Content-Disposition`).
 */
export const liquidaciones = {
    /**
     * Genera el PDF de liquidación de una admisión.
     *
     * @param {object} payload
     * @param {string|number} payload.numeroAdmision - solo dígitos (la ruta valida
     *   `whereNumber`). Se acepta con o sin ceros a la izquierda; el backend normaliza.
     * @param {boolean} [payload.download] - si es `true` añade `?download=1` para
     *   que el backend responda `Content-Disposition: attachment`.
     * @param {boolean} [payload.migrar] - por defecto el backend migra fresco antes
     *   de generar (~10-15 s). Pasar `false` salta la migración y lee lo ya migrado.
     * @returns {Promise} respuesta axios con `data` (Blob application/pdf) y headers.
     *   Errores: 401 no autenticado; 403 sin permiso `liquidaciones.view`;
     *   404 admisión no encontrada; 502 servicio de datos (ETL) caído.
     */
    getPdf: ({ numeroAdmision, download, migrar } = {}) =>
        axios.get(`/liquidaciones/${numeroAdmision}/pdf`, {
            // El paramsSerializer descarta null/undefined/''; solo se envían los
            // parámetros cuando aportan algo distinto al comportamiento por defecto.
            params: {
                download: download ? 1 : undefined,
                migrar: migrar === false ? false : undefined
            },
            responseType: 'blob',
            headers: { Accept: 'application/pdf' }
        })
};
