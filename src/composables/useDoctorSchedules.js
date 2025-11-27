import { apiUtils } from '@/api/axios.js';
import { useDoctorSchedulesStore } from '@/store/doctorSchedulesStore';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';

export function useDoctorSchedules() {
    const schedulesStore = useDoctorSchedulesStore();
    const toast = useToast();

    const operationInProgress = ref(false);

    // Store state - Schedules
    const schedules = computed(() => schedulesStore.filteredSchedules);
    const allSchedules = computed(() => schedulesStore.allSchedules);
    const upcomingSchedules = computed(() => schedulesStore.upcomingSchedules);
    const todaySchedules = computed(() => schedulesStore.todaySchedules);
    const activeSchedules = computed(() => schedulesStore.activeSchedules);
    const currentSchedule = computed(() => schedulesStore.state.currentSchedule);
    const isLoading = computed(() => schedulesStore.state.isLoading);
    const isSaving = computed(() => schedulesStore.state.isSaving);

    // Store state - Absences
    const absences = computed(() => schedulesStore.allAbsences);
    const upcomingAbsences = computed(() => schedulesStore.upcomingAbsences);
    const activeAbsences = computed(() => schedulesStore.activeAbsences);

    // Store state - Medical Shifts
    const medicalShifts = computed(() => schedulesStore.allMedicalShifts);

    // Actions - Schedules
    const fetchSchedules = async (params = {}) => {
        try {
            await schedulesStore.fetchSchedules(params);
        } catch (error) {
            handleError(error, 'Error al cargar los horarios');
        }
    };

    const fetchScheduleById = async (id) => {
        try {
            return await schedulesStore.fetchScheduleById(id);
        } catch (error) {
            handleError(error, 'Error al cargar el horario');
            throw error;
        }
    };

    const createSchedule = async (scheduleData) => {
        operationInProgress.value = true;
        try {
            const response = await schedulesStore.createSchedule(scheduleData);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Horario creado correctamente',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al crear el horario');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const updateSchedule = async (id, scheduleData) => {
        operationInProgress.value = true;
        try {
            const response = await schedulesStore.updateSchedule(id, scheduleData);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Horario actualizado correctamente',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al actualizar el horario');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const deleteSchedule = async (id) => {
        operationInProgress.value = true;
        try {
            await schedulesStore.deleteSchedule(id);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Horario eliminado correctamente',
                life: 3000
            });
        } catch (error) {
            handleError(error, 'Error al eliminar el horario');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const confirmSchedule = async (id) => {
        operationInProgress.value = true;
        try {
            await schedulesStore.confirmSchedule(id);
            toast.add({
                severity: 'info',
                summary: 'Confirmado',
                detail: 'Horario confirmado correctamente',
                life: 3000
            });
        } catch (error) {
            handleError(error, 'Error al confirmar el horario');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const cancelSchedule = async (id, reason) => {
        operationInProgress.value = true;
        try {
            await schedulesStore.cancelSchedule(id, reason);
            toast.add({
                severity: 'warn',
                summary: 'Cancelado',
                detail: 'Horario cancelado correctamente',
                life: 3000
            });
        } catch (error) {
            handleError(error, 'Error al cancelar el horario');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const completeSchedule = async (id) => {
        operationInProgress.value = true;
        try {
            await schedulesStore.completeSchedule(id);
            toast.add({
                severity: 'success',
                summary: 'Completado',
                detail: 'Horario marcado como completado',
                life: 3000
            });
        } catch (error) {
            handleError(error, 'Error al completar el horario');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const createScheduleBatch = async (schedulesArray) => {
        operationInProgress.value = true;
        try {
            // Validate input
            if (!Array.isArray(schedulesArray) || schedulesArray.length === 0) {
                throw new Error('Debe proporcionar al menos un horario para crear');
            }

            const response = await schedulesStore.createScheduleBatch(schedulesArray);

            console.log('🎯 [useDoctorSchedules] Respuesta del store:', {
                response,
                type: typeof response,
                keys: response ? Object.keys(response) : null,
                successful: response?.successful,
                failed: response?.failed,
                total: response?.total
            });

            // Response structure: { successful: [], failed: [], total: number }
            const results = response;

            // Show success toast
            if (results.successful && results.successful.length > 0) {
                const successRate = Math.round((results.successful.length / results.total) * 100);
                toast.add({
                    severity: 'success',
                    summary: 'Horarios Creados',
                    detail: `${results.successful.length} de ${results.total} horarios creados exitosamente (${successRate}%)`,
                    life: 5000
                });
            }

            // Show warning toast if there are failures (but not all failed)
            if (results.failed && results.failed.length > 0 && results.failed.length < results.total) {
                toast.add({
                    severity: 'warn',
                    summary: 'Algunos Horarios Fallaron',
                    detail: `${results.failed.length} de ${results.total} horarios no pudieron ser creados. Revise el detalle en el diálogo.`,
                    life: 7000
                });
            }

            // Show complete failure toast if all failed
            if (results.failed && results.failed.length === results.total) {
                toast.add({
                    severity: 'error',
                    summary: 'Error en Creación Masiva',
                    detail: 'Ningún horario pudo ser creado. Verifique los datos y conflictos.',
                    life: 7000
                });
            }

            // Refresh schedules after batch creation (only if some succeeded)
            if (results.successful && results.successful.length > 0) {
                await fetchSchedules();
            }

            return results;
        } catch (error) {
            // Check if it's a validation error (422)
            if (error?.response?.status === 422) {
                handleError(error, 'Error de validación en los datos de horarios');
            } else {
                handleError(error, 'Error en creación masiva de horarios');
            }
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const fetchScheduleStats = async () => {
        try {
            return await schedulesStore.fetchScheduleStats();
        } catch (error) {
            handleError(error, 'Error al cargar estadísticas de horarios');
            throw error;
        }
    };

    // Actions - Absences
    const fetchAbsences = async (params = {}) => {
        try {
            await schedulesStore.fetchAbsences(params);
        } catch (error) {
            handleError(error, 'Error al cargar las ausencias');
        }
    };

    const createAbsence = async (absenceData) => {
        operationInProgress.value = true;
        try {
            const response = await schedulesStore.createAbsence(absenceData);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Ausencia registrada correctamente',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al registrar la ausencia');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const updateAbsence = async (id, absenceData) => {
        operationInProgress.value = true;
        try {
            const response = await schedulesStore.updateAbsence(id, absenceData);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Ausencia actualizada correctamente',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al actualizar la ausencia');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const deleteAbsence = async (id) => {
        operationInProgress.value = true;
        try {
            await schedulesStore.deleteAbsence(id);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Ausencia eliminada correctamente',
                life: 3000
            });
        } catch (error) {
            handleError(error, 'Error al eliminar la ausencia');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const fetchAbsenceStats = async () => {
        try {
            return await schedulesStore.fetchAbsenceStats();
        } catch (error) {
            handleError(error, 'Error al cargar estadísticas de ausencias');
            throw error;
        }
    };

    // Actions - Medical Shifts
    const fetchMedicalShifts = async () => {
        try {
            await schedulesStore.fetchMedicalShifts();
        } catch (error) {
            handleError(error, 'Error al cargar los turnos médicos');
        }
    };

    // Filters
    const setDoctorFilter = (value) => schedulesStore.setFilter('doctor_id', value);
    const setSpecialtyFilter = (value) => schedulesStore.setFilter('id_medical_specialty', value); // Specialty filter
    const setStartDateFilter = (value) => schedulesStore.setFilter('start_date', value); // New filter
    const setEndDateFilter = (value) => schedulesStore.setFilter('end_date', value);   // New filter

    const clearFilters = () => {
        schedulesStore.setFilter('doctor_id', null);
        schedulesStore.setFilter('id_medical_specialty', null);
        schedulesStore.setFilter('start_date', null);
        schedulesStore.setFilter('end_date', null);
        // Do not clear other filters (upcoming, past, today) as they are used elsewhere
    };

    // Error handler
    const handleError = (error, defaultMessage) => {
        // Verificar si hay errores de validación específicos (422)
        if (error?.response?.status === 422 && error?.response?.data?.errors) {
            const errors = error.response.data.errors;

            // Mostrar cada error de validación
            Object.keys(errors).forEach((field) => {
                const fieldErrors = errors[field];
                if (Array.isArray(fieldErrors)) {
                    fieldErrors.forEach((errorMsg) => {
                        toast.add({
                            severity: 'warn',
                            summary: 'Error de validación',
                            detail: errorMsg,
                            life: 5000
                        });
                    });
                }
            });
            return;
        }

        // Verificar conflictos de horarios o ausencias
        if (error?.response?.status === 422) {
            const message = error?.response?.data?.message;

            if (message && (message.includes('conflicto') || message.includes('superpone'))) {
                toast.add({
                    severity: 'error',
                    summary: 'Conflicto de horario',
                    detail: message,
                    life: 7000
                });
                return;
            }
        }

        // Manejo de errores genéricos
        const message = apiUtils.getMessage(error) || defaultMessage;
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
            life: 5000
        });
    };

    return {
        // Schedules
        schedules,
        allSchedules,
        upcomingSchedules,
        todaySchedules,
        activeSchedules,
        currentSchedule,
        isLoading,
        isSaving,
        operationInProgress,
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
        absences,
        upcomingAbsences,
        activeAbsences,
        fetchAbsences,
        createAbsence,
        updateAbsence,
        deleteAbsence,
        fetchAbsenceStats,
        // Medical Shifts
        medicalShifts,
        fetchMedicalShifts,
        // Filters
        setDoctorFilter,
        setSpecialtyFilter, // Specialty filter
        setStartDateFilter, // New filter
        setEndDateFilter,   // New filter
        clearFilters
    };
}
