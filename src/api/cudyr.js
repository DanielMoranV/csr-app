import axios from './axios';

/**
 * API para gestión de evaluaciones CUDYR (Cuidados Según Dependencia y Riesgo)
 *
 * CUDYR es un sistema de clasificación de pacientes que evalúa:
 * - Dependencia: 6 dimensiones (0-18 puntos)
 * - Riesgo: 8 dimensiones (0-24 puntos)
 *
 * Genera 12 categorías finales (A1 a D3) para priorización de cuidados
 */
export const cudyr = {
    /**
     * 1. Listar evaluaciones CUDYR con filtros y paginación
     * @param {Object} params - Parámetros de filtrado
     * @param {string} params.cudyr_category - Filtrar por categoría (A1, A2, A3, B1, B2, B3, C1, C2, C3, D3)
     * @param {string} params.dependency_classification - Filtrar por dependencia (B, C, D)
     * @param {string} params.risk_classification - Filtrar por riesgo (1, 2, 3, 4)
     * @param {string} params.start_date - Fecha inicial (YYYY-MM-DD)
     * @param {string} params.end_date - Fecha final (YYYY-MM-DD)
     * @param {string} params.sort_by - Campo de ordenamiento
     * @param {string} params.sort_direction - Dirección (asc, desc)
     * @param {boolean} params.paginate - Activar paginación
     * @param {number} params.per_page - Elementos por página (max: 100)
     * @param {number} params.page - Número de página
     * @returns {Promise} Respuesta con lista de evaluaciones
     */
    list: (params = {}) => axios.get('/cudyr-evaluations', { params }),

    /**
     * 2. Crear nueva evaluación CUDYR
     * @param {Object} data - Datos de la evaluación
     * @param {number} data.id_details_attention - ID del detalle de atención (requerido, único)
     *
     * Dimensiones de Dependencia (0-3 cada una):
     * @param {number} data.dependency_mobility - Movilización
     * @param {number} data.dependency_hygiene - Higiene
     * @param {number} data.dependency_nutrition - Alimentación
     * @param {number} data.dependency_elimination - Eliminación
     * @param {number} data.dependency_psychosocial - Apoyo Psicosocial
     * @param {number} data.dependency_surveillance - Vigilancia
     *
     * Dimensiones de Riesgo (0-3 cada una):
     * @param {number} data.risk_oxygen_therapy - Oxigenoterapia
     * @param {number} data.risk_airway_management - Manejo de Vía Aérea
     * @param {number} data.risk_vital_signs - Signos Vitales
     * @param {number} data.risk_fluid_balance - Balance Hídrico
     * @param {number} data.risk_wound_care - Curaciones
     * @param {number} data.risk_invasive_devices - Elementos Invasivos
     * @param {number} data.risk_procedures - Procedimientos
     * @param {number} data.risk_medications - Medicamentos
     *
     * @param {string} data.notes - Observaciones adicionales (opcional)
     * @returns {Promise} Respuesta con evaluación creada
     */
    create: (data) => axios.post('/cudyr-evaluations', data),

    /**
     * 3. Obtener evaluación CUDYR por ID
     * @param {number} id - ID de la evaluación
     * @returns {Promise} Respuesta con datos de la evaluación
     */
    get: (id) => axios.get(`/cudyr-evaluations/${id}`),

    /**
     * 4. Actualizar evaluación CUDYR
     * @param {number} id - ID de la evaluación
     * @param {Object} data - Datos actualizados (mismo formato que create)
     * @returns {Promise} Respuesta con evaluación actualizada
     */
    update: (id, data) => axios.put(`/cudyr-evaluations/${id}`, data),

    /**
     * 5. Eliminar evaluación CUDYR
     * @param {number} id - ID de la evaluación
     * @returns {Promise} Respuesta de confirmación
     */
    delete: (id) => axios.delete(`/cudyr-evaluations/${id}`),

    /**
     * 6. Obtener evaluación por ID de detalle de atención
     * @param {number} detailId - ID del detalle de atención
     * @returns {Promise} Respuesta con evaluación asociada
     */
    getByDetail: (detailId) => axios.get(`/cudyr-evaluations/detail/${detailId}`),

    /**
     * 7. Obtener evaluaciones por ID de atención hospitalaria
     * @param {number} attentionId - ID de la atención hospitalaria
     * @param {Object} params - Parámetros opcionales
     * @param {string} params.start_date - Fecha inicial
     * @param {string} params.end_date - Fecha final
     * @returns {Promise} Respuesta con lista de evaluaciones
     */
    getByAttention: (attentionId, params = {}) => axios.get(`/cudyr-evaluations/attention/${attentionId}`, { params }),

    /**
     * 8. Filtrar evaluaciones por categoría CUDYR
     * @param {string} category - Categoría CUDYR (A1, A2, A3, B1, B2, B3, C1, C2, C3, D3)
     * @param {Object} params - Parámetros opcionales
     * @param {string} params.start_date - Fecha inicial
     * @param {string} params.end_date - Fecha final
     * @returns {Promise} Respuesta con evaluaciones filtradas
     */
    getByCategory: (category, params = {}) =>
        axios.get('/cudyr-evaluations/by-category', {
            params: { category, ...params }
        }),

    /**
     * 9. Obtener pacientes de alto riesgo
     * Retorna categorías: A1, A2, A3, B1, B2, C1
     * @param {Object} params - Parámetros opcionales
     * @param {string} params.start_date - Fecha inicial
     * @param {string} params.end_date - Fecha final
     * @returns {Promise} Respuesta con pacientes críticos
     */
    getHighRisk: (params = {}) => axios.get('/cudyr-evaluations/high-risk', { params }),

    /**
     * 10. Obtener estadísticas de evaluaciones CUDYR
     * Retorna:
     * - Total de evaluaciones
     * - Distribución por dependencia y riesgo
     * - Distribución por categorías
     * - Alertas (pacientes de alto riesgo)
     * - Actividad reciente
     * @returns {Promise} Respuesta con estadísticas
     */
    getStatistics: () => axios.get('/cudyr-evaluations/statistics'),

    /**
     * 11. Calcular CUDYR sin guardar (Preview)
     * Útil para mostrar resultado en tiempo real mientras el usuario completa el formulario
     * @param {Object} data - Datos de evaluación (mismo formato que create, excepto id_details_attention)
     * @returns {Promise} Respuesta con cálculo de categoría, dependencia y riesgo
     */
    calculate: (data) => axios.post('/cudyr-evaluations/calculate', data)
};

