<script setup>
import { CUDYR_CONSTANTS } from '@/api/cudyr';
import CudyrBadge from '@/components/cudyr/CudyrBadge.vue';
import { useCudyr } from '@/composables/useCudyr';
import Accordion from 'primevue/accordion';
import AccordionContent from 'primevue/accordioncontent';
import AccordionHeader from 'primevue/accordionheader';
import AccordionPanel from 'primevue/accordionpanel';
import Badge from 'primevue/badge';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Divider from 'primevue/divider';
import InputNumber from 'primevue/inputnumber';
import InputSwitch from 'primevue/inputswitch';
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, defineEmits, defineProps, ref, watch } from 'vue';

const props = defineProps({
    details: {
        type: Array, // SIEMPRE un array de registros diarios (nuevo formato)
        required: true,
        default: () => []
    },
    attentionId: {
        type: Number,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    },
    readOnly: {
        type: Boolean,
        default: false
    },
    selectedDate: {
        type: String, // Fecha en formato YYYY-MM-DD
        default: null
    }
});

const emit = defineEmits(['create-details', 'update-details', 'delete-details']);

const confirm = useConfirm();
const toast = useToast();
const { state: cudyrState, loadById: loadCudyrById } = useCudyr();

const isEditing = ref(false);
const localDetails = ref({});
const isLoading = ref(false);

// Estado para CUDYR
const includeCudyr = ref(false);
const cudyrData = ref({
    // Dependencia
    dependency_mobility: 0,
    dependency_hygiene: 0,
    dependency_nutrition: 0,
    dependency_elimination: 0,
    dependency_psychosocial: 0,
    dependency_surveillance: 0,
    // Riesgo
    risk_oxygen_therapy: 0,
    risk_airway_management: 0,
    risk_vital_signs: 0,
    risk_fluid_balance: 0,
    risk_wound_care: 0,
    risk_invasive_devices: 0,
    risk_procedures: 0,
    risk_medications: 0,
    notes: ''
});
const cudyrPreview = ref(null);

const fetchCudyrEvaluation = async (evaluationId) => {
    await loadCudyrById(evaluationId);
    if (cudyrState.evaluation) {
        localDetails.value.cudyr_evaluation = cudyrState.evaluation;
    }
};

// Helper para convertir estructura anidada del backend a estructura plana del formulario
const mapCudyrEvaluationToForm = (evaluation) => {
    if (!evaluation) return null;

    // Verificar si los datos vienen en estructura anidada (del backend) o plana
    if (evaluation.dependency && evaluation.dependency.dimensions) {
        // Estructura anidada del backend
        return {
            dependency_mobility: evaluation.dependency.dimensions.mobility || 0,
            dependency_hygiene: evaluation.dependency.dimensions.hygiene || 0,
            dependency_nutrition: evaluation.dependency.dimensions.nutrition || 0,
            dependency_elimination: evaluation.dependency.dimensions.elimination || 0,
            dependency_psychosocial: evaluation.dependency.dimensions.psychosocial || 0,
            dependency_surveillance: evaluation.dependency.dimensions.surveillance || 0,
            risk_oxygen_therapy: evaluation.risk?.dimensions?.oxygen_therapy || 0,
            risk_airway_management: evaluation.risk?.dimensions?.airway_management || 0,
            risk_vital_signs: evaluation.risk?.dimensions?.vital_signs || 0,
            risk_fluid_balance: evaluation.risk?.dimensions?.fluid_balance || 0,
            risk_wound_care: evaluation.risk?.dimensions?.wound_care || 0,
            risk_invasive_devices: evaluation.risk?.dimensions?.invasive_devices || 0,
            risk_procedures: evaluation.risk?.dimensions?.procedures || 0,
            risk_medications: evaluation.risk?.dimensions?.medications || 0,
            notes: evaluation.notes || ''
        };
    } else {
        // Estructura plana
        return {
            dependency_mobility: evaluation.dependency_mobility || 0,
            dependency_hygiene: evaluation.dependency_hygiene || 0,
            dependency_nutrition: evaluation.dependency_nutrition || 0,
            dependency_elimination: evaluation.dependency_elimination || 0,
            dependency_psychosocial: evaluation.dependency_psychosocial || 0,
            dependency_surveillance: evaluation.dependency_surveillance || 0,
            risk_oxygen_therapy: evaluation.risk_oxygen_therapy || 0,
            risk_airway_management: evaluation.risk_airway_management || 0,
            risk_vital_signs: evaluation.risk_vital_signs || 0,
            risk_fluid_balance: evaluation.risk_fluid_balance || 0,
            risk_wound_care: evaluation.risk_wound_care || 0,
            risk_invasive_devices: evaluation.risk_invasive_devices || 0,
            risk_procedures: evaluation.risk_procedures || 0,
            risk_medications: evaluation.risk_medications || 0,
            notes: evaluation.notes || ''
        };
    }
};

// Configuración de campos con validaciones y ayuda contextual
const detailFields = [
    {
        key: 'ram',
        label: 'Reacciones Alérgicas a Medicamentos (RAM)',
        component: 'Textarea',
        icon: 'pi pi-exclamation-triangle',
        placeholder: 'Describa cualquier reacción alérgica conocida a medicamentos...',
        required: false,
        severity: 'warn'
    },
    {
        key: 'images_exams',
        label: 'Exámenes de Imágenes',
        component: 'Textarea',
        icon: 'pi pi-image',
        placeholder: 'Radiografías, TAC, RMN, ecografías realizadas...',
        required: false
    },
    {
        key: 'laboratory_exams',
        label: 'Exámenes de Laboratorio',
        component: 'Textarea',
        icon: 'pi pi-chart-line',
        placeholder: 'Hemograma, bioquímica, marcadores, cultivos...',
        required: false
    },
    {
        key: 'interconsultation',
        label: 'Interconsultas',
        component: 'Textarea',
        icon: 'pi pi-users',
        placeholder: 'Consultas con especialistas solicitadas o realizadas...',
        required: false
    },
    {
        key: 'medical_order',
        label: 'Órdenes Médicas',
        component: 'Textarea',
        icon: 'pi pi-file-edit',
        placeholder: 'Indicaciones médicas, prescripciones, procedimientos...',
        required: false,
        severity: 'info',
        priority: 'high'
    },
    {
        key: 'intercurrences',
        label: 'Intercurrencias',
        component: 'Textarea',
        icon: 'pi pi-info-circle',
        placeholder: 'Eventos o complicaciones durante la atención...',
        required: false,
        severity: 'warn'
    }
];

const scoreFields = [
    {
        key: 'thrombosis_risk_score',
        label: 'Riesgo de Trombosis',
        icon: 'pi pi-heart',
        min: 0,
        max: 10,
        suffix: 'pts',
        help: 'Evaluación del riesgo trombótico'
    },
    {
        key: 'bleeding_risk_score',
        label: 'Riesgo de Sangrado',
        icon: 'pi pi-circle',
        min: 0,
        max: 10,
        suffix: 'pts',
        help: 'Evaluación del riesgo hemorrágico'
    }
];

// Computed para determinar si hay evaluación CUDYR
const hasCudyrEvaluation = computed(() => {
    return (currentDetail.value?.cudyr_evaluation || currentDetail.value?.cudyr_evaluation_id) && localDetails.value?.score_CUDYR > 0;
});

// Computed para validaciones - Solo id_attentions es requerido
const isFormValid = computed(() => {
    // Solo validamos que tenga id_attentions, el resto son opcionales
    return localDetails.value.id_attentions && localDetails.value.id_attentions > 0;
});

// Computed para verificar si hay algún contenido
const hasContent = computed(() => {
    const fields = [...detailFields.map((f) => f.key), ...scoreFields.map((f) => f.key)];
    return fields.some((key) => {
        const value = localDetails.value[key];
        return value !== null && value !== undefined && value !== '' && value !== 0;
    });
});

