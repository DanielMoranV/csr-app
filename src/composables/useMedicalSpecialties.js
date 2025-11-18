import { useMedicalSpecialtiesStore } from '@/store/medicalSpecialtiesStore';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';
import { apiUtils } from '@/api/axios.js';

export function useMedicalSpecialties() {
    const specialtiesStore = useMedicalSpecialtiesStore();
    const toast = useToast();

    const operationInProgress = ref(false);

    // Store state
    const specialties = computed(() => specialtiesStore.filteredSpecialties);
    const allSpecialties = computed(() => specialtiesStore.allSpecialties);
    const popularSpecialties = computed(() => specialtiesStore.popularSpecialties);
    const specialtiesWithDoctors = computed(() => specialtiesStore.specialtiesWithDoctors);
    const currentSpecialty = computed(() => specialtiesStore.state.currentSpecialty);
    const stats = computed(() => specialtiesStore.state.stats);
    const isLoading = computed(() => specialtiesStore.state.isLoading);
    const isSaving = computed(() => specialtiesStore.state.isSaving);

    // Actions
    const fetchSpecialties = async (params = {}) => {
        try {
            await specialtiesStore.fetchSpecialties(params);
        } catch (error) {
            handleError(error, 'Error al cargar las especialidades');
        }
    };

    const fetchSpecialtyById = async (id) => {
        try {
            return await specialtiesStore.fetchSpecialtyById(id);
        } catch (error) {
            handleError(error, 'Error al cargar la especialidad');
            throw error;
        }
    };

    const createSpecialty = async (specialtyData) => {
        operationInProgress.value = true;
        try {
            const response = await specialtiesStore.createSpecialty(specialtyData);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Especialidad creada correctamente',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al crear la especialidad');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const updateSpecialty = async (id, specialtyData) => {
        operationInProgress.value = true;
        try {
            const response = await specialtiesStore.updateSpecialty(id, specialtyData);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Especialidad actualizada correctamente',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al actualizar la especialidad');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const deleteSpecialty = async (id) => {
        operationInProgress.value = true;
        try {
            await specialtiesStore.deleteSpecialty(id);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Especialidad eliminada correctamente',
                life: 3000
            });
        } catch (error) {
            handleError(error, 'Error al eliminar la especialidad');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const searchSpecialties = async (query) => {
        try {
            return await specialtiesStore.searchSpecialties(query);
        } catch (error) {
            handleError(error, 'Error al buscar especialidades');
            throw error;
        }
    };

    const fetchStats = async () => {
        try {
            return await specialtiesStore.fetchStats();
        } catch (error) {
            handleError(error, 'Error al cargar estadísticas');
            throw error;
        }
    };

    const attachDoctor = async (specialtyId, doctorId) => {
        operationInProgress.value = true;
        try {
            const response = await specialtiesStore.attachDoctor(specialtyId, doctorId);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Médico asociado a la especialidad correctamente',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al asociar el médico');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const detachDoctor = async (specialtyId, doctorId) => {
        operationInProgress.value = true;
        try {
            const response = await specialtiesStore.detachDoctor(specialtyId, doctorId);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Médico desasociado de la especialidad correctamente',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al desasociar el médico');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const syncDoctors = async (specialtyId, doctorIds) => {
        operationInProgress.value = true;
        try {
            const response = await specialtiesStore.syncDoctors(specialtyId, doctorIds);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Médicos sincronizados correctamente',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al sincronizar los médicos');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    // Filters
    const setGlobalFilter = (value) => specialtiesStore.setFilter('global', value);
    const setPopularFilter = (value) => specialtiesStore.setFilter('popular', value);
    const setMinDoctorsFilter = (value) => specialtiesStore.setFilter('min_doctors', value);
    const clearFilters = () => specialtiesStore.clearFilters();

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

        // Verificar conflictos específicos
        if (error?.response?.status === 422) {
            const message = error?.response?.data?.message;

            if (message && message.includes('médicos asociados')) {
                toast.add({
                    severity: 'error',
                    summary: 'Operación no permitida',
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
        specialties,
        allSpecialties,
        popularSpecialties,
        specialtiesWithDoctors,
        currentSpecialty,
        stats,
        isLoading,
        isSaving,
        operationInProgress,
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
        setGlobalFilter,
        setPopularFilter,
        setMinDoctorsFilter,
        clearFilters
    };
}
