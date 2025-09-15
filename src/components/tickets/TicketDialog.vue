<script setup>
import { positions, users } from '@/api';
import { apiUtils } from '@/api/axios';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import { computed, reactive, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    ticket: {
        type: Object,
        default: null
    },
    saving: {
        type: Boolean,
        default: false
    }
});

// Reactive variables for search results
const clientSearchResults = ref([]);
const positionSearchResults = ref([]);
const initialClientList = ref([]); // To store the full list of clients
const initialPositionList = ref([]); // To store the full list of positions

// Debounce function
let debounceTimer = null;
const debounce = (func, delay) => {
    return function (...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
};

const emit = defineEmits(['update:visible', 'save-ticket', 'close']);

// Estado del diálogo
const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const isEditing = computed(() => !!props.ticket?.id);

const dialogTitle = computed(() => {
    return isEditing.value ? 'Editar Ticket' : 'Nuevo Ticket';
});

// Formulario reactivo
const ticketForm = reactive({
    title: '',
    description: '',
    assignee_user_id: null,
    assignee_position: null,
    due_date: null // Date object
});

// Estado de validación
const validationErrors = ref({});
const touchedFields = ref({});

// Watchers
watch(
    () => props.ticket,
    (newTicket) => {
        if (newTicket && props.visible) {
            loadTicketData(newTicket);
        } else if (!newTicket && props.visible) {
            resetForm();
        }
    },
    { immediate: true, deep: true }
);

watch(
    () => props.visible,
    async (visible) => {
        if (visible) {
            // Fetch initial lists when dialog opens
            try {
                const [usersResponse, positionsResponse] = await Promise.all([users.list(), positions.getAll()]);

                if (apiUtils.isSuccess(usersResponse)) {
                    initialClientList.value = apiUtils.getData(usersResponse);
                    clientSearchResults.value = initialClientList.value;
                    console.log('clientSearchResults:', clientSearchResults.value);
                }
                if (apiUtils.isSuccess(positionsResponse)) {
                    initialPositionList.value = apiUtils.getData(positionsResponse).map((p) => ({ name: p, id: p }));
                    positionSearchResults.value = initialPositionList.value;
                    console.log('positionSearchResults:', positionSearchResults.value);
                }
            } catch (error) {
                console.error('Error fetching initial client/position lists:', error);
            }

            if (props.ticket) {
                loadTicketData(props.ticket);
            } else {
                resetForm();
            }

            // Ensure assigned user/position is in the search results if editing
            if (props.ticket?.assignee_user && !clientSearchResults.value.some((u) => u.id === props.ticket.assignee_user.id)) {
                clientSearchResults.value.unshift(props.ticket.assignee_user);
            }
            if (props.ticket?.assignee_position_obj && !positionSearchResults.value.some((p) => p.id === props.ticket.assignee_position_obj.id)) {
                positionSearchResults.value.unshift(props.ticket.assignee_position_obj);
            }
        } else {
            resetValidation();
        }
    }
);

// Métodos de carga y reset
const loadTicketData = (ticket) => {
    Object.assign(ticketForm, {
        title: ticket.title || '',
        description: ticket.description || '',
        assignee_user_id: ticket.assignee_user_id || null,
        assignee_position: ticket.assignee_position || null,
        due_date: ticket.due_date ? new Date(ticket.due_date) : null
    });
    // Populate search results if a user/position is already assigned
    if (ticket.assignee_user_id && ticket.assignee_user) {
        clientSearchResults.value = [ticket.assignee_user];
    } else {
        clientSearchResults.value = [];
    }
    if (ticket.assignee_position && ticket.assignee_position_obj) {
        positionSearchResults.value = [ticket.assignee_position_obj];
    } else {
        positionSearchResults.value = [];
    }
    resetValidation();
};

const resetForm = () => {
    Object.assign(ticketForm, {
        title: '',
        description: '',
        assignee_user_id: null,
        assignee_position: null,
        due_date: null
    });
    clientSearchResults.value = [];
    positionSearchResults.value = [];
    resetValidation();
};

const resetValidation = () => {
    validationErrors.value = {};
    touchedFields.value = {};
};

// Search methods with debounce
let clientSearchTimeout = null;
const searchClients = (event) => {
    const query = event.value;
    if (query && query.length >= 2) {
        clientSearchResults.value = initialClientList.value.filter((client) => client.name.toLowerCase().includes(query.toLowerCase()));
    } else {
        clientSearchResults.value = initialClientList.value;
    }
};

let positionSearchTimeout = null;
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
            if (!ticketForm.title.trim()) {
                validationErrors.value.title = 'El título es obligatorio';
            } else if (ticketForm.title.trim().length > 255) {
                validationErrors.value.title = 'El título no puede exceder 255 caracteres';
            } else {
                delete validationErrors.value.title;
            }
            break;

        case 'description':
            if (!ticketForm.description.trim()) {
                validationErrors.value.description = 'La descripción es obligatoria';
            } else {
                delete validationErrors.value.description;
            }
            break;

        case 'assignee_user_id':
        case 'assignee_position':
            // If one is selected, the other should be null
            if (ticketForm.assignee_user_id && ticketForm.assignee_position) {
                validationErrors.value.assignee = 'No se puede asignar a un usuario y una posición al mismo tiempo';
            } else {
                delete validationErrors.value.assignee;
            }
            break;

        case 'due_date':
            // Optional field, no specific validation needed unless it's in the past
            if (ticketForm.due_date && new Date(ticketForm.due_date) < new Date()) {
                // This validation should ideally be handled by backend, but can be a client-side hint
                // validationErrors.value.due_date = 'La fecha límite no puede ser en el pasado';
            } else {
                delete validationErrors.value.due_date;
            }
            break;
    }
};

