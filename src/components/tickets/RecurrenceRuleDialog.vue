<script setup>
import { positions, users } from '@/api';
import { apiUtils } from '@/api/axios';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { computed, reactive, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    rule: {
        type: Object,
        default: null
    },
    saving: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:visible', 'save-rule', 'close']);

// Reactive variables for search results
const clientSearchResults = ref([]);
const positionSearchResults = ref([]);
const initialClientList = ref([]);
const initialPositionList = ref([]);

// Estado del diálogo
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const isEditing = computed(() => !!props.rule?.id);

const dialogTitle = computed(() => {
    return isEditing.value ? 'Editar Regla de Recurrencia' : 'Nueva Regla de Recurrencia';
});

// Formulario reactivo
const ruleForm = reactive({
    title: '',
    description: '',
    assignee_user_id: null,
    assignee_position: null,
    frequency: null,
    interval: 1,
    due_date_days_offset: 0,
    starts_at: null,
    ends_at: null,
    is_active: true
});

// Estado de validación
const validationErrors = ref({});
const touchedFields = ref({});

// Opciones para dropdowns
const frequencyOptions = ref([
    { label: 'Diaria', value: 'daily' },
    { label: 'Semanal', value: 'weekly' },
    { label: 'Mensual', value: 'monthly' },
    { label: 'Anual', value: 'yearly' }
]);

// Watchers
watch(
    () => props.rule,
    (newRule) => {
        if (newRule && props.visible) {
            loadRuleData(newRule);
        } else if (!newRule && props.visible) {
            resetForm();
        }
    },
    { immediate: true, deep: true }
);

watch(
    () => props.visible,
    async (visible) => {
        if (visible) {
            try {
                const [usersResponse, positionsResponse] = await Promise.all([users.list(), positions.getAll()]);

                if (apiUtils.isSuccess(usersResponse)) {
                    initialClientList.value = apiUtils.getData(usersResponse);
                    clientSearchResults.value = initialClientList.value;
                }
                if (apiUtils.isSuccess(positionsResponse)) {
                    initialPositionList.value = apiUtils.getData(positionsResponse).map((p) => ({ name: p, id: p }));
                    positionSearchResults.value = initialPositionList.value;
                }
            } catch (error) {
                console.error('Error fetching initial client/position lists:', error);
            }

            if (props.rule) {
                loadRuleData(props.rule);
            } else {
                resetForm();
            }

            if (props.rule?.assignee && !clientSearchResults.value.some((u) => u.id === props.rule.assignee.id)) {
                clientSearchResults.value.unshift(props.rule.assignee);
            }
            if (props.rule?.assignee_position && !positionSearchResults.value.some((p) => p.id === props.rule.assignee_position)) {
                positionSearchResults.value.unshift({ name: props.rule.assignee_position, id: props.rule.assignee_position });
            }
        } else {
            resetValidation();
        }
    }
);

// Métodos de carga y reset
const loadRuleData = (rule) => {
    Object.assign(ruleForm, {
        title: rule.title || '',
        description: rule.description || '',
        assignee_user_id: rule.assignee_user_id || null,
        assignee_position: rule.assignee_position || null,
        frequency: rule.frequency || null,
        interval: rule.interval || 1,
        due_date_days_offset: rule.due_date_days_offset || 0,
        starts_at: rule.starts_at ? new Date(rule.starts_at) : null,
        ends_at: rule.ends_at ? new Date(rule.ends_at) : null,
        is_active: rule.is_active !== undefined ? rule.is_active : true
    });
    if (rule.assignee && rule.assignee.id) {
        clientSearchResults.value = [rule.assignee];
    } else {
        clientSearchResults.value = initialClientList.value;
    }
    if (rule.assignee_position) {
        positionSearchResults.value = [{ name: rule.assignee_position, id: rule.assignee_position }];
    } else {
        positionSearchResults.value = initialPositionList.value;
    }
    resetValidation();
};

const resetForm = () => {
    Object.assign(ruleForm, {
        title: '',
        description: '',
        assignee_user_id: null,
        assignee_position: null,
        frequency: null,
        interval: 1,
        due_date_days_offset: 0,
        starts_at: null,
        ends_at: null,
        is_active: true
    });
    clientSearchResults.value = initialClientList.value;
    positionSearchResults.value = initialPositionList.value;
    resetValidation();
};

const resetValidation = () => {
    validationErrors.value = {};
    touchedFields.value = {};
};

// Search methods with debounce
const searchClients = (event) => {
    const query = event.value;
    if (query && query.length >= 2) {
        clientSearchResults.value = initialClientList.value.filter((client) => client.name.toLowerCase().includes(query.toLowerCase()));
    } else {
        clientSearchResults.value = initialClientList.value;
    }
};

const searchPositions = (event) => {
    const query = event.value;
    if (query && query.length >= 2) {
        positionSearchResults.value = initialPositionList.value.filter((position) => position.name.toLowerCase().includes(query.toLowerCase()));
    } else {
        positionSearchResults.value = initialPositionList.value;
    }
};

// Validaciones
const validateField = (fieldName) => {
    touchedFields.value[fieldName] = true;

    switch (fieldName) {
        case 'title':
            if (!ruleForm.title?.trim()) {
                validationErrors.value.title = 'El título es obligatorio';
            } else if (ruleForm.title.trim().length > 255) {
                validationErrors.value.title = 'El título no puede exceder 255 caracteres';
            } else {
                delete validationErrors.value.title;
            }
            break;

        case 'description':
            if (!ruleForm.description?.trim()) {
                validationErrors.value.description = 'La descripción es obligatoria';
            } else {
                delete validationErrors.value.description;
            }
            break;

        case 'assignee_user_id':
        case 'assignee_position':
            if (ruleForm.assignee_user_id && ruleForm.assignee_position) {
                validationErrors.value.assignee = 'No se puede asignar a un usuario y una posición al mismo tiempo';
            } else {
                delete validationErrors.value.assignee;
            }
            break;

        case 'frequency':
            if (!ruleForm.frequency) {
                validationErrors.value.frequency = 'La frecuencia es obligatoria';
            } else {
                delete validationErrors.value.frequency;
            }
            break;

        case 'interval':
            if (!ruleForm.interval || ruleForm.interval < 1) {
                validationErrors.value.interval = 'El intervalo debe ser un número positivo';
            } else {
                delete validationErrors.value.interval;
            }
            break;

        case 'starts_at':
            if (!ruleForm.starts_at) {
                validationErrors.value.starts_at = 'La fecha de inicio es obligatoria';
            } else {
                delete validationErrors.value.starts_at;
            }
            break;

        case 'ends_at':
            if (ruleForm.ends_at && ruleForm.starts_at && new Date(ruleForm.ends_at) < new Date(ruleForm.starts_at)) {
                validationErrors.value.ends_at = 'La fecha de fin no puede ser anterior a la fecha de inicio';
            } else {
                delete validationErrors.value.ends_at;
            }
            break;
    }
};

const validateAllFields = () => {
    const fieldsToValidate = ['title', 'description', 'frequency', 'interval', 'starts_at'];

    fieldsToValidate.forEach((field) => {
        validateField(field);
    });

    if (ruleForm.assignee_user_id && ruleForm.assignee_position) {
        validationErrors.value.assignee = 'No se puede asignar a un usuario y una posición al mismo tiempo';
    } else {
        delete validationErrors.value.assignee;
    }

    validateField('ends_at'); // Validate ends_at as well

    return Object.keys(validationErrors.value).length === 0;
};

const getFieldError = (fieldName) => {
    return touchedFields.value[fieldName] ? validationErrors.value[fieldName] : null;
};

// Computadas
const isFormValid = computed(() => {
    const hasErrors = Object.keys(validationErrors.value).length > 0;
    const hasRequiredFields = ruleForm.title && ruleForm.description && ruleForm.frequency && ruleForm.interval && ruleForm.starts_at;

    return hasRequiredFields && !hasErrors;
});

// Métodos de acción
const saveRule = () => {
    if (!validateAllFields()) {
        return;
    }

    const ruleData = { ...ruleForm };

    if (ruleData.starts_at) {
        ruleData.starts_at = ruleData.starts_at.toISOString();
    }
    if (ruleData.ends_at) {
        ruleData.ends_at = ruleData.ends_at.toISOString();
    }

    emit('save-rule', ruleData);
};

const closeDialog = () => {
    emit('close');
};

const onDialogHide = () => {
    emit('close');
};
</script>

<template>
    <Dialog v-model:visible="dialogVisible" :header="dialogTitle" :modal="true" class="p-fluid recurrence-rule-dialog" :style="{ width: '700px', maxHeight: '90vh' }" :closable="!saving" :closeOnEscape="!saving" @hide="onDialogHide">
        <template #header>
            <div class="flex align-items-center gap-2">
                <i :class="isEditing ? 'pi pi-pencil text-orange-600' : 'pi pi-plus-circle text-green-600'" class="text-xl"></i>
                <span class="font-semibold">{{ dialogTitle }}</span>
            </div>
        </template>

        <form @submit.prevent="saveRule" class="mt-3">
            <div class="formgrid grid compact-form mb-3">
                <!-- Título y Descripción -->
                <div class="col-12">
                    <div class="field">
                        <label for="title" class="compact-label"> Título * </label>
                        <InputText id="title" v-model="ruleForm.title" :class="{ 'p-invalid': getFieldError('title') }" placeholder="Tarea de mantenimiento semanal" maxlength="255" @blur="validateField('title')" class="compact-input" fluid />
                        <small class="p-error" v-if="getFieldError('title')">{{ getFieldError('title') }}</small>
                    </div>
                </div>
                <div class="col-12">
                    <div class="field">
                        <label for="description" class="compact-label"> Descripción * </label>
                        <Textarea
                            id="description"
                            v-model="ruleForm.description"
                            :class="{ 'p-invalid': getFieldError('description') }"
                            placeholder="Limpiar servidores, revisar logs, etc."
                            rows="3"
                            cols="30"
                            @blur="validateField('description')"
                            class="compact-input"
                            fluid
                        />
                        <small class="p-error" v-if="getFieldError('description')">{{ getFieldError('description') }}</small>
                    </div>
                </div>

                <!-- Asignación -->
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="assignee_user_id" class="compact-label"> Asignar a Usuario (Opcional) </label>
                        <Select
                            id="assignee_user_id"
                            v-model="ruleForm.assignee_user_id"
                            :options="clientSearchResults"
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Seleccionar usuario"
                            :filter="true"
                            filterPlaceholder="Buscar usuario"
                            @filter="searchClients"
                            :class="{ 'p-invalid': getFieldError('assignee') }"
                            @change="validateField('assignee_user_id')"
                            class="compact-input-select"
                            fluid
                            :showClear="true"
                        />
                        <small class="p-error" v-if="getFieldError('assignee')">{{ getFieldError('assignee') }}</small>
                    </div>
                </div>
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="assignee_position" class="compact-label"> Asignar a Cargo (Opcional) </label>
                        <Select
                            id="assignee_position"
                            v-model="ruleForm.assignee_position"
                            :options="positionSearchResults"
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Seleccionar cargo"
                            :filter="true"
                            filterPlaceholder="Buscar cargo"
                            @filter="searchPositions"
                            :class="{ 'p-invalid': getFieldError('assignee') }"
                            @change="validateField('assignee_position')"
                            class="compact-input-select"
                            fluid
                            :showClear="true"
                        />
                        <small class="p-error" v-if="getFieldError('assignee')">{{ getFieldError('assignee') }}</small>
                    </div>
                </div>

                <!-- Frecuencia e Intervalo -->
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="frequency" class="compact-label"> Frecuencia * </label>
                        <Select
                            id="frequency"
                            v-model="ruleForm.frequency"
                            :options="frequencyOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Seleccionar frecuencia"
                            :class="{ 'p-invalid': getFieldError('frequency') }"
                            @change="validateField('frequency')"
                            class="compact-input-select"
                            fluid
                        />
                        <small class="p-error" v-if="getFieldError('frequency')">{{ getFieldError('frequency') }}</small>
                    </div>
                </div>
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="interval" class="compact-label"> Intervalo * </label>
                        <InputNumber id="interval" v-model="ruleForm.interval" :class="{ 'p-invalid': getFieldError('interval') }" :min="1" @blur="validateField('interval')" class="compact-input" fluid />
                        <small class="p-error" v-if="getFieldError('interval')">{{ getFieldError('interval') }}</small>
                    </div>
                </div>

                <!-- Offset de Días para Fecha Límite -->
                <div class="col-12">
                    <div class="field">
                        <label for="due_date_days_offset" class="compact-label"> Días de Offset para Fecha Límite (desde generación) </label>
                        <InputNumber id="due_date_days_offset" v-model="ruleForm.due_date_days_offset" :min="0" :max="365" class="compact-input" fluid />
                    </div>
                </div>

                <!-- Fechas de Inicio y Fin -->
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="starts_at" class="compact-label"> Fecha de Inicio * </label>
                        <Calendar
                            id="starts_at"
                            v-model="ruleForm.starts_at"
                            dateFormat="dd/mm/yy"
                            placeholder="Seleccionar fecha de inicio"
                            :class="{ 'p-invalid': getFieldError('starts_at') }"
                            @blur="validateField('starts_at')"
                            class="compact-input-select"
                            fluid
                            :showIcon="true"
                        />
                        <small class="p-error" v-if="getFieldError('starts_at')">{{ getFieldError('starts_at') }}</small>
                    </div>
                </div>
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="ends_at" class="compact-label"> Fecha de Fin (Opcional) </label>
                        <Calendar id="ends_at" v-model="ruleForm.ends_at" dateFormat="dd/mm/yy" placeholder="Seleccionar fecha de fin" :minDate="ruleForm.starts_at" class="compact-input-select" fluid :showIcon="true" :showClear="true" />
                        <small class="p-error" v-if="getFieldError('ends_at')">{{ getFieldError('ends_at') }}</small>
                    </div>
                </div>

                <!-- Activo -->
                <div class="col-12">
                    <div class="field-checkbox">
                        <Checkbox id="is_active" v-model="ruleForm.is_active" :binary="true" />
                        <label for="is_active"> Regla Activa </label>
                    </div>
                </div>
            </div>
        </form>

        <template #footer>
            <div class="flex justify-content-between align-items-center">
                <div class="text-500 text-sm">* Campos obligatorios</div>
                <div class="flex gap-2">
                    <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="closeDialog" :disabled="saving" />
                    <Button :label="isEditing ? 'Actualizar' : 'Crear Regla'" :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'" @click="saveRule" :loading="saving" :disabled="!isFormValid" />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
/* Layout compacto principal */
.recurrence-rule-dialog {
    max-width: 92vw;
    max-height: 85vh;
    overflow: hidden;
}

:deep(.p-dialog-content) {
    padding: 0.75rem;
    max-height: calc(85vh - 120px);
    overflow-y: auto;
}

.compact-form {
    gap: 0.5rem;
}

/* Labels compactos */
.compact-label {
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 0.25rem;
    display: block;
    font-size: 0.85rem;
}

/* Campos de entrada compactos */
.compact-input,
:deep(.compact-input) {
    padding: 0.5rem 0.75rem !important;
    font-size: 0.9rem !important;
    transition: all 0.15s ease !important;
    height: 2.5rem !important;
}

.compact-input-select,
:deep(.compact-input-select) {
    font-size: 0.9rem !important;
    transition: all 0.15s ease !important;
    height: 2.5rem !important;
}

.compact-input:hover,
:deep(.compact-input:hover),
:deep(.compact-input:hover input) {
    border-color: var(--primary-300) !important;
}

.compact-input:focus,
:deep(.compact-input:focus),
:deep(.compact-input:focus input),
:deep(.compact-input.p-focus) {
    border-color: var(--primary-color) !important;
    box-shadow: 0 0 0 2px var(--primary-100) !important;
}

/* Campos de entrada específicos */
:deep(.p-inputtext.compact-input) {
    padding: 0.5rem 0.75rem;
    height: 2.5rem;
}

:deep(.p-dropdown.compact-input-select) {
    height: 2.5rem;
}

:deep(.p-dropdown.compact-input-select .p-dropdown-label) {
    padding: 0.5rem 0.75rem;
    line-height: 1.5;
}

:deep(.p-calendar.compact-input-select .p-inputtext) {
    padding: 0.5rem 0.75rem !important;
    height: 2.5rem !important;
}

:deep(.p-textarea.compact-input) {
    padding: 0.5rem 0.75rem !important;
    min-height: 6rem; /* Adjust height for textarea */
    height: auto !important;
}

/* Campos compactos */
.field {
    margin-bottom: 1rem;
}

.field:last-child {
    margin-bottom: 0;
}

/* Mensajes de error compactos */
.p-error {
    font-size: 0.75rem;
    font-weight: 500;
    margin-top: 0.25rem;
    color: var(--red-600);
}

/* Textos de ayuda compactos */
small.text-500 {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    margin-top: 0.15rem;
    display: block;
    line-height: 1.2;
}

/* Estados inválidos */
:deep(.p-invalid.compact-input),
:deep(.p-invalid.compact-input input),
:deep(.p-invalid.compact-input-select .p-inputtext),
:deep(.p-invalid.compact-input-select .p-dropdown-label) {
    border-color: var(--red-500) !important;
    background-color: var(--red-50) !important;
}

/* Header compacto */
:deep(.p-dialog-header) {
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, var(--primary-50) 0%, var(--surface-0) 100%);
    border-bottom: 1px solid var(--surface-200);
    border-radius: 8px 8px 0 0;
}

