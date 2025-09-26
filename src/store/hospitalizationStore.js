import { hospitalization } from '@/api/hospitalization';
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
            const response = await hospitalization.getStatus();

            console.log(response);
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

    // Real-time event handlers
    const handleHospitalizationCreated = (eventData) => {
        console.log('[HospitalizationStore] Handling hospitalization created:', eventData);

        // Refresh the hospitalization status to get updated room/bed information
        fetchHospitalizationStatus();
    };

    const handleHospitalizationUpdated = (eventData) => {
        console.log('[HospitalizationStore] Handling hospitalization updated:', eventData);

        const updatedHospitalization = eventData.data;

        if (updatedHospitalization && state.status) {
            // Find and update the specific bed/room that was affected
            const bedId = updatedHospitalization.id_beds;

            if (bedId) {
                // Look for the bed in all rooms
                let found = false;
                state.status.forEach((room) => {
                    if (room.beds) {
                        room.beds.forEach((bed) => {
                            if (bed.id === bedId) {
                                // Update the bed's attention information
                                bed.attention = updatedHospitalization;
                                bed.status = updatedHospitalization.exit_at ? 'free' : 'occupied';
                                found = true;
                            }
                        });
                    }
                });

                if (!found) {
                    // If the bed wasn't found, refresh all data
                    fetchHospitalizationStatus();
                }
            } else {
                // If no bed ID is provided, refresh all data
                fetchHospitalizationStatus();
            }
        }
    };

    const handleHospitalizationDeleted = (eventData) => {
        console.log('[HospitalizationStore] Handling hospitalization deleted:', eventData);

        // Refresh the hospitalization status to reflect the deletion
        fetchHospitalizationStatus();
    };

    return {
        state,
        hospitalizationStatus,
        fetchHospitalizationStatus,
        // Real-time event handlers
        handleHospitalizationCreated,
        handleHospitalizationUpdated,
        handleHospitalizationDeleted
    };
});