const hasUnsavedChanges = computed(() => {
    if (!props.details) return false;
    return JSON.stringify(localDetails.value) !== JSON.stringify(props.details);
});

const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const convertStringToDate = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const resetForm = () => {
    const dateStr = props.selectedDate || getTodayDate();
    localDetails.value = {
        id_attentions: props.attentionId,
        attention_date: convertStringToDate(dateStr), // Convertir a objeto Date para el Calendar
        ram: '',
        images_exams: '',
        laboratory_exams: '',
        interconsultation: '',
        medical_order: '',
        intercurrences: '',
        score_CUDYR: 0,
        thrombosis_risk_score: 0,
        bleeding_risk_score: 0
    };
};

// Resetear datos de CUDYR
const resetCudyrData = () => {
    cudyrData.value = {
        dependency_mobility: 0,
        dependency_hygiene: 0,
        dependency_nutrition: 0,
        dependency_elimination: 0,
        dependency_psychosocial: 0,
        dependency_surveillance: 0,
        risk_oxygen_therapy: 0,
        risk_airway_management: 0,
        risk_vital_signs: 0,
        risk_fluid_balance: 0,
        risk_wound_care: 0,
        risk_invasive_devices: 0,
        risk_procedures: 0,
        risk_medications: 0,
        notes: ''
    };
    cudyrPreview.value = null;
};

// Calcular scores de CUDYR
const calculateCudyrScores = () => {
    const dependencyScore =
        cudyrData.value.dependency_mobility + cudyrData.value.dependency_hygiene + cudyrData.value.dependency_nutrition + cudyrData.value.dependency_elimination + cudyrData.value.dependency_psychosocial + cudyrData.value.dependency_surveillance;

    const riskScore =
        cudyrData.value.risk_oxygen_therapy +
        cudyrData.value.risk_airway_management +
        cudyrData.value.risk_vital_signs +
        cudyrData.value.risk_fluid_balance +
        cudyrData.value.risk_wound_care +
        cudyrData.value.risk_invasive_devices +
        cudyrData.value.risk_procedures +
        cudyrData.value.risk_medications;

    // Determinar clasificación de dependencia
    let dependencyClass = 'D'; // Autosuficiencia
    if (dependencyScore >= 13)
        dependencyClass = 'B'; // Total
    else if (dependencyScore >= 7) dependencyClass = 'C'; // Parcial

    // Determinar clasificación de riesgo
    let riskClass = '4'; // Bajo
    if (riskScore >= 19)
        riskClass = '1'; // Máximo
    else if (riskScore >= 13)
        riskClass = '2'; // Alto
    else if (riskScore >= 7) riskClass = '3'; // Mediano

    // Determinar categoría CUDYR
    let category = 'D3';
    if (dependencyClass === 'B') {
        if (riskClass === '1') category = 'A1';
        else if (riskClass === '2') category = 'A2';
        else category = 'A3';
    } else if (dependencyClass === 'C') {
        if (riskClass === '1') category = 'B1';
        else if (riskClass === '2') category = 'B2';
        else category = 'B3';
    } else {
        // dependencyClass === 'D'
        if (riskClass === '1') category = 'C1';
        else if (riskClass === '2') category = 'C2';
        else category = 'C3';
    }

    return {
        dependencyScore,
        riskScore,
        dependencyClass,
        riskClass,
        category
    };
};

// Computed para obtener el detalle actual basado en selectedDate o el más reciente
const currentDetail = computed(() => {
    if (!props.details) return null;

    // details SIEMPRE debe ser un array (nuevo formato)
    if (!Array.isArray(props.details)) {
        return null;
    }

    if (props.details.length === 0) return null;

    // Si hay una fecha seleccionada, buscar ese detalle
    if (props.selectedDate) {
        return props.details.find((d) => d.attention_date === props.selectedDate) || null;
    }

    // Sino, retornar el más reciente (primero del array)
    return props.details[0];
});

// Computed para obtener el detalle del día anterior más reciente
const previousDayDetail = computed(() => {
    if (!props.details || !Array.isArray(props.details) || props.details.length === 0) return null;

    // Obtener la fecha actual en formato de comparación
    const currentDateStr = convertDateToString(localDetails.value.attention_date) || getTodayDate();

    // Filtrar detalles de días anteriores y ordenar por fecha descendente
    const previousDetails = props.details
        .filter((d) => {
            const detailDateStr = typeof d.attention_date === 'string' ? d.attention_date : convertDateToString(d.attention_date);
            return detailDateStr < currentDateStr;
        })
        .sort((a, b) => {
            const dateA = typeof a.attention_date === 'string' ? a.attention_date : convertDateToString(a.attention_date);
            const dateB = typeof b.attention_date === 'string' ? b.attention_date : convertDateToString(b.attention_date);
            return dateB.localeCompare(dateA);
        });

    return previousDetails.length > 0 ? previousDetails[0] : null;
});

// Computed para verificar si se puede copiar del día anterior
const canCopyFromPreviousDay = computed(() => {
    return isEditing.value && !props.readOnly && previousDayDetail.value !== null;
});

// Watch para sincronizar props
watch(
    () => currentDetail.value,
    (newDetails) => {
        if (newDetails) {
            localDetails.value = { ...newDetails };
            // Asegurar que tenga attention_date y convertir a Date si es string
            if (!localDetails.value.attention_date) {
                const dateStr = props.selectedDate || getTodayDate();
                localDetails.value.attention_date = convertStringToDate(dateStr);
            } else if (typeof localDetails.value.attention_date === 'string') {
                localDetails.value.attention_date = convertStringToDate(localDetails.value.attention_date);
            }

            // Detectar y pre-cargar evaluación CUDYR existente
            if (newDetails.cudyr_evaluation) {
                includeCudyr.value = true;
                const mappedData = mapCudyrEvaluationToForm(newDetails.cudyr_evaluation);
                if (mappedData) {
                    cudyrData.value = mappedData;
                    // Calcular preview automáticamente
                    cudyrPreview.value = calculateCudyrScores();
                }
            } else if (newDetails.cudyr_evaluation_id) {
                fetchCudyrEvaluation(newDetails.cudyr_evaluation_id);
            } else {
                // Si no hay evaluación CUDYR, resetear
                includeCudyr.value = false;
                resetCudyrData();
            }

            isEditing.value = false;
        } else {
            resetForm();
            includeCudyr.value = false;
            resetCudyrData();
            isEditing.value = true;
        }
    },
    { immediate: true }
);

// Watch para la fecha seleccionada
watch(
    () => props.selectedDate,
    (newDate) => {
        if (newDate && localDetails.value) {
            localDetails.value.attention_date = convertStringToDate(newDate);
        }
    }
);

// Watch para actualizar cudyrData cuando se carga la evaluación desde el composable
watch(
    () => cudyrState.evaluation,
    (newEvaluation) => {
        if (newEvaluation && includeCudyr.value) {
            const mappedData = mapCudyrEvaluationToForm(newEvaluation);
            if (mappedData) {
                cudyrData.value = mappedData;
                cudyrPreview.value = calculateCudyrScores();
            }
        }
    }
);

