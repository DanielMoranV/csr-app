import TariffService from '@/services/TariffService';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';

/**
 * Composable para consulta de tarifarios (Admision)
 */
export function useTariffConsultation() {
    const toast = useToast();
    const tariffs = ref([]);
    const isLoading = ref(false);
    const error = ref(null);
    const searchQuery = ref('');

    /**
     * Cargar todos los tarifarios
     */
    const fetchTariffs = async () => {
        isLoading.value = true;
        error.value = null;

        try {
            const result = await TariffService.getTariffs();

            if (result.success) {
                tariffs.value = result.data;
                return result.data;
            } else {
                throw new Error(result.message || 'Error al obtener tarifarios');
            }
        } catch (err) {
            error.value = err.message;
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: err.response?.data?.message || 'No se pudieron cargar los tarifarios',
                life: 3000
            });
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Buscar tarifarios por término
     */
    const searchTariffs = async (query) => {
        if (!query || query.trim() === '') {
            return fetchTariffs();
        }

        isLoading.value = true;
        error.value = null;

        try {
            const result = await TariffService.searchTariffs(query);

            if (result.success) {
                tariffs.value = result.data;
                return result.data;
            } else {
                throw new Error(result.message || 'Error al buscar tarifarios');
            }
        } catch (err) {
            error.value = err.message;
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: err.response?.data?.message || 'Error al buscar tarifarios',
                life: 3000
            });
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Filtrar solo tarifarios generales
     */
    const generalTariffs = computed(() => {
        return tariffs.value.filter((t) => !t.is_personalized);
    });

    /**
     * Filtrar solo tarifarios personalizados
     */
    const personalizedTariffs = computed(() => {
        return tariffs.value.filter((t) => t.is_personalized);
    });

    /**
     * Agrupar tarifarios por código
     */
    const tariffsByCode = computed(() => {
        const grouped = {};
        tariffs.value.forEach((tariff) => {
            if (!grouped[tariff.code]) {
                grouped[tariff.code] = [];
            }
            grouped[tariff.code].push(tariff);
        });
        return grouped;
    });

    /**
     * Agrupar tarifarios personalizados por doctor
     */
    const tariffsByDoctor = computed(() => {
        const grouped = {};
        tariffs.value
            .filter((t) => t.is_personalized)
            .forEach((tariff) => {
                if (!grouped[tariff.doctor_code]) {
                    grouped[tariff.doctor_code] = {
                        doctor_name: tariff.doctor_name,
                        doctor_code: tariff.doctor_code,
                        tariffs: []
                    };
                }
                grouped[tariff.doctor_code].tariffs.push(tariff);
            });
        return grouped;
    });

    return {
        tariffs,
        isLoading,
        error,
        searchQuery,
        fetchTariffs,
        searchTariffs,
        generalTariffs,
        personalizedTariffs,
        tariffsByCode,
        tariffsByDoctor
    };
}
