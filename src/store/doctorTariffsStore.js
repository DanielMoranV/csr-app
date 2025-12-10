import { apiUtils } from '@/api/axios.js';
import { doctorTariffs as doctorTariffsApi } from '@/api/doctorTariffs';
import cache from '@/utils/cache';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

const CACHE_KEY = 'doctor_tariffs';
const CACHE_TIMESTAMP_KEY = 'doctor_tariffs_timestamp';

export const useDoctorTariffsStore = defineStore('doctorTariffs', () => {
    // State
    const state = reactive({
        tariffs: [],
        currentTariff: null,
        isLoading: false,
        isSaving: false,
        isDeleting: false,
        lastFetch: null,
        filters: {
            global: '',
            doctor_id: null
        }
    });

    // Getters
    const allTariffs = computed(() => state.tariffs);

    const filteredTariffs = computed(() => {
        let filtered = [...state.tariffs];

        if (state.filters.global) {
            const searchTerm = state.filters.global.toLowerCase();
            filtered = filtered.filter((tariff) => {
                // Ajustar según los campos que tenga el tarifario médico
                return (
                    (tariff.code && tariff.code.toLowerCase().includes(searchTerm)) ||
                    (tariff.description && tariff.description.toLowerCase().includes(searchTerm)) ||
                    (tariff.name && tariff.name.toLowerCase().includes(searchTerm)) ||
                    (tariff.doctor_name && tariff.doctor_name.toLowerCase().includes(searchTerm))
                );
            });
        }

        if (state.filters.doctor_id) {
            filtered = filtered.filter((tariff) => tariff.doctor_id === state.filters.doctor_id);
        }

        return filtered;
    });

    const tariffsByDoctor = computed(() => {
        const grouped = {};
        state.tariffs.forEach((tariff) => {
            const doctorId = tariff.doctor_id;
            if (!grouped[doctorId]) {
                grouped[doctorId] = [];
            }
            grouped[doctorId].push(tariff);
        });
        return grouped;
    });

    // Actions
    /**
     * Fetches all doctor tariffs (without pagination)
     * Loads from cache if available, otherwise fetches from API
     * @param {object} params - Optional query parameters
     * @param {boolean} forceRefresh - Force refresh from API ignoring cache
     * @returns {Promise}
     */
    const fetchTariffs = async (params = {}, forceRefresh = false) => {
        // Intentar cargar desde cache si no es refresh forzado
        if (!forceRefresh && cache.hasThis(CACHE_KEY)) {
            try {
                const cachedData = cache.getItem(CACHE_KEY);
                if (cachedData && Array.isArray(cachedData)) {
                    state.tariffs = cachedData;
                    state.lastFetch = cache.getItem(CACHE_TIMESTAMP_KEY) || Date.now();
                    console.log('[DoctorTariffs] Loaded from cache:', cachedData.length, 'tariffs');
                    return { data: cachedData };
                }
            } catch (error) {
                console.error('[DoctorTariffs] Error loading from cache:', error);
            }
        }

        // Cargar desde API
        state.isLoading = true;
        try {
            const response = await doctorTariffsApi.getAll({ ...state.filters, ...params });
            
            // Manejar respuesta directa como array o formato estándar
            let tariffsData = [];
            
            if (apiUtils.isSuccess(response)) {
                // Formato estándar: { success: true, data: [...] }
                const data = apiUtils.getData(response);
                tariffsData = Array.isArray(data) ? data : data.data || [];
            } else if (response.data && Array.isArray(response.data)) {
                // Respuesta directa como array
                tariffsData = response.data;
            } else if (Array.isArray(response)) {
                // Respuesta es directamente un array
                tariffsData = response;
            }
            
            state.tariffs = tariffsData;
            state.lastFetch = Date.now();
            
            // Guardar en cache solo campos esenciales para reducir tamaño
            try {
                // Optimizar: guardar solo los campos necesarios para validación de comisiones
                const optimizedTariffs = tariffsData.map(t => ({
                    id: t.id,
                    doctor_code: t.doctor_code,
                    tariff_code: t.tariff_code,
                    clinic_commission: t.clinic_commission,
                    doctor_commission: t.doctor_commission
                }));
                
                cache.setItem(CACHE_KEY, optimizedTariffs);
                cache.setItem(CACHE_TIMESTAMP_KEY, state.lastFetch);
                console.log('[DoctorTariffs] Saved to cache (optimized):', optimizedTariffs.length, 'tariffs');
            } catch (cacheError) {
                console.error('[DoctorTariffs] Error saving to cache:', cacheError);
                // Si falla por espacio, intentar limpiar cache antiguo
                if (cacheError.message?.includes('quota')) {
                    console.warn('[DoctorTariffs] Storage quota exceeded, cache not saved');
                }
            }
            
            return response;
        } catch (error) {
            console.error('[DoctorTariffs] Error fetching tariffs:', error);
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
            const response = await doctorTariffsApi.getById(id);
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
     * Creates a new doctor tariff
     * @param {object} tariffData - Tariff data
     * @returns {Promise}
     */
    const createTariff = async (tariffData) => {
        state.isSaving = true;
        try {
            const response = await doctorTariffsApi.create(tariffData);
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
     * Updates an existing doctor tariff
     * @param {number} id - Tariff ID
     * @param {object} tariffData - Updated tariff data
     * @returns {Promise}
     */
    const updateTariff = async (id, tariffData) => {
        state.isSaving = true;
        try {
            const response = await doctorTariffsApi.update(id, tariffData);
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
     * Deletes a doctor tariff
     * @param {number} id - Tariff ID
     * @returns {Promise}
     */
    const deleteTariff = async (id) => {
        state.isDeleting = true;
        try {
            const response = await doctorTariffsApi.delete(id);
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
            global: '',
            doctor_id: null
        };
    };

    /**
     * Clears the tariffs cache and optionally reloads from API
     * @param {boolean} reload - Whether to reload from API after clearing cache
     * @returns {Promise}
     */
    const clearCache = async (reload = true) => {
        try {
            cache.removeItem(CACHE_KEY);
            cache.removeItem(CACHE_TIMESTAMP_KEY);
            console.log('[DoctorTariffs] Cache cleared');
            
            if (reload) {
                return await fetchTariffs({}, true);
            }
        } catch (error) {
            console.error('[DoctorTariffs] Error clearing cache:', error);
            throw error;
        }
    };

    return {
        state,
        allTariffs,
        filteredTariffs,
        tariffsByDoctor,
        fetchTariffs,
        fetchTariffById,
        createTariff,
        updateTariff,
        deleteTariff,
        setFilter,
        clearFilters,
        clearCache
    };
});
