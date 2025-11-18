import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { medicalSpecialties as specialtiesApi } from '@/api/medicalSpecialties';
import { apiUtils } from '@/api/axios.js';

export const useMedicalSpecialtiesStore = defineStore('medicalSpecialties', () => {
    // State
    const state = reactive({
        specialties: [],
        currentSpecialty: null,
        isLoading: false,
        isSaving: false,
        isDeleting: false,
        lastFetch: null,
        stats: null,
        filters: {
            global: '',
            with_doctors: false,
            popular: false,
            min_doctors: 1
        }
    });

    // Getters
    const allSpecialties = computed(() => state.specialties);

    const popularSpecialties = computed(() => state.specialties.filter((specialty) => (specialty.doctors_count || 0) >= state.filters.min_doctors));

    const specialtiesWithDoctors = computed(() => state.specialties.filter((specialty) => specialty.doctors && specialty.doctors.length > 0));

    const filteredSpecialties = computed(() => {
        let filtered = [...state.specialties];

        if (state.filters.global) {
            const searchTerm = state.filters.global.toLowerCase();
            filtered = filtered.filter((specialty) => specialty.name.toLowerCase().includes(searchTerm) || (specialty.description && specialty.description.toLowerCase().includes(searchTerm)));
        }

        if (state.filters.popular) {
            filtered = filtered.filter((specialty) => (specialty.doctors_count || 0) >= state.filters.min_doctors);
        }

        return filtered;
    });

    // Actions
    const fetchSpecialties = async (params = {}) => {
        state.isLoading = true;
        try {
            const response = await specialtiesApi.getAll({ ...state.filters, ...params });
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.specialties = Array.isArray(data) ? data : data.data || [];
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

    const fetchSpecialtyById = async (id) => {
        state.isLoading = true;
        try {
            const response = await specialtiesApi.getById(id);
            if (apiUtils.isSuccess(response)) {
                state.currentSpecialty = apiUtils.getData(response);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const createSpecialty = async (specialtyData) => {
        state.isSaving = true;
        try {
            const response = await specialtiesApi.create(specialtyData);
            if (apiUtils.isSuccess(response)) {
                const newSpecialty = apiUtils.getData(response);
                state.specialties.push(newSpecialty);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const updateSpecialty = async (id, specialtyData) => {
        state.isSaving = true;
        try {
            const response = await specialtiesApi.update(id, specialtyData);
            if (apiUtils.isSuccess(response)) {
                const updatedSpecialty = apiUtils.getData(response);
                const index = state.specialties.findIndex((s) => s.id === id);
                if (index !== -1) {
                    state.specialties[index] = { ...state.specialties[index], ...updatedSpecialty };
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

    const deleteSpecialty = async (id) => {
        state.isDeleting = true;
        try {
            const response = await specialtiesApi.delete(id);
            if (apiUtils.isSuccess(response)) {
                const index = state.specialties.findIndex((s) => s.id === id);
                if (index !== -1) {
                    state.specialties.splice(index, 1);
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

    const searchSpecialties = async (query) => {
        state.isLoading = true;
        try {
            const response = await specialtiesApi.search({ q: query });
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response);
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const fetchStats = async () => {
        state.isLoading = true;
        try {
            const response = await specialtiesApi.getStats();
            if (apiUtils.isSuccess(response)) {
                state.stats = apiUtils.getData(response);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const attachDoctor = async (specialtyId, doctorId) => {
        state.isSaving = true;
        try {
            const response = await specialtiesApi.attachDoctor(specialtyId, { doctor_id: doctorId });
            if (apiUtils.isSuccess(response)) {
                // Actualizar el specialty en el estado
                const index = state.specialties.findIndex((s) => s.id === specialtyId);
                if (index !== -1 && state.specialties[index].doctors) {
                    const updatedSpecialty = apiUtils.getData(response);
                    state.specialties[index] = updatedSpecialty;
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

    const detachDoctor = async (specialtyId, doctorId) => {
        state.isSaving = true;
        try {
            const response = await specialtiesApi.detachDoctor(specialtyId, { doctor_id: doctorId });
            if (apiUtils.isSuccess(response)) {
                // Actualizar el specialty en el estado
                const index = state.specialties.findIndex((s) => s.id === specialtyId);
                if (index !== -1 && state.specialties[index].doctors) {
                    const updatedSpecialty = apiUtils.getData(response);
                    state.specialties[index] = updatedSpecialty;
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

    const syncDoctors = async (specialtyId, doctorIds) => {
        state.isSaving = true;
        try {
            const response = await specialtiesApi.syncDoctors(specialtyId, { doctor_ids: doctorIds });
            if (apiUtils.isSuccess(response)) {
                // Actualizar el specialty en el estado
                const index = state.specialties.findIndex((s) => s.id === specialtyId);
                if (index !== -1) {
                    const updatedSpecialty = apiUtils.getData(response);
                    state.specialties[index] = updatedSpecialty;
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

    // Filters
    const setFilter = (key, value) => {
        state.filters[key] = value;
    };

    const clearFilters = () => {
        state.filters = {
            global: '',
            with_doctors: false,
            popular: false,
            min_doctors: 1
        };
    };

    return {
        state,
        allSpecialties,
        popularSpecialties,
        specialtiesWithDoctors,
        filteredSpecialties,
        fetchSpecialties,
        fetchSpecialtyById,
        createSpecialty,
        updateSpecialty,
        deleteSpecialty,
        searchSpecialties,
        fetchStats,
        attachDoctor,
        detachDoctor,
        syncDoctors,
        setFilter,
        clearFilters
    };
});
