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

    // Alias de getTicket — el backend incluye status_histories y attachments
    // automáticamente en GET /tickets/{id} sin necesidad de params adicionales.
    getTicketWithHistory(id) {
        return this.getTicket(id);
    },

    /**
     * Get the total count of unread comments for the authenticated user across ALL their tickets.
     * GET /tickets/unread-comments-count
     * Used for the sidebar badge on the Tickets menu item.
     */
    async getGlobalUnreadCommentsCount() {
        const response = await api.get('/tickets/unread-comments-count');
        return response;
    },

    /**
     * Set or update implementation dates for a ticket.
     * Only the assignee of the ticket is authorized (403 otherwise).
     * PATCH /tickets/{id}/implementation
     * @param {number} id
     * @param {{ implementation_start: string, implementation_end: string }} data - YYYY-MM-DD format
     */
    async updateImplementation(id, data) {
        const response = await api.patch(`/tickets/${id}/implementation`, data);
        return response;
    },

    /**
     * Fetch Gantt data for tickets whose implementation window overlaps the given range.
     * GET /tickets/gantt
     * @param {{ from: string, to: string, assignee_user_id?: number, assignee_position?: string, schedule_status?: string }} params
     */
    async getGantt(params = {}) {
        const response = await api.get('/tickets/gantt', { params });
        return response;
    }
};
