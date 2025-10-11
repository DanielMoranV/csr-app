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

            console.log('[HospitalizationStore] Fetched hospitalization STATUS:', response);
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

        const newHospitalization = eventData.data;

        if (newHospitalization && state.status) {
            // Find and update the specific bed/room that was affected
            const bedId = newHospitalization.id_beds;

            if (bedId) {
                // Look for the bed in all rooms
                let found = false;
                state.status.forEach((room) => {
                    if (room.beds) {
                        room.beds.forEach((bed) => {
                            if (bed.id === bedId) {
                                // Transform the hospitalization data to match the expected format
                                const transformedAttention = {
                                    hospital_attention_id: newHospitalization.id,
                                    entry_date: newHospitalization.entry_at,
                                    exit_date: newHospitalization.exit_at,
                                    discharge_date: newHospitalization.exit_at,
                                    patient: {
                                        id: newHospitalization.patient.id,
                                        name: newHospitalization.patient.name,
                                        document_number: newHospitalization.patient.number_document,
                                        document_type: newHospitalization.patient.document_type,
                                        age_formatted: newHospitalization.patient.age_formatted
                                    },
                                    doctor: newHospitalization.doctor,
                                    insurance: newHospitalization.insurance,
                                    type_attention: newHospitalization.type_attention,
                                    details: newHospitalization.details_attention,
                                    tasks: newHospitalization.tasks || []
                                };

                                // Update the bed's attention information and status
                                if (newHospitalization.is_active && !newHospitalization.exit_at) {
                                    bed.attention = transformedAttention;
                                    bed.status = 'occupied';
                                } else {
                                    bed.attention = null;
                                    bed.status = 'free';
                                }
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
        } else {
            // Fallback: refresh the hospitalization status to get updated room/bed information
            fetchHospitalizationStatus();
        }
    };

    const handleHospitalizationUpdated = (eventData) => {
        console.log('[HospitalizationStore] Handling hospitalization updated:', eventData);

        const updatedHospitalization = eventData.data;

        if (updatedHospitalization && state.status) {
            const currentBedId = updatedHospitalization.id_beds;
            const hospitalizationId = updatedHospitalization.id;

            // First, find any existing bed with the same hospitalization ID and clear it
            // This handles the case where a patient moves from one bed to another
            state.status.forEach((room) => {
                if (room.beds) {
                    room.beds.forEach((bed) => {
                        if (bed.attention && bed.attention.hospital_attention_id === hospitalizationId && bed.id !== currentBedId) {
                            // Clear the old bed since the patient moved
                            bed.attention = null;
                            bed.status = 'free';
                            console.log(`[HospitalizationStore] Cleared previous bed ${bed.id} for hospitalization ${hospitalizationId}`);
                        }
                    });
                }
            });

            if (currentBedId) {
                // Now update the current bed
                let found = false;
                state.status.forEach((room) => {
                    if (room.beds) {
                        room.beds.forEach((bed) => {
                            if (bed.id === currentBedId) {
                                // Transform the hospitalization data to match the expected format
                                const transformedAttention = {
                                    hospital_attention_id: updatedHospitalization.id,
                                    entry_date: updatedHospitalization.entry_at,
                                    exit_date: updatedHospitalization.exit_at,
                                    discharge_date: updatedHospitalization.exit_at,
                                    patient: {
                                        id: updatedHospitalization.patient.id,
                                        name: updatedHospitalization.patient.name,
                                        document_number: updatedHospitalization.patient.number_document,
                                        document_type: updatedHospitalization.patient.document_type,
                                        age_formatted: updatedHospitalization.patient.age_formatted
                                    },
                                    doctor: updatedHospitalization.doctor,
                                    insurance: updatedHospitalization.insurance,
                                    type_attention: updatedHospitalization.type_attention,
                                    details: updatedHospitalization.details_attention,
                                    tasks: updatedHospitalization.tasks || []
                                };

                                // Update the bed's attention information and status
                                if (updatedHospitalization.is_active && !updatedHospitalization.exit_at) {
                                    bed.attention = transformedAttention;
                                    bed.status = 'occupied';
                                } else {
                                    bed.attention = null;
                                    bed.status = 'free';
                                }
                                found = true;
                                console.log(`[HospitalizationStore] Updated bed ${bed.id} for hospitalization ${hospitalizationId}`);
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

        const deletedHospitalization = eventData.data;

        if (deletedHospitalization && state.status) {
            // Find and update the specific bed/room that was affected
            const bedId = deletedHospitalization.id_beds || deletedHospitalization.id;

            if (bedId) {
                // Look for the bed in all rooms and clear its attention
                let found = false;
                state.status.forEach((room) => {
                    if (room.beds) {
                        room.beds.forEach((bed) => {
                            if (bed.id === bedId || (bed.attention && bed.attention.hospital_attention_id === deletedHospitalization.id)) {
                                // Clear the bed's attention information
                                bed.attention = null;
                                bed.status = 'free';
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
        } else {
            // Fallback: refresh the hospitalization status to reflect the deletion
            fetchHospitalizationStatus();
        }
    };

    // Task event handlers
    const handleTaskCreated = (eventData) => {
        console.log('[HospitalizationStore] Handling task created:', eventData);
        const task = eventData.task;

        if (!task || !task.hospital_attention) return;

        const attentionId = task.hospital_attention.id;

        // Find the bed with this attention and add the task
        state.status.forEach((room) => {
            if (room.beds) {
                room.beds.forEach((bed) => {
                    if (bed.attention && bed.attention.hospital_attention_id === attentionId) {
                        // Initialize tasks array if it doesn't exist
                        if (!bed.attention.tasks) {
                            bed.attention.tasks = [];
                        }

                        // Add the new task if it doesn't already exist
                        const taskExists = bed.attention.tasks.some((t) => t.id === task.id);
                        if (!taskExists) {
                            bed.attention.tasks.push(task);
                            console.log(`[HospitalizationStore] Added task ${task.id} to bed ${bed.id}`);
                        }
                    }
                });
            }
        });
    };

    const handleTaskUpdated = (eventData) => {
        console.log('[HospitalizationStore] Handling task updated:', eventData);
        const task = eventData.task;

        if (!task || !task.hospital_attention) return;

        const attentionId = task.hospital_attention.id;

        // Find the bed with this attention and update the task
        state.status.forEach((room) => {
            if (room.beds) {
                room.beds.forEach((bed) => {
                    if (bed.attention && bed.attention.hospital_attention_id === attentionId) {
                        if (bed.attention.tasks) {
                            const taskIndex = bed.attention.tasks.findIndex((t) => t.id === task.id);
                            if (taskIndex !== -1) {
                                // Update the existing task
                                bed.attention.tasks[taskIndex] = task;
                                console.log(`[HospitalizationStore] Updated task ${task.id} in bed ${bed.id}`);
                            } else {
                                // If task not found, add it (could have been filtered out before)
                                bed.attention.tasks.push(task);
                                console.log(`[HospitalizationStore] Added task ${task.id} to bed ${bed.id} (was not found during update)`);
                            }
                        }
                    }
                });
            }
        });
    };

    const handleTaskDeleted = (eventData) => {
        console.log('[HospitalizationStore] Handling task deleted:', eventData);
        const taskId = eventData.task?.id || eventData.id;
        const attentionId = eventData.task?.hospital_attention?.id || eventData.hospital_attention?.id;

        if (!taskId) return;

        // Find the bed with this attention and remove the task
        state.status.forEach((room) => {
            if (room.beds) {
                room.beds.forEach((bed) => {
                    if (bed.attention && (!attentionId || bed.attention.hospital_attention_id === attentionId)) {
                        if (bed.attention.tasks) {
                            const taskIndex = bed.attention.tasks.findIndex((t) => t.id === taskId);
                            if (taskIndex !== -1) {
                                bed.attention.tasks.splice(taskIndex, 1);
                                console.log(`[HospitalizationStore] Removed task ${taskId} from bed ${bed.id}`);
                            }
                        }
                    }
                });
            }
        });
    };

    return {
        state,
        hospitalizationStatus,
        fetchHospitalizationStatus,
        // Real-time event handlers
        handleHospitalizationCreated,
        handleHospitalizationUpdated,
        handleHospitalizationDeleted,
        handleTaskCreated,
        handleTaskUpdated,
        handleTaskDeleted
    };
});
