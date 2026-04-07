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
        isUpdating: false,
        isDeleting: false,
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
            if (apiUtils.isSuccess(response)) {
                state.comments = apiUtils.getData(response) || [];
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

    /**
     * Update a comment. Only the author can do this.
     * Uses PUT /tickets/{ticket}/comments/{comment}
     * Backend returns 403 if the current user is not the author.
     */
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

    /**
     * Delete a comment. Only the author can do this.
     * Uses DELETE /tickets/{ticket}/comments/{comment}
     * Backend returns 403 if the current user is not the author.
     */
    const deleteComment = async (ticketId, commentId) => {
        state.isDeleting = true;
        state.error = null;
        try {
            const response = await TicketCommentService.deleteComment(ticketId, commentId);
            // Remove from local state regardless of response body
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

    return {
        // State
        state,
        // Getters
        allComments,
        // Actions
        fetchComments,
        addComment,
        updateComment,
        deleteComment,
        // Real-time handlers
        handleCommentCreated,
        handleCommentUpdated,
        handleCommentDeleted
    };
});
