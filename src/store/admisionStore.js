import { admision as admisionApi } from '@/api/admision.js';
import { apiUtils } from '@/api/axios.js';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

/**
 * Store del módulo de Admisión (ventanilla).
 *
 * Maneja el estado y las llamadas a la API del "escaneo de paciente": guarda el
 * último resultado de búsqueda y los flags de carga/errores para que la vista
 * distinga entre "cargando", "no encontrado" y "error de red".
 */
export const useAdmisionStore = defineStore('admision', () => {
    // ── Estado ───────────────────────────────────────────────────────────────
    const state = reactive({
        // Resultado del último escaneo: { paciente, financiamiento_default, citas_hoy, ultimas_citas }
        scanResult: null,
        // Documento de la última búsqueda (para mostrar en mensajes de error/vacío)
        lastQuery: '',
        isScanning: false,
        // Diferencia el "no encontrado" (404) de un error genérico para la UI.
        notFound: false
    });

    // ── Getters ──────────────────────────────────────────────────────────────
    const scanResult = computed(() => state.scanResult);

    // ── Acciones ─────────────────────────────────────────────────────────────

    /**
     * Buscar un paciente por documento. Lanza el error normalizado del
     * interceptor (con `status`) para que el composable notifique según el caso.
     * Marca `notFound` en 404 para que la vista muestre el mensaje adecuado.
     */
    const scanPatient = async (documento, limitUltimas) => {
        state.isScanning = true;
        state.notFound = false;
        state.lastQuery = documento;
        try {
            const response = await admisionApi.scanPatient(documento, limitUltimas);
            if (apiUtils.isSuccess(response)) {
                state.scanResult = apiUtils.getData(response);
                return state.scanResult;
            }
            throw response;
        } catch (error) {
            state.scanResult = null;
            if (error?.status === 404) state.notFound = true;
            throw error;
        } finally {
            state.isScanning = false;
        }
    };

    /** Limpiar el resultado actual (al vaciar la búsqueda). */
    const clearScan = () => {
        state.scanResult = null;
        state.lastQuery = '';
        state.notFound = false;
    };

    return {
        state,
        scanResult,
        scanPatient,
        clearScan
    };
});
