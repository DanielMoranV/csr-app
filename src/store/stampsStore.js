import apiClient from '@/api/axios.js';
import { defineStore } from 'pinia';

export const useStampsStore = defineStore('stamps', {
    state: () => ({
        stamps: [],
        isLoading: false,
        isSaving: false
    }),

    getters: {
        allStamps: (state) => state.stamps
    },

    actions: {
        /**
         * GET /api/profile/stamps
         * Lista todos los sellos del usuario autenticado.
         */
        async fetchStamps() {
            this.isLoading = true;
            try {
                const response = await apiClient.get('/profile/stamps');
                // Response: { success, data: [...] }
                this.stamps = response.data ?? [];
                return response;
            } catch (error) {
                console.error('Error fetching stamps:', error);
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * POST /api/profile/stamps
         * Sube un nuevo sello PNG (multipart/form-data).
         * @param {FormData} formData  - debe tener campo 'file' (PNG ≤2MB) y opcional 'nombre'
         */
        async uploadStamp(formData) {
            this.isSaving = true;
            try {
                const response = await apiClient.post('/profile/stamps', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                // Agrega el nuevo sello al inicio de la lista local
                if (response.data) {
                    this.stamps.unshift(response.data);
                }
                return response;
            } catch (error) {
                console.error('Error uploading stamp:', error);
                throw error;
            } finally {
                this.isSaving = false;
            }
        },

        /**
         * DELETE /api/profile/stamps/{id}
         * Elimina un sello del perfil del usuario.
         * @param {number} id
         */
        async deleteStamp(id) {
            this.isSaving = true;
            try {
                const response = await apiClient.delete(`/profile/stamps/${id}`);
                // Elimina el sello de la lista local
                this.stamps = this.stamps.filter((s) => s.id !== id);
                return response;
            } catch (error) {
                console.error(`Error deleting stamp ${id}:`, error);
                throw error;
            } finally {
                this.isSaving = false;
            }
        },

        /**
         * GET /api/profile/stamps/{id}/stream
         * Obtiene el binario PNG del sello como Blob (requiere JWT en header,
         * lo maneja el interceptor de apiClient de forma automática).
         * @param {number} id
         * @returns {Promise<Blob>}
         */
        async streamStamp(id) {
            try {
                const response = await apiClient.get(`/profile/stamps/${id}/stream`, {
                    responseType: 'blob'
                });
                return response.data;
            } catch (error) {
                console.error(`Error streaming stamp ${id}:`, error);
                throw error;
            }
        }
    }
});
