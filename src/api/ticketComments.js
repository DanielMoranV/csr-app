import api from './axios.js';

const BASE_URL = '/tickets';

export const TicketCommentService = {
    /**
     * Get all comments for a specific ticket.
     * @param {number} ticketId - The ID of the ticket.
     * @returns {Promise<object>} The API response.
     */
    getComments: (ticketId) => {
        return api.get(`${BASE_URL}/${ticketId}/comments`);
    },

    /**
     * Add a new comment to a ticket.
     * @param {number} ticketId - The ID of the ticket.
     * @param {object} commentData - The comment data (e.g., { content: "..." }).
     * @returns {Promise<object>} The API response.
     */
    addComment: (ticketId, commentData) => {
        return api.post(`${BASE_URL}/${ticketId}/comments`, commentData);
    },

    /**
     * Update an existing comment (only the author can do this).
     * PUT /tickets/{ticket}/comments/{comment}
     * @param {number} ticketId - The ID of the ticket.
     * @param {number} commentId - The ID of the comment.
     * @param {object} commentData - The updated comment data (e.g., { content: "..." }).
     * @returns {Promise<object>} The API response. Returns 403 if user is not the author.
     */
    updateComment: (ticketId, commentId, commentData) => {
        return api.put(`${BASE_URL}/${ticketId}/comments/${commentId}`, commentData);
    },

    /**
     * Delete a comment (only the author can do this).
     * DELETE /tickets/{ticket}/comments/{comment}
     * @param {number} ticketId - The ID of the ticket.
     * @param {number} commentId - The ID of the comment.
     * @returns {Promise<object>} The API response. Returns 403 if user is not the author.
     */
    deleteComment: (ticketId, commentId) => {
        return api.delete(`${BASE_URL}/${ticketId}/comments/${commentId}`);
    }
};
