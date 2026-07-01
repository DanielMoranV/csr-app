import { apiUtils } from '@/api/axios.js';
import { useAdmisionStore } from '@/store/admisionStore';
import { useToast } from 'primevue/usetoast';
import { computed } from 'vue';

// ── Mapas de estado (severidad de PrimeVue Tag + presentación) ───────────────

/**
 * Estado de pago de una atención (`pago.estado`) → color/etiqueta. Los valores
 * llegan en MAYÚSCULAS desde el backend.
 *  - PAGADO          verde  · ya pagó todo lo que le corresponde
 *  - PARCIAL         ámbar  · pagó algunos servicios, faltan otros
 *  - PENDIENTE       rojo   · no ha pagado
 *  - CUBIERTO_SEGURO azul   · seguro sin copago; no debe nada en ventanilla
 *  - SIN_SERVICIOS   neutro · la atención aún no tiene servicios cargados
 */
export const PAGO_STATUS = {
    PAGADO: { label: 'Pagado', severity: 'success', icon: 'pi pi-check-circle' },
    PARCIAL: { label: 'Pago parcial', severity: 'warn', icon: 'pi pi-exclamation-circle' },
    PENDIENTE: { label: 'Pendiente de pago', severity: 'danger', icon: 'pi pi-times-circle' },
    CUBIERTO_SEGURO: { label: 'Cubierto por seguro', severity: 'info', icon: 'pi pi-shield' },
    SIN_SERVICIOS: { label: 'Sin servicios', severity: 'secondary', icon: 'pi pi-minus-circle' }
};

/** Tipo de financiamiento (`financiamiento.tipo`) → presentación. */
export const FINANCIAMIENTO = {
    PARTICULAR: { label: 'Particular', severity: 'warn', icon: 'pi pi-user' },
    SEGURO: { label: 'Seguro', severity: 'info', icon: 'pi pi-shield' }
};

/** Estado del turno (`turno.estado_turno`) → presentación. */
export const TURNO_STATUS = {
    PENDIENTE: { label: 'Pendiente', severity: 'warn' },
    ATENDIDO: { label: 'Atendido', severity: 'success' },
    ANULADO: { label: 'Anulado', severity: 'danger' }
};

export const pagoStatusInfo = (estado) => PAGO_STATUS[estado] || { label: estado || '—', severity: 'secondary', icon: 'pi pi-question-circle' };
export const financiamientoInfo = (tipo) => FINANCIAMIENTO[tipo] || { label: tipo || '—', severity: 'secondary', icon: 'pi pi-wallet' };
export const turnoStatusInfo = (estado) => TURNO_STATUS[estado] || { label: estado || '—', severity: 'secondary' };

/**
 * Composable del módulo de Admisión (ventanilla). Envuelve el store del
 * "escaneo de paciente" con feedback de UI (toasts) y manejo uniforme de
 * errores, distinguiendo el caso "no encontrado" (404) del resto.
 */
export function useAdmision() {
    const store = useAdmisionStore();
    const toast = useToast();

    // ── Estado expuesto ──────────────────────────────────────────────────────
    const scanResult = computed(() => store.state.scanResult);
    const isScanning = computed(() => store.state.isScanning);
    const notFound = computed(() => store.state.notFound);
    const lastQuery = computed(() => store.state.lastQuery);

    /**
     * Buscar un paciente por documento. El 404 ("no encontrado") NO muestra
     * toast: la vista lo comunica en línea con un mensaje claro. El resto de
     * errores (422, red, etc.) sí se notifican.
     *
     * @param {string} documento
     * @param {number} [limitUltimas]
     * @returns {Promise<object|null>} el resultado, o null si no se encontró.
     */
    const scanPatient = async (documento, limitUltimas) => {
        try {
            return await store.scanPatient(documento, limitUltimas);
        } catch (error) {
            if (error?.status !== 404) {
                handleError(error, 'No se pudo consultar el paciente');
            }
            return null;
        }
    };

    const clearScan = () => store.clearScan();

    // ── Manejo de errores ──────────────────────────────────────────────────────
    const handleError = (error, defaultMessage) => {
        const status = error?.status;
        const message = apiUtils.getMessage(error) || defaultMessage;

        if (status === 422 && error?.errors && typeof error.errors === 'object') {
            const flat = apiUtils.getValidationErrorsFlat(error);
            if (flat.length > 0) {
                flat.forEach((detail) => toast.add({ severity: 'warn', summary: 'Documento no válido', detail, life: 5000 }));
                return;
            }
        }

        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: message || defaultMessage,
            life: 5000
        });
    };

    return {
        // Estado
        scanResult,
        isScanning,
        notFound,
        lastQuery,
        // Acciones
        scanPatient,
        clearScan,
        // Helpers de presentación
        pagoStatusInfo,
        financiamientoInfo,
        turnoStatusInfo
    };
}
