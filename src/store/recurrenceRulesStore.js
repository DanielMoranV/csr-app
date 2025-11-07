import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import { TicketRecurrenceRuleService } from '@/api';
import { apiUtils } from '@/api/axios';

export const useRecurrenceRulesStore = defineStore('recurrenceRules', () => {
    // State
    const state = reactive({
        rules: [],
        currentRule: null,
        isLoading: false,
        isSaving: false,
        isDeleting: false,
        lastFetch: null,
        filters: {
            // Add filters if needed in the future
            per_page: null // No pagination by default
        }
    });

    // Getters
    const allRules = computed(() => state.rules);

    // Actions
    const fetchRules = async (params = {}) => {
        state.isLoading = true;
        try {
            const response = await TicketRecurrenceRuleService.getRules({ ...state.filters, ...params });
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                // Assuming the same pagination logic as tickets, but adaptable
                if (data && Array.isArray(data.data)) {
                    state.rules = data.data;
                    // Handle pagination data if necessary
                } else if (Array.isArray(data)) {
                    state.rules = data;
                }
                state.lastFetch = Date.now();
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const fetchRule = async (id) => {
        state.isLoading = true;
        try {
            const response = await TicketRecurrenceRuleService.getRule(id);
            if (apiUtils.isSuccess(response)) {
                state.currentRule = apiUtils.getData(response);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const createRule = async (ruleData) => {
        state.isSaving = true;
        try {
            const response = await TicketRecurrenceRuleService.createRule(ruleData);
            if (apiUtils.isSuccess(response)) {
                const newRule = apiUtils.getData(response);
                state.rules.unshift(newRule);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const updateRule = async (id, ruleData) => {
        state.isSaving = true;
        try {
            const response = await TicketRecurrenceRuleService.updateRule(id, ruleData);
            if (apiUtils.isSuccess(response)) {
                const updatedRule = apiUtils.getData(response);
                const index = state.rules.findIndex((r) => r.id === id);
                if (index !== -1) {
                    state.rules[index] = updatedRule;
                }
                if (state.currentRule && state.currentRule.id === id) {
                    state.currentRule = updatedRule;
                }
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const deleteRule = async (id) => {
        state.isDeleting = true;
        try {
            const response = await TicketRecurrenceRuleService.deleteRule(id);
            if (apiUtils.isSuccess(response)) {
                const index = state.rules.findIndex((r) => r.id === id);
                if (index !== -1) {
                    state.rules.splice(index, 1);
                }
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isDeleting = false;
        }
    };

    return {
        // State (direct access)
        rules: computed(() => state.rules),
        isLoading: computed(() => state.isLoading),
        isSaving: computed(() => state.isSaving),
        isDeleting: computed(() => state.isDeleting),

        // Getters
        allRules,

        // Actions
        fetchRules,
        fetchRule,
        createRule,
        updateRule,
        deleteRule
    };
});
