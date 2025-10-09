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

            console.log(response);

            attentions.value = response.data?.data || [];
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

    async function createTask(taskData) {
        try {
            await hospitalAttentionsApi.createTask(taskData);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            console.error('Error creating task:', e);
            throw e;
        }
    }

    async function updateTask(id, taskData) {
        try {
            await hospitalAttentionsApi.updateTask(id, taskData);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            console.error('Error updating task:', e);
            throw e;
        }
    }

    async function deleteTask(id) {
        try {
            await hospitalAttentionsApi.deleteTask(id);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            console.error('Error deleting task:', e);
            throw e;
        }
    }

    async function createDetails(detailsData) {
        try {
            await hospitalAttentionsApi.createDetails(detailsData);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            console.error('Error creating details:', e);
            throw e;
        }
    }

    async function updateDetails(id, detailsData) {
        try {
            await hospitalAttentionsApi.updateDetails(id, detailsData);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            console.error('Error updating details:', e);
            throw e;
        }
    }

    async function deleteDetails(id) {
        try {
            await hospitalAttentionsApi.deleteDetails(id);
            await fetchAttentions(); // Refresh list
        } catch (e) {
            console.error('Error deleting details:', e);
            throw e;
        }
    }

    async function approveAttention(id) {
        try {
            const response = await hospitalAttentionsApi.approve(id);
            await fetchAttentions(); // Refresh list
            return response;
        } catch (e) {
            console.error('Error approving attention:', e);
            throw e;
        }
    }

    // Real-time event handlers
    function handleHospitalizationCreated(eventData) {
        console.log('Handling hospitalization created:', eventData);
        // Add new attention to the list
        const newAttention = eventData.data;
        if (newAttention && !attentions.value.find((att) => att.id === newAttention.id)) {
            attentions.value.unshift(newAttention);
        }
        // Refresh stats
        fetchStats();
    }

    function handleHospitalizationUpdated(eventData) {
        console.log('Handling hospitalization updated:', eventData);
        const updatedAttention = eventData.data;

        if (updatedAttention) {
            const index = attentions.value.findIndex((att) => att.id === updatedAttention.id);
            if (index !== -1) {
                // Update existing attention
                attentions.value[index] = updatedAttention;
            } else {
                // Add if not found (might be a new record)
                attentions.value.unshift(updatedAttention);
            }
        }
        // Refresh stats
        fetchStats();
    }

    function handleHospitalizationDeleted(eventData) {
        console.log('Handling hospitalization deleted:', eventData);
        const deletedId = eventData.data?.id || eventData.id;

        if (deletedId) {
            const index = attentions.value.findIndex((att) => att.id === deletedId);
            if (index !== -1) {
                attentions.value.splice(index, 1);
            }
        }
        // Refresh stats
        fetchStats();
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
        deleteAttention,
        approveAttention,
        createTask,
        updateTask,
        deleteTask,
        createDetails,
        updateDetails,
        deleteDetails,
        // Real-time event handlers
        handleHospitalizationCreated,
        handleHospitalizationUpdated,
        handleHospitalizationDeleted
    };
});
