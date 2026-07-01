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
// Reintentos automáticos ante 409 (otra sincronización del mismo documento en
// curso): se espera y se vuelve a intentar manteniendo el spinner activo.
const MAX_SYNC_RETRIES = 2;
const SYNC_RETRY_DELAY_MS = 2500;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const useAdmisionStore = defineStore('admision', () => {
    // ── Estado ───────────────────────────────────────────────────────────────
    const state = reactive({
        // Resultado del último escaneo: { paciente, financiamiento_default, citas_hoy, ultimas_citas }
        scanResult: null,
        // Documento de la última búsqueda (para mostrar en mensajes de error/vacío)
        lastQuery: '',
        isScanning: false,
        // Diferencia el "no encontrado" (404) de un error genérico para la UI.
        notFound: false,
        // Último error no-404 (sync en curso, servicio caído, timeout, validación…)
        // como { status, message }; null si la última búsqueda no falló.
        error: null
    });

    // ── Getters ──────────────────────────────────────────────────────────────
    const scanResult = computed(() => state.scanResult);

    // ── Acciones ─────────────────────────────────────────────────────────────

    /** Deja el estado limpio antes de una nueva búsqueda. */
    const beginSearch = (documento) => {
        state.isScanning = true;
        state.notFound = false;
        state.error = null;
        state.lastQuery = documento;
    };

    /** Clasifica el fallo: 404 → notFound; el resto → error { status, message }. */
    const registerError = (error) => {
        state.scanResult = null;
        if (error?.status === 404) {
            state.notFound = true;
        } else {
            state.error = { status: error?.status ?? 0, message: apiUtils.getMessage(error) };
        }
    };

    /**
     * Buscar un paciente MIGRANDO fresco desde Sisclin (endpoint principal).
     * Reintenta automáticamente ante 409 hasta MAX_SYNC_RETRIES manteniendo el
     * spinner. Marca notFound/error para que la vista muestre el estado adecuado
     * y relanza el error normalizado (con `status`).
     */
    const syncPatient = async ({ documento, tipo, limitUltimas } = {}) => {
        beginSearch(documento);
        try {
            let attempts = 0;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                try {
                    const response = await admisionApi.syncPatient({ documento, tipo, limitUltimas });
                    if (apiUtils.isSuccess(response)) {
                        state.scanResult = apiUtils.getData(response);
                        return state.scanResult;
                    }
                    throw response;
                } catch (err) {
                    if (err?.status === 409 && attempts < MAX_SYNC_RETRIES) {
                        attempts++;
                        await delay(SYNC_RETRY_DELAY_MS);
                        continue;
                    }
                    throw err;
                }
            }
        } catch (error) {
            registerError(error);
            throw error;
        } finally {
            state.isScanning = false;
        }
    };

    /**
     * Lectura rápida SIN migrar desde Sisclin. Misma clasificación de errores.
     */
    const scanPatient = async (documento, limitUltimas) => {
        beginSearch(documento);
        try {
            const response = await admisionApi.scanPatient(documento, limitUltimas);
            if (apiUtils.isSuccess(response)) {
                state.scanResult = apiUtils.getData(response);
                return state.scanResult;
            }
            throw response;
        } catch (error) {
            registerError(error);
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
        state.error = null;
    };

    return {
        state,
        scanResult,
        syncPatient,
        scanPatient,
        clearScan
    };
});
