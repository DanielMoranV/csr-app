import { cudyr, cudyrUtils } from '@/api/cudyr';
import { apiUtils } from '@/api/axios';
import { computed, reactive, ref, watch } from 'vue';

/**
 * Composable para gestión de evaluaciones CUDYR
 * Maneja la creación, edición, visualización y cálculo de evaluaciones CUDYR
 */
export function useCudyr(detailsAttentionId = null) {
    // Estado reactivo
    const state = reactive({
        evaluation: null,
        isLoading: false,
        isSaving: false,
        isCalculating: false,
        error: null,
        validationErrors: {}
    });

    // Datos del formulario
    const formData = reactive({
        id_details_attention: detailsAttentionId,
        // Dimensiones de dependencia (0-3)
        dependency_mobility: 0,
        dependency_hygiene: 0,
        dependency_nutrition: 0,
        dependency_elimination: 0,
        dependency_psychosocial: 0,
        dependency_surveillance: 0,
        // Dimensiones de riesgo (0-3)
        risk_oxygen_therapy: 0,
        risk_airway_management: 0,
        risk_vital_signs: 0,
        risk_fluid_balance: 0,
        risk_wound_care: 0,
        risk_invasive_devices: 0,
        risk_procedures: 0,
        risk_medications: 0,
        // Notas
        notes: ''
    });

    // Preview del cálculo CUDYR
    const preview = ref(null);

    // Debounce timer para cálculo
    let calculateTimer = null;

    /**
     * Cargar evaluación existente por ID de detalle de atención
     */
    const loadByDetail = async (detailId) => {
        state.isLoading = true;
        state.error = null;

        try {
            const response = await cudyr.getByDetail(detailId);
            console.log('[useCudyr] Response from getByDetail:', response);

            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.evaluation = data;

                // Pre-llenar formulario si hay evaluación existente
                if (data) {
                    populateForm(data);
                }
            } else {
                // No hay evaluación para este detalle (es válido)
                state.evaluation = null;
            }
        } catch (error) {
            // Error 404 es esperado si no hay evaluación
            if (error.status !== 404) {
                state.error = apiUtils.getMessage(error);
                console.error('[useCudyr] Error loading evaluation:', error);
            }
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Cargar evaluación por ID
     */
    const loadById = async (id) => {
        state.isLoading = true;
        state.error = null;

        try {
            const response = await cudyr.get(id);

            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.evaluation = data;
                populateForm(data);
            } else {
                state.error = apiUtils.getMessage(response);
            }
        } catch (error) {
            state.error = apiUtils.getMessage(error);
            console.error('[useCudyr] Error loading evaluation by id:', error);
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Poblar formulario con datos de evaluación existente
     */
    const populateForm = (evaluation) => {
        if (!evaluation) return;

        formData.id_details_attention = evaluation.id_details_attention;

        // Verificar si los datos vienen en estructura anidada (del backend) o plana
        if (evaluation.dependency && evaluation.dependency.dimensions) {
            // Estructura anidada del backend
            formData.dependency_mobility = evaluation.dependency.dimensions.mobility || 0;
            formData.dependency_hygiene = evaluation.dependency.dimensions.hygiene || 0;
            formData.dependency_nutrition = evaluation.dependency.dimensions.nutrition || 0;
            formData.dependency_elimination = evaluation.dependency.dimensions.elimination || 0;
            formData.dependency_psychosocial = evaluation.dependency.dimensions.psychosocial || 0;
            formData.dependency_surveillance = evaluation.dependency.dimensions.surveillance || 0;
        } else {
            // Estructura plana
            formData.dependency_mobility = evaluation.dependency_mobility || 0;
            formData.dependency_hygiene = evaluation.dependency_hygiene || 0;
            formData.dependency_nutrition = evaluation.dependency_nutrition || 0;
            formData.dependency_elimination = evaluation.dependency_elimination || 0;
            formData.dependency_psychosocial = evaluation.dependency_psychosocial || 0;
            formData.dependency_surveillance = evaluation.dependency_surveillance || 0;
        }

        // Verificar si los datos vienen en estructura anidada (del backend) o plana
        if (evaluation.risk && evaluation.risk.dimensions) {
            // Estructura anidada del backend
            formData.risk_oxygen_therapy = evaluation.risk.dimensions.oxygen_therapy || 0;
            formData.risk_airway_management = evaluation.risk.dimensions.airway_management || 0;
            formData.risk_vital_signs = evaluation.risk.dimensions.vital_signs || 0;
            formData.risk_fluid_balance = evaluation.risk.dimensions.fluid_balance || 0;
            formData.risk_wound_care = evaluation.risk.dimensions.wound_care || 0;
            formData.risk_invasive_devices = evaluation.risk.dimensions.invasive_devices || 0;
            formData.risk_procedures = evaluation.risk.dimensions.procedures || 0;
            formData.risk_medications = evaluation.risk.dimensions.medications || 0;
        } else {
            // Estructura plana
            formData.risk_oxygen_therapy = evaluation.risk_oxygen_therapy || 0;
            formData.risk_airway_management = evaluation.risk_airway_management || 0;
            formData.risk_vital_signs = evaluation.risk_vital_signs || 0;
            formData.risk_fluid_balance = evaluation.risk_fluid_balance || 0;
            formData.risk_wound_care = evaluation.risk_wound_care || 0;
            formData.risk_invasive_devices = evaluation.risk_invasive_devices || 0;
            formData.risk_procedures = evaluation.risk_procedures || 0;
            formData.risk_medications = evaluation.risk_medications || 0;
        }

        formData.notes = evaluation.notes || '';
    };

    /**
     * Crear nueva evaluación
     */
    const create = async () => {
        state.isSaving = true;
        state.error = null;
        state.validationErrors = {};

        try {
            // Validar dimensiones localmente
            const validation = cudyrUtils.validateDimensions(formData);
            if (!validation.isValid) {
                state.validationErrors = validation.errors;
                state.error = 'Por favor corrija los errores del formulario';
                return { success: false, errors: validation.errors };
            }

            const response = await cudyr.create(formData);

            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.evaluation = data;
                return { success: true, data };
            } else {
                state.error = apiUtils.getMessage(response);
                state.validationErrors = apiUtils.getValidationErrors(response);
                return { success: false, error: state.error };
            }
        } catch (error) {
            state.error = apiUtils.getMessage(error);
            state.validationErrors = apiUtils.getValidationErrors(error);
            console.error('[useCudyr] Error creating evaluation:', error);
            return { success: false, error: state.error };
        } finally {
            state.isSaving = false;
        }
    };

    /**
     * Actualizar evaluación existente
     */
    const update = async (id) => {
        state.isSaving = true;
        state.error = null;
        state.validationErrors = {};

        try {
            // Validar dimensiones localmente
            const validation = cudyrUtils.validateDimensions(formData);
            if (!validation.isValid) {
                state.validationErrors = validation.errors;
                state.error = 'Por favor corrija los errores del formulario';
                return { success: false, errors: validation.errors };
            }

            const response = await cudyr.update(id, formData);

            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.evaluation = data;
                return { success: true, data };
            } else {
                state.error = apiUtils.getMessage(response);
                state.validationErrors = apiUtils.getValidationErrors(response);
                return { success: false, error: state.error };
            }
        } catch (error) {
            state.error = apiUtils.getMessage(error);
            state.validationErrors = apiUtils.getValidationErrors(error);
            console.error('[useCudyr] Error updating evaluation:', error);
            return { success: false, error: state.error };
        } finally {
            state.isSaving = false;
        }
    };

    /**
     * Eliminar evaluación
     */
    const deleteEvaluation = async (id) => {
        state.isSaving = true;
        state.error = null;

        try {
            const response = await cudyr.delete(id);

            if (apiUtils.isSuccess(response)) {
                state.evaluation = null;
                resetForm();
                return { success: true };
            } else {
                state.error = apiUtils.getMessage(response);
                return { success: false, error: state.error };
            }
        } catch (error) {
            state.error = apiUtils.getMessage(error);
            console.error('[useCudyr] Error deleting evaluation:', error);
            return { success: false, error: state.error };
        } finally {
            state.isSaving = false;
        }
    };

    /**
     * Calcular preview sin guardar (para feedback en tiempo real)
     */
    const calculatePreview = async () => {
        // Cancelar cálculo anterior pendiente
        if (calculateTimer) {
            clearTimeout(calculateTimer);
        }

        // Debounce de 300ms para no hacer demasiadas peticiones
        calculateTimer = setTimeout(async () => {
            state.isCalculating = true;

            try {
                const response = await cudyr.calculate(formData);

                if (apiUtils.isSuccess(response)) {
                    preview.value = apiUtils.getData(response);
                } else {
                    preview.value = null;
                }
            } catch (error) {
                preview.value = null;
                console.error('[useCudyr] Error calculating preview:', error);
            } finally {
                state.isCalculating = false;
            }
        }, 300);
    };

    /**
     * Resetear formulario
     */
    const resetForm = () => {
        formData.dependency_mobility = 0;
        formData.dependency_hygiene = 0;
        formData.dependency_nutrition = 0;
        formData.dependency_elimination = 0;
        formData.dependency_psychosocial = 0;
        formData.dependency_surveillance = 0;
        formData.risk_oxygen_therapy = 0;
        formData.risk_airway_management = 0;
        formData.risk_vital_signs = 0;
        formData.risk_fluid_balance = 0;
        formData.risk_wound_care = 0;
        formData.risk_invasive_devices = 0;
        formData.risk_procedures = 0;
        formData.risk_medications = 0;
        formData.notes = '';
        preview.value = null;
        state.validationErrors = {};
    };

    /**
     * Actualizar una dimensión del formulario
     */
    const updateDimension = (field, value) => {
        formData[field] = value;
        // Recalcular preview automáticamente
        calculatePreview();
    };

    // Computed properties
    const hasEvaluation = computed(() => state.evaluation !== null);

    const isEditMode = computed(() => hasEvaluation.value && state.evaluation?.id);

    const canSubmit = computed(() => {
        return formData.id_details_attention && !state.isSaving && Object.keys(state.validationErrors).length === 0;
    });

    const categoryConfig = computed(() => {
        if (preview.value?.cudyr_category) {
            return cudyrUtils.getCategoryConfig(preview.value.cudyr_category);
        }
        if (state.evaluation?.cudyr_category) {
            return cudyrUtils.getCategoryConfig(state.evaluation.cudyr_category);
        }
        return null;
    });

    const isCriticalPatient = computed(() => {
        const category = preview.value?.cudyr_category || state.evaluation?.cudyr_category;
        return category ? cudyrUtils.isCritical(category) : false;
    });

    const isHighRiskPatient = computed(() => {
        const category = preview.value?.cudyr_category || state.evaluation?.cudyr_category;
        return category ? cudyrUtils.isHighRisk(category) : false;
    });

    // Watch para cargar evaluación cuando cambia el detailsAttentionId
    watch(
        () => formData.id_details_attention,
        (newId) => {
            if (newId) {
                loadByDetail(newId);
            }
        },
        { immediate: true }
    );

    return {
        // Estado
        state,
        formData,
        preview,

        // Acciones
        loadByDetail,
        loadById,
        create,
        update,
        deleteEvaluation,
        calculatePreview,
        resetForm,
        updateDimension,
        populateForm,

        // Computed
        hasEvaluation,
        isEditMode,
        canSubmit,
        categoryConfig,
        isCriticalPatient,
        isHighRiskPatient
    };
}