const convertDateToString = (date) => {
    if (!date) return getTodayDate();
    if (typeof date === 'string') return date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Computed para verificar si todas las dimensiones CUDYR están completas
const allCudyrDimensionsCompleted = computed(() => {
    if (!includeCudyr.value) return true;

    const dimensions = [
        'dependency_mobility',
        'dependency_hygiene',
        'dependency_nutrition',
        'dependency_elimination',
        'dependency_psychosocial',
        'dependency_surveillance',
        'risk_oxygen_therapy',
        'risk_airway_management',
        'risk_vital_signs',
        'risk_fluid_balance',
        'risk_wound_care',
        'risk_invasive_devices',
        'risk_procedures',
        'risk_medications'
    ];

    return dimensions.every((dim) => cudyrData.value[dim] !== null && cudyrData.value[dim] !== undefined);
});

// Watch para actualizar preview cuando cambian los datos CUDYR
watch(
    () => cudyrData.value,
    () => {
        if (includeCudyr.value && allCudyrDimensionsCompleted.value) {
            cudyrPreview.value = calculateCudyrScores();
        } else {
            cudyrPreview.value = null;
        }
    },
    { deep: true }
);

// Watch para resetear CUDYR cuando se deshabilita el toggle
watch(includeCudyr, (newVal) => {
    if (!newVal) {
        resetCudyrData();
    }
});

const handleSave = async () => {
    if (!isFormValid.value) {
        toast.add({
            severity: 'warn',
            summary: 'Validación',
            detail: 'Error en la validación del formulario',
            life: 3000
        });
        return;
    }

    // Validar CUDYR si está incluido
    if (includeCudyr.value && !allCudyrDimensionsCompleted.value) {
        toast.add({
            severity: 'warn',
            summary: 'Validación CUDYR',
            detail: 'Debe completar todas las 14 dimensiones de la evaluación CUDYR',
            life: 5000
        });
        return;
    }

    // Asegurar que attention_date esté presente
    if (!localDetails.value.attention_date) {
        localDetails.value.attention_date = convertStringToDate(props.selectedDate || getTodayDate());
    }

    try {
        isLoading.value = true;

        // Preparar datos para enviar al backend - convertir Date a string
        const dataToSend = {
            ...localDetails.value,
            attention_date: convertDateToString(localDetails.value.attention_date)
        };

        // Agregar evaluación CUDYR si está habilitada
        if (includeCudyr.value && allCudyrDimensionsCompleted.value) {
            dataToSend.cudyr_evaluation = {
                dependency_mobility: cudyrData.value.dependency_mobility,
                dependency_hygiene: cudyrData.value.dependency_hygiene,
                dependency_nutrition: cudyrData.value.dependency_nutrition,
                dependency_elimination: cudyrData.value.dependency_elimination,
                dependency_psychosocial: cudyrData.value.dependency_psychosocial,
                dependency_surveillance: cudyrData.value.dependency_surveillance,
                risk_oxygen_therapy: cudyrData.value.risk_oxygen_therapy,
                risk_airway_management: cudyrData.value.risk_airway_management,
                risk_vital_signs: cudyrData.value.risk_vital_signs,
                risk_fluid_balance: cudyrData.value.risk_fluid_balance,
                risk_wound_care: cudyrData.value.risk_wound_care,
                risk_invasive_devices: cudyrData.value.risk_invasive_devices,
                risk_procedures: cudyrData.value.risk_procedures,
                risk_medications: cudyrData.value.risk_medications,
                notes: cudyrData.value.notes
            };

            // Calcular y actualizar automáticamente el score_CUDYR
            if (cudyrPreview.value) {
                dataToSend.score_CUDYR = cudyrPreview.value.dependencyScore;
            }
        }

        if (currentDetail.value) {
            await emit('update-details', dataToSend.id, dataToSend);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: includeCudyr.value ? 'Detalles y evaluación CUDYR actualizados correctamente' : 'Detalles actualizados correctamente',
                life: 3000
            });
        } else {
            await emit('create-details', dataToSend);
            toast.add({
                severity: 'success',
                summary: 'Éxito',
                detail: includeCudyr.value ? 'Detalles y evaluación CUDYR creados correctamente' : 'Detalles creados correctamente',
                life: 3000
            });
        }

        isEditing.value = false;
        includeCudyr.value = false;
        resetCudyrData();
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al guardar los detalles',
            life: 3000
        });
    } finally {
        isLoading.value = false;
    }
};

const handleDelete = () => {
    confirm.require({
        message: '¿Está seguro de que desea eliminar estos detalles médicos?',
        header: 'Confirmar Eliminación',
        icon: 'pi pi-exclamation-triangle',
        rejectClass: 'p-button-secondary p-button-outlined',
        rejectLabel: 'Cancelar',
        acceptLabel: 'Eliminar',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                isLoading.value = true;
                await emit('delete-details', localDetails.value.id);
                toast.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: 'Detalles eliminados correctamente',
                    life: 3000
                });
            } catch (error) {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al eliminar los detalles',
                    life: 3000
                });
            } finally {
                isLoading.value = false;
            }
        }
    });
};

const startEditing = () => {
    if (currentDetail.value) {
        localDetails.value = { ...currentDetail.value };

        // Pre-cargar evaluación CUDYR si existe
        if (currentDetail.value.cudyr_evaluation) {
            includeCudyr.value = true;
            const mappedData = mapCudyrEvaluationToForm(currentDetail.value.cudyr_evaluation);
            if (mappedData) {
                cudyrData.value = mappedData;
                cudyrPreview.value = calculateCudyrScores();
            }
        } else if (currentDetail.value.cudyr_evaluation_id) {
            // Si solo existe el ID, marcar que tiene evaluación CUDYR
            // Los datos se cargarán por el watch que detecta cudyr_evaluation_id
            includeCudyr.value = true;
            // Cargar evaluación por ID si no está cargada
            if (!cudyrState.evaluation || cudyrState.evaluation.id !== currentDetail.value.cudyr_evaluation_id) {
                fetchCudyrEvaluation(currentDetail.value.cudyr_evaluation_id);
            } else {
                // Si ya está cargada en el estado, usar esos datos
                const mappedData = mapCudyrEvaluationToForm(cudyrState.evaluation);
                if (mappedData) {
                    cudyrData.value = mappedData;
                    cudyrPreview.value = calculateCudyrScores();
                }
            }
        } else {
            // No hay evaluación CUDYR
            includeCudyr.value = false;
            resetCudyrData();
        }
    } else {
        resetForm();
        includeCudyr.value = false;
        resetCudyrData();
    }
    isEditing.value = true;
};

const cancelEditing = () => {
    const restoreCudyrData = () => {
        if (currentDetail.value) {
            localDetails.value = { ...currentDetail.value };

            // Restaurar datos CUDYR originales
            if (currentDetail.value.cudyr_evaluation) {
                includeCudyr.value = true;
                const mappedData = mapCudyrEvaluationToForm(currentDetail.value.cudyr_evaluation);
                if (mappedData) {
                    cudyrData.value = mappedData;
                    cudyrPreview.value = calculateCudyrScores();
                }
            } else if (currentDetail.value.cudyr_evaluation_id && cudyrState.evaluation) {
                // Si solo existe el ID y ya está cargada la evaluación
                includeCudyr.value = true;
                const mappedData = mapCudyrEvaluationToForm(cudyrState.evaluation);
                if (mappedData) {
                    cudyrData.value = mappedData;
                    cudyrPreview.value = calculateCudyrScores();
                }
            } else {
                includeCudyr.value = false;
                resetCudyrData();
            }

            isEditing.value = false;
        } else {
            resetForm();
            includeCudyr.value = false;
            resetCudyrData();
        }
    };

    if (hasUnsavedChanges.value) {
        confirm.require({
            message: 'Tiene cambios sin guardar. ¿Desea descartar los cambios?',
            header: 'Confirmar Cancelación',
            icon: 'pi pi-question-circle',
            rejectClass: 'p-button-secondary p-button-outlined',
            rejectLabel: 'Continuar Editando',
            acceptLabel: 'Descartar Cambios',
            accept: restoreCudyrData
        });
    } else {
        restoreCudyrData();
    }
};

