import { apiUtils } from '@/api/axios.js';
import { sisclin as sisclinApi } from '@/api/index.js';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

export const useSisclinStore = defineStore('sisclin', () => {
    const state = reactive({
        bulkImportResult: null,
        isImporting: false,
        importHistory: [],
        validationErrors: [],
        lastImportSummary: null
    });

    const isLoading = computed(() => state.isImporting);
    const hasImportResult = computed(() => state.bulkImportResult !== null);
    const lastImportStats = computed(() => state.lastImportSummary);

    const validateHospitalizationData = (hospitalization, index = 0) => {
        const errors = {};
        const errorPrefix = `hospitalizations.${index}`;

        if (!hospitalization.num_doc?.trim()) {
            errors[`${errorPrefix}.num_doc`] = ['El número de documento es obligatorio'];
        } else if (hospitalization.num_doc.trim().length < 2 || hospitalization.num_doc.trim().length > 10) {
            errors[`${errorPrefix}.num_doc`] = ['El número de documento debe tener entre 2 y 10 caracteres'];
        }

        if (!hospitalization.fec_doc?.trim()) {
            errors[`${errorPrefix}.fec_doc`] = ['La fecha del documento es obligatoria'];
        } else if (!/^\d{2}-\d{2}-\d{4}$/.test(hospitalization.fec_doc.trim())) {
            errors[`${errorPrefix}.fec_doc`] = ['La fecha debe tener formato dd-mm-yyyy'];
        }

        if (!hospitalization.hi_doc?.trim()) {
            errors[`${errorPrefix}.hi_doc`] = ['La hora del documento es obligatoria'];
        } else if (!/^\d{2}:\d{2}$/.test(hospitalization.hi_doc.trim())) {
            errors[`${errorPrefix}.hi_doc`] = ['La hora debe tener formato HH:MM'];
        }

        if (!hospitalization.ta_doc?.trim()) {
            errors[`${errorPrefix}.ta_doc`] = ['El tipo de atención es obligatorio'];
        } else if (hospitalization.ta_doc.trim().length < 2 || hospitalization.ta_doc.trim().length > 20) {
            errors[`${errorPrefix}.ta_doc`] = ['El tipo de atención debe tener entre 2 y 20 caracteres'];
        }

        if (!hospitalization.ota_doc?.trim()) {
            errors[`${errorPrefix}.ota_doc`] = ['El origen del tipo de atención es obligatorio'];
        } else if (hospitalization.ota_doc.trim().length < 2 || hospitalization.ota_doc.trim().length > 50) {
            errors[`${errorPrefix}.ota_doc`] = ['El origen del tipo de atención debe tener entre 2 y 50 caracteres'];
        }

        if (!hospitalization.ph_doc?.trim()) {
            errors[`${errorPrefix}.ph_doc`] = ['El procedimiento hospitalario es obligatorio'];
        } else if (hospitalization.ph_doc.trim().length < 2 || hospitalization.ph_doc.trim().length > 50) {
            errors[`${errorPrefix}.ph_doc`] = ['El procedimiento hospitalario debe tener entre 2 y 50 caracteres'];
        }

        if (!hospitalization.cam_doc?.trim()) {
            errors[`${errorPrefix}.cam_doc`] = ['La cama es obligatoria'];
        } else if (hospitalization.cam_doc.trim().length < 2 || hospitalization.cam_doc.trim().length > 50) {
            errors[`${errorPrefix}.cam_doc`] = ['La cama debe tener entre 2 y 50 caracteres'];
        }

        if (!hospitalization.fing_doc?.trim()) {
            errors[`${errorPrefix}.fing_doc`] = ['La fecha de ingreso es obligatoria'];
        } else if (!/^\d{2}-\d{2}-\d{4}$/.test(hospitalization.fing_doc.trim())) {
            errors[`${errorPrefix}.fing_doc`] = ['La fecha de ingreso debe tener formato dd-mm-yyyy'];
        }

        if (!hospitalization.hip_doc?.trim()) {
            errors[`${errorPrefix}.hip_doc`] = ['La hora de ingreso es obligatoria'];
        } else if (!/^\d{2}:\d{2}$/.test(hospitalization.hip_doc.trim())) {
            errors[`${errorPrefix}.hip_doc`] = ['La hora de ingreso debe tener formato HH:MM'];
        }

        // fsal_doc es opcional según la API
        if (hospitalization.fsal_doc?.trim() && !/^\d{2}-\d{2}-\d{4}$/.test(hospitalization.fsal_doc.trim())) {
            errors[`${errorPrefix}.fsal_doc`] = ['La fecha de salida debe tener formato dd-mm-yyyy'];
        }

        // hs_doc es opcional según la API
        if (hospitalization.hs_doc?.trim() && !/^\d{2}:\d{2}$/.test(hospitalization.hs_doc.trim())) {
            errors[`${errorPrefix}.hs_doc`] = ['La hora de salida debe tener formato HH:MM'];
        }

        // tipegr es opcional según la API
        if (hospitalization.tipegr?.trim() && (hospitalization.tipegr.trim().length < 2 || hospitalization.tipegr.trim().length > 50)) {
            errors[`${errorPrefix}.tipegr`] = ['El tipo de egreso debe tener entre 2 y 50 caracteres'];
        }

        // cod_dx es opcional según la API
        if (hospitalization.cod_dx?.trim() && (hospitalization.cod_dx.trim().length < 2 || hospitalization.cod_dx.trim().length > 10)) {
            errors[`${errorPrefix}.cod_dx`] = ['El código de diagnóstico debe tener entre 2 y 10 caracteres'];
        }

        // cod1_dx es opcional según la API
        if (hospitalization.cod1_dx?.trim() && (hospitalization.cod1_dx.trim().length < 2 || hospitalization.cod1_dx.trim().length > 10)) {
            errors[`${errorPrefix}.cod1_dx`] = ['El código de diagnóstico 1 debe tener entre 2 y 10 caracteres'];
        }

        // cod2_dx es opcional según la API
        if (hospitalization.cod2_dx?.trim() && (hospitalization.cod2_dx.trim().length < 2 || hospitalization.cod2_dx.trim().length > 10)) {
            errors[`${errorPrefix}.cod2_dx`] = ['El código de diagnóstico 2 debe tener entre 2 y 10 caracteres'];
        }

        // cod3_dx es opcional según la API
        if (hospitalization.cod3_dx?.trim() && (hospitalization.cod3_dx.trim().length < 2 || hospitalization.cod3_dx.trim().length > 10)) {
            errors[`${errorPrefix}.cod3_dx`] = ['El código de diagnóstico 3 debe tener entre 2 y 10 caracteres'];
        }

        // obs_doc es opcional según la API
        if (hospitalization.obs_doc?.trim() && (hospitalization.obs_doc.trim().length < 2 || hospitalization.obs_doc.trim().length > 255)) {
            errors[`${errorPrefix}.obs_doc`] = ['Las observaciones deben tener entre 2 y 255 caracteres'];
        }

        if (!hospitalization.nom_pac?.trim()) {
            errors[`${errorPrefix}.nom_pac`] = ['El nombre del paciente es obligatorio'];
        } else if (hospitalization.nom_pac.trim().length < 2 || hospitalization.nom_pac.trim().length > 100) {
            errors[`${errorPrefix}.nom_pac`] = ['El nombre del paciente debe tener entre 2 y 100 caracteres'];
        }

        if (!hospitalization.cod_pac?.trim()) {
            errors[`${errorPrefix}.cod_pac`] = ['El código del paciente es obligatorio'];
        } else if (hospitalization.cod_pac.trim().length < 2 || hospitalization.cod_pac.trim().length > 10) {
            errors[`${errorPrefix}.cod_pac`] = ['El código del paciente debe tener entre 2 y 10 caracteres'];
        }

        if (!hospitalization.tdi_pac?.trim()) {
            errors[`${errorPrefix}.tdi_pac`] = ['El tipo de documento de identidad es obligatorio'];
        } else if (hospitalization.tdi_pac.trim().length < 2 || hospitalization.tdi_pac.trim().length > 10) {
            errors[`${errorPrefix}.tdi_pac`] = ['El tipo de documento de identidad debe tener entre 2 y 10 caracteres'];
        }

        if (!hospitalization.sex_pac?.trim()) {
            errors[`${errorPrefix}.sex_pac`] = ['El sexo del paciente es obligatorio'];
        } else if (hospitalization.sex_pac.trim().length < 1 || hospitalization.sex_pac.trim().length > 10) {
            errors[`${errorPrefix}.sex_pac`] = ['El sexo del paciente debe tener entre 1 y 10 caracteres'];
        }

        if (!hospitalization.dni_pac?.trim()) {
            errors[`${errorPrefix}.dni_pac`] = ['El DNI del paciente es obligatorio'];
        } else if (hospitalization.dni_pac.trim().length < 2 || hospitalization.dni_pac.trim().length > 10) {
            errors[`${errorPrefix}.dni_pac`] = ['El DNI del paciente debe tener entre 2 y 10 caracteres'];
        }

        // fnac_pac es opcional según la API
        if (hospitalization.fnac_pac?.trim() && !/^\d{2}-\d{2}-\d{4}$/.test(hospitalization.fnac_pac.trim())) {
            errors[`${errorPrefix}.fnac_pac`] = ['La fecha de nacimiento debe tener formato dd-mm-yyyy'];
        }

        if (!hospitalization.cod_ser?.trim()) {
            errors[`${errorPrefix}.cod_ser`] = ['El código del médico es obligatorio'];
        } else if (hospitalization.cod_ser.trim().length < 2 || hospitalization.cod_ser.trim().length > 10) {
            errors[`${errorPrefix}.cod_ser`] = ['El código del médico debe tener entre 2 y 10 caracteres'];
        }

        if (!hospitalization.nom_ser?.trim()) {
            errors[`${errorPrefix}.nom_ser`] = ['El nombre del médico es obligatorio'];
        } else if (hospitalization.nom_ser.trim().length < 2 || hospitalization.nom_ser.trim().length > 100) {
            errors[`${errorPrefix}.nom_ser`] = ['El nombre del médico debe tener entre 2 y 100 caracteres'];
        }

        if (!hospitalization.id_cia?.trim()) {
            errors[`${errorPrefix}.id_cia`] = ['El ID de la aseguradora es obligatorio'];
        } else if (hospitalization.id_cia.trim().length < 1 || hospitalization.id_cia.trim().length > 10) {
            errors[`${errorPrefix}.id_cia`] = ['El ID de la aseguradora debe tener entre 1 y 10 caracteres'];
        }

        if (!hospitalization.nom_cia?.trim()) {
            errors[`${errorPrefix}.nom_cia`] = ['El nombre de la aseguradora es obligatorio'];
        } else if (hospitalization.nom_cia.trim().length < 2 || hospitalization.nom_cia.trim().length > 100) {
            errors[`${errorPrefix}.nom_cia`] = ['El nombre de la aseguradora debe tener entre 2 y 100 caracteres'];
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };

    const validateBulkData = (data) => {
        const errors = {};

        if (!data.hospitalizations) {
            errors.hospitalizations = ['El campo hospitalizations es obligatorio'];
            return { isValid: false, errors };
        }

        if (!Array.isArray(data.hospitalizations)) {
            errors.hospitalizations = ['El campo hospitalizations debe ser un array'];
            return { isValid: false, errors };
        }

        if (data.hospitalizations.length === 0) {
            errors.hospitalizations = ['Debe proporcionar al menos una hospitalización'];
            return { isValid: false, errors };
        }

        if (data.hospitalizations.length > 1000) {
            errors['hospitalizations.max'] = ['No se pueden procesar más de 1000 hospitalizaciones a la vez'];
            return { isValid: false, errors };
        }

        const allErrors = {};
        let hasErrors = false;

        data.hospitalizations.forEach((hospitalization, index) => {
            const validation = validateHospitalizationData(hospitalization, index);
            if (!validation.isValid) {
                hasErrors = true;
                Object.assign(allErrors, validation.errors);
            }
        });

        return {
            isValid: !hasErrors,
            errors: allErrors
        };
    };

    const bulkImportHospitalizations = async (data) => {
        const validation = validateBulkData(data);
        if (!validation.isValid) {
            state.validationErrors = validation.errors;
            throw {
                success: false,
                message: 'Los datos proporcionados no son válidos.',
                errors: validation.errors
            };
        }

        state.isImporting = true;
        state.validationErrors = [];
        state.bulkImportResult = null;

        try {
            const response = await sisclinApi.bulkImportHospitalizations(data);

            if (apiUtils.isSuccess(response)) {
                const result = apiUtils.getData(response);
                state.bulkImportResult = result;
                state.lastImportSummary = result.summary;

                state.importHistory.unshift({
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    summary: result.summary,
                    successful: result.successful || [],
                    failed: result.failed || []
                });

                return response;
            } else {
                throw response;
            }
        } catch (error) {
            console.error('Error en importación masiva:', error);
            if (error.errors) {
                state.validationErrors = error.errors;
            }
            throw error;
        } finally {
            state.isImporting = false;
        }
    };

    const clearImportResult = () => {
        state.bulkImportResult = null;
        state.validationErrors = [];
    };

    const clearImportHistory = () => {
        state.importHistory = [];
    };

    const getImportById = (id) => {
        return state.importHistory.find((item) => item.id === id);
    };

    const resetState = () => {
        state.bulkImportResult = null;
        state.isImporting = false;
        state.importHistory = [];
        state.validationErrors = [];
        state.lastImportSummary = null;
    };

    return {
        state,

        isLoading,
        hasImportResult,
        lastImportStats,

        validateHospitalizationData,
        validateBulkData,
        bulkImportHospitalizations,
        clearImportResult,
        clearImportHistory,
        getImportById,
        resetState
    };
});
