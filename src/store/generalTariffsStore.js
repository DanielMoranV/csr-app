import { apiUtils } from '@/api/axios.js';
import { generalTariffs as generalTariffsApi } from '@/api/generalTariffs';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

export const useGeneralTariffsStore = defineStore('generalTariffs', () => {
    // State
    const state = reactive({
        tariffs: [],
        currentTariff: null,
        isLoading: false,
        isSaving: false,
        isDeleting: false,
        lastFetch: null,
        filters: {
            global: ''
        }
    });

    // Getters
    const allTariffs = computed(() => state.tariffs);

    const filteredTariffs = computed(() => {
        let filtered = [...state.tariffs];

        if (state.filters.global) {
            const searchTerm = state.filters.global.toLowerCase();
            filtered = filtered.filter((tariff) => {
                // Ajustar según los campos que tenga el tarifario
                return (
                    (tariff.code && tariff.code.toLowerCase().includes(searchTerm)) ||
                    (tariff.description && tariff.description.toLowerCase().includes(searchTerm)) ||
                    (tariff.name && tariff.name.toLowerCase().includes(searchTerm))
                );
            });
        }

        return filtered;
    });

    // Actions
    /**
     * Fetches all general tariffs (without pagination)
     * @param {object} params - Optional query parameters
     * @returns {Promise}
     */
    const fetchTariffs = async (params = {}) => {
        state.isLoading = true;
        try {
            const response = await generalTariffsApi.getAll({ ...state.filters, ...params });
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.tariffs = Array.isArray(data) ? data : data.data || [];
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

    /**
     * Fetches a specific tariff by ID
     * @param {number} id - Tariff ID
     * @returns {Promise}
     */
    const fetchTariffById = async (id) => {
        state.isLoading = true;
        try {
            const response = await generalTariffsApi.getById(id);
            if (apiUtils.isSuccess(response)) {
                state.currentTariff = apiUtils.getData(response);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Creates a new general tariff
     * @param {object} tariffData - Tariff data
     * @returns {Promise}
     */
    const createTariff = async (tariffData) => {
        state.isSaving = true;
        try {
            const response = await generalTariffsApi.create(tariffData);
            if (apiUtils.isSuccess(response)) {
                const newTariff = apiUtils.getData(response);
                state.tariffs.push(newTariff);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    /**
     * Updates an existing general tariff
     * @param {number} id - Tariff ID
     * @param {object} tariffData - Updated tariff data
     * @returns {Promise}
     */
    const updateTariff = async (id, tariffData) => {
        state.isSaving = true;
        try {
            const response = await generalTariffsApi.update(id, tariffData);
            if (apiUtils.isSuccess(response)) {
                const updatedTariff = apiUtils.getData(response);
                const index = state.tariffs.findIndex((t) => t.id === id);
                if (index !== -1) {
                    state.tariffs[index] = { ...state.tariffs[index], ...updatedTariff };
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

    /**
     * Deletes a general tariff
     * @param {number} id - Tariff ID
     * @returns {Promise}
     */
    const deleteTariff = async (id) => {
        state.isDeleting = true;
        try {
            const response = await generalTariffsApi.delete(id);
            if (apiUtils.isSuccess(response)) {
                const index = state.tariffs.findIndex((t) => t.id === id);
                if (index !== -1) {
                    state.tariffs.splice(index, 1);
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

    // Filters
    const setFilter = (key, value) => {
        state.filters[key] = value;
    };

    const clearFilters = () => {
        state.filters = {
            global: ''
        };
    };

    return {
        state,
        allTariffs,
        filteredTariffs,
        fetchTariffs,
        fetchTariffById,
        createTariff,
        updateTariff,
        deleteTariff,
        setFilter,
        clearFilters
    };
});