const copyFromPreviousDay = () => {
    if (!previousDayDetail.value) return;

    confirm.require({
        message: `¿Desea copiar los datos del registro del ${formatAuditDate(previousDayDetail.value.attention_date)}?`,
        header: 'Copiar del Día Anterior',
        icon: 'pi pi-copy',
        rejectClass: 'p-button-secondary p-button-outlined',
        rejectLabel: 'Cancelar',
        acceptLabel: 'Copiar',
        acceptClass: 'p-button-info',
        accept: () => {
            // Copiar campos clínicos
            localDetails.value.ram = previousDayDetail.value.ram || '';
            localDetails.value.images_exams = previousDayDetail.value.images_exams || '';
            localDetails.value.laboratory_exams = previousDayDetail.value.laboratory_exams || '';
            localDetails.value.interconsultation = previousDayDetail.value.interconsultation || '';
            localDetails.value.medical_order = previousDayDetail.value.medical_order || '';
            localDetails.value.intercurrences = previousDayDetail.value.intercurrences || '';

            // Copiar scores de riesgo
            localDetails.value.thrombosis_risk_score = previousDayDetail.value.thrombosis_risk_score || 0;
            localDetails.value.bleeding_risk_score = previousDayDetail.value.bleeding_risk_score || 0;
            localDetails.value.score_CUDYR = previousDayDetail.value.score_CUDYR || 0;

            // Copiar evaluación CUDYR si existe
            if (previousDayDetail.value.cudyr_evaluation) {
                includeCudyr.value = true;
                const mappedData = mapCudyrEvaluationToForm(previousDayDetail.value.cudyr_evaluation);
                if (mappedData) {
                    cudyrData.value = mappedData;
                    cudyrPreview.value = calculateCudyrScores();
                }
            } else if (previousDayDetail.value.cudyr_evaluation_id) {
                // Si solo existe el ID, cargar la evaluación
                includeCudyr.value = true;
                fetchCudyrEvaluation(previousDayDetail.value.cudyr_evaluation_id);
            }

            toast.add({
                severity: 'success',
                summary: 'Datos Copiados',
                detail: `Se copiaron los datos del ${formatAuditDate(previousDayDetail.value.attention_date)} exitosamente`,
                life: 3000
            });
        }
    });
};

const getRiskSeverity = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 70) return 'danger';
    if (percentage >= 40) return 'warn';
    return 'success';
};

// Función para calcular porcentaje seguro
const getScorePercentage = (score, maxScore) => {
    if (!score || !maxScore || maxScore === 0) return 0;
    const percentage = Math.round((score / maxScore) * 100);
    return Math.min(Math.max(percentage, 0), 100); // Asegurar que esté entre 0 y 100
};

// Función para obtener el valor del score de forma segura
const getScoreValue = (score) => {
    return score && typeof score === 'number' ? score : 0;
};

// Funciones para clasificación CUDYR
const getCudyrDependencyClassification = (score) => {
    if (score >= 13) return { class: 'B', text: 'Dependencia Total', color: 'danger' };
    if (score >= 7) return { class: 'C', text: 'Dependencia Parcial', color: 'warn' };
    return { class: 'D', text: 'Autosuficiencia', color: 'success' };
};

const getCudyrRiskClassification = (score) => {
    if (score >= 19) return { class: '1', text: 'Riesgo Máximo', color: 'danger' };
    if (score >= 13) return { class: '2', text: 'Riesgo Alto', color: 'warn' };
    if (score >= 7) return { class: '3', text: 'Riesgo Mediano', color: 'info' };
    return { class: '4', text: 'Riesgo Bajo', color: 'success' };
};

const getCudyrCategory = (dependencyScore, riskScore = 0) => {
    const depClass = getCudyrDependencyClassification(dependencyScore).class;
    const riskClass = getCudyrRiskClassification(riskScore).class;

    let category = 'D3';
    if (depClass === 'B') {
        if (riskClass === '1') category = 'A1';
        else if (riskClass === '2') category = 'A2';
        else category = 'A3';
    } else if (depClass === 'C') {
        if (riskClass === '1') category = 'B1';
        else if (riskClass === '2') category = 'B2';
        else category = 'B3';
    } else {
        if (riskClass === '1') category = 'C1';
        else if (riskClass === '2') category = 'C2';
        else category = 'C3';
    }

    return category;
};

const getCudyrCategoryColor = (category) => {
    if (!category) return 'secondary';

    // A1, A2, A3 - Dependencia Total
    if (category.startsWith('A')) return 'danger';

    // B1, B2, B3 - Dependencia Parcial
    if (category.startsWith('B')) return 'warn';

    // C1, C2, C3 - Autosuficiencia
    if (category === 'C1' || category === 'C2') return 'info';
    if (category === 'C3') return 'success';

    // D3 - Autosuficiencia Completa
    return 'success';
};

const formatAuditDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        let date;
        // Si la fecha es solo YYYY-MM-DD, parsear como fecha local
        if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateString.split('-').map(Number);
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(dateString);
        }

        if (isNaN(date)) return dateString;
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
};

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
};

const getUserInfo = (userObj) => {
    if (!userObj) return null;
    return {
        id: userObj.id,
        nick: userObj.nick || 'Usuario'
    };
};
</script>

