import { apiUtils } from '@/api/axios';
import { TicketCommentService } from '@/api/ticketComments';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

export const useTicketCommentsStore = defineStore('ticketComments', () => {
    // State
    const state = reactive({
        comments: [],
        isLoading: false,
        isAdding: false,
        error: null,
        currentTicketId: null
    });

    // Getters
    const allComments = computed(() => state.comments);

    // Actions
    const fetchComments = async (ticketId) => {
        state.isLoading = true;
        state.error = null;
        state.currentTicketId = ticketId;
        try {
            const response = await TicketCommentService.getComments(ticketId);
            console.log(`[TicketCommentsStore] Fetched comments for ticket ${ticketId}:`, response);
            if (apiUtils.isSuccess(response)) {
                state.comments = apiUtils.getData(response) || [];
                return response;
            }
            throw response;
        } catch (error) {
            state.error = error;
            console.error(`Error fetching comments for ticket ${ticketId}:`, error);
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
                state.comments.push(newComment); // Add new comment to the list
                return response;
            }
            throw response;
        } catch (error) {
            state.error = error;
            console.error(`Error adding comment to ticket ${ticketId}:`, error);
            throw error;
        } finally {
            state.isAdding = false;
        }
    };

    // Real-time event handlers
    const handleCommentCreated = (comment, ticketId) => {
        // Only add comment if we're currently viewing this ticket
        if (state.currentTicketId === ticketId) {
            const exists = state.comments.some((c) => c.id === comment.id);
            if (!exists) {
                state.comments.push(comment);
                console.log(`[TicketCommentsStore] Comment added for ticket ${ticketId}:`, comment);
            }
        }
    };

    const handleCommentUpdated = (comment, ticketId) => {
        // Only update comment if we're currently viewing this ticket
        if (state.currentTicketId === ticketId) {
            const index = state.comments.findIndex((c) => c.id === comment.id);
            if (index !== -1) {
                state.comments[index] = comment;
                console.log(`[TicketCommentsStore] Comment updated for ticket ${ticketId}:`, comment);
            }
        }
    };

    return {
        // State
        state,
        // Getters
        allComments,
        // Actions
        fetchComments,
        addComment,
        // Real-time handlers
        handleCommentCreated,
        handleCommentUpdated
    };
});
