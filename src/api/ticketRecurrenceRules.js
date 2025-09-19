import api from './axios.js';

const BASE_URL = '/ticket-recurrence-rules';

export const TicketRecurrenceRuleService = {
    /**
     * Get a list of recurrence rules.
     * @param {object} params - Query parameters (e.g., per_page).
     * @returns {Promise<object>} The API response.
     */
    getRules: (params) => {
        return api.get(BASE_URL, { params });
    },

    /**
     * Get a specific recurrence rule by its ID.
     * @param {number} id - The ID of the rule.
     * @returns {Promise<object>} The API response.
     */
    getRule: (id) => {
        return api.get(`${BASE_URL}/${id}`);
    },

    /**
     * Create a new recurrence rule.
     * @param {object} ruleData - The data for the new rule.
     * @returns {Promise<object>} The API response.
     */
    createRule: (ruleData) => {
        return api.post(BASE_URL, ruleData);
    },

    /**
     * Update an existing recurrence rule.
     * @param {number} id - The ID of the rule to update.
     * @param {object} ruleData - The updated data for the rule.
     * @returns {Promise<object>} The API response.
     */
    updateRule: (id, ruleData) => {
        return api.put(`${BASE_URL}/${id}`, ruleData);
    },

    /**
     * Delete a recurrence rule.
     * @param {number} id - The ID of the rule to delete.
     * @returns {Promise<object>} The API response.
     */
    deleteRule: (id) => {
        return api.delete(`${BASE_URL}/${id}`);
    }
};
