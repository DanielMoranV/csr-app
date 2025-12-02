import api from './axios';

export const TicketService = {
    async getTickets(params = {}) {
        // Clean up filters: remove null, undefined, or empty string values
        const activeFilters = {};
        for (const key in params) {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
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
        const response = await api.put(`/tickets/${id}`, ticketData);
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
    }
};
