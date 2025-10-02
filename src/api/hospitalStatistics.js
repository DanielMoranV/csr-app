import axios from './axios';

/**
 * Hospital Statistics API
 * Sistema de estadísticas hospitalarias con datos de ocupación, doctores, aseguradoras y diagnósticos
 */
export const hospitalStatistics = {
    /**
     * Obtiene dashboard completo con todas las estadísticas
     * @param {Object} params - { start_date?: string, end_date?: string }
     * @returns {Promise} Dashboard con ocupación, hospitalizaciones, top doctores, aseguradoras y diagnósticos
     */
    getDashboard: (params = {}) => axios.get('/hospital-statistics/dashboard', { params }),

    /**
     * Obtiene estadísticas de ocupación de camas
     * @param {Object} params - { start_date: string, end_date: string } (REQUERIDO)
     * @returns {Promise} Datos de ocupación con resumen y datos diarios
     */
    getOccupancy: (params) => axios.get('/hospital-statistics/occupancy', { params }),

    /**
     * Obtiene ocupación mensual
     * @param {Object} params - { year: number, month: number } (REQUERIDO)
     * @returns {Promise} Datos de ocupación del mes completo
     */
    getMonthlyOccupancy: (params) => axios.get('/hospital-statistics/occupancy/monthly', { params }),

    /**
     * Obtiene estadísticas de hospitalizaciones
     * @param {Object} params - { start_date: string, end_date: string } (REQUERIDO)
     * @returns {Promise} Análisis de estancias, tipos de atención y altas médicas
     */
    getHospitalizations: (params) => axios.get('/hospital-statistics/hospitalizations', { params }),

    /**
     * Obtiene estadísticas por doctor
     * @param {Object} params - { start_date: string, end_date: string } (REQUERIDO)
     * @returns {Promise} Carga de trabajo y métricas de cada médico
     */
    getDoctorStats: (params) => axios.get('/hospital-statistics/doctors', { params }),

    /**
     * Obtiene estadísticas por aseguradora
     * @param {Object} params - { start_date: string, end_date: string } (REQUERIDO)
     * @returns {Promise} Distribución de pacientes por seguro médico
     */
    getInsuranceStats: (params) => axios.get('/hospital-statistics/insurances', { params }),

    /**
     * Obtiene top diagnósticos CIE-10
     * @param {Object} params - { start_date: string, end_date: string, limit?: number }
     * @returns {Promise} Diagnósticos más frecuentes del período
     */
    getTopDiagnoses: (params) => axios.get('/hospital-statistics/diagnoses', { params }),

    /**
     * Genera estadísticas manualmente para un período
     * @param {Object} data - { start_date: string, end_date: string } (REQUERIDO)
     * @returns {Promise} Confirmación de generación
     */
    generateStats: (data) => axios.post('/hospital-statistics/generate', data)
};
