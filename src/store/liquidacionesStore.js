import { apiUtils } from '@/api/axios.js';
import { liquidaciones as liquidacionesApi } from '@/api/liquidaciones.js';
import { defineStore } from 'pinia';
import { reactive } from 'vue';

/**
 * Store del módulo de Liquidación de Servicios.
 *
 * Maneja el estado y la llamada a la API que genera el PDF de liquidación a
 * partir de un número de admisión. Como la respuesta es binaria (Blob), el store
 * no guarda el PDF: solo lo devuelve a la vista y mantiene el flag de carga y el
 * último error clasificado (por `status`) para que la vista muestre el mensaje
 * adecuado.
 */
export const useLiquidacionesStore = defineStore('liquidaciones', () => {
    // ── Estado ───────────────────────────────────────────────────────────────
    const state = reactive({
        isLoading: false,
        // Último error como { status, message }; null si la última generación no falló.
        error: null
    });

    // ── Acciones ─────────────────────────────────────────────────────────────

    /**
     * Genera el PDF de una admisión. Devuelve la respuesta axios completa (con el
     * Blob en `response.data` y `Content-Disposition` en `response.headers`).
     * Ante un error, lo clasifica en `state.error` ({ status, message }) y lo
     * relanza normalizado (con `status`) para que la vista/composable decidan.
     *
     * @param {object} payload
     * @param {string|number} payload.numeroAdmision
     * @param {boolean} [payload.download]
     * @param {boolean} [payload.migrar]
     */
    const fetchPdf = async ({ numeroAdmision, download, migrar } = {}) => {
        state.isLoading = true;
        state.error = null;
        try {
            return await liquidacionesApi.getPdf({ numeroAdmision, download, migrar });
        } catch (error) {
            state.error = { status: error?.status ?? 0, message: apiUtils.getMessage(error) };
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    /** Limpia el error actual (p. ej. al cambiar el número de admisión). */
    const clearError = () => {
        state.error = null;
    };

    return {
        state,
        fetchPdf,
        clearError
    };
});
