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
    }
};
