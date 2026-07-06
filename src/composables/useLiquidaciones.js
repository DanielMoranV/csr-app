import { useAuth } from '@/composables/useAuth';
import { useLiquidacionesStore } from '@/store/liquidacionesStore';
import { computed } from 'vue';

/**
 * Composable del módulo de Liquidación de Servicios.
 *
 * Envuelve el store con el flag de permiso que gobierna la visibilidad de la UI
 * (`liquidaciones.view`) y expone la generación del PDF. Los estados de error
 * quedan clasificados en el store (por `status`) y la vista los renderiza en
 * línea con copia clara para cada caso (403/404/502…).
 */
export function useLiquidaciones() {
    const store = useLiquidacionesStore();
    const { hasPermission } = useAuth();

    // ── Permiso (regla de UI) ────────────────────────────────────────────────
    // El backend igual devuelve 403 como defensa en profundidad; aquí solo se
    // decide si mostrar la entrada de menú / la acción.
    const canView = computed(() => hasPermission('liquidaciones.view'));

    // ── Estado expuesto ──────────────────────────────────────────────────────
    const isLoading = computed(() => store.state.isLoading);
    const error = computed(() => store.state.error);

    /**
     * Genera el PDF de liquidación de una admisión y devuelve el Blob, o `null`
     * si falló (el error queda en `error` para que la vista lo muestre en línea).
     *
     * @param {string|number} numeroAdmision
     * @param {object} [opts]
     * @param {boolean} [opts.migrar=true] - `false` salta la migración previa (más
     *   rápido, lee lo ya migrado).
     * @returns {Promise<Blob|null>}
     */
    const generarPdf = async (numeroAdmision, { migrar = true } = {}) => {
        try {
            const response = await store.fetchPdf({ numeroAdmision, migrar });
            return response?.data ?? null;
        } catch {
            // El estado ya quedó clasificado en el store.
            return null;
        }
    };

    const clearError = () => store.clearError();

    return {
        canView,
        isLoading,
        error,
        generarPdf,
        clearError
    };
}