const validateAllFields = () => {
    const fieldsToValidate = ['title', 'description'];

    fieldsToValidate.forEach((field) => {
        validateField(field);
    });

    // Special validation for assignee fields
    if (ticketForm.assignee_user_id && ticketForm.assignee_position) {
        validationErrors.value.assignee = 'No se puede asignar a un usuario y una posición al mismo tiempo';
    } else {
        delete validationErrors.value.assignee;
    }

    return Object.keys(validationErrors.value).length === 0;
};

const getFieldError = (fieldName) => {
    return touchedFields.value[fieldName] ? validationErrors.value[fieldName] : null;
};

// Computadas
const isFormValid = computed(() => {
    const hasErrors = Object.keys(validationErrors.value).length > 0;
    const hasRequiredFields = ticketForm.title && ticketForm.description;

    return hasRequiredFields && !hasErrors;
});

// Métodos de acción
const saveTicket = () => {
    if (!validateAllFields()) {
        return;
    }

    const ticketData = { ...ticketForm };

    // Format due_date to ISO string if it exists
    if (ticketData.due_date) {
        ticketData.due_date = ticketData.due_date.toISOString();
    }

    emit('save-ticket', ticketData);
};

const closeDialog = () => {
    emit('close');
};

const onDialogHide = () => {
    emit('close');
};
</script>

<template>
    <Dialog v-model:visible="dialogVisible" :header="dialogTitle" :modal="true" class="p-fluid ticket-dialog" :style="{ width: '600px', maxHeight: '85vh' }" :closable="!saving" :closeOnEscape="!saving" @hide="onDialogHide">
        <template #header>
            <div class="flex align-items-center gap-2">
                <i :class="isEditing ? 'pi pi-ticket text-orange-600' : 'pi pi-plus-circle text-green-600'" class="text-xl"></i>
                <span class="font-semibold">{{ dialogTitle }}</span>
            </div>
        </template>

        <form @submit.prevent="saveTicket" class="mt-3">
            <!-- Fila 1: Título y Descripción -->
            <div class="formgrid grid compact-form mb-3">
                <div class="col-12">
                    <div class="field">
                        <label for="title" class="compact-label"> Título * </label>
                        <InputText id="title" v-model="ticketForm.title" :class="{ 'p-invalid': getFieldError('title') }" placeholder="Problema con la impresora" maxlength="255" @blur="validateField('title')" class="compact-input" fluid />
                        <small class="p-error" v-if="getFieldError('title')">{{ getFieldError('title') }}</small>
                    </div>
                </div>
                <div class="col-12">
                    <div class="field">
                        <label for="description" class="compact-label"> Descripción * </label>
                        <Textarea
                            id="description"
                            v-model="ticketForm.description"
                            :class="{ 'p-invalid': getFieldError('description') }"
                            placeholder="La impresora del departamento de contabilidad no funciona."
                            rows="5"
                            cols="30"
                            @blur="validateField('description')"
                            class="compact-input"
                            fluid
                        />
                        <small class="p-error" v-if="getFieldError('description')">{{ getFieldError('description') }}</small>
                    </div>
                </div>
            </div>

            <!-- Fila 2: Asignación -->
            <div class="formgrid grid compact-form mb-3">
                <div class="col-12 md:col-6">
                    <div class="field">
                        <label for="assignee_user_id" class="compact-label"> Asignar a Usuario (Opcional) </label>
                        <Select
                            id="assignee_user_id"
                            v-model="ticketForm.assignee_user_id"
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
                            v-model="ticketForm.assignee_position"
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
            </div>

            <!-- Fila 3: Fecha Límite -->
            <div class="formgrid grid compact-form">
                <div class="col-12">
                    <div class="field">
                        <label for="due_date" class="compact-label"> Fecha y Hora Límite (Opcional) </label>
                        <Calendar
                            id="due_date"
                            v-model="ticketForm.due_date"
                            showTime
                            hourFormat="24"
                            dateFormat="dd/mm/yy"
                            placeholder="Seleccionar fecha y hora"
                            @blur="validateField('due_date')"
                            class="compact-input-select"
                            fluid
                            :showIcon="true"
                            :showClear="true"
                        />
                        <small class="p-error" v-if="getFieldError('due_date')">{{ getFieldError('due_date') }}</small>
                    </div>
                </div>
            </div>
        </form>

        <template #footer>
            <div class="flex justify-content-between align-items-center">
                <div class="text-500 text-sm">* Campos obligatorios</div>
                <div class="flex gap-2">
                    <Button label="Cancelar" icon="pi pi-times" class="p-button-text" @click="closeDialog" :disabled="saving" />
                    <Button :label="isEditing ? 'Actualizar' : 'Crear Ticket'" :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'" @click="saveTicket" :loading="saving" :disabled="!isFormValid" />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
/* Layout compacto principal */
.ticket-dialog {
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
    .ticket-dialog {
        max-width: 95vw;
    }

    .compact-form .col-12.md\\:col-6 {
        flex: 0 0 auto;
        width: 50%;
    }
}

@media (max-width: 768px) {
    .ticket-dialog {
        margin: 0.5rem;
        max-width: calc(100vw - 1rem);
        max-height: 90vh;
    }

    :deep(.p-dialog-content) {
        padding: 0.5rem;
        max-height: calc(90vh - 100px);
    }

    .compact-form .col-12.md\\:col-6 {
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
    .ticket-dialog {
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
