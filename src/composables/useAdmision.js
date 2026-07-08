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
 *  - TRASLADADO      neutro · cobrado en otro documento; nada que cobrar aquí
 *  - SIN_SERVICIOS   neutro · la atención aún no tiene servicios cargados
 */
export const PAGO_STATUS = {
    PAGADO: { label: 'Pagado', severity: 'success', icon: 'pi pi-check-circle' },
    PARCIAL: { label: 'Pago parcial', severity: 'warn', icon: 'pi pi-exclamation-circle' },
    PENDIENTE: { label: 'Pendiente de pago', severity: 'danger', icon: 'pi pi-times-circle' },
    CUBIERTO_SEGURO: { label: 'Cubierto por seguro', severity: 'info', icon: 'pi pi-shield' },
    TRASLADADO: { label: 'Trasladado', severity: 'secondary', icon: 'pi pi-arrow-right-arrow-left' },
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

/**
 * Tipo de atención (`tipo_atencion`, MAYÚSCULAS) → color + ícono, para
 * distinguir de un vistazo el origen de la cita.
 *  - AMBULATORIO  azul   · consulta externa
 *  - EMERGENCIA   rojo   · tópico/emergencia
 *  - HOSPITALARIO ámbar  · internamiento
 *  - PROCESO      oscuro · procedimiento
 */
export const TIPO_ATENCION = {
    AMBULATORIO: { label: 'Ambulatorio', severity: 'info', icon: 'pi pi-user' },
    EMERGENCIA: { label: 'Emergencia', severity: 'danger', icon: 'pi pi-bolt' },
    HOSPITALARIO: { label: 'Hospitalario', severity: 'warn', icon: 'pi pi-building' },
    PROCESO: { label: 'Proceso', severity: 'contrast', icon: 'pi pi-sync' }
};

/**
 * Estado de la cobranza a la aseguradora (`pago.seguro.estado_cobranza`), solo
 * en atenciones de SEGURO. Refleja si ya se facturó a crédito (series 003/004) y
 * si la aseguradora pagó; es independiente del copago que paga el paciente. Es
 * "todo o nada" por atención (si hubo refacturación, basta una factura pagada).
 *  - NO_FACTURADO  neutro · aún no se emite factura a la aseguradora
 *  - PENDIENTE     ámbar  · factura(s) a crédito emitida(s), sin pago aún
 *  - PAGADO        verde  · la aseguradora ya pagó
 */
export const SEGURO_COBRANZA = {
    NO_FACTURADO: { label: 'No facturado', severity: 'secondary', icon: 'pi pi-hourglass' },
    PENDIENTE: { label: 'Por cobrar', severity: 'warn', icon: 'pi pi-file' },
    PAGADO: { label: 'Cobrado', severity: 'success', icon: 'pi pi-check-circle' }
};

export const pagoStatusInfo = (estado) => PAGO_STATUS[estado] || { label: estado || '—', severity: 'secondary', icon: 'pi pi-question-circle' };
export const financiamientoInfo = (tipo) => FINANCIAMIENTO[tipo] || { label: tipo || '—', severity: 'secondary', icon: 'pi pi-wallet' };
export const turnoStatusInfo = (estado) => TURNO_STATUS[estado] || { label: estado || '—', severity: 'secondary' };
export const tipoAtencionInfo = (tipo) => TIPO_ATENCION[tipo] || { label: tipo || '—', severity: 'contrast', icon: 'pi pi-tag' };
export const seguroCobranzaInfo = (estado) => SEGURO_COBRANZA[estado] || { label: estado || '—', severity: 'secondary', icon: 'pi pi-question-circle' };

/**
 * Composable del módulo de Admisión (ventanilla). Envuelve el store del
 * "escaneo de paciente" con feedback de UI (toasts) y manejo uniforme de
 * errores, distinguiendo el caso "no encontrado" (404) del resto.
 */
export function useAdmision() {
    const store = useAdmisionStore();
    const toast = useToast();

    // Atenciones históricas a traer por defecto (rango 1-20 en el backend).
    const DEFAULT_LIMIT_ULTIMAS = 5;

    // ── Estado expuesto ──────────────────────────────────────────────────────
    const scanResult = computed(() => store.state.scanResult);
    const isScanning = computed(() => store.state.isScanning);
    const notFound = computed(() => store.state.notFound);
    const lastQuery = computed(() => store.state.lastQuery);
    const error = computed(() => store.state.error);

    /**
     * Buscar un paciente migrando fresco desde Sisclin (flujo principal). Los
     * estados de error (notFound / error con status) quedan en el store y la
     * vista los renderiza en línea; aquí no se muestran toasts.
     *
     * @param {string} documento
     * @param {'dni'|'historia'|'num_admision'} [tipo] - omitir para auto-detectar.
     * @returns {Promise<object|null>} el resultado, o null si falló.
     */
    const syncPatient = async (documento, tipo) => {
        try {
            return await store.syncPatient({ documento, tipo, limitUltimas: DEFAULT_LIMIT_ULTIMAS });
        } catch {
            // El estado ya quedó clasificado en el store (notFound / error).
            return null;
        }
    };

    /**
     * Lectura rápida sin migrar. El 404 NO muestra toast (la vista lo comunica
     * en línea); el resto de errores sí se notifican.
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
        error,
        // Acciones
        syncPatient,
        scanPatient,
        clearScan,
        // Helpers de presentación
        pagoStatusInfo,
        financiamientoInfo,
        turnoStatusInfo,
        tipoAtencionInfo,
        seguroCobranzaInfo
    };
}