/**
 * Constantes y utilidades para CUDYR
 */
export const CUDYR_CONSTANTS = {
    // Categorías CUDYR
    CATEGORIES: {
        A1: { risk: 'critical', label: 'CRÍTICO', color: 'danger', icon: '🔴' },
        A2: { risk: 'critical', label: 'CRÍTICO', color: 'danger', icon: '🔴' },
        A3: { risk: 'high', label: 'ALTO', color: 'warning', icon: '🟠' },
        B1: { risk: 'critical', label: 'CRÍTICO', color: 'danger', icon: '🔴' },
        B2: { risk: 'critical', label: 'CRÍTICO', color: 'danger', icon: '🔴' },
        B3: { risk: 'medium', label: 'MEDIO', color: 'info', icon: '🟡' },
        C1: { risk: 'critical', label: 'CRÍTICO', color: 'danger', icon: '🔴' },
        C2: { risk: 'medium', label: 'MEDIO', color: 'info', icon: '🟡' },
        C3: { risk: 'low', label: 'BAJO', color: 'success', icon: '🟢' },
        D3: { risk: 'low', label: 'BAJO', color: 'success', icon: '🟢' }
    },

    // Clasificaciones de dependencia
    DEPENDENCY: {
        B: { range: '13-18', label: 'Dependencia Total' },
        C: { range: '7-12', label: 'Dependencia Parcial' },
        D: { range: '0-6', label: 'Autosuficiencia' }
    },

    // Clasificaciones de riesgo
    RISK: {
        1: { label: 'Máximo Riesgo' },
        2: { label: 'Alto Riesgo' },
        3: { label: 'Mediano Riesgo' },
        4: { label: 'Bajo Riesgo' }
    },

    // Descripciones de dimensiones de dependencia
    DEPENDENCY_DIMENSIONS: {
        mobility: {
            label: 'Movilización',
            descriptions: ['Deambula sin ayuda, se moviliza solo en cama', 'Se levanta y deambula con ayuda', 'Es levantado a silla, requiere cambio de posición 4-9 veces/día', 'No se levanta, requiere cambio de posición 10 o más veces/día']
        },
        hygiene: {
            label: 'Higiene',
            descriptions: ['Se baña y viste sin ayuda', 'Participa en su higiene con supervisión', 'Requiere cambio de ropa 1-2 veces/día', 'Requiere cambio de ropa 3 o más veces/día']
        },
        nutrition: {
            label: 'Alimentación',
            descriptions: ['Se alimenta sin ayuda', 'Se alimenta con ayuda y supervisión', 'Alimentación oral que le es administrada', 'Alimentación parenteral total/parcial o enteral permanente']
        },
        elimination: {
            label: 'Eliminación',
            descriptions: ['Usa colectores sin ayuda o usa WC', 'Usuario y familia realizan recolección con ayuda', 'Se le entregan/colocan colectores (chata, pato)', 'Sonda, prótesis, diálisis, colectores adhesivos o pañales']
        },
        psychosocial: {
            label: 'Apoyo Psicosocial',
            descriptions: ['Requiere menos de 5 minutos de apoyo durante el turno', 'Requiere entre 5-14 minutos de apoyo', 'Requiere entre 15-30 minutos de apoyo', 'Requiere más de 30 minutos de apoyo durante el turno']
        },
        surveillance: {
            label: 'Vigilancia',
            descriptions: ['Consciente, orientado, autónomo', 'Consciente con inestabilidad de la marcha', 'Consciente pero intranquilo, con riesgo de caída', 'Alteración de consciencia/conducta o alto riesgo de caída']
        }
    },

    // Descripciones de dimensiones de riesgo
    RISK_DIMENSIONS: {
        oxygen_therapy: {
            label: 'Oxigenoterapia',
            descriptions: ['No requiere oxígeno adicional', 'Oxígeno por cánula nasal', 'Oxígeno por mascarilla simple o con reservorio', 'Ventilación mecánica o FiO2 >40%']
        },
        airway_management: {
            label: 'Manejo de Vía Aérea',
            descriptions: [
                'No requiere apoyo ventilatorio adicional',
                'Vía natural, apoyo kinésico 1 vez/día',
                'Vía natural con 1-3 aspiraciones y/o apoyo kinésico 2-3 veces/día',
                'Vía aérea artificial o 4+ aspiraciones con apoyo kinésico >4 veces/día'
            ]
        },
        vital_signs: {
            label: 'Signos Vitales',
            descriptions: ['No requiere medición', 'Medición cada 8-12 horas', 'Medición cada 4 horas', 'Medición de 2+ parámetros cada 2 horas o menos']
        },
        fluid_balance: {
            label: 'Balance Hídrico',
            descriptions: ['No requiere balance hídrico', 'Balance 1 vez (cada 24 horas)', 'Balance 2-5 veces (cada 12, 8, 6 o 5 horas)', 'Balance 6 veces o más (cada 4 horas o más frecuente)']
        },
        wound_care: {
            label: 'Curaciones',
            descriptions: ['No requiere curaciones', '1 curación simple', '1-2 curaciones de heridas complejas', '3 o más curaciones de heridas complejas en 24 horas']
        },
        invasive_devices: {
            label: 'Elementos Invasivos',
            descriptions: ['Sin elementos invasivos', '1 vía venosa periférica', '1-2 elementos invasivos o 2+ vías venosas periféricas', '3 o más elementos invasivos (catéteres, sondas, drenajes)']
        },
        procedures: {
            label: 'Procedimientos',
            descriptions: ['No requiere procedimientos', 'Procedimientos menores', '1-2 procedimientos de enfermería invasivos', '3+ procedimientos enfermería o 1+ procedimiento médico invasivo']
        },
        medications: {
            label: 'Medicamentos',
            descriptions: ['Sin tratamiento farmacológico o solo VO', 'Medicación EV ocasional o IM/SC', 'Medicación EV intermitente (3 o más dosis/día)', 'Medicación EV continua (vasoactivos, sedación, quimioterapia)']
        }
    }
};

