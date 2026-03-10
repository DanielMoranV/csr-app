import { apiUtils } from '@/api/axios.js';
import { useStepTemplatesStore } from '@/store/stepTemplatesStore.js';
import { useToast } from 'primevue/usetoast';
import { computed } from 'vue';

export function useStepTemplates() {
    const store = useStepTemplatesStore();
    const toast = useToast();

    const templates = computed(() => store.allTemplates);
    const isLoading = computed(() => store.isLoading);
    const isSaving = computed(() => store.isSaving);

    const loadTemplates = async () => {
        try {
            await store.fetchTemplates();
        } catch (error) {
            if (error?.status !== 404) {
                toast.add({ severity: 'error', summary: 'Error', detail: apiUtils.getMessage(error) || 'No se pudieron cargar las plantillas', life: 5000 });
            }
        }
    };

    const createTemplate = async (payload) => {
        try {
            const response = await store.createTemplate(payload);
            toast.add({ severity: 'success', summary: 'Plantilla creada', detail: apiUtils.getMessage(response) || 'Plantilla creada exitosamente', life: 4000 });
            return response.data;
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: apiUtils.getMessage(error) || 'No se pudo crear la plantilla', life: 5000 });
            throw error;
        }
    };

    const updateTemplate = async (id, payload) => {
        try {
            const response = await store.updateTemplate(id, payload);
            toast.add({ severity: 'success', summary: 'Actualizada', detail: apiUtils.getMessage(response) || 'Plantilla actualizada', life: 4000 });
            return response.data;
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: apiUtils.getMessage(error) || 'No se pudo actualizar la plantilla', life: 5000 });
            throw error;
        }
    };

    const deleteTemplate = async (id) => {
        try {
            const response = await store.deleteTemplate(id);
            toast.add({ severity: 'success', summary: 'Eliminada', detail: apiUtils.getMessage(response) || 'Plantilla eliminada', life: 3500 });
            return true;
        } catch (error) {
            const msg = apiUtils.getMessage(error) || 'No se pudo eliminar la plantilla';
            toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 5000 });
            return false;
        }
    };

    return {
        templates,
        isLoading,
        isSaving,
        loadTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate
    };
}
