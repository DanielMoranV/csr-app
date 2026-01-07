import TariffService from '@/services/TariffService';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';

/**
 * Composable para gestión de tarifarios generales
 */
export function useGeneralTariffs() {
    const toast = useToast();
    const tariffs = ref([]);
    const loading = ref(false);
    const filters = ref({
        grouper: null,
        control_group: null,
        search: ''
    });

    const loadTariffs = async () => {
        loading.value = true;
        try {
            tariffs.value = await TariffService.getGeneralTariffs(filters.value);
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar los tarifarios',
                life: 3000
            });
            console.error('Error loading tariffs:', error);
        } finally {
            loading.value = false;
        }
    };

    const importTariffs = async (file) => {
        loading.value = true;
        try {
            const result = await TariffService.importGeneralTariffs(file);

            toast.add({
                severity: 'success',
                summary: 'Importación Exitosa',
                detail: `Creados: ${result.data.created}, Actualizados: ${result.data.updated}, Omitidos: ${result.data.skipped}`,
                life: 5000
            });

            // Recargar tarifarios
            await loadTariffs();

            return result;
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Error en Importación',
                detail: error.response?.data?.message || 'Error al importar el archivo',
                life: 5000
            });
            throw error;
        } finally {
            loading.value = false;
        }
    };

    return {
        tariffs,
        loading,
        filters,
        loadTariffs,
        importTariffs
    };
}

/**
 * Composable para gestión de tarifarios de médicos
 */
export function useDoctorTariffs() {
    const toast = useToast();
    const tariffs = ref([]);
    const loading = ref(false);
    const filters = ref({
        doctor_id: null,
        doctor_code: null,
        tariff_code: null,
        search: ''
    });

    const loadTariffs = async () => {
        loading.value = true;
        try {
            tariffs.value = await TariffService.getDoctorTariffs(filters.value);
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar los tarifarios de médicos',
                life: 3000
            });
            console.error('Error loading doctor tariffs:', error);
        } finally {
            loading.value = false;
        }
    };

    const importTariffs = async (file) => {
        loading.value = true;
        try {
            const result = await TariffService.importDoctorTariffs(file);

            toast.add({
                severity: 'success',
                summary: 'Importación Exitosa',
                detail: `Creados: ${result.data.created}, Actualizados: ${result.data.updated}, Médicos no encontrados: ${result.data.doctors_not_found}`,
                life: 5000
            });

            // Recargar tarifarios
            await loadTariffs();

            return result;
        } catch (error) {
            toast.add({
                severity: 'error',
                summary: 'Error en Importación',
                detail: error.response?.data?.message || 'Error al importar el archivo',
                life: 5000
            });
            throw error;
        } finally {
            loading.value = false;
        }
    };

    return {
        tariffs,
        loading,
        filters,
        loadTariffs,
        importTariffs
    };
}
