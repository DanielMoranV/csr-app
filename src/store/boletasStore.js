import { apiUtils } from '@/api/axios.js';
import { boletas as boletasApi } from '@/api/boletas.js';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

/**
 * Store del módulo de Envío Masivo de Documentos ("Boletas").
 *
 * Maneja el estado y las llamadas a la API: plantillas, archivos PDF, padrón de
 * empleados, validación de destinatarios, catálogo de tipos y campañas. Las
 * acciones de descarga devuelven la respuesta axios cruda (blob) para que el
 * composable extraiga el archivo respetando `Content-Disposition`.
 */
export const useBoletasStore = defineStore('boletas', () => {
    // ── Estado ───────────────────────────────────────────────────────────────
    const state = reactive({
        // Catálogos
        documentTypes: [],

        // Plantillas
        templates: [],
        currentTemplate: null,

        // Padrón de empleados
        employees: [],

        // Archivos
        files: [],
        filesMeta: { period: null, document_type: null, count: 0 },

        // Campañas
        campaigns: [],
        campaignsPagination: { page: 1, perPage: 15, total: 0, lastPage: 1 },
        currentCampaign: null,

        // Configuración del correo emisor (SMTP)
        mailSettings: null,

        // Flags de carga
        isLoadingDocumentTypes: false,
        isLoadingTemplates: false,
        isSavingTemplate: false,
        isDeletingTemplate: false,
        isPreviewing: false,
        isLoadingFiles: false,
        isUploading: false,
        isDeletingFile: false,
        isLoadingEmployees: false,
        isSavingEmployee: false,
        isDeletingEmployee: false,
        isValidating: false,
        isLoadingCampaigns: false,
        isLoadingCampaign: false,
        isCreatingCampaign: false,
        isUpdatingCampaign: false,
        isUploadingAttachment: false,
        isLaunching: false,
        isRetrying: false,
        isLoadingMailSettings: false,
        isSavingMailSettings: false,
        isTestingMail: false
    });

    // ── Getters ──────────────────────────────────────────────────────────────
    const documentTypes = computed(() => state.documentTypes);
    const templates = computed(() => state.templates);
    const campaigns = computed(() => state.campaigns);
    const files = computed(() => state.files);
    const employees = computed(() => state.employees);

    // ── Catálogo ─────────────────────────────────────────────────────────────
    const fetchDocumentTypes = async () => {
        // Cacheado: solo se pide una vez por sesión de navegación
        if (state.documentTypes.length > 0) return state.documentTypes;
        state.isLoadingDocumentTypes = true;
        try {
            const response = await boletasApi.getDocumentTypes();
            if (apiUtils.isSuccess(response)) {
                state.documentTypes = apiUtils.getData(response) || [];
                return state.documentTypes;
            }
            throw response;
        } finally {
            state.isLoadingDocumentTypes = false;
        }
    };

    // ── Plantillas ───────────────────────────────────────────────────────────
    const fetchTemplates = async () => {
        state.isLoadingTemplates = true;
        try {
            const response = await boletasApi.getTemplates();
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.templates = Array.isArray(data) ? data : data?.data || [];
                return state.templates;
            }
            throw response;
        } finally {
            state.isLoadingTemplates = false;
        }
    };

    const fetchTemplate = async (id) => {
        const response = await boletasApi.getTemplate(id);
        if (apiUtils.isSuccess(response)) {
            state.currentTemplate = apiUtils.getData(response);
            return state.currentTemplate;
        }
        throw response;
    };

    const previewTemplate = async (id, payload) => {
        state.isPreviewing = true;
        try {
            const response = await boletasApi.previewTemplate(id, payload);
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response);
            }
            throw response;
        } finally {
            state.isPreviewing = false;
        }
    };

    const previewAdhoc = async (payload) => {
        state.isPreviewing = true;
        try {
            const response = await boletasApi.previewAdhoc(payload);
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response);
            }
            throw response;
        } finally {
            state.isPreviewing = false;
        }
    };

    const createTemplate = async (data) => {
        state.isSavingTemplate = true;
        try {
            const response = await boletasApi.createTemplate(data);
            if (apiUtils.isSuccess(response)) {
                const created = apiUtils.getData(response);
                state.templates.push(created);
                if (created?.is_default) unsetOtherDefaults(created.id);
                return created;
            }
            throw response;
        } finally {
            state.isSavingTemplate = false;
        }
    };

    const updateTemplate = async (id, data) => {
        state.isSavingTemplate = true;
        try {
            const response = await boletasApi.updateTemplate(id, data);
            if (apiUtils.isSuccess(response)) {
                const updated = apiUtils.getData(response);
                patchTemplate(id, updated);
                if (updated?.is_default) unsetOtherDefaults(id);
                return updated;
            }
            throw response;
        } finally {
            state.isSavingTemplate = false;
        }
    };

    const deleteTemplate = async (id) => {
        state.isDeletingTemplate = true;
        try {
            const response = await boletasApi.deleteTemplate(id);
            if (apiUtils.isSuccess(response)) {
                const index = state.templates.findIndex((t) => t.id === id);
                if (index !== -1) state.templates.splice(index, 1);
                return response;
            }
            throw response;
        } finally {
            state.isDeletingTemplate = false;
        }
    };

    // ── Archivos PDF ─────────────────────────────────────────────────────────
    const fetchFiles = async (params) => {
        state.isLoadingFiles = true;
        try {
            const response = await boletasApi.getFiles(params);
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response) || {};
                state.files = data.files || [];
                state.filesMeta = { period: data.period, document_type: data.document_type, count: data.count ?? state.files.length };
                return data;
            }
            throw response;
        } finally {
            state.isLoadingFiles = false;
        }
    };

    const uploadFiles = async (formData) => {
        state.isUploading = true;
        try {
            const response = await boletasApi.uploadFiles(formData);
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response);
            }
            throw response;
        } finally {
            state.isUploading = false;
        }
    };

    const deleteFile = async (period, dni, documentType) => {
        state.isDeletingFile = true;
        try {
            const response = await boletasApi.deleteFile(period, dni, documentType);
            if (apiUtils.isSuccess(response)) {
                const index = state.files.findIndex((f) => f.dni === dni);
                if (index !== -1) {
                    state.files.splice(index, 1);
                    state.filesMeta.count = state.files.length;
                }
                return response;
            }
            throw response;
        } finally {
            state.isDeletingFile = false;
        }
    };

    // ── Destinatarios ──────────────────────────────────────────────────────────
    const fetchEmployees = async (params) => {
        state.isLoadingEmployees = true;
        try {
            const response = await boletasApi.getEmployees(params);
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.employees = Array.isArray(data) ? data : data?.data || [];
                return state.employees;
            }
            throw response;
        } finally {
            state.isLoadingEmployees = false;
        }
    };

    const fetchEmployee = async (id) => {
        const response = await boletasApi.getEmployee(id);
        if (apiUtils.isSuccess(response)) {
            return apiUtils.getData(response);
        }
        throw response;
    };

    const createEmployee = async (data) => {
        state.isSavingEmployee = true;
        try {
            const response = await boletasApi.createEmployee(data);
            if (apiUtils.isSuccess(response)) {
                const created = apiUtils.getData(response);
                if (created) state.employees.unshift(created);
                return created;
            }
            throw response;
        } finally {
            state.isSavingEmployee = false;
        }
    };

    const updateEmployee = async (id, data) => {
        state.isSavingEmployee = true;
        try {
            const response = await boletasApi.updateEmployee(id, data);
            if (apiUtils.isSuccess(response)) {
                const updated = apiUtils.getData(response);
                const index = state.employees.findIndex((e) => e.id === id);
                if (index !== -1 && updated) state.employees[index] = updated;
                return updated;
            }
            throw response;
        } finally {
            state.isSavingEmployee = false;
        }
    };

    const deleteEmployee = async (id) => {
        state.isDeletingEmployee = true;
        try {
            const response = await boletasApi.deleteEmployee(id);
            if (apiUtils.isSuccess(response)) {
                const index = state.employees.findIndex((e) => e.id === id);
                if (index !== -1) state.employees.splice(index, 1);
                return response;
            }
            throw response;
        } finally {
            state.isDeletingEmployee = false;
        }
    };

    const validateRecipients = async (formData) => {
        state.isValidating = true;
        try {
            const response = await boletasApi.validateRecipients(formData);
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response);
            }
            throw response;
        } finally {
            state.isValidating = false;
        }
    };

    // ── Campañas ─────────────────────────────────────────────────────────────
    const fetchCampaigns = async (params = {}) => {
        state.isLoadingCampaigns = true;
        try {
            const response = await boletasApi.getCampaigns(params);
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                // Soporta array plano, envoltorio { data, pagination } (formato de
                // la API) y paginador estilo Laravel plano (compatibilidad).
                if (Array.isArray(data)) {
                    state.campaigns = data;
                    state.campaignsPagination = { page: 1, perPage: data.length, total: data.length, lastPage: 1 };
                } else {
                    state.campaigns = data?.data || [];
                    const pg = data?.pagination || data || {};
                    state.campaignsPagination = {
                        page: pg.current_page ?? pg.page ?? 1,
                        perPage: pg.per_page ?? pg.perPage ?? params.per_page ?? 15,
                        total: pg.total ?? state.campaigns.length,
                        lastPage: pg.last_page ?? pg.total_pages ?? pg.lastPage ?? 1
                    };
                }
                return state.campaigns;
            }
            throw response;
        } finally {
            state.isLoadingCampaigns = false;
        }
    };

    const fetchCampaign = async (id) => {
        state.isLoadingCampaign = true;
        try {
            const response = await boletasApi.getCampaign(id);
            if (apiUtils.isSuccess(response)) {
                state.currentCampaign = apiUtils.getData(response);
                return state.currentCampaign;
            }
            throw response;
        } finally {
            state.isLoadingCampaign = false;
        }
    };

    const fetchCampaignProgress = async (id) => {
        const response = await boletasApi.getCampaignProgress(id);
        if (apiUtils.isSuccess(response)) {
            return apiUtils.getData(response);
        }
        throw response;
    };

    const fetchCampaignRecipients = async (id, params = {}) => {
        const response = await boletasApi.getCampaignRecipients(id, params);
        if (apiUtils.isSuccess(response)) {
            const data = apiUtils.getData(response);
            if (Array.isArray(data)) {
                return { items: data, total: data.length, page: 1, perPage: data.length, lastPage: 1 };
            }
            const pg = data?.pagination || data || {};
            return {
                items: data?.data || [],
                total: pg.total ?? (data?.data?.length || 0),
                page: pg.current_page ?? pg.page ?? 1,
                perPage: pg.per_page ?? pg.perPage ?? params.per_page ?? 25,
                lastPage: pg.last_page ?? pg.total_pages ?? pg.lastPage ?? 1
            };
        }
        throw response;
    };

    const createCampaign = async (data) => {
        state.isCreatingCampaign = true;
        try {
            const response = await boletasApi.createCampaign(data);
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response);
            }
            throw response;
        } finally {
            state.isCreatingCampaign = false;
        }
    };

    const updateCampaign = async (id, data) => {
        state.isUpdatingCampaign = true;
        try {
            const response = await boletasApi.updateCampaign(id, data);
            if (apiUtils.isSuccess(response)) {
                const updated = apiUtils.getData(response);
                // La campaña vuelve a draft con contadores en 0: refrescar el detalle abierto.
                if (state.currentCampaign?.id === id) state.currentCampaign = updated;
                return updated;
            }
            throw response;
        } finally {
            state.isUpdatingCampaign = false;
        }
    };

    const uploadCampaignAttachment = async (id, formData) => {
        state.isUploadingAttachment = true;
        try {
            const response = await boletasApi.uploadCampaignAttachment(id, formData);
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response);
            }
            throw response;
        } finally {
            state.isUploadingAttachment = false;
        }
    };

    const launchCampaign = async (id) => {
        state.isLaunching = true;
        try {
            const response = await boletasApi.launchCampaign(id);
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response);
            }
            throw response;
        } finally {
            state.isLaunching = false;
        }
    };

    const retryFailed = async (id) => {
        state.isRetrying = true;
        try {
            const response = await boletasApi.retryFailed(id);
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response);
            }
            throw response;
        } finally {
            state.isRetrying = false;
        }
    };

    // Descargas (devuelven la respuesta axios cruda con el Blob)
    const downloadErrors = (id) => boletasApi.downloadErrors(id);
    const downloadConstancia = (id, recipientId) => boletasApi.downloadConstancia(id, recipientId);

    // ── Configuración del correo emisor ───────────────────────────────────────
    const fetchMailSettings = async () => {
        state.isLoadingMailSettings = true;
        try {
            const response = await boletasApi.getMailSettings();
            if (apiUtils.isSuccess(response)) {
                state.mailSettings = apiUtils.getData(response);
                return state.mailSettings;
            }
            throw response;
        } finally {
            state.isLoadingMailSettings = false;
        }
    };

    const saveMailSettings = async (data) => {
        state.isSavingMailSettings = true;
        try {
            const response = await boletasApi.updateMailSettings(data);
            if (apiUtils.isSuccess(response)) {
                state.mailSettings = apiUtils.getData(response) || state.mailSettings;
                return state.mailSettings;
            }
            throw response;
        } finally {
            state.isSavingMailSettings = false;
        }
    };

    const testMailSettings = async (data) => {
        state.isTestingMail = true;
        try {
            const response = await boletasApi.testMailSettings(data);
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response);
            }
            throw response;
        } finally {
            state.isTestingMail = false;
        }
    };

    // ── Helpers internos ───────────────────────────────────────────────────────
    const patchTemplate = (id, partial) => {
        const index = state.templates.findIndex((t) => t.id === id);
        if (index !== -1) state.templates[index] = { ...state.templates[index], ...partial };
        if (state.currentTemplate?.id === id) state.currentTemplate = { ...state.currentTemplate, ...partial };
    };

    // Al marcar una plantilla como default, el backend desmarca las demás; se
    // replica localmente para mantener la lista coherente sin recargar.
    const unsetOtherDefaults = (defaultId) => {
        state.templates.forEach((t) => {
            if (t.id !== defaultId && t.is_default) t.is_default = false;
        });
    };

    return {
        state,
        // Getters
        documentTypes,
        templates,
        campaigns,
        files,
        employees,
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
        testMailSettings
    };
});
