import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { doctors as doctorsApi } from '@/api/doctors';
import { apiUtils } from '@/api/axios.js';

export const useDoctorsStore = defineStore('doctors', () => {
    // State
    const state = reactive({
        doctors: [],
        currentDoctor: null,
        isLoading: false,
        isSaving: false,
        isDeleting: false,
        lastFetch: null,
        stats: null,
        filters: {
            global: '',
            document_type: null,
            payment_payroll: null,
            with_active_attentions: false,
            sort_by: 'name',
            sort_direction: 'asc'
        }
    });

    // Getters
    const allDoctors = computed(() => state.doctors);

    const doctorsByDocumentType = computed(() => {
        return (type) => state.doctors.filter((doctor) => doctor.document_type === type);
    });

    const doctorsByPaymentPayroll = computed(() => {
        return (type) => state.doctors.filter((doctor) => doctor.payment_payroll === type);
    });

    const filteredDoctors = computed(() => {
        let filtered = [...state.doctors];

        if (state.filters.global) {
            const searchTerm = state.filters.global.toLowerCase();
            filtered = filtered.filter(
                (doctor) =>
                    doctor.name.toLowerCase().includes(searchTerm) ||
                    doctor.code.toLowerCase().includes(searchTerm) ||
                    doctor.cmp.toLowerCase().includes(searchTerm) ||
                    doctor.document_number.toLowerCase().includes(searchTerm)
            );
        }

        if (state.filters.document_type) {
            filtered = filtered.filter((doctor) => doctor.document_type === state.filters.document_type);
        }

        if (state.filters.payment_payroll) {
            filtered = filtered.filter((doctor) => doctor.payment_payroll === state.filters.payment_payroll);
        }

        if (state.filters.with_active_attentions) {
            filtered = filtered.filter((doctor) => doctor.active_hospital_attentions_count > 0);
        }

        if (state.filters.sort_by) {
            filtered.sort((a, b) => {
                const fieldA = a[state.filters.sort_by];
                const fieldB = b[state.filters.sort_by];
                let comparison = 0;
                if (fieldA < fieldB) comparison = -1;
                if (fieldA > fieldB) comparison = 1;
                return state.filters.sort_direction === 'desc' ? -comparison : comparison;
            });
        }

        return filtered;
    });

    // Actions
    const fetchDoctors = async (params = {}) => {
        state.isLoading = true;
        try {
            const response = await doctorsApi.getAll({ ...state.filters, ...params });
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.doctors = Array.isArray(data) ? data : data.data || [];
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

    const fetchDoctorById = async (id) => {
        state.isLoading = true;
        try {
            const response = await doctorsApi.getById(id);
            if (apiUtils.isSuccess(response)) {
                state.currentDoctor = apiUtils.getData(response);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const fetchDoctorByCode = async (code) => {
        state.isLoading = true;
        try {
            const response = await doctorsApi.getByCode(code);
            if (apiUtils.isSuccess(response)) {
                state.currentDoctor = apiUtils.getData(response);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const createDoctor = async (doctorData) => {
        state.isSaving = true;
        try {
            const response = await doctorsApi.create(doctorData);
            if (apiUtils.isSuccess(response)) {
                const newDoctor = apiUtils.getData(response);
                state.doctors.push(newDoctor);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const updateDoctor = async (id, doctorData) => {
        state.isSaving = true;
        try {
            const response = await doctorsApi.update(id, doctorData);
            if (apiUtils.isSuccess(response)) {
                const updatedDoctor = apiUtils.getData(response);
                const index = state.doctors.findIndex((d) => d.id === id);
                if (index !== -1) {
                    state.doctors[index] = { ...state.doctors[index], ...updatedDoctor };
                }
                if (state.currentDoctor && state.currentDoctor.id === id) {
                    state.currentDoctor = { ...state.currentDoctor, ...updatedDoctor };
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

    const deleteDoctor = async (id) => {
        state.isDeleting = true;
        try {
            const response = await doctorsApi.delete(id);
            if (apiUtils.isSuccess(response)) {
                const index = state.doctors.findIndex((d) => d.id === id);
                if (index !== -1) {
                    state.doctors.splice(index, 1);
                }
                if (state.currentDoctor && state.currentDoctor.id === id) {
                    state.currentDoctor = null;
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

    const searchDoctors = async (query, params = {}) => {
        state.isLoading = true;
        try {
            const response = await doctorsApi.search({ q: query, ...params });
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
            const response = await doctorsApi.getStats();
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

    const linkUser = async (doctorId, userId) => {
        state.isSaving = true;
        try {
            const response = await doctorsApi.linkUser(doctorId, { user_id: userId });
            if (apiUtils.isSuccess(response)) {
                const updatedDoctor = apiUtils.getData(response);
                const index = state.doctors.findIndex((d) => d.id === doctorId);
                if (index !== -1) {
                    state.doctors[index] = { ...state.doctors[index], ...updatedDoctor };
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

    const unlinkUser = async (doctorId) => {
        state.isSaving = true;
        try {
            const response = await doctorsApi.unlinkUser(doctorId);
            if (apiUtils.isSuccess(response)) {
                const updatedDoctor = apiUtils.getData(response);
                const index = state.doctors.findIndex((d) => d.id === doctorId);
                if (index !== -1) {
                    state.doctors[index] = { ...state.doctors[index], ...updatedDoctor };
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

    const getLinkedUser = async (doctorId) => {
        state.isLoading = true;
        try {
            const response = await doctorsApi.getLinkedUser(doctorId);
            return response;
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    // Filters
    const setFilter = (key, value) => {
        state.filters[key] = value;
    };

    const clearFilters = () => {
        state.filters = {
            global: '',
            document_type: null,
            payment_payroll: null,
            with_active_attentions: false,
            sort_by: 'name',
            sort_direction: 'asc'
        };
    };

    return {
        state,
        allDoctors,
        doctorsByDocumentType,
        doctorsByPaymentPayroll,
        filteredDoctors,
        fetchDoctors,
        fetchDoctorById,
        fetchDoctorByCode,
        createDoctor,
        updateDoctor,
        deleteDoctor,
        searchDoctors,
        fetchStats,
        linkUser,
        unlinkUser,
        getLinkedUser,
        setFilter,
        clearFilters
    };
});
