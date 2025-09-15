import api from './axios';

export const TicketService = {
    async getTickets(params = {}) {
        const response = await api.get('/tickets', { params });
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
    }
};
