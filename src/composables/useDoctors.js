import { useDoctorsStore } from '@/store/doctorsStore';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';
import { apiUtils } from '@/api/axios.js';

export function useDoctors() {
    const doctorsStore = useDoctorsStore();
    const toast = useToast();

    const operationInProgress = ref(false);

    // Store state
    const doctors = computed(() => doctorsStore.filteredDoctors);
    const allDoctors = computed(() => doctorsStore.allDoctors);
    const currentDoctor = computed(() => doctorsStore.state.currentDoctor);
    const stats = computed(() => doctorsStore.state.stats);
    const isLoading = computed(() => doctorsStore.state.isLoading);
    const isSaving = computed(() => doctorsStore.state.isSaving);

    // Filter options
    const documentTypeOptions = computed(() => [
        { label: 'DNI', value: 'dni' },
        { label: 'CE', value: 'ce' },
        { label: 'Pasaporte', value: 'passport' }
    ]);

    const paymentPayrollOptions = computed(() => [
        { label: 'Total', value: 'total' },
        { label: 'Parcial', value: 'partial' },
        { label: 'Ninguno', value: 'none' }
    ]);

    const typeOptions = computed(() => [
        { label: 'Médico', value: 'medico' },
        { label: 'Odontólogo', value: 'odontologo' },
        { label: 'Obstetriz', value: 'obstetriz' },
        { label: 'Enfermero', value: 'enfermero' },
        { label: 'Nutricionista', value: 'nutricionista' },
        { label: 'Psicólogo', value: 'psicologo' },
        { label: 'Tecnólogo Médico', value: 'tecnologo_medico' },
        { label: 'Químico Farmacéutico', value: 'quimico_farmaceutico' },
        { label: 'Biólogo', value: 'biologo' }
    ]);

    const colegioOptions = computed(() => [
        { label: 'CMP - Colegio Médico del Perú', value: 'cmp' },
        { label: 'COP - Colegio Odontológico del Perú', value: 'cop' },
        { label: 'CQFP - Colegio Químico Farmacéutico del Perú', value: 'cqfp' },
        { label: 'CBP - Colegio de Biólogos del Perú', value: 'cbp' },
        { label: 'COBP - Colegio de Obstetras del Perú', value: 'cobp' },
        { label: 'CEP - Colegio de Enfermeros del Perú', value: 'cep' },
        { label: 'CSP - Colegio de Sociólogos del Perú', value: 'csp' },
        { label: 'CNP - Colegio de Nutricionistas del Perú', value: 'cnp' }
    ]);

    const sortOptions = computed(() => [
        { label: 'Nombre', value: 'name' },
        { label: 'Código', value: 'code' },
        { label: 'Número de Colegiatura', value: 'numero_colegiatura' },
        { label: 'Fecha de creación', value: 'created_at' }
    ]);

    // Actions
    const fetchDoctors = async (params = {}) => {
        try {
            await doctorsStore.fetchDoctors(params);
        } catch (error) {
            handleError(error, 'Error al cargar los médicos');
        }
    };

    const fetchDoctorById = async (id) => {
        try {
            return await doctorsStore.fetchDoctorById(id);
        } catch (error) {
            handleError(error, 'Error al cargar el médico');
            throw error;
        }
    };

    const fetchDoctorByCode = async (code) => {
        try {
            return await doctorsStore.fetchDoctorByCode(code);
        } catch (error) {
            handleError(error, 'Error al cargar el médico');
            throw error;
        }
    };

    const createDoctor = async (doctorData) => {
        operationInProgress.value = true;
        try {
            const response = await doctorsStore.createDoctor(doctorData);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Médico creado correctamente',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al crear el médico');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const updateDoctor = async (id, doctorData) => {
        operationInProgress.value = true;
        try {
            const response = await doctorsStore.updateDoctor(id, doctorData);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Médico actualizado correctamente',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al actualizar el médico');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const deleteDoctor = async (id) => {
        operationInProgress.value = true;
        try {
            await doctorsStore.deleteDoctor(id);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Médico eliminado correctamente',
                life: 3000
            });
        } catch (error) {
            handleError(error, 'Error al eliminar el médico');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const searchDoctors = async (query, params = {}) => {
        try {
            return await doctorsStore.searchDoctors(query, params);
        } catch (error) {
            handleError(error, 'Error al buscar médicos');
            throw error;
        }
    };

    const fetchStats = async () => {
        try {
            return await doctorsStore.fetchStats();
        } catch (error) {
            handleError(error, 'Error al cargar estadísticas');
            throw error;
        }
    };

    const linkUser = async (doctorId, userId) => {
        operationInProgress.value = true;
        try {
            const response = await doctorsStore.linkUser(doctorId, userId);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Usuario vinculado correctamente al médico',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al vincular el usuario');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const unlinkUser = async (doctorId) => {
        operationInProgress.value = true;
        try {
            const response = await doctorsStore.unlinkUser(doctorId);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Usuario desvinculado correctamente del médico',
                life: 3000
            });
            return response;
        } catch (error) {
            handleError(error, 'Error al desvincular el usuario');
            throw error;
        } finally {
            operationInProgress.value = false;
        }
    };

    const getLinkedUser = async (doctorId) => {
        try {
            return await doctorsStore.getLinkedUser(doctorId);
        } catch (error) {
            handleError(error, 'Error al obtener el usuario vinculado');
            throw error;
        }
    };

    // Filters
    const setGlobalFilter = (value) => doctorsStore.setFilter('global', value);
    const setDocumentTypeFilter = (value) => doctorsStore.setFilter('document_type', value);
    const setPaymentPayrollFilter = (value) => doctorsStore.setFilter('payment_payroll', value);
    const setActiveAttentionsFilter = (value) => doctorsStore.setFilter('with_active_attentions', value);
    const clearFilters = () => doctorsStore.clearFilters();

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

        // Verificar conflictos específicos de médicos
        if (error?.response?.status === 422) {
            const message = error?.response?.data?.message;

            if (message && message.includes('atenciones activas')) {
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
        doctors,
        allDoctors,
        currentDoctor,
        stats,
        isLoading,
        isSaving,
        operationInProgress,
        documentTypeOptions,
        paymentPayrollOptions,
        typeOptions,
        colegioOptions,
        sortOptions,
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
        setGlobalFilter,
        setDocumentTypeFilter,
        setPaymentPayrollFilter,
        setActiveAttentionsFilter,
        clearFilters
    };
}
