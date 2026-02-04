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

/**
 * Composable para sincronización de tarifarios desde Sisclin
 */
export function useTariffSync() {
    const toast = useToast();
    const isLoading = ref(false);
    const syncStats = ref(null);
    const error = ref(null);

    const syncTariffs = async () => {
        isLoading.value = true;
        error.value = null;
        syncStats.value = null;

        try {
            const result = await TariffService.syncTariffs();

            if (result.success) {
                syncStats.value = result.data;

                toast.add({
                    severity: 'success',
                    summary: 'Sincronización Exitosa',
                    detail: result.message,
                    life: 5000
                });

                // Advertir sobre registros huérfanos si existen
                const orphanedCount = result.data.doctor_tariffs?.orphaned_records?.length || 0;
                if (orphanedCount > 0) {
                    toast.add({
                        severity: 'warn',
                        summary: 'Registros Ignorados',
                        detail: `Se ignoraron ${orphanedCount} registros huérfanos. Revisa los logs para más detalles.`,
                        life: 5000
                    });
                }

                return result.data;
            } else {
                throw new Error(result.message || 'Error al sincronizar');
            }
        } catch (err) {
            error.value = err.message;

            const errorMessage = err.response?.data?.message || err.message || 'Error al sincronizar tarifarios';

            toast.add({
                severity: 'error',
                summary: 'Error en Sincronización',
                detail: errorMessage,
                life: 5000
            });

            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        syncStats,
        error,
        syncTariffs
    };
}
