import { absences as absencesApi } from '@/api/absences';
import { apiUtils } from '@/api/axios.js';
import { doctorSchedules as schedulesApi } from '@/api/doctorSchedules';
import { medicalShifts as shiftsApi } from '@/api/medicalShifts';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

export const useDoctorSchedulesStore = defineStore('doctorSchedules', () => {
    // State
    const state = reactive({
        schedules: [],
        absences: [],
        medicalShifts: [],
        currentSchedule: null,
        currentAbsence: null,
        isLoading: false,
        isSaving: false,
        isDeleting: false,
        lastFetch: null,
        stats: null,
        filters: {
            doctor_id: null,
            id_medical_specialty: null, // Filter by medical specialty
            start_date: null, // New filter for start date
            end_date: null,   // New filter for end date
            category: null,
            status: null,
            upcoming: false,
            past: false,
            today: false
        }
    });

    // Getters for Schedules
    const allSchedules = computed(() => state.schedules);

    const upcomingSchedules = computed(() => state.schedules.filter((schedule) => schedule.is_future || schedule.is_today));

    const pastSchedules = computed(() => state.schedules.filter((schedule) => schedule.is_past));

    const todaySchedules = computed(() => state.schedules.filter((schedule) => schedule.is_today));

    const activeSchedules = computed(() => state.schedules.filter((schedule) => schedule.is_active));

    const schedulesByCategory = computed(() => {
        return (category) => state.schedules.filter((schedule) => schedule.category === category);
    });

    const schedulesByStatus = computed(() => {
        return (status) => state.schedules.filter((schedule) => schedule.status === status);
    });

    const filteredSchedules = computed(() => {
        let filtered = [...state.schedules];

        if (state.filters.doctor_id) {
            filtered = filtered.filter((schedule) => schedule.id_doctors === state.filters.doctor_id);
        }

        // The date range filtering will primarily be handled by the API when fetchSchedules is called.
        // Client-side filtering for date range is not needed here if API handles it.

        if (state.filters.category) {
            filtered = filtered.filter((schedule) => schedule.category === state.filters.category);
        }

        if (state.filters.status) {
            filtered = filtered.filter((schedule) => schedule.status === state.filters.status);
        }

        if (state.filters.upcoming) {
            filtered = filtered.filter((schedule) => schedule.is_future || schedule.is_today);
        }

        if (state.filters.past) {
            filtered = filtered.filter((schedule) => schedule.is_past);
        }

        if (state.filters.today) {
            filtered = filtered.filter((schedule) => schedule.is_today);
        }

        return filtered;
    });

    // Getters for Absences
    const allAbsences = computed(() => state.absences);

    const upcomingAbsences = computed(() => state.absences.filter((absence) => absence.is_future || absence.is_today));

    const activeAbsences = computed(() => state.absences.filter((absence) => absence.is_active_now));

    // Getters for Medical Shifts
    const allMedicalShifts = computed(() => state.medicalShifts);

    const getShiftByCode = computed(() => {
        return (code) => state.medicalShifts.find((shift) => shift.code === code);
    });

    // Actions for Schedules
    const fetchSchedules = async (params = {}) => {
        state.isLoading = true;
        try {
            const requestParams = { ...state.filters, ...params };
            console.log('📅 [fetchSchedules] Solicitando horarios con parámetros:', requestParams);

            const response = await schedulesApi.getAll(requestParams);

            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);

                console.log('🔍 [fetchSchedules] Procesando respuesta:', {
                    rawResponse: response,
                    extractedData: data,
                    isArray: Array.isArray(data),
                    hasDataProperty: data?.data !== undefined,
                    dataContent: data?.data,
                    isDataArray: Array.isArray(data?.data),
                    finalSchedules: Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.data?.data) ? data.data.data : []))
                });

                // Handle different response structures:
                // 1. Direct array: data = [...]
                // 2. Wrapped in data: data = { data: [...] }
                // 3. Paginated: data = { data: { data: [...], pagination: {...} } }
                if (Array.isArray(data)) {
                    state.schedules = data;
                } else if (Array.isArray(data?.data)) {
                    state.schedules = data.data;
                } else if (Array.isArray(data?.data?.data)) {
                    // Paginated response
                    state.schedules = data.data.data;
                } else {
                    state.schedules = [];
                }

                console.log('✅ [fetchSchedules] Horarios recibidos del backend:', {
                    total: state.schedules.length,
                    schedules: state.schedules,
                    filters: state.filters
                });

                state.lastFetch = Date.now();
                return response;
            }
            throw response;
        } catch (error) {
            console.error('❌ [fetchSchedules] Error al cargar horarios:', error);
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const fetchScheduleById = async (id) => {
        state.isLoading = true;
        try {
            const response = await schedulesApi.getById(id);
            if (apiUtils.isSuccess(response)) {
                state.currentSchedule = apiUtils.getData(response);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const createSchedule = async (scheduleData) => {
        state.isSaving = true;
        try {
            const response = await schedulesApi.create(scheduleData);
            if (apiUtils.isSuccess(response)) {
                const newSchedule = apiUtils.getData(response);
                state.schedules.push(newSchedule);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const updateSchedule = async (id, scheduleData) => {
        state.isSaving = true;
        try {
            const response = await schedulesApi.update(id, scheduleData);
            if (apiUtils.isSuccess(response)) {
                const updatedSchedule = apiUtils.getData(response);
                const index = state.schedules.findIndex((s) => s.id === id);
                if (index !== -1) {
                    state.schedules[index] = { ...state.schedules[index], ...updatedSchedule };
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

    const deleteSchedule = async (id) => {
        state.isDeleting = true;
        try {
            const response = await schedulesApi.delete(id);
            if (apiUtils.isSuccess(response)) {
                const index = state.schedules.findIndex((s) => s.id === id);
                if (index !== -1) {
                    state.schedules.splice(index, 1);
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

    const confirmSchedule = async (id) => {
        return await updateSchedule(id, { status: 'confirmed' });
    };

    const cancelSchedule = async (id, reason) => {
        return await schedulesApi.cancel(id, reason);
    };

    const completeSchedule = async (id) => {
        return await updateSchedule(id, { status: 'completed' });
    };

    const createScheduleBatch = async (schedulesArray) => {
        state.isSaving = true;
        try {
            const response = await schedulesApi.createBatch(schedulesArray);

            console.log('📦 [createScheduleBatch] Respuesta del backend:', {
                response,
                isSuccess: apiUtils.isSuccess(response),
                data: apiUtils.getData(response)
            });

            // Special handling for batch endpoint which doesn't follow standard format
            // It returns { successful, failed, total, message } directly without "success" field
            let results;

            if (apiUtils.isSuccess(response)) {
                // Standard format: { success: true, data: { successful, failed, ... } }
                results = apiUtils.getData(response);
            } else if (response && typeof response === 'object' &&
                       'successful' in response && 'failed' in response && 'total' in response) {
                // Batch format: { successful, failed, total, message } (no "success" field)
                results = response;
                console.log('⚠️ [createScheduleBatch] Respuesta en formato batch (sin "success" field)');
            } else {
                // Unknown format - throw error
                throw response;
            }

            console.log('✅ [createScheduleBatch] Resultados extraídos:', {
                results,
                hasSuccessful: !!results.successful,
                hasFailed: !!results.failed,
                successfulLength: results.successful?.length,
                failedLength: results.failed?.length
            });

            // Add successful schedules to state
            if (results.successful && results.successful.length > 0) {
                results.successful.forEach(item => {
                    if (item.schedule) {
                        state.schedules.push(item.schedule);
                    }
                });
            }

            return results;
        } catch (error) {
            console.error('❌ [createScheduleBatch] Error:', error);
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const fetchScheduleStats = async () => {
        state.isLoading = true;
        try {
            const response = await schedulesApi.getStats();
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

    // Actions for Absences
    const fetchAbsences = async (params = {}) => {
        state.isLoading = true;
        try {
            const response = await absencesApi.getAll(params);
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.absences = Array.isArray(data) ? data : data.data || [];
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isLoading = false;
        }
    };

    const createAbsence = async (absenceData) => {
        state.isSaving = true;
        try {
            const response = await absencesApi.create(absenceData);
            if (apiUtils.isSuccess(response)) {
                const newAbsence = apiUtils.getData(response);
                state.absences.push(newAbsence);
                return response;
            }
            throw response;
        } catch (error) {
            throw error;
        } finally {
            state.isSaving = false;
        }
    };

    const updateAbsence = async (id, absenceData) => {
        state.isSaving = true;
        try {
            const response = await absencesApi.update(id, absenceData);
            if (apiUtils.isSuccess(response)) {
                const updatedAbsence = apiUtils.getData(response);
                const index = state.absences.findIndex((a) => a.id === id);
                if (index !== -1) {
                    state.absences[index] = { ...state.absences[index], ...updatedAbsence };
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

    const deleteAbsence = async (id) => {
        state.isDeleting = true;
        try {
            const response = await absencesApi.delete(id);
            if (apiUtils.isSuccess(response)) {
                const index = state.absences.findIndex((a) => a.id === id);
                if (index !== -1) {
                    state.absences.splice(index, 1);
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

    const fetchAbsenceStats = async () => {
        state.isLoading = true;
        try {
            const response = await absencesApi.getStats();
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

    // Actions for Medical Shifts
    const fetchMedicalShifts = async () => {
        state.isLoading = true;
        try {
            const response = await shiftsApi.getAll();
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.medicalShifts = Array.isArray(data) ? data : data.data || [];
                return response;
            }
            throw response;
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
            doctor_id: null,
            date: null,
            category: null,
            status: null,
            upcoming: false,
            past: false,
            today: false
        };
    };

    return {
        state,
        // Schedules
        allSchedules,
        upcomingSchedules,
        pastSchedules,
        todaySchedules,
        activeSchedules,
        schedulesByCategory,
        schedulesByStatus,
        filteredSchedules,
        fetchSchedules,
        fetchScheduleById,
        createSchedule,
        createScheduleBatch,
        updateSchedule,
        deleteSchedule,
        confirmSchedule,
        cancelSchedule,
        completeSchedule,
        fetchScheduleStats,
        // Absences
        allAbsences,
        upcomingAbsences,
        activeAbsences,
        fetchAbsences,
        createAbsence,
        updateAbsence,
        deleteAbsence,
        fetchAbsenceStats,
        // Medical Shifts
        allMedicalShifts,
        getShiftByCode,
        fetchMedicalShifts,
        // Filters
        setFilter,
        clearFilters
    };
});
