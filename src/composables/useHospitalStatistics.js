import { hospitalStatistics } from '@/api';
import { computed, ref } from 'vue';

export function useHospitalStatistics() {
    const loading = ref(false);
    const error = ref(null);
    const dashboard = ref(null);
    const occupancy = ref(null);
    const hospitalizations = ref(null);
    const doctors = ref(null);
    const insurances = ref(null);
    const diagnoses = ref(null);

    // Obtener rango de fechas por defecto (últimos 30 días)
    const getDefaultDateRange = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        return {
            start_date: start.toISOString().split('T')[0],
            end_date: end.toISOString().split('T')[0]
        };
    };

    // Fetch dashboard completo
    const fetchDashboard = async (params = {}) => {
        loading.value = true;
        error.value = null;

        try {
            const dateRange = params.start_date && params.end_date ? params : getDefaultDateRange();

            // 🔍 DEBUG: Log detallado del request
            console.log('🔍 [DASHBOARD DEBUG] Parámetros recibidos:', params);
            console.log('🔍 [DASHBOARD DEBUG] Date range a enviar:', dateRange);
            console.log('🔍 [DASHBOARD DEBUG] URL completa:', `${import.meta.env.VITE_API_URL}/hospital-statistics/dashboard?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`);

            const response = await hospitalStatistics.getDashboard(dateRange);

            // 🔍 DEBUG: Log de la respuesta
            console.log('✅ [DASHBOARD DEBUG] Respuesta recibida:', response);
            console.log('📊 [DASHBOARD DEBUG] Datos del dashboard:', response.data);

            if (response.success) {
                dashboard.value = response.data;
                return response.data;
            } else {
                throw new Error(response.message || 'Error al obtener dashboard');
            }
        } catch (err) {
            // Manejo silencioso del error - el endpoint puede no estar disponible aún
            error.value = err.message || 'Error al cargar estadísticas';

            // El interceptor de axios devuelve el error en formato estandarizado
            console.warn('[HospitalStats] API not available:', {
                message: err.message,
                status: err.status || 'N/A',
                errorType: err.errors?.type || 'Unknown',
                isConnectionError: err.errors?.is_connection_error || false
            });

            dashboard.value = null;
            return null;
        } finally {
            loading.value = false;
        }
    };

    // Fetch estadísticas de ocupación
    const fetchOccupancy = async (params) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await hospitalStatistics.getOccupancy(params);

            if (response.success) {
                occupancy.value = response.data;
                return response.data;
            } else {
                throw new Error(response.message || 'Error al obtener ocupación');
            }
        } catch (err) {
            error.value = err.message || 'Error al cargar ocupación';
            console.error('Error fetching occupancy:', err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    // Fetch ocupación mensual
    const fetchMonthlyOccupancy = async (year, month) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await hospitalStatistics.getMonthlyOccupancy({ year, month });

            if (response.success) {
                occupancy.value = response.data;
                return response.data;
            } else {
                throw new Error(response.message || 'Error al obtener ocupación mensual');
            }
        } catch (err) {
            error.value = err.message || 'Error al cargar ocupación mensual';
            console.error('Error fetching monthly occupancy:', err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    // Fetch estadísticas de hospitalizaciones
    const fetchHospitalizations = async (params) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await hospitalStatistics.getHospitalizations(params);

            if (response.success) {
                hospitalizations.value = response.data;
                return response.data;
            } else {
                throw new Error(response.message || 'Error al obtener hospitalizaciones');
            }
        } catch (err) {
            error.value = err.message || 'Error al cargar hospitalizaciones';
            console.error('Error fetching hospitalizations:', err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    // Fetch estadísticas de doctores
    const fetchDoctorStats = async (params) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await hospitalStatistics.getDoctorStats(params);

            if (response.success) {
                doctors.value = response.data;
                return response.data;
            } else {
                throw new Error(response.message || 'Error al obtener estadísticas de doctores');
            }
        } catch (err) {
            error.value = err.message || 'Error al cargar estadísticas de doctores';
            console.error('Error fetching doctor stats:', err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    // Fetch estadísticas de aseguradoras
    const fetchInsuranceStats = async (params) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await hospitalStatistics.getInsuranceStats(params);

            if (response.success) {
                insurances.value = response.data;
                return response.data;
            } else {
                throw new Error(response.message || 'Error al obtener estadísticas de aseguradoras');
            }
        } catch (err) {
            error.value = err.message || 'Error al cargar estadísticas de aseguradoras';
            console.error('Error fetching insurance stats:', err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    // Fetch top diagnósticos
    const fetchTopDiagnoses = async (params) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await hospitalStatistics.getTopDiagnoses(params);

            if (response.success) {
                diagnoses.value = response.data;
                return response.data;
            } else {
                throw new Error(response.message || 'Error al obtener diagnósticos');
            }
        } catch (err) {
            error.value = err.message || 'Error al cargar diagnósticos';
            console.error('Error fetching diagnoses:', err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    // Generar estadísticas manualmente
    const generateStats = async (params) => {
        loading.value = true;
        error.value = null;

        try {
            const response = await hospitalStatistics.generateStats(params);

            if (response.success) {
                return response;
            } else {
                throw new Error(response.message || 'Error al generar estadísticas');
            }
        } catch (err) {
            error.value = err.message || 'Error al generar estadísticas';
            console.error('Error generating stats:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

    // Computed properties
    const hasData = computed(() => dashboard.value !== null);

    const occupancyRate = computed(() => {
        return dashboard.value?.occupancy?.summary?.overall_occupancy_rate || 0;
    });

    const currentlyActive = computed(() => {
        return dashboard.value?.hospitalizations?.currently_active || 0;
    });

    const averageStayDays = computed(() => {
        return dashboard.value?.hospitalizations?.average_stay_days || 0;
    });

    const totalAdmissions = computed(() => {
        return dashboard.value?.occupancy?.summary?.total_admissions || 0;
    });

    return {
        // State
        loading,
        error,
        dashboard,
        occupancy,
        hospitalizations,
        doctors,
        insurances,
        diagnoses,

        // Methods
        fetchDashboard,
        fetchOccupancy,
        fetchMonthlyOccupancy,
        fetchHospitalizations,
        fetchDoctorStats,
        fetchInsuranceStats,
        fetchTopDiagnoses,
        generateStats,
        getDefaultDateRange,

        // Computed
        hasData,
        occupancyRate,
        currentlyActive,
        averageStayDays,
        totalAdmissions
    };
}
