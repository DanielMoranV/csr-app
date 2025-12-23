/**
 * Composable para gestionar filtros de Honorarios Médicos
 */

import { DEFAULT_FILTERS, TYPE_OPTIONS } from '@/utils/medicalFees/constants';
import { ref, watch } from 'vue';

export function useMedicalFeesFilters() {
    // Estado de filtros
    const selectedSpecialty = ref(null);
    const selectedMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
    const selectedDoctor = ref(null);
    const selectedType = ref(null);

    // Filtros de DataTable
    const filters = ref({ ...DEFAULT_FILTERS });

    // Opciones de tipo
    const typeOptions = TYPE_OPTIONS;

    // Estados de UI
    const showSummaryTable = ref(false);
    const showBulkApprovalDialog = ref(false);
    const showRecalculateDialog = ref(false);

    /**
     * Resetea todos los filtros a sus valores por defecto
     */
    function resetFilters() {
        selectedSpecialty.value = null;
        selectedDoctor.value = null;
        selectedType.value = null;
        filters.value = { ...DEFAULT_FILTERS };
    }

    /**
     * Resetea solo el filtro de médico
     */
    function resetDoctorFilter() {
        selectedDoctor.value = null;
    }

    /**
     * Valida si un médico está disponible en las opciones actuales
     * @param {Array} doctorOptions - Opciones de médicos disponibles
     * @returns {boolean} - True si el médico seleccionado es válido
     */
    function validateSelectedDoctor(doctorOptions) {
        if (!selectedDoctor.value) return true;
        return doctorOptions.some((opt) => opt.value === selectedDoctor.value);
    }

    /**
     * Limpia el filtro de médico si no es válido
     * @param {Array} doctorOptions - Opciones de médicos disponibles
     */
    function cleanInvalidDoctorFilter(doctorOptions) {
        if (!validateSelectedDoctor(doctorOptions)) {
            resetDoctorFilter();
        }
    }

    // Watch para limpiar el filtro de médico cuando cambia la especialidad
    watch(selectedSpecialty, () => {
        // La validación se hará en el componente principal
        // ya que necesita acceso a doctorOptions
    });

    return {
        // Estado
        selectedSpecialty,
        selectedMonth,
        selectedDoctor,
        selectedType,
        filters,
        typeOptions,
        showSummaryTable,
        showBulkApprovalDialog,
        showRecalculateDialog,

        // Métodos
        resetFilters,
        resetDoctorFilter,
        validateSelectedDoctor,
        cleanInvalidDoctorFilter
    };
}