/**
 * Composable para listar y filtrar evaluaciones CUDYR
 */
export function useCudyrList() {
    const state = reactive({
        evaluations: [],
        isLoading: false,
        error: null,
        pagination: null
    });

    const filters = reactive({
        cudyr_category: null,
        dependency_classification: null,
        risk_classification: null,
        start_date: null,
        end_date: null,
        sort_by: 'evaluated_at',
        sort_direction: 'desc',
        paginate: false,
        per_page: 15,
        page: 1
    });

    /**
     * Cargar lista de evaluaciones
     */
    const load = async (params = {}) => {
        state.isLoading = true;
        state.error = null;

        try {
            const requestParams = { ...filters, ...params };
            const response = await cudyr.list(requestParams);

            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);

                if (requestParams.paginate && data.data) {
                    state.evaluations = data.data;
                    state.pagination = data.pagination;
                } else {
                    state.evaluations = data.data || data;
                    state.pagination = null;
                }
            } else {
                state.error = apiUtils.getMessage(response);
            }
        } catch (error) {
            state.error = apiUtils.getMessage(error);
            console.error('[useCudyrList] Error loading evaluations:', error);
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Cargar pacientes de alto riesgo
     */
    const loadHighRisk = async (params = {}) => {
        state.isLoading = true;
        state.error = null;

        try {
            const response = await cudyr.getHighRisk(params);

            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.evaluations = data.data || data;
            } else {
                state.error = apiUtils.getMessage(response);
            }
        } catch (error) {
            state.error = apiUtils.getMessage(error);
            console.error('[useCudyrList] Error loading high risk patients:', error);
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * Aplicar filtros
     */
    const applyFilters = (newFilters) => {
        Object.assign(filters, newFilters);
        load();
    };

    /**
     * Resetear filtros
     */
    const resetFilters = () => {
        filters.cudyr_category = null;
        filters.dependency_classification = null;
        filters.risk_classification = null;
        filters.start_date = null;
        filters.end_date = null;
        filters.page = 1;
        load();
    };

    return {
        state,
        filters,
        load,
        loadHighRisk,
        applyFilters,
        resetFilters
    };
}

/**
 * Composable para estadísticas CUDYR
 */
export function useCudyrStatistics() {
    const state = reactive({
        statistics: null,
        isLoading: false,
        error: null
    });

    /**
     * Cargar estadísticas
     */
    const load = async () => {
        state.isLoading = true;
        state.error = null;

        try {
            const response = await cudyr.getStatistics();

            if (apiUtils.isSuccess(response)) {
                state.statistics = apiUtils.getData(response);
            } else {
                state.error = apiUtils.getMessage(response);
            }
        } catch (error) {
            state.error = apiUtils.getMessage(error);
            console.error('[useCudyrStatistics] Error loading statistics:', error);
        } finally {
            state.isLoading = false;
        }
    };

    // Computed properties para estadísticas
    const totalEvaluations = computed(() => state.statistics?.total_evaluations || 0);

    const highRiskCount = computed(() => state.statistics?.alerts?.high_risk_patients || 0);

    const criticalDependencyCount = computed(() => state.statistics?.alerts?.critical_dependency || 0);

    const averageDependencyScore = computed(() => state.statistics?.dependency?.average_score || 0);

    const averageRiskScore = computed(() => state.statistics?.risk?.average_score || 0);

    return {
        state,
        load,
        totalEvaluations,
        highRiskCount,
        criticalDependencyCount,
        averageDependencyScore,
        averageRiskScore
    };
}
