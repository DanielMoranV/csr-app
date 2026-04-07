import api from './axios';

export const TicketService = {
    async getTickets(params = {}) {
        // Whitelist of parameters accepted by the backend (strict validation since backend returns 422 for unknown/invalid params)
        const ALLOWED_FILTERS = new Set(['status', 'priority', 'search', 'ticket_id', 'per_page', 'page']);

        // Clean up: keep only whitelisted, non-null, non-empty values
        const activeFilters = {};
        for (const key in params) {
            if (ALLOWED_FILTERS.has(key) && params[key] !== null && params[key] !== undefined && params[key] !== '') {
                activeFilters[key] = params[key];
            }
        }
        const response = await api.get('/tickets', { params: activeFilters });
        return response;
    },

    async getTicket(id) {
        const response = await api.get(`/tickets/${id}`);
        return response;
    },

    async createTicket(ticketData) {
        const response = await api.post('/tickets', ticketData);
        return response;
    },

    async updateTicket(id, ticketData) {
        // Strip 'status' from the payload — PUT /tickets/{id} no longer accepts it.
        // Status changes must go through PATCH /tickets/{id}/status exclusively.
        // eslint-disable-next-line no-unused-vars
        const { status, ...dataWithoutStatus } = ticketData;
        const response = await api.put(`/tickets/${id}`, dataWithoutStatus);
        return response;
    },

    async deleteTicket(id) {
        const response = await api.delete(`/tickets/${id}`);
        return response;
    },

    async updateTicketStatus(id, status) {
        const response = await api.patch(`/tickets/${id}/status`, { status });
        return response;
    },

    async getTicketWithHistory(id) {
        const response = await api.get(`/tickets/${id}`, {
            params: { include: 'status_histories,status_histories.user' }
        });
        return response;
    },

    /**
     * Get the total count of unread comments for the authenticated user across ALL their tickets.
     * GET /tickets/unread-comments-count
     * Used for the sidebar badge on the Tickets menu item.
     */
    async getGlobalUnreadCommentsCount() {
        const response = await api.get('/tickets/unread-comments-count');
        return response;
    }
};
