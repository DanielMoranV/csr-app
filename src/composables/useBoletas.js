import { apiUtils } from '@/api/axios.js';
import { useAuth } from '@/composables/useAuth';
import { useBoletasStore } from '@/store/boletasStore';
import { useToast } from 'primevue/usetoast';
import { computed } from 'vue';

// ── Mapa de colores de estado (PrimeVue Tag severity) ────────────────────────

/** Severidad/etiqueta por estado de destinatario. */
export const RECIPIENT_STATUS = {
    pending: { label: 'Pendiente', severity: 'secondary' },
    sending: { label: 'Enviando', severity: 'info' },
    sent: { label: 'Enviado', severity: 'success' },
    failed: { label: 'Fallido', severity: 'danger' },
    skipped: { label: 'Omitido', severity: 'warn' }
};

/** Severidad/etiqueta por estado de campaña. */
export const CAMPAIGN_STATUS = {
    draft: { label: 'Borrador', severity: 'secondary' },
    queued: { label: 'En cola', severity: 'info' },
    processing: { label: 'Procesando', severity: 'info' },
    completed: { label: 'Completada', severity: 'success' },
    completed_with_errors: { label: 'Completada con errores', severity: 'warn' },
    failed: { label: 'Fallida', severity: 'danger' }
};

/** Estados de campaña en los que conviene hacer polling de progreso. */
export const CAMPAIGN_ACTIVE_STATUSES = ['queued', 'processing'];

/**
 * Estados en los que una campaña es editable (PUT) y relanzable. Editar la
 * devuelve a `draft` y resetea contadores; el relanzamiento reenvía a TODOS los
 * destinatarios. Para reenviar solo los fallidos con el mismo contenido se usa
 * `retryFailed` (disponible en `failed` y `completed_with_errors`).
 */
export const CAMPAIGN_EDITABLE_STATUSES = ['draft', 'failed'];

/** ¿La campaña con este estado se puede editar/relanzar? */
export const canEditCampaign = (status) => CAMPAIGN_EDITABLE_STATUSES.includes(status);

/**
 * Modos de adjunto de un envío (campo `attachment_mode`):
 *  - per_dni: documento personalizado por persona (ZIP {dni}.pdf → /files/upload)
 *  - shared:  un mismo PDF para todos (→ /campaigns/{id}/attachment)
 *  - none:    sin adjunto, solo el cuerpo del correo
 */
export const ATTACHMENT_MODES = [
    { value: 'per_dni', label: 'Sí, personalizado por DNI', short: 'Personalizado por DNI', icon: 'pi pi-id-card' },
    { value: 'shared', label: 'Sí, el mismo para todos', short: 'Compartido', icon: 'pi pi-file' },
    { value: 'none', label: 'No, solo correo', short: 'Sin adjunto', icon: 'pi pi-envelope' }
];

export const attachmentModeInfo = (mode) => ATTACHMENT_MODES.find((m) => m.value === mode) || ATTACHMENT_MODES[0];

export const recipientStatusInfo = (status) => RECIPIENT_STATUS[status] || { label: status || '—', severity: 'secondary' };
export const campaignStatusInfo = (status) => CAMPAIGN_STATUS[status] || { label: status || '—', severity: 'secondary' };

/**
 * Composable del módulo de Envío Masivo de Documentos ("Boletas").
 * Envuelve el store con feedback de UI (toasts), manejo uniforme de errores,
 * helpers de descarga de archivos (respetando `Content-Disposition`) y los
 * flags de permiso para gobernar la UI de solo lectura vs. operación.
 */
