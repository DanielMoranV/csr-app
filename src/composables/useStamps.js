import { apiUtils } from '@/api/axios.js';
import { useStampsStore } from '@/store/stampsStore.js';
import { useToast } from 'primevue/usetoast';
import { computed, onUnmounted } from 'vue';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function useStamps() {
    const store = useStampsStore();
    const toast = useToast();

    // Mapa interno: sello_id → Object URL (para deduplicar y revocar correctamente)
    const blobUrls = new Map();

    const stamps = computed(() => store.allStamps);
    const isLoading = computed(() => store.isLoading);
    const isSaving = computed(() => store.isSaving);

    // ─── Cargar lista de sellos ──────────────────────────────────────
    const loadStamps = async () => {
        try {
            await store.fetchStamps();
        } catch (error) {
            if (error?.status !== 404) {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: apiUtils.getMessage(error) || 'No se pudieron cargar los sellos',
                    life: 5000
                });
            }
        }
    };

    // ─── Validar archivo antes de subir ─────────────────────────────
    const validateStampFile = (file) => {
        if (!file) return 'Debe seleccionar un archivo';
        if (file.type !== 'image/png') return 'Solo se permiten archivos PNG';
        if (file.size > MAX_FILE_SIZE_BYTES) return 'El archivo no puede superar los 2 MB';
        return null;
    };

    // ─── Subir sello ────────────────────────────────────────────────
    const uploadStamp = async (file, nombre = '') => {
        const validationError = validateStampFile(file);
        if (validationError) {
            toast.add({ severity: 'warn', summary: 'Validación', detail: validationError, life: 4000 });
            return null;
        }

        const formData = new FormData();
        formData.append('file', file);
        if (nombre?.trim()) {
            formData.append('nombre', nombre.trim().slice(0, 100));
        }

        try {
            const response = await store.uploadStamp(formData);
            const message = apiUtils.getMessage(response) || 'Sello subido exitosamente';
            toast.add({ severity: 'success', summary: 'Sello subido', detail: message, life: 3500 });
            return response.data;
        } catch (error) {
            const errorMsg = apiUtils.getMessage(error) || 'No se pudo subir el sello';

            // Mostrar errores de validación si los hay (422)
            if (error?.errors && typeof error.errors === 'object') {
                const flat = apiUtils.getValidationErrorsFlat?.(error) ?? [];
                toast.add({
                    severity: 'error',
                    summary: 'Error de validación',
                    detail: flat.length > 0 ? flat.join('. ') : errorMsg,
                    life: 6000
                });
            } else {
                toast.add({ severity: 'error', summary: 'Error', detail: errorMsg, life: 5000 });
            }
            return null;
        }
    };

    // ─── Eliminar sello ─────────────────────────────────────────────
    const deleteStamp = async (id) => {
        try {
            // Revocar Blob URL si existe
            if (blobUrls.has(id)) {
                URL.revokeObjectURL(blobUrls.get(id));
                blobUrls.delete(id);
            }

            await store.deleteStamp(id);
            toast.add({ severity: 'success', summary: 'Eliminado', detail: 'Sello eliminado correctamente', life: 3000 });
            return true;
        } catch (error) {
            const msg = apiUtils.getMessage(error) || 'No se pudo eliminar el sello';
            toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 5000 });
            return false;
        }
    };

    // ─── Obtener Blob URL de un sello ────────────────────────────────
    /**
     * Devuelve un Object URL (blob:) para el sello dado.
     * Si ya fue cargado antes, reutiliza la URL cacheada.
     * @param {number} id
     * @returns {Promise<string|null>}
     */
    const getStampBlobUrl = async (id) => {
        if (blobUrls.has(id)) return blobUrls.get(id);

        try {
            const blob = await store.streamStamp(id);
            const url = URL.createObjectURL(blob);
            blobUrls.set(id, url);
            return url;
        } catch (error) {
            console.error(`No se pudo cargar imagen del sello ${id}:`, error);
            return null;
        }
    };

    // ─── Revocar todas las Blob URLs ─────────────────────────────────
    const revokeAllBlobUrls = () => {
        for (const url of blobUrls.values()) {
            URL.revokeObjectURL(url);
        }
        blobUrls.clear();
    };

    // Limpieza automática al desmontar el componente que usa este composable
    onUnmounted(() => {
        revokeAllBlobUrls();
    });

    return {
        stamps,
        isLoading,
        isSaving,

        loadStamps,
        uploadStamp,
        deleteStamp,
        getStampBlobUrl,
        revokeAllBlobUrls,
        validateStampFile
    };
}