:deep(.p-dialog-header .p-dialog-title) {
    font-weight: 700;
    font-size: 1.1rem;
}

/* Footer compacto */
:deep(.p-dialog-footer) {
    padding: 0.75rem 1.25rem;
    background: var(--surface-50);
    border-top: 1px solid var(--surface-200);
    border-radius: 0 0 8px 8px;
}

:deep(.p-button) {
    border-radius: 6px;
    font-weight: 600;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    transition: all 0.15s ease;
}

:deep(.p-button:hover) {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Select panel compacto */
:deep(.p-dropdown-panel) {
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    border: 1px solid var(--surface-200);
}

:deep(.p-dropdown-item) {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
}

/* Calendar panel compacto */
:deep(.p-datepicker) {
    border-radius: 6px;
    box-shadow: 0 44px 12px rgba(0, 0, 0, 0.12);
    border: 1px solid var(--surface-200);
}

/* Responsive ultra compacto */
@media (max-width: 968px) {
    .recurrence-rule-dialog {
        max-width: 95vw;
    }

    .compact-form .col-12.md\:col-6 {
        flex: 0 0 auto;
        width: 50%;
    }
}

@media (max-width: 768px) {
    .recurrence-rule-dialog {
        margin: 0.5rem;
        max-width: calc(100vw - 1rem);
        max-height: 90vh;
    }

    :deep(.p-dialog-content) {
        padding: 0.5rem;
        max-height: calc(90vh - 100px);
    }

    .compact-form .col-12.md\:col-6 {
        width: 100%;
        margin-bottom: 0.5rem;
    }

    .field {
        margin-bottom: 0.6rem;
    }

    :deep(.p-dialog-header),
    :deep(.p-dialog-footer) {
        padding: 0.75rem 1rem;
    }
}

@media (max-width: 480px) {
    .recurrence-rule-dialog {
        margin: 0.25rem;
        max-width: calc(100vw - 0.5rem);
        max-height: 95vh;
    }

    :deep(.p-dialog-content) {
        max-height: calc(95vh - 80px);
    }

    .compact-label {
        font-size: 0.8rem;
        margin-bottom: 0.2rem;
    }

    .field {
        margin-bottom: 0.5rem;
    }

    :deep(.p-dialog-header),
    :deep(.p-dialog-footer) {
        padding: 0.5rem 0.75rem;
    }

    :deep(.p-button) {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
    }

    .flex.gap-2 {
        gap: 0.5rem;
    }
}

/* Modo oscuro */
@media (prefers-color-scheme: dark) {
    :deep(.p-dialog-footer) {
        background: var(--surface-900);
    }

    :deep(.p-dialog-header) {
        background: linear-gradient(135deg, var(--surface-800) 0%, var(--surface-900) 100%);
    }
}

/* Scrollbar personalizada */
:deep(.p-dialog-content)::-webkit-scrollbar {
    width: 4px;
}

:deep(.p-dialog-content)::-webkit-scrollbar-track {
    background: var(--surface-100);
}

:deep(.p-dialog-content)::-webkit-scrollbar-thumb {
    background: var(--primary-300);
    border-radius: 2px;
}

:deep(.p-dialog-content)::-webkit-scrollbar-thumb:hover {
    background: var(--primary-400);
}
</style>