export function useBoletas() {
    const store = useBoletasStore();
    const toast = useToast();
    const { hasPermission } = useAuth();

    // ── Permisos (reglas de UI) ──────────────────────────────────────────────
    // Mostrar el módulo si tiene cualquiera de los dos; las acciones de escritura
    // requieren `boletas.manage`.
    const canManage = computed(() => hasPermission('boletas.manage'));
    const canView = computed(() => hasPermission('boletas.view') || hasPermission('boletas.manage'));
    const canSettings = computed(() => hasPermission('boletas.settings'));

    // ── Estado expuesto ──────────────────────────────────────────────────────
    const documentTypes = computed(() => store.documentTypes);
    const templates = computed(() => store.templates);
    const campaigns = computed(() => store.campaigns);
    const files = computed(() => store.files);
    const employees = computed(() => store.employees);
    const filesMeta = computed(() => store.state.filesMeta);
    const campaignsPagination = computed(() => store.state.campaignsPagination);
    const currentCampaign = computed(() => store.state.currentCampaign);
    const mailSettings = computed(() => store.state.mailSettings);

    const isLoadingTemplates = computed(() => store.state.isLoadingTemplates);
    const isSavingTemplate = computed(() => store.state.isSavingTemplate);
    const isDeletingTemplate = computed(() => store.state.isDeletingTemplate);
    const isPreviewing = computed(() => store.state.isPreviewing);
    const isLoadingFiles = computed(() => store.state.isLoadingFiles);
    const isUploading = computed(() => store.state.isUploading);
    const isDeletingFile = computed(() => store.state.isDeletingFile);
    const isLoadingEmployees = computed(() => store.state.isLoadingEmployees);
    const isSavingEmployee = computed(() => store.state.isSavingEmployee);
    const isDeletingEmployee = computed(() => store.state.isDeletingEmployee);
    const isValidating = computed(() => store.state.isValidating);
    const isLoadingCampaigns = computed(() => store.state.isLoadingCampaigns);
    const isLoadingCampaign = computed(() => store.state.isLoadingCampaign);
    const isCreatingCampaign = computed(() => store.state.isCreatingCampaign);
    const isUpdatingCampaign = computed(() => store.state.isUpdatingCampaign);
    const isUploadingAttachment = computed(() => store.state.isUploadingAttachment);
    const isLaunching = computed(() => store.state.isLaunching);
    const isRetrying = computed(() => store.state.isRetrying);
    const isLoadingMailSettings = computed(() => store.state.isLoadingMailSettings);
    const isSavingMailSettings = computed(() => store.state.isSavingMailSettings);
    const isTestingMail = computed(() => store.state.isTestingMail);

    // ── Catálogo ─────────────────────────────────────────────────────────────
    const fetchDocumentTypes = async () => {
        try {
            return await store.fetchDocumentTypes();
        } catch (error) {
            handleError(error, 'Error al cargar los tipos de documento');
            throw error;
        }
    };

    // ── Plantillas ───────────────────────────────────────────────────────────
    const fetchTemplates = async () => {
        try {
            return await store.fetchTemplates();
        } catch (error) {
            handleError(error, 'Error al cargar las plantillas');
            throw error;
        }
    };

    const fetchTemplate = async (id) => {
        try {
            return await store.fetchTemplate(id);
        } catch (error) {
            handleError(error, 'Error al cargar la plantilla');
            throw error;
        }
    };

    /** Vista previa. No muestra toast en error (la usa el editor en vivo). */
    const previewTemplate = async (id, payload) => {
        return await store.previewTemplate(id, payload);
    };

    /** Vista previa ad-hoc (sin plantilla). Silenciosa en error. */
    const previewAdhoc = async (payload) => {
        return await store.previewAdhoc(payload);
    };

    const createTemplate = async (data) => {
        try {
            const template = await store.createTemplate(data);
            success('Plantilla creada correctamente');
            return template;
        } catch (error) {
            handleError(error, 'Error al crear la plantilla');
            throw error;
        }
    };

    const updateTemplate = async (id, data) => {
        try {
            const template = await store.updateTemplate(id, data);
            success('Plantilla actualizada correctamente');
            return template;
        } catch (error) {
            handleError(error, 'Error al actualizar la plantilla');
            throw error;
        }
    };

    const deleteTemplate = async (id) => {
        try {
            await store.deleteTemplate(id);
            success('Plantilla eliminada correctamente');
        } catch (error) {
            handleError(error, 'Error al eliminar la plantilla');
            throw error;
        }
    };

    // ── Archivos PDF ─────────────────────────────────────────────────────────
    const fetchFiles = async (params) => {
        try {
            return await store.fetchFiles(params);
        } catch (error) {
            handleError(error, 'Error al cargar los archivos');
            throw error;
        }
    };

    const uploadFiles = async (formData) => {
        try {
            const result = await store.uploadFiles(formData);
            const stored = result?.stored ?? 0;
            const invalid = result?.invalid?.length ?? 0;
            if (invalid > 0) {
                toast.add({ severity: 'warn', summary: 'Subida parcial', detail: `${stored} archivo(s) subido(s), ${invalid} rechazado(s).`, life: 6000 });
            } else {
                success(`${stored} archivo(s) subido(s) correctamente`);
            }
            return result;
        } catch (error) {
            handleError(error, 'Error al subir el archivo ZIP');
            throw error;
        }
    };

    const deleteFile = async (period, dni, documentType) => {
        try {
            await store.deleteFile(period, dni, documentType);
            success('Archivo eliminado correctamente');
        } catch (error) {
            handleError(error, 'Error al eliminar el archivo');
            throw error;
        }
    };

    // ── Destinatarios ──────────────────────────────────────────────────────────
    const fetchEmployees = async (params) => {
        try {
            return await store.fetchEmployees(params);
        } catch (error) {
            handleError(error, 'Error al cargar el padrón de empleados');
            throw error;
        }
    };

    const validateRecipients = async (formData) => {
        try {
            return await store.validateRecipients(formData);
        } catch (error) {
            handleError(error, 'Error al validar el archivo de destinatarios');
            throw error;
        }
    };

    // ── Padrón (CRUD) ────────────────────────────────────────────────────────────
    const fetchEmployee = async (id) => {
        try {
            return await store.fetchEmployee(id);
        } catch (error) {
            handleError(error, 'Error al cargar el empleado');
            throw error;
        }
    };

    const createEmployee = async (data) => {
        try {
            const employee = await store.createEmployee(data);
            success('Empleado creado correctamente');
            return employee;
        } catch (error) {
            handleError(error, 'Error al crear el empleado');
            throw error;
        }
    };

    const updateEmployee = async (id, data) => {
        try {
            const employee = await store.updateEmployee(id, data);
            success('Empleado actualizado correctamente');
            return employee;
        } catch (error) {
            handleError(error, 'Error al actualizar el empleado');
            throw error;
        }
    };

    const deleteEmployee = async (id) => {
        try {
            await store.deleteEmployee(id);
            success('Empleado eliminado correctamente');
        } catch (error) {
            // 422: el backend explica el motivo (p. ej. tiene usuario vinculado).
            handleError(error, 'No se pudo eliminar el empleado');
            throw error;
        }
    };

    // ── Campañas ─────────────────────────────────────────────────────────────
    const fetchCampaigns = async (params) => {
        try {
            return await store.fetchCampaigns(params);
        } catch (error) {
            handleError(error, 'Error al cargar el historial de campañas');
            throw error;
        }
    };

    const fetchCampaign = async (id) => {
        try {
            return await store.fetchCampaign(id);
        } catch (error) {
            handleError(error, 'Error al cargar la campaña');
            throw error;
        }
    };

    /** Progreso para polling. Silencioso: no muestra toast en error. */
    const fetchCampaignProgress = async (id) => store.fetchCampaignProgress(id);

    const fetchCampaignRecipients = async (id, params) => {
        try {
            return await store.fetchCampaignRecipients(id, params);
        } catch (error) {
            handleError(error, 'Error al cargar los destinatarios');
            throw error;
        }
    };

    const createCampaign = async (data) => {
        try {
            return await store.createCampaign(data);
        } catch (error) {
            handleError(error, 'Error al crear la campaña');
            throw error;
        }
    };

    /**
     * Editar una campaña en `draft`/`failed`. La devuelve a borrador con
     * contadores en 0; el llamador debe relanzarla. 422 si no es editable.
     */
    const updateCampaign = async (id, data) => {
        try {
            return await store.updateCampaign(id, data);
        } catch (error) {
            handleError(error, 'Error al guardar los cambios de la campaña');
            throw error;
        }
    };

    /** Subir el PDF compartido (modo `shared`) de una campaña en draft. */
    const uploadCampaignAttachment = async (id, formData) => {
        try {
            return await store.uploadCampaignAttachment(id, formData);
        } catch (error) {
            // 422: "Solo se puede subir el adjunto a una campaña en borrador", etc.
            handleError(error, 'Error al subir el documento adjunto');
            throw error;
        }
    };

    const launchCampaign = async (id) => {
        try {
            const result = await store.launchCampaign(id);
            const queued = result?.queued ?? 0;
            const failed = result?.failed ?? 0;
            if (failed > 0) {
                toast.add({ severity: 'warn', summary: 'Campaña lanzada', detail: `${queued} envío(s) encolado(s), ${failed} no se pudieron encolar.`, life: 6000 });
            } else {
                success(`Campaña lanzada: ${queued} envío(s) encolado(s)`);
            }
            return result;
        } catch (error) {
            handleError(error, 'Error al lanzar la campaña');
            throw error;
        }
    };

    const retryFailed = async (id) => {
        try {
            const result = await store.retryFailed(id);
            success(`${result?.requeued ?? 0} envío(s) reencolado(s)`);
            return result;
        } catch (error) {
            handleError(error, 'Error al reintentar los envíos fallidos');
            throw error;
        }
    };

    // ── Configuración del correo emisor ──────────────────────────────────────────
    const fetchMailSettings = async () => {
        try {
            return await store.fetchMailSettings();
        } catch (error) {
            handleError(error, 'Error al cargar la configuración de correo');
            throw error;
        }
    };

    const saveMailSettings = async (data) => {
        try {
            const result = await store.saveMailSettings(data);
            success('Configuración de correo guardada correctamente');
            return result;
        } catch (error) {
            handleError(error, 'Error al guardar la configuración de correo');
            throw error;
        }
    };

    const testMailSettings = async (data) => {
        try {
            const result = await store.testMailSettings(data);
            success('Correo de prueba enviado correctamente');
            return result;
        } catch (error) {
            // 422: el backend devuelve el error SMTP concreto.
            handleError(error, 'No se pudo enviar el correo de prueba');
            throw error;
        }
    };

    // ── Descargas (blob) ───────────────────────────────────────────────────────
    const downloadErrors = async (id) => {
        try {
            const response = await store.downloadErrors(id);
            saveBlobResponse(response, `errores_campana_${id}.xlsx`);
            success('Reporte de errores descargado');
        } catch (error) {
            handleError(error, 'Error al descargar el reporte de errores', { blob: true });
            throw error;
        }
    };

    const downloadConstancia = async (id, recipientId, dni = '') => {
        try {
            const response = await store.downloadConstancia(id, recipientId);
            const fallback = dni ? `constancia_${dni}.pdf` : `constancia_${recipientId}.pdf`;
            saveBlobResponse(response, fallback);
        } catch (error) {
            handleError(error, 'Error al descargar la constancia', { blob: true });
            throw error;
        }
    };

    // ── Utilidades internas ────────────────────────────────────────────────────

    /** Descarga un Blob de una respuesta axios respetando `Content-Disposition`. */
    const saveBlobResponse = (response, fallbackName) => {
        const blob = response?.data;
        const filename = filenameFromDisposition(response?.headers?.['content-disposition']) || fallbackName;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const filenameFromDisposition = (disposition) => {
        if (!disposition) return null;
        // filename*=UTF-8''... (RFC 5987) o filename="..."
        const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
        if (utf8Match) return decodeURIComponent(utf8Match[1].trim());
        const match = /filename="?([^";]+)"?/i.exec(disposition);
        return match ? match[1].trim() : null;
    };

    const success = (detail) => {
        toast.add({ severity: 'success', summary: 'Éxito', detail, life: 3000 });
    };

    /**
     * Manejo uniforme de errores del backend (objeto plano con status/message/errors
     * que produce el interceptor de axios). Para descargas, el cuerpo de error
     * puede venir como Blob: se intenta leer el JSON adentro.
     */
    const handleError = async (error, defaultMessage, opts = {}) => {
        let normalized = error;

        // En descargas (responseType blob) el error de Laravel llega como Blob.
        if (opts.blob && error?.data instanceof Blob) {
            try {
                const text = await error.data.text();
                normalized = { ...JSON.parse(text), status: error.status };
            } catch {
                normalized = { status: error?.status, message: defaultMessage };
            }
        }

        const status = normalized?.status;
        const message = apiUtils.getMessage(normalized) || defaultMessage;

        if (status === 422 && normalized?.errors && typeof normalized.errors === 'object') {
            const flat = apiUtils.getValidationErrorsFlat(normalized);
            if (flat.length > 0) {
                flat.forEach((detail) => toast.add({ severity: 'warn', summary: 'Error de validación', detail, life: 5000 }));
                return;
            }
        }

        const summaryByStatus = {
            401: 'Sesión inválida',
            403: 'Sin permisos',
            404: 'No encontrado',
            409: 'Operación no permitida'
        };

        toast.add({
            severity: status === 409 || status === 403 ? 'warn' : 'error',
            summary: summaryByStatus[status] || 'Error',
            detail: message || defaultMessage,
            life: status === 409 ? 7000 : 5000
        });
    };

    return {
        // Permisos
        canManage,
        canView,
        canSettings,
        // Estado
        documentTypes,
        templates,
        campaigns,
        files,
        employees,
        filesMeta,
        campaignsPagination,
        currentCampaign,
        mailSettings,
        isLoadingTemplates,
        isSavingTemplate,
        isDeletingTemplate,
        isPreviewing,
        isLoadingFiles,
        isUploading,
        isDeletingFile,
        isLoadingEmployees,
        isSavingEmployee,
        isDeletingEmployee,
        isValidating,
        isLoadingCampaigns,
        isLoadingCampaign,
        isCreatingCampaign,
        isUpdatingCampaign,
        isUploadingAttachment,
        isLaunching,
        isRetrying,
        isLoadingMailSettings,
        isSavingMailSettings,
        isTestingMail,
        // Catálogo
        fetchDocumentTypes,
        // Plantillas
        fetchTemplates,
        fetchTemplate,
        previewTemplate,
        previewAdhoc,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        // Archivos
        fetchFiles,
        uploadFiles,
        deleteFile,
        // Destinatarios / Padrón
        fetchEmployees,
        fetchEmployee,
        createEmployee,
        updateEmployee,
        deleteEmployee,
        validateRecipients,
        // Campañas
        fetchCampaigns,
        fetchCampaign,
        fetchCampaignProgress,
        fetchCampaignRecipients,
        createCampaign,
        updateCampaign,
        uploadCampaignAttachment,
        launchCampaign,
        retryFailed,
        downloadErrors,
        downloadConstancia,
        // Configuración de correo
        fetchMailSettings,
        saveMailSettings,
        testMailSettings,
        // Helpers de estado
        recipientStatusInfo,
        campaignStatusInfo,
        canEditCampaign
    };
}
