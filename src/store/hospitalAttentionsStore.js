import { hospitalAttentions as hospitalAttentionsApi } from '@/api/hospitalAttentions';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useHospitalAttentionsStore = defineStore('hospitalAttentions', () => {
    // State
    const attentions = ref([]);
    const stats = ref({});
    const isLoading = ref(false);
    const error = ref(null);

    // Getters
    const allAttentions = computed(() => attentions.value);
    const statistics = computed(() => stats.value);

    // Actions
    async function fetchAttentions() {
        isLoading.value = true;
        error.value = null;
        try {
            // El interceptor de axios devuelve directamente el cuerpo de la respuesta en caso de éxito.
            const response = await hospitalAttentionsApi.list(); // Cargar todo, sin paginar
            // Asumimos una estructura de respuesta { success: true, data: { data: [...] } }

            console.log('Fetching hospital attentions...', response);
            attentions.value = response.data?.data || [];
            console.log('Fetched attentions:', attentions.value);
        } catch (err) {
            // El interceptor de axios rechaza la promesa con un objeto de error estandarizado.
            error.value = err;
            attentions.value = [];
            console.error('Error fetching hospital attentions:', err.message || err);
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchStats() {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await hospitalAttentionsApi.getStats();
            // Asumimos una estructura de respuesta { success: true, data: { ... } }
            stats.value = response.data || {};
        } catch (err) {
            error.value = err;
            console.error('Error fetching hospital stats:', err.message || err);
        } finally {
            isLoading.value = false;
        }
    }

    async function createAttention(attentionData) {
        try {
            await hospitalAttentionsApi.create(attentionData);
            await fetchAttentions(); // Refresh list after creating
        } catch (e) {
            console.error('Error creating attention:', e);
            throw e; // Re-throw to be handled in the component
        }
    }

    async function updateAttention(id, attentionData) {
        try {
            await hospitalAttentionsApi.update(id, attentionData);
            await fetchAttentions(); // Refresh list after updating
        } catch (e) {
            console.error('Error updating attention:', e);
            throw e;
        }
    }

    async function deleteAttention(id) {
        try {
            await hospitalAttentionsApi.delete(id);
            await fetchAttentions(); // Refresh list after deleting
        } catch (e) {
            console.error('Error deleting attention:', e);
            throw e;
        }
    }

    return {
        // State
        attentions,
        stats,
        isLoading,
        error,
        // Getters
        allAttentions,
        statistics,
        // Actions
        fetchAttentions,
        fetchStats,
        createAttention,
        updateAttention,
        deleteAttention
    };
});
