import { getStatus } from '@/api/hospitalization';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

export const useHospitalizationStore = defineStore('hospitalization', () => {
    // State
    const state = reactive({
        status: [],
        isLoading: false,
        error: null,
        lastFetch: null
    });

    // Getters
    const hospitalizationStatus = computed(() => state.status);

    // Actions
    const fetchHospitalizationStatus = async () => {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await getStatus();
            // Assuming getStatus returns the full axios response
            // and you have a utility to check for success and get data.
            // If not, you might need to adjust this part.
            if (response && response.data) {
                state.status = response.data;
                state.lastFetch = Date.now();
            } else {
                // Handle cases where response is not as expected
                throw new Error('Invalid response structure');
            }
        } catch (error) {
            console.error('Error fetching hospitalization status:', error);
            state.error = 'Failed to fetch hospitalization status.';
            // Re-throw the error if you want calling components to be able to catch it too
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    return {
        state,
        hospitalizationStatus,
        fetchHospitalizationStatus
    };
});