<template>
    <!-- Estado sin datos -->
    <div v-if="!isEditing && !currentDetail" class="empty-state text-center py-6">
        <div class="mb-4">
            <i class="pi pi-file-plus text-6xl text-gray-400 mb-3 block"></i>
            <h3 class="text-xl font-medium text-gray-700 mb-2">Sin Detalles Médicos Registrados</h3>
            <p class="text-gray-500 mb-4">{{ readOnly ? 'No hay detalles médicos registrados para esta atención.' : 'Aún no se han registrado detalles médicos para esta atención.' }}</p>
            <Button v-if="!readOnly" label="Agregar Detalles Médicos" icon="pi pi-plus" class="p-button-lg" @click="startEditing" :disabled="isLoading" />
        </div>
    </div>

    <!-- Contenido principal con datos -->
    <div v-else class="medical-details-container">
        <!-- Header compacto con información general -->
        <div v-if="!isEditing && currentDetail" class="details-header-compact">
            <div class="header-content">
                <div class="header-info">
                    <i class="pi pi-file-edit header-icon"></i>
                    <div class="header-text">
                        <h3 class="header-title">Detalles Médicos</h3>
                        <span class="header-subtitle">Información clínica</span>
                    </div>
                </div>
                <div class="header-badges">
                    <Tag v-if="currentDetail && currentDetail.attention_date" :value="formatAuditDate(currentDetail.attention_date)" severity="info" size="small" />
                    <Tag v-if="hasContent" value="Con datos" severity="success" size="small" />
                    <Tag v-else value="Sin datos" severity="warn" size="small" />
                    <Badge v-if="currentDetail && currentDetail.id" :value="currentDetail.id" severity="info" size="small" />
                </div>
            </div>
            <div class="audit-info-header">
                <div v-if="getUserInfo(currentDetail.created_by)" class="audit-item">
                    <i class="pi pi-user-plus"></i>
                    <span
                        >Creado por <b>{{ getUserInfo(currentDetail.created_by).nick }}</b> el {{ formatDateTime(currentDetail.created_at) }}</span
                    >
                </div>
                <div v-if="getUserInfo(currentDetail.updated_by) && currentDetail.updated_at !== currentDetail.created_at" class="audit-item">
                    <i class="pi pi-user-edit"></i>
                    <span
                        >Actualizado por <b>{{ getUserInfo(currentDetail.updated_by).nick }}</b> el {{ formatDateTime(currentDetail.updated_at) }}</span
                    >
                </div>
            </div>
        </div>

        <!-- Contenido en tabs -->
        <div v-if="!isEditing && currentDetail" class="view-mode">
            <Tabs value="1" class="custom-tabs">
                <TabList>
                    <Tab value="0">
                        <i class="pi pi-chart-bar mr-2"></i>
                        Evaluación de Riesgos
                    </Tab>
                    <Tab value="1">
                        <i class="pi pi-file-edit mr-2"></i>
                        Información Clínica
                    </Tab>
                </TabList>

                <TabPanels>
                    <!-- Panel de Scores Compacto -->
                    <TabPanel value="0" class="pt-3">
                        <!-- Tarjeta especial de Evaluación CUDYR completa -->
                        <div v-if="hasCudyrEvaluation" class="cudyr-evaluation-card">
                            <div class="cudyr-eval-header">
                                <i class="pi pi-chart-bar"></i>
                                <span class="cudyr-eval-title">Evaluación CUDYR</span>
                            </div>
                            <Divider class="my-2" />
                            <div class="cudyr-eval-body-simple">
                                <div class="cudyr-category-section">
                                    <span class="cudyr-category-label">Categoría CUDYR:</span>
                                    <div class="cudyr-category-display-simple">
                                        <CudyrBadge :category="currentDetail.cudyr_evaluation?.cudyr_category || getCudyrCategory(localDetails.score_CUDYR || 0)" size="large" />
                                    </div>
                                </div>
                                <Divider class="my-3" />
                                <div class="cudyr-score-section">
                                    <span class="cudyr-score-label">Puntuación:</span>
                                    <span class="cudyr-score-value-large">{{ localDetails.score_CUDYR || 0 }}/18</span>
                                </div>
                            </div>
                        </div>

                        <div v-if="scoreFields.some((score) => getScoreValue(localDetails[score.key]) > 0)" class="scores-container">
                            <div v-for="score in scoreFields" :key="score.key" class="score-card" :class="{ 'score-card--active': getScoreValue(localDetails[score.key]) > 0 }">
                                <div class="score-header">
                                    <i :class="score.icon" class="score-icon"></i>
                                    <span class="score-title">{{ score.label }}</span>
                                </div>
                                <div class="score-body">
                                    <div class="score-value" :class="'score-value--' + getRiskSeverity(getScoreValue(localDetails[score.key]), score.max)">{{ getScoreValue(localDetails[score.key]) }}{{ score.suffix }}</div>
                                    <div class="score-progress">
                                        <ProgressBar :value="getScorePercentage(getScoreValue(localDetails[score.key]), score.max)" :severity="getRiskSeverity(getScoreValue(localDetails[score.key]), score.max)" />
                                    </div>
                                    <div class="score-percentage">{{ getScorePercentage(getScoreValue(localDetails[score.key]), score.max) }}% de {{ score.max }}{{ score.suffix }}</div>
                                    <small class="score-help">{{ score.help }}</small>
                                </div>
                            </div>
                        </div>
                        <div v-else-if="!hasCudyrEvaluation" class="empty-scores">
                            <i class="pi pi-chart-bar"></i>
                            <span>No hay evaluaciones de riesgo registradas</span>
                            <Button v-if="!readOnly" label="Añadir Evaluaciones" icon="pi pi-plus" size="small" severity="secondary" outlined @click="startEditing" />
                        </div>
                    </TabPanel>

                    <!-- Panel de Información Clínica Compacta -->
                    <TabPanel value="1" class="pt-3">
                        <div v-if="detailFields.some((field) => field && localDetails[field.key])" class="clinical-grid">
                            <template v-for="field in detailFields" :key="field?.key || 'unknown'">
                                <div v-if="field && localDetails[field.key]" class="clinical-item">
                                    <div class="clinical-header">
                                        <i :class="[field.icon, 'clinical-icon', 'text-' + (field.severity || 'primary')]"></i>
                                        <span class="clinical-title">{{ field.label }}</span>
                                        <Badge v-if="field.priority === 'high'" value="Importante" severity="info" size="small" />
                                    </div>
                                    <div class="clinical-content">
                                        {{ localDetails[field.key] }}
                                    </div>
                                </div>
                            </template>
                        </div>
                        <div v-else class="empty-clinical">
                            <i class="pi pi-file-edit"></i>
                            <span>No hay información clínica</span>
                            <Button v-if="!readOnly" label="Añadir" icon="pi pi-plus" size="small" severity="secondary" outlined @click="startEditing" />
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>

        <!-- Modo Edición/Creación Compacto -->
        <div v-else class="edit-mode-compact">
            <div class="edit-info">
                <i class="pi pi-info-circle"></i>
                <span>{{ currentDetail ? 'Editando detalles médicos' : 'Creando nuevos detalles médicos' }}</span>
                <small>Fecha: {{ convertDateToString(localDetails.attention_date) || 'Hoy' }}</small>
            </div>

            <!-- Botón para copiar del día anterior -->
            <div v-if="canCopyFromPreviousDay" class="copy-from-previous-container">
                <Button
                    label="Copiar del Día Anterior"
                    icon="pi pi-copy"
                    severity="info"
                    outlined
                    size="small"
                    v-tooltip.top="'Copiar datos del registro del ' + formatAuditDate(previousDayDetail.attention_date)"
                    @click="copyFromPreviousDay"
                    :disabled="isLoading"
                />
                <span class="copy-helper-text">
                    <i class="pi pi-info-circle"></i>
                    Disponible: registro del {{ formatAuditDate(previousDayDetail.attention_date) }}
                </span>
            </div>

            <div class="edit-content">
                <!-- Campo de fecha (solo visible al crear) -->
                <div v-if="!currentDetail" class="edit-section">
                    <h4 class="edit-section-title">
                        <i class="pi pi-calendar"></i>
                        Fecha del Registro
                    </h4>
                    <div class="field">
                        <label for="attention_date" class="field-label">
                            <i class="pi pi-calendar"></i>
                            Fecha de Atención *
                        </label>
                        <Calendar id="attention_date" v-model="localDetails.attention_date" dateFormat="yy-mm-dd" :showIcon="true" :showButtonBar="true" class="w-full" />
                        <small class="field-help">Seleccione la fecha para este registro diario (hoy: {{ getTodayDate() }})</small>
                    </div>
                </div>

                <!-- Sección de Scores -->
                <div class="edit-section">
                    <h4 class="edit-section-title">
                        <i class="pi pi-chart-bar"></i>
                        Evaluación de Riesgos
                    </h4>
                    <div class="scores-edit-grid">
                        <div v-for="score in scoreFields" :key="score.key" class="score-edit-field">
                            <label :for="score.key" class="field-label">
                                <i :class="score.icon"></i>
                                {{ score.label }}
                            </label>
                            <InputNumber :id="score.key" v-model="localDetails[score.key]" mode="decimal" :min="score.min" :max="score.max" :suffix="' ' + score.suffix" show-buttons size="small" class="w-full" :placeholder="`0-${score.max}`" />
                            <small class="field-help">{{ score.help }}</small>
                        </div>
                    </div>
                </div>

                <!-- Sección de Información Clínica -->
                <div class="edit-section">
                    <h4 class="edit-section-title">
                        <i class="pi pi-file-edit"></i>
                        Información Clínica
                    </h4>
                    <div class="clinical-edit-grid">
                        <div v-for="field in detailFields" :key="field.key" class="clinical-edit-field">
                            <label :for="field.key" class="field-label">
                                <i :class="[field.icon, 'text-' + (field.severity || 'primary')]"></i>
                                {{ field.label }}
                                <Badge v-if="field.priority === 'high'" value="Importante" severity="info" size="small" />
                            </label>
                            <Textarea :id="field.key" v-model="localDetails[field.key]" :placeholder="field.placeholder" rows="3" auto-resize class="w-full" />
                        </div>
                    </div>
                </div>

                <!-- Sección de Evaluación CUDYR (NUEVA) -->
                <div class="edit-section cudyr-section">
                    <div class="cudyr-toggle-header">
                        <h4 class="edit-section-title">
                            <i class="pi pi-chart-bar"></i>
                            Evaluación CUDYR
                        </h4>
                        <div class="cudyr-toggle-container">
                            <label class="cudyr-toggle-label">
                                <InputSwitch v-model="includeCudyr" />
                                <span class="ml-2">{{ includeCudyr ? 'Incluir Evaluación CUDYR' : 'Agregar Evaluación CUDYR' }}</span>
                            </label>
                        </div>
                    </div>

                    <!-- Preview CUDYR -->
                    <Message v-if="includeCudyr && cudyrPreview" severity="success" :closable="false" class="cudyr-preview-message">
                        <div class="cudyr-preview-content">
                            <div class="preview-header">
                                <span class="preview-label">Categoría CUDYR:</span>
                                <CudyrBadge :category="cudyrPreview.category" size="normal" />
                            </div>
                            <Divider />
                            <div class="preview-scores">
                                <div class="preview-score-item">
                                    <i class="pi pi-users"></i>
                                    <span
                                        >Dependencia: <strong>{{ cudyrPreview.dependencyScore }}/18</strong> ({{ cudyrPreview.dependencyClass }})</span
                                    >
                                </div>
                                <div class="preview-score-item">
                                    <i class="pi pi-exclamation-triangle"></i>
                                    <span
                                        >Riesgo: <strong>{{ cudyrPreview.riskScore }}/24</strong> ({{ cudyrPreview.riskClass }})</span
                                    >
                                </div>
                            </div>
                        </div>
                    </Message>

                    <!-- Formulario CUDYR -->
                    <div v-if="includeCudyr" class="cudyr-form-container">
                        <Message severity="info" :closable="false" class="mb-3"> Complete las 14 dimensiones (6 dependencia + 8 riesgo). Cada dimensión se evalúa de 0 a 3 puntos. </Message>

                        <!-- Acordeones para Dependencia y Riesgo -->
                        <Accordion :value="['0', '1']" multiple>
                            <!-- Panel de Dependencia -->
                            <AccordionPanel value="0">
                                <AccordionHeader>
                                    <i class="pi pi-users mr-2"></i>
                                    <span>Escala de Dependencia (6 dimensiones)</span>
                                    <Badge v-if="cudyrPreview" :value="`${cudyrPreview.dependencyScore}/18`" severity="info" class="ml-auto mr-2" />
                                </AccordionHeader>
                                <AccordionContent>
                                    <div class="cudyr-dimensions-grid">
                                        <!-- Movilización -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.mobility.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.dependency_mobility }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.mobility.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.dependency_mobility === index }"
                                                    @click="cudyrData.dependency_mobility = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Higiene -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.hygiene.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.dependency_hygiene }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.hygiene.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.dependency_hygiene === index }"
                                                    @click="cudyrData.dependency_hygiene = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Alimentación -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.nutrition.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.dependency_nutrition }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.nutrition.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.dependency_nutrition === index }"
                                                    @click="cudyrData.dependency_nutrition = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Eliminación -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.elimination.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.dependency_elimination }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.elimination.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.dependency_elimination === index }"
                                                    @click="cudyrData.dependency_elimination = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Apoyo Psicosocial -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.psychosocial.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.dependency_psychosocial }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.psychosocial.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.dependency_psychosocial === index }"
                                                    @click="cudyrData.dependency_psychosocial = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Vigilancia -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.surveillance.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.dependency_surveillance }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.DEPENDENCY_DIMENSIONS.surveillance.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.dependency_surveillance === index }"
                                                    @click="cudyrData.dependency_surveillance = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionPanel>

                            <!-- Panel de Riesgo -->
                            <AccordionPanel value="1">
                                <AccordionHeader>
                                    <i class="pi pi-exclamation-triangle mr-2"></i>
                                    <span>Escala de Riesgo (8 dimensiones)</span>
                                    <Badge v-if="cudyrPreview" :value="`${cudyrPreview.riskScore}/24`" severity="warning" class="ml-auto mr-2" />
                                </AccordionHeader>
                                <AccordionContent>
                                    <div class="cudyr-dimensions-grid">
                                        <!-- Oxigenoterapia -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.oxygen_therapy.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.risk_oxygen_therapy }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.oxygen_therapy.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.risk_oxygen_therapy === index }"
                                                    @click="cudyrData.risk_oxygen_therapy = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Manejo de Vía Aérea -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.airway_management.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.risk_airway_management }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.airway_management.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.risk_airway_management === index }"
                                                    @click="cudyrData.risk_airway_management = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Signos Vitales -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.vital_signs.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.risk_vital_signs }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.vital_signs.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.risk_vital_signs === index }"
                                                    @click="cudyrData.risk_vital_signs = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Balance Hídrico -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.fluid_balance.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.risk_fluid_balance }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.fluid_balance.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.risk_fluid_balance === index }"
                                                    @click="cudyrData.risk_fluid_balance = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Curaciones -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.wound_care.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.risk_wound_care }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.wound_care.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.risk_wound_care === index }"
                                                    @click="cudyrData.risk_wound_care = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Elementos Invasivos -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.invasive_devices.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.risk_invasive_devices }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.invasive_devices.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.risk_invasive_devices === index }"
                                                    @click="cudyrData.risk_invasive_devices = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Procedimientos -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.procedures.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.risk_procedures }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.procedures.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.risk_procedures === index }"
                                                    @click="cudyrData.risk_procedures = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Divider />

                                        <!-- Medicamentos -->
                                        <div class="cudyr-dimension-field">
                                            <label class="dimension-label-compact">
                                                {{ CUDYR_CONSTANTS.RISK_DIMENSIONS.medications.label }}
                                                <span class="dimension-value-compact">{{ cudyrData.risk_medications }}/3</span>
                                            </label>
                                            <div class="dimension-options-compact">
                                                <div
                                                    v-for="(description, index) in CUDYR_CONSTANTS.RISK_DIMENSIONS.medications.descriptions"
                                                    :key="index"
                                                    class="dimension-option-compact"
                                                    :class="{ selected: cudyrData.risk_medications === index }"
                                                    @click="cudyrData.risk_medications = index"
                                                >
                                                    <div class="option-radio-compact">{{ index }}</div>
                                                    <span class="option-description-compact">{{ description }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionPanel>
                        </Accordion>

                        <!-- Notas CUDYR -->
                        <div class="cudyr-notes-field">
                            <label class="field-label">
                                <i class="pi pi-file-edit"></i>
                                Observaciones CUDYR (Opcional)
                            </label>
                            <Textarea v-model="cudyrData.notes" rows="3" placeholder="Observaciones adicionales sobre la evaluación..." class="w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer compacto con acciones -->
        <div class="details-footer-compact">
            <div class="footer-content">
                <div class="footer-info-wrapper">
                    <!-- Información de auditoría -->
                    <div v-if="!isEditing && currentDetail" class="audit-info"></div>
                    <div v-else class="footer-info">
                        <i class="pi pi-info-circle"></i>
                        <span>Campos opcionales - Fecha: {{ convertDateToString(localDetails.attention_date) }}</span>
                    </div>
                </div>
                <div class="footer-actions">
                    <template v-if="!isEditing && currentDetail && !readOnly">
                        <Button label="Editar" icon="pi pi-pencil" severity="info" size="small" :disabled="isLoading" @click="startEditing" />
                        <Button label="Eliminar" icon="pi pi-trash" severity="danger" outlined size="small" :disabled="isLoading" @click="handleDelete" />
                    </template>
                    <template v-else-if="!readOnly">
                        <Button v-if="currentDetail" label="Cancelar" icon="pi pi-times" severity="secondary" outlined size="small" :disabled="isLoading" @click="cancelEditing" />
                        <Button :label="currentDetail ? 'Actualizar' : 'Guardar'" icon="pi pi-check" size="small" :disabled="!isFormValid || isLoading" :loading="isLoading" @click="handleSave" />
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Contenedor principal compacto */
.medical-details-container {
    padding: 0.75rem;
    background: var(--surface-card);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
}

/* Estado vacío */
.empty-state {
    padding: 3rem 1rem;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    border-radius: 12px;
    border: 2px dashed #cbd5e1;
}

.empty-state .p-button-lg {
    padding: 0.875rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
}

/* Header de detalles */
.details-header {
    border: 1px solid #e2e8f0;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

/* Tabs personalizados */
.custom-tabs :deep(.p-tablist) {
    background: #f8fafc;
    border-radius: 8px;
    padding: 4px;
    border: 1px solid #e2e8f0;
}

.custom-tabs :deep(.p-tab) {
    border-radius: 6px;
    margin: 0 2px;
    transition: all 0.2s ease;
}

.custom-tabs :deep(.p-tab:hover) {
    background: #e2e8f0;
}

.custom-tabs :deep(.p-tab[aria-selected='true']) {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
}

.custom-tabs :deep(.p-tabpanel) {
    padding: 0;
}

/* Panels mejorados */
.score-panel {
    transition: all 0.3s ease;
    border: 1px solid #e2e8f0;
}

.score-panel.has-data {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1);
}

.score-panel:deep(.p-panel-header) {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 0.75rem 1rem;
}

.score-panel:deep(.p-panel-content) {
    padding: 1.25rem;
}

.clinical-panel {
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
}

.clinical-panel:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.clinical-panel:deep(.p-panel-header) {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem;
}

.clinical-panel:deep(.p-panel-content) {
    padding: 1.25rem;
}

/* Modo edición */
.edit-mode .field {
    margin-bottom: 1.5rem;
}

.edit-mode .field label {
    color: #374151;
    font-weight: 500;
}

.edit-tabs :deep(.p-tablist) {
    background: #eff6ff;
    border-color: #bfdbfe;
}

.edit-tabs :deep(.p-tab[aria-selected='true']) {
    background: #dbeafe;
    border-color: #3b82f6;
}

/* Footer */
.details-footer {
    background: #f8fafc;
    border-radius: 8px;
    padding: 1rem;
    margin: 0 -1rem -1rem -1rem;
}

/* Responsive */
@media (max-width: 768px) {
    .medical-details-container {
        padding: 0.5rem;
    }

    .details-header {
        padding: 1rem;
    }

    .details-header .flex {
        flex-direction: column;
        align-items: flex-start !important;
        gap: 1rem;
    }

    .details-footer {
        margin: 1rem -0.5rem -0.5rem -0.5rem;
    }

    .details-footer .flex {
        flex-direction: column;
        gap: 1rem;
    }

    .details-footer .flex:last-child {
        width: 100%;
    }

    .details-footer .flex:last-child > div {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
    }

    .details-footer button {
        width: 100%;
    }

    .custom-tabs :deep(.p-tablist) {
        flex-wrap: wrap;
    }

    .custom-tabs :deep(.p-tab) {
        flex: 1;
        min-width: 120px;
    }
}

/* Animaciones suaves */
.medical-details-container,
.empty-state {
    animation: fadeInUp 0.4s ease-out;
}

.score-panel,
.clinical-panel {
    animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Estados de carga */
.p-button:disabled {
    opacity: 0.6;
}

/* Mejoras de accesibilidad */
.custom-tabs :deep(.p-tab:focus) {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

/* Colores de severidad personalizados */
.text-success {
    color: #10b981;
}
.text-warn {
    color: #f59e0b;
}
.text-danger {
    color: #ef4444;
}
.text-primary {
    color: #3b82f6;
}

/* Utilidades */
.bg-gray-50 {
    background-color: #f9fafb;
}
.border-gray-200 {
    border-color: #e5e7eb;
}
.text-gray-400 {
    color: #9ca3af;
}
.text-gray-500 {
    color: #6b7280;
}
.text-gray-600 {
    color: #4b5563;
}
.text-gray-700 {
    color: #374151;
}
.text-gray-800 {
    color: #1f2937;
}

/* ===== NUEVOS ESTILOS COMPACTOS ===== */

.audit-info-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--surface-200);
}

.audit-info-header .audit-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

.audit-info-header .audit-item i {
    font-size: 0.875rem;
}

.audit-info-header .audit-item b {
    font-weight: 600;
    color: var(--text-color);
}

/* Header Compacto */
.details-header-compact {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--surface-50);
    border: 1px solid var(--surface-200);
    border-radius: 8px;
}

