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

        // Archivos
        files: [],
        filesMeta: { period: null, document_type: null, count: 0 },

        // Campañas
        campaigns: [],
        campaignsPagination: { page: 1, perPage: 15, total: 0, lastPage: 1 },
        currentCampaign: null,

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
        isValidating: false,
        isLoadingCampaigns: false,
        isLoadingCampaign: false,
        isCreatingCampaign: false,
        isLaunching: false,
        isRetrying: false
    });

    // ── Getters ──────────────────────────────────────────────────────────────
    const documentTypes = computed(() => state.documentTypes);
    const templates = computed(() => state.templates);
    const campaigns = computed(() => state.campaigns);
    const files = computed(() => state.files);

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
                return Array.isArray(data) ? data : data?.data || [];
            }
            throw response;
        } finally {
            state.isLoadingEmployees = false;
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
                // Soporta tanto array plano como paginador estilo Laravel
                if (Array.isArray(data)) {
                    state.campaigns = data;
                    state.campaignsPagination = { page: 1, perPage: data.length, total: data.length, lastPage: 1 };
                } else {
                    state.campaigns = data?.data || [];
                    state.campaignsPagination = {
                        page: data?.current_page ?? 1,
                        perPage: data?.per_page ?? params.per_page ?? 15,
                        total: data?.total ?? state.campaigns.length,
                        lastPage: data?.last_page ?? 1
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
            return {
                items: data?.data || [],
                total: data?.total ?? (data?.data?.length || 0),
                page: data?.current_page ?? 1,
                perPage: data?.per_page ?? params.per_page ?? 25,
                lastPage: data?.last_page ?? 1
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
        // Catálogo
        fetchDocumentTypes,
        // Plantillas
        fetchTemplates,
        fetchTemplate,
        previewTemplate,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        // Archivos
        fetchFiles,
        uploadFiles,
        deleteFile,
        // Destinatarios
        fetchEmployees,
        validateRecipients,
        // Campañas
        fetchCampaigns,
        fetchCampaign,
        fetchCampaignProgress,
        fetchCampaignRecipients,
        createCampaign,
        launchCampaign,
        retryFailed,
        downloadErrors,
        downloadConstancia
    };
});