/**
 * Utilidades para trabajar con evaluaciones CUDYR
 */
export const cudyrUtils = {
    /**
     * Obtiene la configuración de una categoría CUDYR
     */
    getCategoryConfig: (category) => {
        return (
            CUDYR_CONSTANTS.CATEGORIES[category] || {
                risk: 'unknown',
                label: 'DESCONOCIDO',
                color: 'secondary',
                icon: '⚪'
            }
        );
    },

    /**
     * Obtiene la severidad de PrimeVue según la categoría
     */
    getCategorySeverity: (category) => {
        const config = cudyrUtils.getCategoryConfig(category);
        return config.color;
    },

    /**
     * Verifica si una categoría es crítica
     */
    isCritical: (category) => {
        return ['A1', 'A2', 'B1', 'B2', 'C1'].includes(category);
    },

    /**
     * Verifica si una categoría es de alto riesgo
     */
    isHighRisk: (category) => {
        return ['A1', 'A2', 'A3', 'B1', 'B2', 'C1'].includes(category);
    },

    /**
     * Valida que todas las dimensiones estén en rango 0-3
     */
    validateDimensions: (data) => {
        const errors = {};

        // Validar dimensiones de dependencia
        const dependencyFields = ['dependency_mobility', 'dependency_hygiene', 'dependency_nutrition', 'dependency_elimination', 'dependency_psychosocial', 'dependency_surveillance'];

        // Validar dimensiones de riesgo
        const riskFields = ['risk_oxygen_therapy', 'risk_airway_management', 'risk_vital_signs', 'risk_fluid_balance', 'risk_wound_care', 'risk_invasive_devices', 'risk_procedures', 'risk_medications'];

        [...dependencyFields, ...riskFields].forEach((field) => {
            const value = data[field];
            if (value === undefined || value === null) {
                errors[field] = ['Este campo es requerido'];
            } else if (!Number.isInteger(value) || value < 0 || value > 3) {
                errors[field] = ['El valor debe ser un número entero entre 0 y 3'];
            }
        });

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    /**
     * Formatea una fecha para el API
     */
    formatDate: (date) => {
        if (!date) return null;
        if (typeof date === 'string') return date;
        if (date instanceof Date) {
            return date.toISOString().split('T')[0];
        }
        return null;
    }
};