.header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.header-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.header-icon {
    color: var(--primary-color);
    font-size: 1.25rem;
}

.header-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}

.header-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-color);
}

.header-subtitle {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

.header-badges {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* Scores Compactos */
.scores-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 0.5rem;
}

.score-card {
    flex: 1;
    min-width: 180px;
    background: var(--surface-card);
    border: 1px solid var(--surface-200);
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s ease;
}

.score-card--active {
    border-color: var(--primary-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.score-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.score-icon {
    font-size: 0.9rem;
    color: var(--text-color-secondary);
}

.score-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-color);
}

.score-body {
    text-align: center;
}

.score-value {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.score-value--success {
    color: var(--green-600);
}

.score-value--warn {
    color: var(--orange-600);
}

.score-value--danger {
    color: var(--red-600);
}

.score-progress {
    margin-bottom: 0.5rem;
}

.score-help {
    color: var(--text-color-secondary);
    font-size: 0.75rem;
    display: block;
}

.score-percentage {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    text-align: center;
    margin-bottom: 0.25rem;
    font-weight: 500;
}

/* Tarjeta de Evaluación CUDYR Completa */
.cudyr-evaluation-card {
    background: linear-gradient(135deg, var(--surface-card) 0%, var(--blue-50) 100%);
    border: 2px solid var(--primary-color);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.cudyr-eval-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color);
}

.cudyr-eval-header i {
    color: var(--primary-color);
    font-size: 1.25rem;
}

.cudyr-eval-title {
    flex: 1;
}

.cudyr-eval-body-simple {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0.5rem 0;
}

.cudyr-category-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
}

