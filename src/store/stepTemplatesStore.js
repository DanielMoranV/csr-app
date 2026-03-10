import apiClient from '@/api/axios.js';
import { defineStore } from 'pinia';

export const useStepTemplatesStore = defineStore('stepTemplates', {
    state: () => ({
        templates: [],
        isLoading: false,
        isSaving: false
    }),

    getters: {
        allTemplates: (state) => state.templates
    },

    actions: {
        async fetchTemplates() {
            this.isLoading = true;
            try {
                const response = await apiClient.get('/step-templates');
                this.templates = response.data ?? [];
                return response;
            } catch (error) {
                console.error('Error fetching step templates:', error);
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async createTemplate(payload) {
            this.isSaving = true;
            try {
                const response = await apiClient.post('/step-templates', payload);
                if (response.data) {
                    this.templates.unshift(response.data);
                }
                return response;
            } catch (error) {
                console.error('Error creating step template:', error);
                throw error;
            } finally {
                this.isSaving = false;
            }
        },

        async updateTemplate(id, payload) {
            this.isSaving = true;
            try {
                const response = await apiClient.put(`/step-templates/${id}`, payload);
                const idx = this.templates.findIndex((t) => t.id === id);
                if (idx !== -1 && response.data) {
                    this.templates[idx] = response.data;
                }
                return response;
            } catch (error) {
                console.error(`Error updating step template ${id}:`, error);
                throw error;
            } finally {
                this.isSaving = false;
            }
        },

        async deleteTemplate(id) {
            this.isSaving = true;
            try {
                const response = await apiClient.delete(`/step-templates/${id}`);
                this.templates = this.templates.filter((t) => t.id !== id);
                return response;
            } catch (error) {
                console.error(`Error deleting step template ${id}:`, error);
                throw error;
            } finally {
                this.isSaving = false;
            }
        }
    }
});
