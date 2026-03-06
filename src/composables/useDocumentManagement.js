import { apiUtils } from '@/api/axios.js';
import { useDocumentManagementStore } from '@/store/documentManagementStore.js';
import { useToast } from 'primevue/usetoast';
import { computed } from 'vue';

export function useDocumentManagement() {
    const store = useDocumentManagementStore();
    const toast = useToast();

    // States
    const documents = computed(() => store.allDocuments);
    const currentDocument = computed(() => store.currentDocument);
    const isLoading = computed(() => store.isLoading);
    const isSaving = computed(() => store.isSaving);

    // Initialization
    const initializeDocuments = async (forceRefresh = false) => {
        if (!forceRefresh && store.lastFetch) {
            const timeSinceLastFetch = Date.now() - store.lastFetch;
            if (timeSinceLastFetch < 60000) {
                // 1 min cache
                return;
            }
        }
        await loadDocuments();
    };

    const loadDocuments = async () => {
        try {
            await store.fetchPermittedDocuments();
        } catch (error) {
            // Un 404 significa que no hay documentos, no es un error que requiera alertar
            if (error && error.status !== 404) {
                handleError(error, 'Error al cargar los documentos');
            }
        }
    };

    // Actions
    const createDocument = async (formData) => {
        try {
            const response = await store.createDocument(formData);
            const message = apiUtils.getMessage(response) || 'Documento creado correctamente';

            toast.add({ severity: 'success', summary: 'Éxito', detail: message, life: 4000 });
            await loadDocuments(); // Reload list
            return response;
        } catch (error) {
            handleError(error, 'Error al crear el documento', true);
            throw error;
        }
    };

    const fetchDocumentDetails = async (id) => {
        try {
            return await store.fetchDocument(id);
        } catch (error) {
            handleError(error, 'Error al cargar detalles del documento');
            throw error;
        }
    };

    const signDocumentStep = async (stepId, payload = {}) => {
        try {
            const response = await store.signStep(stepId, payload);
            const message = apiUtils.getMessage(response) || 'Paso completado exitosamente';

            toast.add({ severity: 'success', summary: 'Aprobado', detail: message, life: 4000 });
            return response;
        } catch (error) {
            handleError(error, 'Error al firmar/aprobar el documento', true);
            throw error;
        }
    };

    const rejectDocumentStep = async (stepId, comentario) => {
        try {
            const response = await store.rejectStep(stepId, { comentario });
            const message = apiUtils.getMessage(response) || 'Documento rechazado';

            toast.add({ severity: 'info', summary: 'Rechazado', detail: message, life: 4000 });
            return response;
        } catch (error) {
            handleError(error, 'Error al rechazar el documento', true);
            throw error;
        }
    };

    const addDocumentComment = async (documentId, payload) => {
        try {
            const response = await store.addComment(documentId, payload);
            toast.add({ severity: 'success', summary: 'Enviado', detail: 'Comentario agregado', life: 3000 });
            return response;
        } catch (error) {
            handleError(error, 'Error al agregar el comentario');
            throw error;
        }
    };

    // Utils
    const getSeverity = (status) => {
        switch (status) {
            case 'Pendiente':
                return 'warning';
            case 'Finalizado':
                return 'success';
            case 'En corrección':
                return 'info';
            case 'Rechazado':
                return 'danger';
            default:
                return 'info';
        }
    };

    // Error Handling
    const handleError = (error, defaultMessage, showValidationErrors = false) => {
        console.error(defaultMessage, error);
        const errorMessage = apiUtils.getMessage(error) || defaultMessage;

        if (showValidationErrors && error.errors && typeof error.errors === 'object') {
            const validationErrors = apiUtils.getValidationErrorsFlat(error);
            toast.add({
                severity: 'error',
                summary: 'Validación',
                detail: validationErrors.length > 0 ? validationErrors.join(', ') : errorMessage,
                life: 6000
            });
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage,
                life: 5000
            });
        }
    };

    return {
        documents,
        currentDocument,
        isLoading,
        isSaving,

        initializeDocuments,
        createDocument,
        fetchDocumentDetails,
        signDocumentStep,
        rejectDocumentStep,
        addDocumentComment,
        getSeverity
    };
}