.cudyr-category-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-color);
}

.cudyr-category-display-simple {
    display: flex;
    align-items: center;
    justify-content: center;
}

.cudyr-score-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
}

.cudyr-score-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-color);
}

.cudyr-score-value-large {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--primary-color);
    line-height: 1;
}

/* Responsive para tarjeta CUDYR */
@media (max-width: 768px) {
    .cudyr-evaluation-card {
        padding: 0.75rem;
    }

    .cudyr-score-value-large {
        font-size: 2rem;
    }

    .cudyr-category-label,
    .cudyr-score-label {
        font-size: 0.85rem;
    }
}

.empty-scores {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
    text-align: center;
    color: var(--text-color-secondary);
}

.empty-scores i {
    font-size: 2rem;
    color: var(--surface-400);
}

/* Información Clínica Compacta */
.clinical-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.clinical-item {
    background: var(--surface-card);
    border: 1px solid var(--surface-200);
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s ease;
}

.clinical-item:hover {
    border-color: var(--primary-color-text);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.clinical-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.clinical-icon {
    font-size: 0.9rem;
}

.clinical-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-color);
}

.clinical-content {
    font-size: 0.9rem;
    line-height: 1.4;
    color: var(--text-color);
    white-space: pre-wrap;
}

.empty-clinical {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
    text-align: center;
    color: var(--text-color-secondary);
}

.empty-clinical i {
    font-size: 2rem;
    color: var(--surface-400);
}

/* Modo Edición Compacto */
.edit-mode-compact {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.edit-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--blue-50);
    border: 1px solid var(--blue-200);
    border-radius: 6px;
    font-size: 0.9rem;
}

