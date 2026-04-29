import apiClient from '@/api/axios.js';
import { defineStore } from 'pinia';

export const useSignAndDownloadStore = defineStore('signAndDownload', {
    state: () => ({
        isSaving: false
    }),

    actions: {
        async signAndDownload(formData) {
            this.isSaving = true;
            try {
                const response = await apiClient.post('/sign-and-download', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    responseType: 'blob'
                });
                return response.data;
            } catch (error) {
                console.error('Error en sign-and-download:', error);
                throw error;
            } finally {
                this.isSaving = false;
            }
        }
    }
});
