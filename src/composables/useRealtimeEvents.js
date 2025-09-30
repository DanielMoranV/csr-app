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
    const { updateAttentions = true, updateDashboard = true, updateHospitalization = true } = options;

    const startListening = () => {
        if (isListening.value) return;
        isListening.value = true;

        // Canal hospitalizations - para lista de atenciones
        const hospitalizationsChannel = useEcho.channel('hospitalizations');

        hospitalizationsChannel
            .listen('.hospitalization.created', (e) => {
                console.log('[RealtimeEvents] hospitalization.created:', e);

                if (updateAttentions) {
                    hospitalAttentionsStore.handleHospitalizationCreated(e);
                }

                if (updateHospitalization) {
                    hospitalizationStore.handleHospitalizationCreated(e);
                }
            })
            .listen('.hospitalization.updated', (e) => {
                console.log('[RealtimeEvents] hospitalization.updated:', e);

                if (updateAttentions) {
                    hospitalAttentionsStore.handleHospitalizationUpdated(e);
                }

                if (updateHospitalization) {
                    hospitalizationStore.handleHospitalizationUpdated(e);
                }
            })
            .listen('.hospitalization.deleted', (e) => {
                console.log('[RealtimeEvents] hospitalization.deleted:', e);

                if (updateAttentions) {
                    hospitalAttentionsStore.handleHospitalizationDeleted(e);
                }

                if (updateHospitalization) {
                    hospitalizationStore.handleHospitalizationDeleted(e);
                }
            });

        // Canal hospital-dashboard - para estadísticas del dashboard
        const dashboardChannel = useEcho.channel('hospital-dashboard');

        if (updateDashboard) {
            dashboardChannel
                .listen('.hospitalization.created', (e) => {
                    console.log('[RealtimeEvents] Dashboard hospitalization.created:', e);
                    dashboardStore.handleDashboardHospitalizationEvent(e);
                })
                .listen('.hospitalization.updated', (e) => {
                    console.log('[RealtimeEvents] Dashboard hospitalization.updated:', e);
                    dashboardStore.handleDashboardHospitalizationEvent(e);
                })
                .listen('.hospitalization.deleted', (e) => {
                    console.log('[RealtimeEvents] Dashboard hospitalization.deleted:', e);
                    dashboardStore.handleDashboardHospitalizationEvent(e);
                })
                .listen('.task.created', (e) => {
                    console.log('[RealtimeEvents] Dashboard task.created:', e);
                    dashboardStore.handleDashboardTaskEvent(e);
                })
                .listen('.task.updated', (e) => {
                    console.log('[RealtimeEvents] Dashboard task.updated:', e);
                    dashboardStore.handleDashboardTaskEvent(e);
                })
                .listen('.task.deleted', (e) => {
                    console.log('[RealtimeEvents] Dashboard task.deleted:', e);
                    dashboardStore.handleDashboardTaskEvent(e);
                })
                .listen('.patient.created', (e) => {
                    console.log('[RealtimeEvents] Dashboard patient.created:', e);
                    dashboardStore.handleDashboardPatientEvent(e);
                })
                .listen('.patient.updated', (e) => {
                    console.log('[RealtimeEvents] Dashboard patient.updated:', e);
                    dashboardStore.handleDashboardPatientEvent(e);
                });
        }

        channels.value = ['hospitalizations', 'hospital-dashboard'];
    };

    const stopListening = () => {
        if (!isListening.value) return;

        channels.value.forEach((channelName) => {
            try {
                useEcho.leave(channelName);
                console.log(`[RealtimeEvents] Left channel: ${channelName}`);
            } catch (error) {
                console.warn(`[RealtimeEvents] Error leaving channel ${channelName}:`, error);
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
