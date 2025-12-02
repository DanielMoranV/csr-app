<script setup>
import Card from 'primevue/card';
import Timeline from 'primevue/timeline';
import { computed, onMounted, ref } from 'vue';
import { useTicketsStore } from '@/store/ticketsStore';
import { TicketService } from '@/api/tickets';

const props = defineProps({
    ticket: {
        type: Object,
        required: true
    }
});

const ticketsStore = useTicketsStore();
const isLoading = ref(false);
const ticketWithHistory = ref(null);

// Load ticket with history on mount
onMounted(async () => {
    if (props.ticket?.id) {
        isLoading.value = true;
        try {
            const response = await TicketService.getTicketWithHistory(props.ticket.id);
            ticketWithHistory.value = response.data;
        } catch (error) {
            console.error('Error loading ticket history:', error);
        } finally {
            isLoading.value = false;
        }
    }
});

// Get current ticket from store for real-time updates, or use loaded ticket with history
const currentTicket = computed(() => {
    // If we have loaded history, use that
    if (ticketWithHistory.value) {
        return ticketWithHistory.value;
    }
    // Otherwise try to get from store
    return ticketsStore.tickets.find((t) => t.id === props.ticket?.id) || props.ticket;
});

const getStatusDetails = (status) => {
    switch (status) {
        case 'pendiente':
            return { label: 'Pendiente', icon: 'pi pi-clock', color: 'var(--blue-500)', description: 'El ticket ha sido creado y está pendiente de asignación o inicio.' };
        case 'en proceso':
            return { label: 'En Proceso', icon: 'pi pi-play', color: 'var(--orange-500)', description: 'El ticket está siendo atendido por el usuario asignado.' };
        case 'concluido':
            return { label: 'Concluido', icon: 'pi pi-check', color: 'var(--green-500)', description: 'El trabajo en el ticket ha finalizado y se considera resuelto.' };
        case 'rechazado':
            return { label: 'Rechazado', icon: 'pi pi-times', color: 'var(--red-500)', description: 'El ticket ha sido rechazado por alguna razón.' };
        case 'anulado':
            return { label: 'Anulado', icon: 'pi pi-ban', color: 'var(--gray-500)', description: 'El ticket ha sido anulado y no será procesado.' };
        default:
            return { label: status, icon: 'pi pi-question', color: 'var(--surface-500)', description: 'Estado desconocido.' };
    }
};

const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

const historyEvents = computed(() => {
    if (!currentTicket.value || !currentTicket.value.status_histories) {
        return [];
    }
    return currentTicket.value.status_histories
        .map((history) => {
            const details = getStatusDetails(history.new_status);
            return {
                statusLabel: details.label,
                icon: details.icon,
                color: details.color,
                date: history.created_at,
                user: history.user,
                description: `Cambio de estado a '${details.label}' por ${history.user.name}.`
            };
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending
});
</script>

<template>
    <div class="ticket-status-history-container">
        <h3 class="history-title">Historial de Estados</h3>
        
        <div v-if="isLoading" class="text-center p-4">
            <i class="pi pi-spin pi-spinner text-2xl text-primary"></i>
            <p class="mt-2 text-600">Cargando historial...</p>
        </div>

        <Timeline v-else-if="historyEvents.length" :value="historyEvents" class="customized-timeline">
            <template #marker="{ item }">
                <span class="custom-marker p-shadow-2" :style="{ backgroundColor: item.color }">
                    <i :class="item.icon"></i>
                </span>
            </template>
            <template #content="{ item }">
                <Card class="mb-3">
                    <template #title>
                        <div class="flex align-items-center">
                            <span class="status-label" :style="{ color: item.color }">{{ item.statusLabel }}</span>
                            <i class="pi pi-angle-right mx-2 text-500"></i>
                            <span class="user-name text-700">{{ item.user.name }}</span>
                        </div>
                    </template>
                    <template #subtitle>
                        <small class="text-500">{{ formatDateTime(item.date) }}</small>
                    </template>
                    <template #content>
                        <p class="m-0 text-600">{{ item.description }}</p>
                    </template>
                </Card>
            </template>
        </Timeline>
        <div v-if="!isLoading && !historyEvents.length" class="p-message p-message-info mt-3">
            <div class="p-message-wrapper">
                <span class="p-message-icon pi pi-info-circle"></span>
                <div class="p-message-text">No hay historial de estados disponible para este ticket.</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.ticket-status-history-container {
    padding: 1rem;
    background-color: var(--surface-card);
    border-radius: 8px;
    box-shadow: var(--surface-shadow);
}

.history-title {
    font-size: 1.5rem;
    color: var(--text-color);
    margin-bottom: 1.5rem;
    text-align: center;
}

.customized-timeline {
    padding: 0;
}

:deep(.customized-timeline .p-timeline-event-content),
:deep(.customized-timeline .p-timeline-event-opposite) {
    line-height: 1;
}

:deep(.customized-timeline .p-timeline-event-marker) {
    border: 0 none;
    background-color: var(--surface-card);
}

.custom-marker {
    display: flex;
    width: 2rem;
    height: 2rem;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    border-radius: 50%;
    z-index: 1;
}

.custom-marker i {
    font-size: 1rem;
}

.status-label {
    font-weight: bold;
    font-size: 1.1rem;
}

.user-name {
    font-weight: 600;
    font-size: 1rem;
}

.p-card .p-card-title {
    font-size: 1.1rem;
}

.p-card .p-card-subtitle {
    font-size: 0.85rem;
}

.p-card .p-card-content p {
    font-size: 0.9rem;
}

.p-message {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    border-radius: 6px;
    background-color: var(--blue-50);
    border: 1px solid var(--blue-200);
    color: var(--blue-700);
}

.p-message-icon {
    margin-right: 0.5rem;
    font-size: 1.2rem;
}

.p-message-text {
    font-size: 0.9rem;
}
</style>
