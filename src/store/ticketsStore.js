import { TicketService } from '@/api/tickets';
import useEcho from '@/websocket/echo';
import { defineStore } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { computed, reactive } from 'vue';
import { useAuthStore } from './authStore';

export const useTicketsStore = defineStore('tickets', () => {
    const toast = useToast();
    const authStore = useAuthStore();

    const state = reactive({
        tickets: [],
        currentTicket: null,
        isLoading: false,
        isSaving: false,
        isDeleting: false,
        lastFetch: null,
        filters: {
            status: null,
            priority: null,
            search: '',
            ticket_id: null
        },
        pagination: {
            total: 0,
            current_page: 1
        }
    });

    // --- GETTERS / COMPUTED ---
    const allTickets = computed(() => state.tickets);
    const statusOptions = computed(() => [
        { label: 'Pendiente', value: 'pendiente' },
        { label: 'En Proceso', value: 'en proceso' },
        { label: 'Concluido', value: 'concluido' },
        { label: 'Rechazado', value: 'rechazado' },
        { label: 'Anulado', value: 'anulado' }
    ]);
    const priorityOptions = computed(() => [
        { label: 'Baja', value: 'baja' },
        { label: 'Media', value: 'media' },
        { label: 'Alta', value: 'alta' },
        { label: 'Urgente', value: 'urgente' }
    ]);

    // --- REAL-TIME EVENT HANDLERS ---
    const handleTicketCreated = (e) => {
        const ticket = e.ticket;
        const exists = state.tickets.some((t) => t.id === ticket.id);
        if (!exists) {
            state.tickets.unshift(ticket);
            state.pagination.total++;
            toast.add({ severity: 'info', summary: 'Nuevo Ticket', detail: `Ticket #${ticket.id}: ${ticket.title}`, life: 5000 });
        }
    };

    const handleTicketUpdated = (e) => {
        const ticket = e.ticket;
        const index = state.tickets.findIndex((t) => t.id === ticket.id);
        if (index !== -1) {
            state.tickets[index] = ticket;
            toast.add({ severity: 'success', summary: 'Ticket Actualizado', detail: `Ticket #${ticket.id}: ${ticket.title} (${ticket.status})`, life: 5000 });
        }
        if (state.currentTicket && state.currentTicket.id === ticket.id) {
            state.currentTicket = ticket;
        }
    };

    const initEchoListeners = () => {
        const userId = authStore.authUser?.id;
        const userPosition = authStore.authUser?.position;

        if (userId) {
            useEcho.private(`App.Models.User.${userId}`).listen('.ticket.created', handleTicketCreated).listen('.ticket.updated', handleTicketUpdated);
            console.log(`Listening to private user channel: App.Models.User.${userId}`);
        }

        if (userPosition) {
            useEcho
                .join(`tickets.position.${userPosition}`)
                .here((users) => {
                    console.log(`Users in position channel ${userPosition}:`, users);
                })
                .joining((user) => {
                    console.log(`${user.name} joined position channel ${userPosition}.`);
                })
                .leaving((user) => {
                    console.log(`${user.name} left position channel ${userPosition}.`);
                })
                .listen('.ticket.created', handleTicketCreated)
                .listen('.ticket.updated', handleTicketUpdated);
            console.log(`Listening to presence position channel: tickets.position.${userPosition}`);
        }
    };

    const leaveEchoChannels = () => {
        const userId = authStore.authUser?.id;
        const userPosition = authStore.authUser?.position;

        if (userId) {
            useEcho.leave(`App.Models.User.${userId}`);
            console.log(`Left private user channel: App.Models.User.${userId}`);
        }

        if (userPosition) {
            useEcho.leave(`tickets.position.${userPosition}`);
            console.log(`Left presence position channel: tickets.position.${userPosition}`);
        }
    };

    // --- API ACTIONS ---
    const fetchTickets = async () => {
        state.isLoading = true;
        try {
            const response = await TicketService.getTickets(state.filters);
            const responseData = response.data;

            // Handle response wrapped in a 'data' object, or as a direct array
            if (responseData && Array.isArray(responseData.data)) {
                state.tickets = responseData.data;
            } else if (Array.isArray(responseData)) {
                state.tickets = responseData;
            } else {
                console.warn('Unexpected API response structure for tickets:', responseData);
                state.tickets = [];
            }

            // Update pagination state for client-side table info
            state.pagination = {
                total: state.tickets.length,
                per_page: state.tickets.length,
                current_page: 1
            };
            state.lastFetch = Date.now();
        } catch (error) {
            console.error('Error fetching tickets:', error);
            toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los tickets.', life: 3000 });
        } finally {
            state.isLoading = false;
        }
    };

    const createTicket = async (ticketData) => {
        state.isSaving = true;
        try {
            const response = await TicketService.createTicket(ticketData);
            toast.add({ severity: 'success', summary: 'Ticket Creado', detail: `Ticket #${response.id} creado correctamente.`, life: 3000 });
            return response;
        } catch (error) {
            console.error('Error creating ticket:', error);
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const updateTicket = async (id, ticketData) => {
        state.isSaving = true;
        try {
            const response = await TicketService.updateTicket(id, ticketData);
            toast.add({ severity: 'success', summary: 'Ticket Actualizado', detail: `Ticket #${response.id} actualizado correctamente.`, life: 3000 });
            return response;
        } catch (error) {
            console.error(`Error updating ticket ${id}:`, error);
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const deleteTicket = async (id) => {
        state.isDeleting = true;
        try {
            await TicketService.deleteTicket(id);
            const index = state.tickets.findIndex((t) => t.id === id);
            if (index !== -1) {
                state.tickets.splice(index, 1);
                state.pagination.total--;
            }
        } catch (error) {
            console.error(`Error deleting ticket ${id}:`, error);
            throw error;
        } finally {
            state.isDeleting = false;
        }
    };

    // --- UI ACTIONS ---
    const setFilter = (key, value) => {
        state.filters[key] = value;
        fetchTickets();
    };

    const clearFilters = () => {
        state.filters.status = null;
        state.filters.priority = null;
        state.filters.search = '';
        state.filters.ticket_id = null;
        fetchTickets();
    };

    return {
        // State (direct access)
        tickets: computed(() => state.tickets),
        isLoading: computed(() => state.isLoading),
        isSaving: computed(() => state.isSaving),
        isDeleting: computed(() => state.isDeleting),
        filters: state.filters, // Direct access for v-model
        pagination: computed(() => state.pagination),

        // Getters
        allTickets,
        statusOptions,
        priorityOptions,

        // API Actions
        fetchTickets,
        createTicket,
        updateTicket,
        deleteTicket,

        // Real-time handlers
        handleTicketCreated,
        handleTicketUpdated,
        initEchoListeners,
        leaveEchoChannels,

        // UI Actions
        setFilter,
        clearFilters
    };
});
