import { apiUtils } from '@/api/axios.js';
import { useSignAndDownloadStore } from '@/store/signAndDownloadStore.js';
import { useToast } from 'primevue/usetoast';
import { computed } from 'vue';

export function useSignAndDownload() {
    const store = useSignAndDownloadStore();
    const toast = useToast();

    const isSaving = computed(() => store.isSaving);

    const signAndDownload = async (formData, originalFilename = 'documento') => {
        try {
            const blob = await store.signAndDownload(formData);
            const url = URL.createObjectURL(blob);
            const baseName = originalFilename.replace(/\.pdf$/i, '');
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseName}_firmado.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.add({ severity: 'success', summary: 'Descargado', detail: 'PDF firmado descargado correctamente', life: 4000 });
        } catch (error) {
            const message = apiUtils.getMessage(error) || 'Error al procesar el PDF';
            toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
            throw error;
        }
    };

    return { isSaving, signAndDownload };
}