.edit-info i {
    color: var(--blue-600);
}

.edit-info span {
    font-weight: 500;
    color: var(--blue-800);
}

.edit-info small {
    color: var(--blue-700);
    margin-left: auto;
}

/* Contenedor para copiar del día anterior */
.copy-from-previous-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 1rem;
    background: linear-gradient(135deg, var(--primary-50) 0%, var(--blue-50) 100%);
    border: 1px solid var(--primary-200);
    border-radius: 8px;
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.copy-helper-text {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--primary-700);
    font-weight: 500;
}

.copy-helper-text i {
    color: var(--primary-600);
    font-size: 0.9rem;
}

.edit-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.edit-section {
    background: var(--surface-50);
    border: 1px solid var(--surface-200);
    border-radius: 8px;
    padding: 1rem;
}

.edit-section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color);
}

.edit-section-title i {
    color: var(--primary-color);
}

/* Grid de Scores en Edición */
.scores-edit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.score-edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* Grid de Clínica en Edición */
.clinical-edit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
}

.clinical-edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.field-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-color);
}

.field-label i {
    font-size: 0.85rem;
}

.field-help {
    color: var(--text-color-secondary);
    font-size: 0.75rem;
    line-height: 1.3;
}

/* Footer Compacto */
.details-footer-compact {
    margin-top: 1rem;
    padding: 0.75rem;
    background: var(--surface-50);
    border: 1px solid var(--surface-200);
    border-radius: 6px;
}

.footer-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.footer-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-color-secondary);
}

.footer-info i {
    font-size: 0.75rem;
}

.footer-info-wrapper {
    flex: 1;
}

.audit-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.audit-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    padding: 0.375rem 0.625rem;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.audit-item--created {
    background: var(--blue-50);
    border-left: 3px solid var(--blue-500);
}

.audit-item--created i {
    color: var(--blue-600);
}

.audit-item--updated {
    background: var(--green-50);
    border-left: 3px solid var(--green-500);
}

.audit-item--updated i {
    color: var(--green-600);
}

.audit-item i {
    font-size: 0.875rem;
}

.audit-label {
    font-weight: 600;
    color: var(--text-color);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.audit-date {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    margin-left: auto;
    font-weight: 500;
}

.footer-actions {
    display: flex;
    gap: 0.5rem;
}

/* Responsive para diseño compacto */
@media (max-width: 768px) {
    .medical-details-container {
        padding: 0.5rem;
    }

    .header-content {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
    }

    .scores-container {
        flex-direction: column;
    }

    .score-card {
        min-width: auto;
    }

    .scores-edit-grid {
        grid-template-columns: 1fr;
    }

    .clinical-edit-grid {
        grid-template-columns: 1fr;
    }

    .footer-content {
        flex-direction: column;
        align-items: stretch;
    }

    .audit-item {
        flex-wrap: wrap;
        padding: 0.5rem;
    }

    .audit-label {
        font-size: 0.65rem;
    }

    .audit-date {
        margin-left: 0;
        width: 100%;
        margin-top: 0.25rem;
        padding-left: 1.5rem;
        font-size: 0.65rem;
    }

    .footer-actions {
        justify-content: center;
    }

    .edit-info {
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
    }

    .edit-info small {
        margin-left: 0;
        margin-top: 0.25rem;
    }
}

@media (max-width: 480px) {
    .footer-actions {
        flex-direction: column;
        width: 100%;
    }

    .footer-actions button {
        width: 100%;
    }

    .scores-edit-grid,
    .clinical-edit-grid {
        grid-template-columns: 1fr;
    }

    .audit-info {
        gap: 0.375rem;
    }

    .audit-item {
        font-size: 0.7rem;
    }

    .audit-item i {
        font-size: 0.75rem;
    }
}

/* Optimizaciones de espacio */
.custom-tabs :deep(.p-tablist) {
    margin-bottom: 0.75rem;
    padding: 0.25rem;
}

.custom-tabs :deep(.p-tab) {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
}

.custom-tabs :deep(.p-tabpanel) {
    padding: 0;
}

/* Progress Bar Optimizada */
:deep(.p-progressbar) {
    height: 14px;
    border-radius: 7px;
    background-color: var(--surface-200);
    overflow: hidden;
    border: 1px solid var(--surface-300);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

:deep(.p-progressbar .p-progressbar-value) {
    border-radius: 6px;
    transition: width 0.3s ease;
    position: relative;
    overflow: hidden;
}

/* Efecto de brillo en la barra */
:deep(.p-progressbar .p-progressbar-value::after) {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1));
    border-radius: 6px 6px 0 0;
}

/* Colores específicos para los diferentes niveles de severidad */
:deep(.p-progressbar.p-progressbar-success .p-progressbar-value) {
    background: linear-gradient(90deg, var(--green-500), var(--green-400));
}

:deep(.p-progressbar.p-progressbar-warn .p-progressbar-value) {
    background: linear-gradient(90deg, var(--orange-500), var(--orange-400));
}

:deep(.p-progressbar.p-progressbar-danger .p-progressbar-value) {
    background: linear-gradient(90deg, var(--red-500), var(--red-400));
}

:deep(.p-inputnumber-input) {
    padding: 0.5rem;
}

:deep(.p-inputtextarea) {
    padding: 0.5rem;
    font-size: 0.9rem;
}

/* ===== ESTILOS CUDYR ===== */

/* Sección CUDYR */
.cudyr-section {
    background: linear-gradient(135deg, var(--blue-50), var(--surface-card));
    border: 2px solid var(--primary-color);
}

.cudyr-toggle-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.cudyr-toggle-container {
    flex-shrink: 0;
}

.cudyr-toggle-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
}

/* Preview CUDYR */
.cudyr-preview-message {
    margin-bottom: 1rem;
    background: linear-gradient(135deg, var(--green-50), var(--surface-card));
    border-left: 4px solid var(--green-500);
}

.cudyr-preview-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.preview-label {
    font-weight: 600;
    font-size: 1rem;
}

.preview-scores {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
}

.preview-score-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
}

.preview-score-item i {
    font-size: 1.1rem;
    color: var(--primary-color);
}

/* Formulario CUDYR */
.cudyr-form-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.cudyr-dimensions-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.cudyr-dimension-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.dimension-label-compact {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text-color);
    padding: 0.5rem;
    background: var(--surface-100);
    border-radius: 6px;
}

.dimension-value-compact {
    background: var(--primary-color);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 700;
}

.dimension-options-compact {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.dimension-option-compact {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--surface-card);
    border: 2px solid var(--surface-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.dimension-option-compact:hover {
    background: var(--surface-50);
    border-color: var(--primary-color);
    transform: translateX(4px);
}

.dimension-option-compact.selected {
    background: var(--primary-50);
    border-color: var(--primary-color);
    box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2);
}

.option-radio-compact {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface-100);
    border: 2px solid var(--surface-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
    color: var(--text-color-secondary);
    transition: all 0.2s ease;
}

.dimension-option-compact.selected .option-radio-compact {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
}

.option-description-compact {
    flex: 1;
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text-color);
}

.cudyr-notes-field {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* Responsive CUDYR */
@media (max-width: 768px) {
    .cudyr-toggle-header {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
    }

    .cudyr-toggle-container {
        width: 100%;
    }

    .cudyr-toggle-label {
        justify-content: center;
    }

    .preview-header {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
    }

    .preview-scores {
        flex-direction: column;
        gap: 0.75rem;
    }

    .dimension-option-compact {
        padding: 0.5rem;
    }

    .option-radio-compact {
        width: 28px;
        height: 28px;
        font-size: 0.9rem;
    }

    .option-description-compact {
        font-size: 0.8rem;
    }
}
</style>
