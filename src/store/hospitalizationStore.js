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
            // Error handled
            state.error = 'Failed to fetch hospitalization status.';
            // Re-throw the error if you want calling components to be able to catch it too
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    // Real-time event handlers
    const handleHospitalizationCreated = (eventData) => {
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
                                    number: newHospitalization.number, // Número de admisión
                                    is_active: newHospitalization.is_active,
                                    entry_date: newHospitalization.entry_at,
                                    exit_date: newHospitalization.exit_at,
                                    discharge_date: newHospitalization.exit_at,
                                    request_at: newHospitalization.request_at,
                                    medical_discharge_type: newHospitalization.medical_discharge_type,
                                    // Alta programada
                                    exit_at: newHospitalization.exit_at,
                                    discharge_is_future: newHospitalization.discharge_is_future ?? false,
                                    minutes_until_discharge: newHospitalization.minutes_until_discharge ?? null,
                                    patient: {
                                        id: newHospitalization.patient.id,
                                        name: newHospitalization.patient.name,
                                        document_number: newHospitalization.patient.number_document,
                                        document_type: newHospitalization.patient.document_type,
                                        sex: newHospitalization.patient.sex,
                                        age: newHospitalization.patient.age
                                    },
                                    doctor: newHospitalization.doctor,
                                    insurance: newHospitalization.insurance,
                                    code_insurance: newHospitalization.code_insurance,
                                    type_attention: newHospitalization.type_attention,
                                    cie10: newHospitalization.cie10,
                                    details: newHospitalization.details_attention || [],
                                    tasks: newHospitalization.tasks || []
                                };

                                // Cama ocupada mientras is_active sea true (incluyendo alta programada futura)
                                if (newHospitalization.is_active) {
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
                                    number: updatedHospitalization.number, // Número de admisión
                                    is_active: updatedHospitalization.is_active,
                                    entry_date: updatedHospitalization.entry_at,
                                    exit_date: updatedHospitalization.exit_at,
                                    discharge_date: updatedHospitalization.exit_at,
                                    request_at: updatedHospitalization.request_at,
                                    medical_discharge_type: updatedHospitalization.medical_discharge_type,
                                    // Alta programada
                                    exit_at: updatedHospitalization.exit_at,
                                    discharge_is_future: updatedHospitalization.discharge_is_future ?? false,
                                    minutes_until_discharge: updatedHospitalization.minutes_until_discharge ?? null,
                                    patient: {
                                        id: updatedHospitalization.patient.id,
                                        name: updatedHospitalization.patient.name,
                                        document_number: updatedHospitalization.patient.number_document,
                                        document_type: updatedHospitalization.patient.document_type,
                                        sex: updatedHospitalization.patient.sex,
                                        age: updatedHospitalization.patient.age
                                    },
                                    doctor: updatedHospitalization.doctor,
                                    insurance: updatedHospitalization.insurance,
                                    code_insurance: updatedHospitalization.code_insurance,
                                    type_attention: updatedHospitalization.type_attention,
                                    cie10: updatedHospitalization.cie10,
                                    details: updatedHospitalization.details_attention || [],
                                    tasks: updatedHospitalization.tasks || []
                                };

                                // Cama ocupada mientras is_active sea true (incluyendo alta programada futura)
                                if (updatedHospitalization.is_active) {
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
        }
    };

    const handleHospitalizationDeleted = (eventData) => {
        const deletedHospitalization = eventData.data;

        if (deletedHospitalization && state.status) {
            // Extract identifiers for matching
            const deletedId = deletedHospitalization.id;
            const deletedNumber = deletedHospitalization.number;
            const bedInfo = deletedHospitalization.bed;

            // Look for the bed in all rooms and clear its attention
            let found = false;
            state.status.forEach((room) => {
                if (room.beds) {
                    room.beds.forEach((bed) => {
                        // Match by multiple criteria:
                        // 1. Bed ID from event bed data
                        // 2. Attention hospital_attention_id matching deleted ID
                        // 3. Attention number matching deleted number (primary match)
                        const matchesBedId = bedInfo && bed.id === bedInfo.id;
                        const matchesAttentionId = bed.attention && bed.attention.hospital_attention_id === deletedId;
                        const matchesNumber = bed.attention && bed.attention.number === deletedNumber;

                        if (matchesBedId || matchesAttentionId || matchesNumber) {
                            // Clear the bed's attention information and mark as free
                            bed.attention = null;
                            bed.status = 'free';
                            bed.is_reserved = false;
                            found = true;

                            console.log(`Bed freed: Room ${room.room_number}, Bed ${bed.name} - Admission #${deletedNumber} deleted`);
                        }
                    });
                }
            });

            if (!found) {
                console.warn(`Bed not found for deleted hospitalization #${deletedNumber} (ID: ${deletedId}). Refreshing all data.`);
                // If the bed wasn't found, refresh all data
                fetchHospitalizationStatus();
            }
        } else {
            // Fallback: refresh the hospitalization status to reflect the deletion
            fetchHospitalizationStatus();
        }
    };

    // Task event handlers
    const handleTaskCreated = (eventData) => {
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
                        }
                    }
                });
            }
        });
    };

    const handleTaskUpdated = (eventData) => {
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
                            } else {
                                // If task not found, add it (could have been filtered out before)
                                bed.attention.tasks.push(task);
                            }
                        }
                    }
                });
            }
        });
    };

    const handleTaskDeleted = (eventData) => {
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
                            }
                        }
                    }
                });
            }
        });
    };

    // Details event handlers
    const handleDetailsCreated = (eventData) => {
        const detail = eventData.detail || eventData.data;

        if (!detail || !detail.id_attentions) return;

        const attentionId = detail.id_attentions;

        // Find the bed with this attention and add the detail
        state.status.forEach((room) => {
            if (room.beds) {
                room.beds.forEach((bed) => {
                    if (bed.attention && bed.attention.hospital_attention_id === attentionId) {
                        // Initialize details array if it doesn't exist
                        if (!bed.attention.details) {
                            bed.attention.details = [];
                        }

                        // Add the new detail if it doesn't already exist
                        const detailExists = bed.attention.details.some((d) => d.id === detail.id);
                        if (!detailExists) {
                            bed.attention.details.push(detail);
                        }
                    }
                });
            }
        });
    };

    const handleDetailsUpdated = (eventData) => {
        const detail = eventData.detail || eventData.data;

        if (!detail || !detail.id_attentions) return;

        const attentionId = detail.id_attentions;

        // Find the bed with this attention and update the detail
        state.status.forEach((room) => {
            if (room.beds) {
                room.beds.forEach((bed) => {
                    if (bed.attention && bed.attention.hospital_attention_id === attentionId) {
                        if (bed.attention.details) {
                            const detailIndex = bed.attention.details.findIndex((d) => d.id === detail.id);
                            if (detailIndex !== -1) {
                                // Update the existing detail
                                bed.attention.details[detailIndex] = detail;
                            } else {
                                // If detail not found, add it (could have been filtered out before)
                                bed.attention.details.push(detail);
                            }
                        }
                    }
                });
            }
        });
    };

    const handleDetailsDeleted = (eventData) => {
        const detailId = eventData.detail?.id || eventData.id;
        const attentionId = eventData.detail?.id_attentions || eventData.id_attentions;

        if (!detailId) return;

        // Find the bed with this attention and remove the detail
        state.status.forEach((room) => {
            if (room.beds) {
                room.beds.forEach((bed) => {
                    if (bed.attention && (!attentionId || bed.attention.hospital_attention_id === attentionId)) {
                        if (bed.attention.details) {
                            const detailIndex = bed.attention.details.findIndex((d) => d.id === detailId);
                            if (detailIndex !== -1) {
                                bed.attention.details.splice(detailIndex, 1);
                            }
                        }
                    }
                });
            }
        });
    };

    // CUDYR Evaluation event handlers
    const handleCudyrEvaluationCreated = (eventData) => {
        const evaluation = eventData.evaluation || eventData.data;

        if (!evaluation || !evaluation.id_details_attention) return;

        const detailId = evaluation.id_details_attention;

        // Find the detail and update it with the CUDYR evaluation
        state.status.forEach((room) => {
            if (room.beds) {
                room.beds.forEach((bed) => {
                    if (bed.attention && bed.attention.details) {
                        const detailIndex = bed.attention.details.findIndex((d) => d.id === detailId);
                        if (detailIndex !== -1) {
                            // Add the cudyr_evaluation to the detail
                            bed.attention.details[detailIndex].cudyr_evaluation = evaluation;
                        }
                    }
                });
            }
        });
    };

    const handleCudyrEvaluationUpdated = (eventData) => {
        const evaluation = eventData.evaluation || eventData.data;

        if (!evaluation || !evaluation.id_details_attention) return;

        const detailId = evaluation.id_details_attention;

        // Find the detail and update its CUDYR evaluation
        state.status.forEach((room) => {
            if (room.beds) {
                room.beds.forEach((bed) => {
                    if (bed.attention && bed.attention.details) {
                        const detailIndex = bed.attention.details.findIndex((d) => d.id === detailId);
                        if (detailIndex !== -1) {
                            // Update the cudyr_evaluation in the detail
                            bed.attention.details[detailIndex].cudyr_evaluation = evaluation;
                        }
                    }
                });
            }
        });
    };

    const handleCudyrEvaluationDeleted = (eventData) => {
        const evaluationId = eventData.evaluation?.id || eventData.id;
        const detailId = eventData.evaluation?.id_details_attention || eventData.id_details_attention;

        if (!detailId) return;

        // Find the detail and remove its CUDYR evaluation
        state.status.forEach((room) => {
            if (room.beds) {
                room.beds.forEach((bed) => {
                    if (bed.attention && bed.attention.details) {
                        const detailIndex = bed.attention.details.findIndex((d) => d.id === detailId);
                        if (detailIndex !== -1) {
                            // Remove the cudyr_evaluation from the detail
                            bed.attention.details[detailIndex].cudyr_evaluation = null;
                        }
                    }
                });
            }
        });
    };

    // Alta programada: discharge_scheduled — la cama pasa a estado azul con temporizador
    const handleDischargeScheduled = (eventData) => {
        // Usamos la misma lógica que handleHospitalizationUpdated;
        // el payload tiene el objeto hospital_attention actualizado con
        // discharge_is_future: true y exit_at con la hora de alta
        handleHospitalizationUpdated(eventData);
    };

    // Cama liberada: bed_released — la cama pasa a disponible
    const handleBedReleased = (eventData) => {
        const data = eventData.data;
        if (!data) return;

        const bedId = data.id_beds;
        const hospitalizationId = data.id;

        if (bedId) {
            let found = false;
            state.status.forEach((room) => {
                room.beds?.forEach((bed) => {
                    if (bed.id === bedId) {
                        bed.attention = null;
                        bed.status = 'free';
                        found = true;
                    }
                });
            });

            if (!found) {
                // Buscar por attention id como fallback
                state.status.forEach((room) => {
                    room.beds?.forEach((bed) => {
                        if (bed.attention?.hospital_attention_id === hospitalizationId) {
                            bed.attention = null;
                            bed.status = 'free';
                        }
                    });
                });
            }
        } else {
            // Sin bed id, refrescar todo
            fetchHospitalizationStatus();
        }
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
        handleTaskDeleted,
        handleDetailsCreated,
        handleDetailsUpdated,
        handleDetailsDeleted,
        // CUDYR event handlers
        handleCudyrEvaluationCreated,
        handleCudyrEvaluationUpdated,
        handleCudyrEvaluationDeleted,
        // Alta programada
        handleDischargeScheduled,
        handleBedReleased
    };
});
