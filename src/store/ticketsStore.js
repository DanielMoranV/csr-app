import { TicketService } from '@/api/tickets';
import useEcho from '@/websocket/echo';
import { slugify } from '@/utils/pusher-helpers';
import { defineStore } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { computed, reactive } from 'vue';
import { useAuthStore } from './authStore';
import { useTicketCommentsStore } from './ticketCommentsStore';

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
            toast.add({
                severity: 'info',
                summary: 'Nuevo Ticket',
                detail: `Ticket #${ticket.id}: ${ticket.title}`,
                life: 5000
            });
        }
    };

    const handleTicketUpdated = (e) => {
        const ticket = e.ticket;
        const index = state.tickets.findIndex((t) => t.id === ticket.id);
        if (index !== -1) {
            state.tickets[index] = ticket;
            toast.add({
                severity: 'success',
                summary: 'Ticket Actualizado',
                detail: `Ticket #${ticket.id}: ${ticket.title} (${ticket.status})`,
                life: 5000
            });
        }
        if (state.currentTicket && state.currentTicket.id === ticket.id) {
            state.currentTicket = ticket;
        }
    };

    const handleTicketAssigned = (e) => {
        const ticket = e.ticket;
        const previousAssigneeId = e.previous_assignee_id;
        const previousPosition = e.previous_position;
        const currentUserId = authStore.getUser?.id;

        // Actualizar ticket en la lista
        const index = state.tickets.findIndex((t) => t.id === ticket.id);
        if (index !== -1) {
            state.tickets[index] = ticket;
        }

        // Actualizar ticket actual si está seleccionado
        if (state.currentTicket && state.currentTicket.id === ticket.id) {
            state.currentTicket = ticket;
        }

        // Mostrar notificación personalizada según el contexto
        let notificationMessage = '';
        let severity = 'info';

        if (ticket.assignee_user_id === currentUserId) {
            notificationMessage = `Te han asignado el ticket: ${ticket.title}`;
            severity = 'success';
        } else if (previousAssigneeId === currentUserId) {
            notificationMessage = `El ticket "${ticket.title}" ha sido reasignado`;
            severity = 'warning';
        } else {
            notificationMessage = `Cambio de asignación en ticket: ${ticket.title}`;
        }

        toast.add({
            severity,
            summary: 'Asignación de Ticket',
            detail: notificationMessage,
            life: 5000
        });
    };

    const handleTicketStatusChanged = (e) => {
        const ticket = e.ticket;
        const oldStatus = e.old_status;
        const newStatus = e.new_status;

        // Actualizar ticket en la lista
        const index = state.tickets.findIndex((t) => t.id === ticket.id);
        if (index !== -1) {
            state.tickets[index] = ticket;
        }

        // Actualizar ticket actual si está seleccionado
        if (state.currentTicket && state.currentTicket.id === ticket.id) {
            state.currentTicket = ticket;
        }

        // Determinar severity basado en el nuevo estado
        let severity = 'info';
        if (newStatus === 'concluido') severity = 'success';
        else if (newStatus === 'rechazado' || newStatus === 'anulado') severity = 'error';
        else if (newStatus === 'en proceso') severity = 'warning';

        toast.add({
            severity,
            summary: 'Estado del Ticket Cambiado',
            detail: `Ticket "${ticket.title}" cambió de ${oldStatus} a ${newStatus}`,
            life: 5000
        });
    };

    const handleTicketCommentCreated = (e) => {
        const comment = e.comment;
        const ticketId = e.comment.ticket_id; // Corrected: get ticket_id from the comment object

        const ticket = state.tickets.find((t) => t.id === ticketId);
        if (ticket) {
            // Notify comments store about the new comment
            const commentsStore = useTicketCommentsStore();
            commentsStore.handleCommentCreated(comment, ticketId);

            toast.add({
                severity: 'info',
                summary: 'Nuevo Comentario',
                detail: `Nuevo comentario en: ${ticket.title}`,
                life: 4000
            });
        }
    };

    const handleTicketCommentUpdated = (e) => {
        const comment = e.comment;
        const ticketId = e.comment.ticket_id; // Corrected: get ticket_id from the comment object

        const ticket = state.tickets.find((t) => t.id === ticketId);
        if (ticket) {
            // Notify comments store about the updated comment
            const commentsStore = useTicketCommentsStore();
            commentsStore.handleCommentUpdated(comment, ticketId);

            toast.add({
                severity: 'info',
                summary: 'Comentario Actualizado',
                detail: `Comentario actualizado en: ${ticket.title}`,
                life: 4000
            });
        }
    };

    const handleTicketDeleted = (e) => {
        const ticketId = e.ticket_id;
        const index = state.tickets.findIndex((t) => t.id === ticketId);
        if (index !== -1) {
            const deletedTicket = state.tickets[index];
            state.tickets.splice(index, 1);
            state.pagination.total--;

            toast.add({
                severity: 'warn',
                summary: 'Ticket Eliminado',
                detail: `El ticket "${deletedTicket.title}" ha sido eliminado`,
                life: 5000
            });
        }

        // Si el ticket eliminado era el actual, limpiarlo
        if (state.currentTicket && state.currentTicket.id === ticketId) {
            state.currentTicket = null;
        }
    };

    const initEchoListeners = () => {
        const user = authStore.getUser;
        const userId = user?.id;
        const userPosition = user?.position;
        const token = authStore.getToken;

        if (!authStore.isLoggedIn) {
            return;
        }

        if (!token) {
            return;
        }

        if (userId) {
            const privateChannel = useEcho.private(`App.Models.User.${userId}`);

            // Agregar manejadores de eventos del canal
            privateChannel
                .subscribed(() => {
                    // Successfully subscribed
                })
                .error((error) => {
                    // Error handled
                })
                .listen('.ticket.created', handleTicketCreated)
                .listen('.ticket.updated', handleTicketUpdated)
                .listen('.ticket.assigned', handleTicketAssigned)
                .listen('.ticket.status.changed', handleTicketStatusChanged)
                .listen('.ticket.comment.created', handleTicketCommentCreated)
                .listen('.ticket.comment.updated', handleTicketCommentUpdated)
                .listen('.ticket.deleted', handleTicketDeleted);
        }

        if (userPosition) {
            const positionSlug = slugify(userPosition);

            const presenceChannel = useEcho.join(`tickets.position.${positionSlug}`);

            presenceChannel
                .subscribed(() => {
                    // Successfully subscribed
                })
                .error((error) => {
                    // Error handled
                })
                .here((users) => {
                    // Users in channel
                })
                .joining((user) => {
                    // User joined
                })
                .leaving((user) => {
                    // User left
                })
                .listen('.ticket.created', handleTicketCreated)
                .listen('.ticket.updated', handleTicketUpdated)
                .listen('.ticket.assigned', handleTicketAssigned)
                .listen('.ticket.status.changed', handleTicketStatusChanged)
                .listen('.ticket.comment.created', handleTicketCommentCreated)
                .listen('.ticket.comment.updated', handleTicketCommentUpdated)
                .listen('.ticket.deleted', handleTicketDeleted);
        }
    };

    const leaveEchoChannels = () => {
        const user = authStore.getUser;
        const userId = user?.id;
        const userPosition = user?.position;

        if (userId) {
            useEcho.leave(`App.Models.User.${userId}`);
        }

        if (userPosition) {
            const positionSlug = slugify(userPosition);
            useEcho.leave(`tickets.position.${positionSlug}`);
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
            // Error handled
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
            // Error handled
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
            // Error handled
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
            // Error handled
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
        handleTicketAssigned,
        handleTicketStatusChanged,
        handleTicketCommentCreated,
        handleTicketCommentUpdated,
        handleTicketDeleted,
        initEchoListeners,
        leaveEchoChannels,

        // UI Actions
        setFilter,
        clearFilters
    };
});
