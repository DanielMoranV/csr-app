import api from './axios';

export const TicketRecurrenceRuleService = {
    async getTicketRecurrenceRules(params = {}) {
        const response = await api.get('/ticket-recurrence-rules', { params });
        return response;
    }
};
