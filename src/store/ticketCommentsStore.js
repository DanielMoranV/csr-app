import { apiUtils } from '@/api/axios.js';
import { TicketCommentService } from '@/api/ticketComments';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

export const useTicketCommentsStore = defineStore('ticketComments', () => {
    // State
    const state = reactive({
        comments: [],
        isLoading: false,
        isAdding: false,
        isUpdating: false,
        isDeleting: false,
        error: null,
        currentTicketId: null,
        // True cuando el usuario tiene abierto el panel de comentarios de currentTicketId
        isCommentsTabActive: false,
        // Read receipts: { [commentId]: [{ read_by: {id, name}, read_at }] }
        readReceipts: {}
    });

    // Getters
    const allComments = computed(() => state.comments);

    // readReceipts expuesto como computed para que Vue trackee los cambios
    // correctamente en el template sin depender del proxy de Pinia
    const readReceipts = computed(() => state.readReceipts);

    // Alias por compatibilidad con código existente
    const getReadReceiptsForComment = (commentId) => {
        return state.readReceipts[commentId] || [];
    };

    // Actions
    const fetchComments = async (ticketId) => {
        state.isLoading = true;
        state.error = null;
        state.currentTicketId = ticketId;
        try {
            const response = await TicketCommentService.getComments(ticketId);
            if (apiUtils.isSuccess(response)) {
                const comments = apiUtils.getData(response) || [];
                state.comments = comments;

                // Poblar readReceipts desde los datos históricos que devuelve el backend.
                // El campo read_by en cada comentario contiene todos los lectores con timestamp.
                // Estructura interna: { [commentId]: [{ read_by: userObj, read_at }] }
                const receipts = {};
                comments.forEach((comment) => {
                    if (comment.read_by?.length > 0) {
                        receipts[comment.id] = comment.read_by.map((r) => ({
                            read_by: r.user,
                            read_at: r.read_at
                        }));
                    }
                });
                // Preservar receipts en tiempo real que hayan llegado DURANTE el fetch
                // (eventos Echo que llegaron mientras esperábamos la respuesta HTTP)
                Object.entries(state.readReceipts).forEach(([id, rts]) => {
                    if (!receipts[id]) receipts[id] = rts;
                });
                state.readReceipts = receipts;

                return response;
            }
            throw response;
        } catch (error) {
            state.error = error;
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const addComment = async (ticketId, commentData) => {
        state.isAdding = true;
        state.error = null;
        try {
            const response = await TicketCommentService.addComment(ticketId, commentData);
            if (apiUtils.isSuccess(response)) {
                const newComment = apiUtils.getData(response);
                state.comments.push(newComment);
                return response;
            }
            throw response;
        } catch (error) {
            state.error = error;
            throw error;
        } finally {
            state.isAdding = false;
        }
    };

    const updateComment = async (ticketId, commentId, commentData) => {
        state.isUpdating = true;
        state.error = null;
        try {
            const response = await TicketCommentService.updateComment(ticketId, commentId, commentData);
            if (apiUtils.isSuccess(response)) {
                const updatedComment = apiUtils.getData(response);
                const index = state.comments.findIndex((c) => c.id === commentId);
                if (index !== -1) {
                    state.comments[index] = updatedComment;
                }
                return response;
            }
            throw response;
        } catch (error) {
            state.error = error;
            throw error;
        } finally {
            state.isUpdating = false;
        }
    };

    const deleteComment = async (ticketId, commentId) => {
        state.isDeleting = true;
        state.error = null;
        try {
            const response = await TicketCommentService.deleteComment(ticketId, commentId);
            const index = state.comments.findIndex((c) => c.id === commentId);
            if (index !== -1) {
                state.comments.splice(index, 1);
            }
            return response;
        } catch (error) {
            state.error = error;
            throw error;
        } finally {
            state.isDeleting = false;
        }
    };

    /**
     * Set whether the user currently has the comments panel open for currentTicketId.
     * Called by TicketDialog when the user switches to/from the Comments tab.
     * Also called on dialog close to ensure the flag is reset.
     */
    const setCommentsTabActive = (active) => {
        state.isCommentsTabActive = !!active;
    };

    /**
     * Mark a comment as read. Fire-and-forget, idempotent.
     * Actualiza is_read_by_me localmente de forma optimista para que
     * llamadas sucesivas (p. ej. al cambiar de tab) no lo marquen de nuevo.
     * Side effect on backend: broadcasts ticket.comment.read to the comment author.
     */
    const markCommentAsRead = async (ticketId, commentId) => {
        // Actualización optimista: marcar localmente antes de esperar respuesta
        const idx = state.comments.findIndex((c) => c.id === commentId);
        if (idx !== -1 && !state.comments[idx].is_read_by_me) {
            state.comments[idx].is_read_by_me = true;
        }
        try {
            await TicketCommentService.markAsRead(ticketId, commentId);
        } catch {
            // Silent — idempotent read marks should not block UX
        }
    };

    // Real-time event handlers
    const handleCommentCreated = (comment, ticketId) => {
        if (state.currentTicketId === ticketId) {
            const exists = state.comments.some((c) => c.id === comment.id);
            if (!exists) {
                state.comments.push(comment);
            }
        }
    };

    const handleCommentUpdated = (comment, ticketId) => {
        if (state.currentTicketId === ticketId) {
            const index = state.comments.findIndex((c) => c.id === comment.id);
            if (index !== -1) {
                state.comments[index] = comment;
            }
        }
    };

    const handleCommentDeleted = (commentId, ticketId) => {
        if (state.currentTicketId === ticketId) {
            const index = state.comments.findIndex((c) => c.id === commentId);
            if (index !== -1) {
                state.comments.splice(index, 1);
            }
        }
    };

    /**
     * Handle the ticket.comment.read Echo event.
     * Only received by the AUTHOR of the comment (on their private channel).
     * Payload: { comment_id, ticket_id, read_by: {id, name}, read_at }
     */
    const handleCommentRead = (e) => {
        const { comment_id, read_by, read_at } = e;
        if (!comment_id || !read_by) return;

        if (!state.readReceipts[comment_id]) {
            state.readReceipts[comment_id] = [];
        }

        // Avoid duplicates from the same reader
        const alreadyAdded = state.readReceipts[comment_id].some((r) => r.read_by?.id === read_by.id);
        if (!alreadyAdded) {
            state.readReceipts[comment_id].push({ read_by, read_at });
        }
    };

    return {
        // State
        state,
        // Getters
        allComments,
        readReceipts,
        getReadReceiptsForComment,
        // Actions
        fetchComments,
        addComment,
        updateComment,
        deleteComment,
        markCommentAsRead,
        setCommentsTabActive,
        // Real-time handlers
        handleCommentCreated,
        handleCommentUpdated,
        handleCommentDeleted,
        handleCommentRead
    };
});
