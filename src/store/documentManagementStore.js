import apiClient, { apiUtils } from '@/api/axios.js';
import { defineStore } from 'pinia';

export const useDocumentManagementStore = defineStore('documentManagement', {
    state: () => ({
        documents: [],
        currentDocument: null,
        isLoading: false,
        isSaving: false,
        lastFetch: null
    }),

    getters: {
        allDocuments: (state) => state.documents,
        getDocumentById: (state) => (id) => state.documents.find((doc) => doc.id === id)
    },

    actions: {
        async fetchPermittedDocuments() {
            this.isLoading = true;
            try {
                const response = await apiClient.get('/documents/permitted');
                console.log('[DEBUG] Response GET /documents/permitted:', response); // Log agregado temporalmente

                // Si la respuesta es un array directo, lo asignamos, sino tratamos de extraer la data
                this.documents = Array.isArray(response) ? response : apiUtils.getData(response) || [];

                this.lastFetch = Date.now();
                return response;
            } catch (error) {
                console.error('Error fetching permitted documents:', error);
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async fetchDocument(id) {
            this.isLoading = true;
            try {
                const response = await apiClient.get(`/documents/${id}`);
                this.currentDocument = apiUtils.getData(response);
                return response;
            } catch (error) {
                console.error(`Error fetching document ${id}:`, error);
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async createDocument(formData) {
            this.isSaving = true;
            try {
                // Important: We send multipart/form-data
                const response = await apiClient.post('/documents', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });

                // Clear cache so next fetch brings new data
                this.lastFetch = null;
                return response;
            } catch (error) {
                console.error('Error creating document:', error);
                throw error;
            } finally {
                this.isSaving = false;
            }
        },

        async signStep(stepId, payload) {
            this.isSaving = true;
            try {
                // payload could be { firma_base64: '...', posicion: { page, x, y, w, h } }
                const response = await apiClient.post(`/documents/steps/${stepId}/sign`, payload);
                return response;
            } catch (error) {
                console.error(`Error signing step ${stepId}:`, error);
                throw error;
            } finally {
                this.isSaving = false;
            }
        },

        async rejectStep(stepId, payload) {
            this.isSaving = true;
            try {
                // payload could be { comentario: '...' }
                const response = await apiClient.post(`/documents/steps/${stepId}/reject`, payload);
                return response;
            } catch (error) {
                console.error(`Error rejecting step ${stepId}:`, error);
                throw error;
            } finally {
                this.isSaving = false;
            }
        },

        async addComment(documentId, payload) {
            this.isSaving = true;
            try {
                const response = await apiClient.post(`/documents/${documentId}/comments`, payload);
                return response;
            } catch (error) {
                console.error(`Error adding comment to doc ${documentId}:`, error);
                throw error;
            } finally {
                this.isSaving = false;
            }
        }
    }
});
