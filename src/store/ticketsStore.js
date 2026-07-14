import { TicketService } from '@/api/tickets';
import { debounce } from '@/utils/debounce';
import { slugify } from '@/utils/pusher-helpers';
import useEcho from '@/websocket/echo';
import { defineStore } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { computed, reactive } from 'vue';
import { useAuthStore } from './authStore';
import { useNotificationsStore } from './notificationsStore';
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
        globalUnreadCount: 0, // total unread comments across all tickets (from GET /tickets/unread-comments-count)
        mySummary: {
            // resumen de tickets asignados al usuario actual (from GET /tickets/my-summary)
            total: 0,
            by_status: {}
        },
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
        // Refrescar resumen si el ticket nuevo nos fue asignado
        const user = authStore.getUser;
        const isAssignedToMe = ticket.assignee?.id === user?.id || (user?.position && ticket.assignee_position === user.position);
        if (isAssignedToMe) fetchMySummary();
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

        if (ticket.assignee?.id === currentUserId) {
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

        // Refrescar resumen: puede que un ticket nos acabe de llegar o salir
        fetchMySummary();
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

        // Refrescar resumen: el estado cambio puede afectar los conteos
        const user = authStore.getUser;
        const isAssignedToMe = ticket.assignee?.id === user?.id || (user?.position && ticket.assignee_position === user.position);
        if (isAssignedToMe) fetchMySummary();
    };

    const handleTicketCommentCreated = (e) => {
        const comment = e.comment;
        const ticketId = e.comment.ticket_id;
        const currentUser = authStore.getUser;

        const ticket = state.tickets.find((t) => t.id === ticketId);
        if (!ticket) return;

        const commentsStore = useTicketCommentsStore();
        commentsStore.handleCommentCreated(comment, ticketId);

        // Determinar si el comentario fue enviado por el usuario actual.
        // El payload puede traer user_id (plano) o user.id (anidado) según la versión del backend.
        const authorId = comment.user_id ?? comment.user?.id;
        const isOwnComment = comment.is_read_by_me === true || (currentUser && authorId === currentUser.id);
        if (!isOwnComment) {
            const isViewingComments = commentsStore.state.currentTicketId === ticketId && commentsStore.state.isCommentsTabActive;

            if (isViewingComments) {
                // El usuario tiene el chat abierto — marcar como leído de inmediato
                commentsStore.markCommentAsRead(ticketId, comment.id);
                // No se toca el badge ni el bell: el usuario ya leyó el comentario
            } else {
                // El usuario no está viendo ese ticket — actualizar badges
                state.globalUnreadCount++;

                // Incrementar el contador por fila en la tabla de tickets
                ticket.unread_comments_count = (ticket.unread_comments_count || 0) + 1;

                // Incrementar el bell de notificaciones sin mutar su estado interno
                const notificationsStore = useNotificationsStore();
                notificationsStore.bumpUnreadCount('tickets');

                // Mostrar toast solo si no está en la vista del ticket
                toast.add({
                    severity: 'info',
                    summary: 'Nuevo Comentario',
                    detail: `Nuevo comentario en: ${ticket.title}`,
                    life: 4000
                });
            }
        }
    };

    /**
     * Handle the ticket.comment.read Echo event.
     * Only arrives on the PRIVATE channel of the comment author.
     * Payload: { comment_id, ticket_id, read_by: {id, name}, read_at }
     */
    const handleTicketCommentRead = (e) => {
        const commentsStore = useTicketCommentsStore();
        commentsStore.handleCommentRead(e);
    };

    const handleTicketCommentUpdated = (e) => {
        const comment = e.comment;
        const ticketId = e.comment.ticket_id;

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

    const handleTicketCommentDeleted = (e) => {
        const commentId = e.comment_id;
        const ticketId = e.ticket_id;

        const ticket = state.tickets.find((t) => t.id === ticketId);
        if (ticket) {
            const commentsStore = useTicketCommentsStore();
            commentsStore.handleCommentDeleted(commentId, ticketId);
        }
    };

    /**
     * Handle ticket.implementation_dates_set Echo event.
     * Only received by the CREATOR of the ticket (on their private channel).
     * Payload: { ticket_id, title, actor_id, schedule_status, implementation_start,
     *            implementation_end, due_date, previous_start, previous_end }
     */
    const handleImplementationDatesSet = (e) => {
        const { ticket_id, title, schedule_status, implementation_start, implementation_end } = e;
        if (!ticket_id) return;

        // Actualizar campos de implementación en la lista local (patch parcial)
        const index = state.tickets.findIndex((t) => t.id === ticket_id);
        if (index !== -1) {
            state.tickets[index] = {
                ...state.tickets[index],
                implementation_start,
                implementation_end,
                schedule_status
            };
        }

        // Actualizar currentTicket si está abierto
        if (state.currentTicket?.id === ticket_id) {
            state.currentTicket = {
                ...state.currentTicket,
                implementation_start,
                implementation_end,
                schedule_status
            };
        }

        const isDelayed = schedule_status === 'delayed';
        toast.add({
            severity: isDelayed ? 'warn' : 'info',
            summary: 'Plan de Implementación',
            detail: `Ticket "${title}": ${isDelayed ? '⚠️ implementación con retraso' : '✅ implementación en plazo'} (${implementation_start} → ${implementation_end})`,
            life: 7000
        });
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
                .subscribed(() => {})
                .error(() => {})
                .listen('.ticket.created', handleTicketCreated)
                .listen('.ticket.updated', handleTicketUpdated)
                .listen('.ticket.assigned', handleTicketAssigned)
                .listen('.ticket.status.changed', handleTicketStatusChanged)
                .listen('.ticket.implementation_dates_set', handleImplementationDatesSet)
                .listen('.ticket.comment.created', handleTicketCommentCreated)
                .listen('.ticket.comment.updated', handleTicketCommentUpdated)
                .listen('.ticket.comment.deleted', handleTicketCommentDeleted)
                .listen('.ticket.comment.read', handleTicketCommentRead); // only on private channel
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
                .listen('.ticket.comment.deleted', handleTicketCommentDeleted);
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
            // Refrescar resumen de mis tickets en paralelo (no bloquea el render)
            fetchMySummary();
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
            toast.add({ severity: 'success', summary: 'Ticket Creado', detail: `Ticket #${response.data?.id} creado correctamente.`, life: 3000 });
            return response;
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const updateTicket = async (id, ticketData) => {
        state.isSaving = true;
        try {
            const response = await TicketService.updateTicket(id, ticketData);
            toast.add({ severity: 'success', summary: 'Ticket Actualizado', detail: `Ticket #${response.data?.id} actualizado correctamente.`, life: 3000 });
            return response;
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const deleteTicket = async (id) => {
        state.isDeleting = true;
        try {
            // DELETE responde 200 con body estándar { success, message, data:null }.
            const response = await TicketService.deleteTicket(id);
            const index = state.tickets.findIndex((t) => t.id === id);
            if (index !== -1) {
                state.tickets.splice(index, 1);
                state.pagination.total--;
            }
            return response;
        } catch (error) {
            // Error handled
            throw error;
        } finally {
            state.isDeleting = false;
        }
    };

    const updateTicketStatus = async (ticketId, newStatus) => {
        state.isSaving = true;
        try {
            const response = await TicketService.updateTicketStatus(ticketId, newStatus);

            // Actualizar ticket en la lista local
            const index = state.tickets.findIndex((t) => t.id === ticketId);
            if (index !== -1) {
                state.tickets[index] = response.data;
            }

            // Actualizar ticket actual si está seleccionado
            if (state.currentTicket && state.currentTicket.id === ticketId) {
                state.currentTicket = response.data;
            }

            toast.add({
                severity: 'success',
                summary: 'Estado Actualizado',
                detail: `Estado cambiado a: ${newStatus}`,
                life: 3000
            });

            return response;
        } catch (error) {
            // Manejar errores específicos
            if (error.status === 403) {
                toast.add({
                    severity: 'error',
                    summary: 'Sin Permiso',
                    detail: error.message || 'No tienes permiso para cambiar el estado de este ticket',
                    life: 5000
                });
            } else {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo actualizar el estado del ticket',
                    life: 3000
                });
            }
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    // --- IMPLEMENTATION DATES ---
    const updateImplementation = async (ticketId, payload) => {
        const response = await TicketService.updateImplementation(ticketId, payload);
        const updated = response?.data?.data ?? response?.data;
        if (updated) {
            const index = state.tickets.findIndex((t) => t.id === updated.id);
            if (index !== -1) state.tickets[index] = updated;
            if (state.currentTicket?.id === updated.id) state.currentTicket = updated;
        }
        return response;
    };

    // --- CREATOR CONFORMITY ---
    const submitConformity = async (ticketId, payload) => {
        const response = await TicketService.submitConformity(ticketId, payload);
        const updated = response?.data?.data ?? response?.data;
        if (updated) {
            const index = state.tickets.findIndex((t) => t.id === updated.id);
            if (index !== -1) state.tickets[index] = updated;
            if (state.currentTicket?.id === updated.id) state.currentTicket = updated;
        }
        return response;
    };

    // --- GLOBAL UNREAD COMMENTS COUNT ---

    /**
     * Pone a 0 el contador unread_comments_count de un ticket específico en la lista local.
     * Llamar desde TicketDialog cuando el usuario marca todos los comentarios como leídos.
     * @param {number} ticketId
     */
    const clearTicketUnreadCount = (ticketId) => {
        const ticket = state.tickets.find((t) => t.id === ticketId);
        if (ticket) ticket.unread_comments_count = 0;
    };

    const fetchGlobalUnreadCount = async () => {
        try {
            const response = await TicketService.getGlobalUnreadCommentsCount();
            if (response && response.success) {
                state.globalUnreadCount = response.data?.unread_count || 0;
            }
        } catch {
            // silent — badge is non-critical
        }
    };

    /**
     * Fetch the personalized ticket summary for the current user.
     * Calls GET /tickets/my-summary — lightweight endpoint, no pagination.
     * Updates state.mySummary.total and state.mySummary.by_status.
     */
    const fetchMySummary = async () => {
        try {
            const response = await TicketService.getMySummary();
            if (response?.success && response.data) {
                state.mySummary.total = response.data.total ?? 0;
                state.mySummary.by_status = response.data.by_status ?? {};
            }
        } catch {
            // silent — summary is non-critical
        }
    };

    // --- STATUS TRANSITION LOGIC ---
    /**
     * Returns the list of status values the current user is allowed to transition
     * the given ticket into, based on the backend's transition matrix.
     *
     * Creator:  pendiente → anulado
     * Assignee: pendiente → en proceso | concluido | rechazado
     *           en proceso → concluido | rechazado
     * Final states (concluido, rechazado, anulado): no transitions allowed.
     *
     * @param {Object} ticket
     * @returns {string[]} Allowed target statuses (never includes current status)
     */
    const getAllowedTransitions = (ticket) => {
        const user = authStore.getUser;
        if (!user || !ticket) return [];

        const isFinal = ['concluido', 'rechazado', 'anulado'].includes(ticket.status);
        if (isFinal) return [];

        const isCreator = ticket.creator?.id === user.id;
        const isAssignee = ticket.assignee?.id === user.id;
        const samePos = !!(user.position && ticket.assignee_position && user.position === ticket.assignee_position);

        const allowed = new Set();

        if (isCreator && ticket.status === 'pendiente') {
            allowed.add('anulado');
        }

        if (isAssignee || samePos) {
            if (ticket.status === 'pendiente') {
                allowed.add('en proceso');
                allowed.add('concluido');
                allowed.add('rechazado');
            } else if (ticket.status === 'en proceso') {
                allowed.add('concluido');
                allowed.add('rechazado');
            }
        }

        return [...allowed];
    };

    // --- UI ACTIONS ---
    const debouncedFetch = debounce(fetchTickets, 350);

    const setFilter = (key, value) => {
        state.filters[key] = value;
        // Debounce only text search to avoid a request per keystroke
        if (key === 'search') {
            debouncedFetch();
        } else {
            debouncedFetch.cancel();
            fetchTickets();
        }
    };

    const clearFilters = () => {
        debouncedFetch.cancel();
        state.filters.status = null;
        state.filters.priority = null;
        state.filters.search = '';
        state.filters.ticket_id = null;
        fetchTickets();
    };

    return {
        // State
        tickets: computed(() => state.tickets),
        isLoading: computed(() => state.isLoading),
        isSaving: computed(() => state.isSaving),
        isDeleting: computed(() => state.isDeleting),
        filters: state.filters,
        pagination: computed(() => state.pagination),
        globalUnreadCount: computed(() => state.globalUnreadCount),
        mySummary: computed(() => state.mySummary),

        // Getters
        allTickets,
        statusOptions,
        priorityOptions,

        // API Actions
        fetchTickets,
        createTicket,
        updateTicket,
        deleteTicket,
        updateTicketStatus,
        updateImplementation,
        submitConformity,
        fetchGlobalUnreadCount,
        clearTicketUnreadCount,
        fetchMySummary,

        // Real-time handlers
        handleTicketCreated,
        handleTicketUpdated,
        handleTicketAssigned,
        handleTicketStatusChanged,
        handleImplementationDatesSet,
        handleTicketCommentCreated,
        handleTicketCommentUpdated,
        handleTicketCommentDeleted,
        handleTicketCommentRead,
        initEchoListeners,
        leaveEchoChannels,

        // Status transitions
        getAllowedTransitions,

        // UI Actions
        setFilter,
        clearFilters
    };
});
