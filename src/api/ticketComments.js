import api from './axios.js';

const BASE_URL = '/tickets';

export const TicketCommentService = {
    getComments: (ticketId) => {
        return api.get(`${BASE_URL}/${ticketId}/comments`);
    },

    addComment: (ticketId, commentData) => {
        return api.post(`${BASE_URL}/${ticketId}/comments`, commentData);
    },

    updateComment: (ticketId, commentId, commentData) => {
        return api.put(`${BASE_URL}/${ticketId}/comments/${commentId}`, commentData);
    },

    deleteComment: (ticketId, commentId) => {
        return api.delete(`${BASE_URL}/${ticketId}/comments/${commentId}`);
    },

    /**
     * Mark a comment as read by the authenticated user.
     * POST /tickets/{ticket}/comments/{comment}/read
     * Idempotent — safe to call multiple times. The author is always considered as having read.
     * Side effect: marks the related notification as read and broadcasts ticket.comment.read to the comment author.
     */
    markAsRead: (ticketId, commentId) => {
        return api.post(`${BASE_URL}/${ticketId}/comments/${commentId}/read`);
    },

    /**
     * Get the unread comments count for a specific ticket.
     * GET /tickets/{ticket}/unread-comments-count
     * @returns {Promise} { data: { unread_count: N } }
     */
    getUnreadCountByTicket: (ticketId) => {
        return api.get(`${BASE_URL}/${ticketId}/unread-comments-count`);
    }
};
