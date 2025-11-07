import { useDashboardStore } from '@/store/dashboardStore';
import { useHospitalAttentionsStore } from '@/store/hospitalAttentionsStore';
import { useHospitalizationStore } from '@/store/hospitalizationStore';
import useEcho from '@/websocket/echo';
import { onUnmounted, ref } from 'vue';

export function useRealtimeEvents(options = {}) {
    const isListening = ref(false);
    const channels = ref([]);

    const hospitalAttentionsStore = useHospitalAttentionsStore();
    const dashboardStore = useDashboardStore();
    const hospitalizationStore = useHospitalizationStore();

    // Options to control which stores should be updated
    const { updateAttentions = true, updateDashboard = true, updateHospitalization = true, updateTasks = true, updateDetails = true, updateAudits = true } = options;

    const startListening = () => {
        if (isListening.value) return;
        isListening.value = true;

        // Canal hospitalizations - para lista de atenciones
        const hospitalizationsChannel = useEcho.channel('hospitalizations');

        hospitalizationsChannel
            .listen('.hospitalization.created', (e) => {
                if (updateAttentions) {
                    hospitalAttentionsStore.handleHospitalizationCreated(e);
                }

                if (updateHospitalization) {
                    hospitalizationStore.handleHospitalizationCreated(e);
                }
            })
            .listen('.hospitalization.updated', (e) => {
                if (updateAttentions) {
                    hospitalAttentionsStore.handleHospitalizationUpdated(e);
                }

                if (updateHospitalization) {
                    hospitalizationStore.handleHospitalizationUpdated(e);
                }
            })
            .listen('.hospitalization.deleted', (e) => {
                if (updateAttentions) {
                    hospitalAttentionsStore.handleHospitalizationDeleted(e);
                }

                if (updateHospitalization) {
                    hospitalizationStore.handleHospitalizationDeleted(e);
                }
            })
            .listen('.task.created', (e) => {
                if (updateTasks && updateAttentions) {
                    hospitalAttentionsStore.handleTaskCreated(e);
                }

                if (updateTasks && updateHospitalization) {
                    hospitalizationStore.handleTaskCreated(e);
                }
            })
            .listen('.task.updated', (e) => {
                if (updateTasks && updateAttentions) {
                    hospitalAttentionsStore.handleTaskUpdated(e);
                }

                if (updateTasks && updateHospitalization) {
                    hospitalizationStore.handleTaskUpdated(e);
                }
            })
            .listen('.task.deleted', (e) => {
                if (updateTasks && updateAttentions) {
                    hospitalAttentionsStore.handleTaskDeleted(e);
                }

                if (updateTasks && updateHospitalization) {
                    hospitalizationStore.handleTaskDeleted(e);
                }
            })
            .listen('.detail.created', (e) => {
                if (updateDetails && updateAttentions) {
                    hospitalAttentionsStore.handleDetailsCreated(e);
                }

                if (updateDetails && updateHospitalization) {
                    hospitalizationStore.handleDetailsCreated(e);
                }
            })
            .listen('.detail.updated', (e) => {
                if (updateDetails && updateAttentions) {
                    hospitalAttentionsStore.handleDetailsUpdated(e);
                }

                if (updateDetails && updateHospitalization) {
                    hospitalizationStore.handleDetailsUpdated(e);
                }
            })
            .listen('.detail.deleted', (e) => {
                if (updateDetails && updateAttentions) {
                    hospitalAttentionsStore.handleDetailsDeleted(e);
                }

                if (updateDetails && updateHospitalization) {
                    hospitalizationStore.handleDetailsDeleted(e);
                }
            })
            .listen('.cudyr.created', (e) => {
                if (updateHospitalization) {
                    hospitalizationStore.handleCudyrEvaluationCreated(e);
                }
            })
            .listen('.cudyr.updated', (e) => {
                if (updateHospitalization) {
                    hospitalizationStore.handleCudyrEvaluationUpdated(e);
                }
            })
            .listen('.cudyr.deleted', (e) => {
                if (updateHospitalization) {
                    hospitalizationStore.handleCudyrEvaluationDeleted(e);
                }
            })
            .listen('.audit.created', (e) => {
                if (updateAudits && updateAttentions) {
                    hospitalAttentionsStore.handleAuditCreated(e);
                }
            })
            .listen('.audit.updated', (e) => {
                if (updateAudits && updateAttentions) {
                    hospitalAttentionsStore.handleAuditUpdated(e);
                }
            })
            .listen('.audit.deleted', (e) => {
                if (updateAudits && updateAttentions) {
                    hospitalAttentionsStore.handleAuditDeleted(e);
                }
            });

        // Canal hospital-dashboard - para estadísticas del dashboard
        const dashboardChannel = useEcho.channel('hospital-dashboard');

        if (updateDashboard) {
            dashboardChannel
                .listen('.hospitalization.created', (e) => {
                    dashboardStore.handleDashboardHospitalizationEvent(e);
                })
                .listen('.hospitalization.updated', (e) => {
                    dashboardStore.handleDashboardHospitalizationEvent(e);
                })
                .listen('.hospitalization.deleted', (e) => {
                    dashboardStore.handleDashboardHospitalizationEvent(e);
                })
                .listen('.task.created', (e) => {
                    dashboardStore.handleDashboardTaskEvent(e);
                })
                .listen('.task.updated', (e) => {
                    dashboardStore.handleDashboardTaskEvent(e);
                })
                .listen('.task.deleted', (e) => {
                    dashboardStore.handleDashboardTaskEvent(e);
                })
                .listen('.patient.created', (e) => {
                    dashboardStore.handleDashboardPatientEvent(e);
                })
                .listen('.patient.updated', (e) => {
                    dashboardStore.handleDashboardPatientEvent(e);
                });
        }

        // Canal tasks - para actualizaciones de tareas en tiempo real
        const tasksChannel = useEcho.channel('tasks');

        if (updateTasks) {
            tasksChannel
                .listen('.task.created', (e) => {
                    if (updateAttentions) {
                        hospitalAttentionsStore.handleTaskCreated(e);
                    }
                    if (updateHospitalization) {
                        hospitalizationStore.handleTaskCreated(e);
                    }
                })
                .listen('.task.updated', (e) => {
                    if (updateAttentions) {
                        hospitalAttentionsStore.handleTaskUpdated(e);
                    }
                    if (updateHospitalization) {
                        hospitalizationStore.handleTaskUpdated(e);
                    }
                })
                .listen('.task.deleted', (e) => {
                    if (updateAttentions) {
                        hospitalAttentionsStore.handleTaskDeleted(e);
                    }
                    if (updateHospitalization) {
                        hospitalizationStore.handleTaskDeleted(e);
                    }
                })
                .listen('.task.nearing-due', (e) => {
                    // Refrescar datos para obtener el estado actualizado con alert_status
                    if (updateHospitalization) {
                        hospitalizationStore.fetchHospitalizationStatus();
                    }
                    if (updateAttentions) {
                        hospitalAttentionsStore.fetchAttentions();
                    }
                    if (updateDashboard) {
                        dashboardStore.handleDashboardTaskEvent(e);
                    }
                })
                .listen('.task.overdue', (e) => {
                    // Refrescar datos para obtener el estado actualizado con alert_status
                    if (updateHospitalization) {
                        hospitalizationStore.fetchHospitalizationStatus();
                    }
                    if (updateAttentions) {
                        hospitalAttentionsStore.fetchAttentions();
                    }
                    if (updateDashboard) {
                        dashboardStore.handleDashboardTaskEvent(e);
                    }
                });
        }

        channels.value = ['hospitalizations', 'hospital-dashboard', 'tasks'];
    };

    const stopListening = () => {
        if (!isListening.value) return;

        channels.value.forEach((channelName) => {
            try {
                useEcho.leave(channelName);
            } catch (error) {
                // Error handled
            }
        });

        channels.value = [];
        isListening.value = false;
    };

    // Cleanup automático cuando el componente se desmonta
    onUnmounted(() => {
        stopListening();
    });

    return {
        isListening,
        startListening,
        stopListening,
        channels
    };
}
