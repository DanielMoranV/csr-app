import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import { TicketCommentService } from '@/api/ticketComments';
import { apiUtils } from '@/api/axios';

export const useTicketCommentsStore = defineStore('ticketComments', () => {
    // State
    const state = reactive({
        comments: [],
        isLoading: false,
        isAdding: false,
        error: null
    });

    // Getters
    const allComments = computed(() => state.comments);

    // Actions
    const fetchComments = async (ticketId) => {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await TicketCommentService.getComments(ticketId);
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

    return {
        // State
        state,
        // Getters
        allComments,
        // Actions
        fetchComments,
        addComment
    };
});
