<script setup>
import { positions, users } from '@/api';
import { apiUtils } from '@/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useTicketCommentsStore } from '@/store/ticketCommentsStore';
import { useTicketsStore } from '@/store/ticketsStore';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import TabPanel from 'primevue/tabpanel';
import TabView from 'primevue/tabview';
import Textarea from 'primevue/textarea';
import { computed, reactive, ref, watch } from 'vue';
import TicketAttachments from './TicketAttachments.vue';
import TicketStatusHistory from './TicketStatusHistory.vue';

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

const emit = defineEmits(['update:visible', 'save-ticket', 'close']);

const authStore = useAuthStore();
const ticketCommentsStore = useTicketCommentsStore();
const ticketsStore = useTicketsStore();

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

const isEditing = computed(() => !!props.ticket?.id);

// Computed para obtener el ticket actualizado del store
const currentTicket = computed(() => {
    if (!props.ticket?.id) return props.ticket;
    
    // Buscar el ticket actualizado en el store
    const updatedTicket = ticketsStore.tickets.find(t => t.id === props.ticket.id);
    return updatedTicket || props.ticket;
});

const dialogTitle = computed(() => {
    return isEditing.value ? 'Editar Ticket' : 'Nuevo Ticket';
});

// Formulario reactivo
const ticketForm = reactive({
    title: '',
    description: '',
    assignee_user_id: null,
    assignee_position: null,
    due_date: null,
    priority: null,
    status: null
});

const newCommentContent = ref('');

// Estado de validación
const validationErrors = ref({});
const touchedFields = ref({});

// Opciones para dropdowns
const priorityOptions = ref([
    { label: 'Baja', value: 'baja' },
    { label: 'Media', value: 'media' },
    { label: 'Alta', value: 'alta' },
    { label: 'Urgente', value: 'urgente' }
]);

const statusOptions = ref([
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'En Proceso', value: 'en proceso' },
    { label: 'Concluido', value: 'concluido' },
    { label: 'Rechazado', value: 'rechazado' },
    { label: 'Anulado', value: 'anulado' }
]);

// Computed para opciones de estado filtradas por autorización
const filteredStatusOptions = computed(() => {
    if (!isEditing.value) {
        return statusOptions.value.filter((opt) => opt.value === 'pendiente');
    }

    const currentUser = authStore.getUser;
    const isCreator = currentUser && currentUser.id === currentTicket.value?.creator_user_id;
    const isAssignee = currentUser && currentUser.id === currentTicket.value?.assignee_user_id;
    const currentStatus = currentTicket.value?.status;

    if (isCreator) {
        if (currentStatus === 'pendiente') {
            return statusOptions.value.filter((opt) => opt.value === 'pendiente' || opt.value === 'anulado');
        } else {
            return statusOptions.value.filter((opt) => opt.value === currentStatus);
        }
    } else if (isAssignee) {
        return statusOptions.value.filter((opt) => opt.value === currentStatus || opt.value === 'en proceso' || opt.value === 'concluido' || opt.value === 'rechazado');
    }
    return statusOptions.value.filter((opt) => opt.value === currentStatus);
});

// Watchers
watch(
    () => props.ticket,
    (newTicket) => {
        if (newTicket && props.visible) {
            loadTicketData(newTicket);
            if (newTicket.id) {
                ticketCommentsStore.fetchComments(newTicket.id);
            }
        } else if (!newTicket && props.visible) {
            resetForm();
        }
    },
    { immediate: true, deep: true }
);

// Watcher para el ticket actualizado del store
watch(
    currentTicket,
    (newTicket) => {
        if (newTicket && props.visible && isEditing.value) {
            // Solo actualizar los campos si el ticket ha cambiado
            const hasChanged = JSON.stringify(newTicket) !== JSON.stringify(props.ticket);
            if (hasChanged) {
                console.log('[TicketDialog] Ticket updated from store, reloading data');
                loadTicketData(newTicket);
            }
        }
    },
    { deep: true }
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

            if (props.ticket) {
                loadTicketData(props.ticket);
                ticketCommentsStore.fetchComments(props.ticket.id);
            } else {
                resetForm();
            }

            if (props.ticket?.assignee && !clientSearchResults.value.some((u) => u.id === props.ticket.assignee.id)) {
                clientSearchResults.value.unshift(props.ticket.assignee);
            }
            if (props.ticket?.assignee_position && !positionSearchResults.value.some((p) => p.id === props.ticket.assignee_position)) {
                positionSearchResults.value.unshift({ name: props.ticket.assignee_position, id: props.ticket.assignee_position });
            }
        } else {
            resetValidation();
            ticketCommentsStore.state.comments = []; // Clear comments when dialog closes
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
        due_date: ticket.due_date ? new Date(ticket.due_date) : null,
        priority: ticket.priority || null,
        status: ticket.status || null
    });
    if (ticket.assignee && ticket.assignee.id) {
        clientSearchResults.value = [ticket.assignee];
    } else {
        clientSearchResults.value = initialClientList.value;
    }
    if (ticket.assignee_position) {
        positionSearchResults.value = [{ name: ticket.assignee_position, id: ticket.assignee_position }];
    } else {
        positionSearchResults.value = initialPositionList.value;
    }
    resetValidation();
};

const resetForm = () => {
    Object.assign(ticketForm, {
        title: '',
        description: '',
        assignee_user_id: null,
        assignee_position: null,
        due_date: null,
        priority: null,
        status: 'pendiente'
    });
    newCommentContent.value = '';
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
            if (!ticketForm.title?.trim()) {
                validationErrors.value.title = 'El título es obligatorio';
            } else if (ticketForm.title.trim().length > 255) {
                validationErrors.value.title = 'El título no puede exceder 255 caracteres';
            } else {
                delete validationErrors.value.title;
            }
            break;

        case 'description':
            if (!ticketForm.description?.trim()) {
                validationErrors.value.description = 'La descripción es obligatoria';
            } else {
                delete validationErrors.value.description;
            }
            break;

        case 'assignee_user_id':
        case 'assignee_position':
            if (ticketForm.assignee_user_id && ticketForm.assignee_position) {
                validationErrors.value.assignee = 'No se puede asignar a un usuario y una posición al mismo tiempo';
            } else {
                delete validationErrors.value.assignee;
            }
            break;

        case 'due_date':
            if (ticketForm.due_date && new Date(ticketForm.due_date) < new Date()) {
                validationErrors.value.due_date = 'La fecha límite no puede ser en el pasado';
            } else {
                delete validationErrors.value.due_date;
            }
            break;
        case 'priority':
            if (!ticketForm.priority) {
                validationErrors.value.priority = 'La prioridad es obligatoria';
            } else {
                delete validationErrors.value.priority;
            }
            break;
        case 'status':
            if (!ticketForm.status) {
                validationErrors.value.status = 'El estado es obligatorio';
            } else {
                delete validationErrors.value.status;
            }
            break;
    }
};

const validateAllFields = () => {
    const fieldsToValidate = ['title', 'description', 'priority', 'status'];

    fieldsToValidate.forEach((field) => {
        validateField(field);
    });

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
    const hasRequiredFields = ticketForm.title && ticketForm.description && ticketForm.priority && ticketForm.status;

    return hasRequiredFields && !hasErrors;
});

// Métodos de acción
const saveTicket = () => {
    if (!validateAllFields()) {
        return;
    }

    const ticketData = { ...ticketForm };

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

// const getStatusSeverity = (status) => {
//     switch (status) {
//         case 'pendiente':
//             return 'info';
//         case 'en proceso':
//             return 'warning';
//         case 'concluido':
//             return 'success';
//         case 'rechazado':
//             return 'danger';
//         case 'anulado':
//             return 'secondary';
//         default:
//             return null;
//     }
// };

const addComment = async () => {
    if (!newCommentContent.value.trim()) return;
    if (!props.ticket?.id) return; // Cannot add comment to a new ticket

    try {
        await ticketCommentsStore.addComment(props.ticket.id, { content: newCommentContent.value });
        newCommentContent.value = ''; // Clear input
    } catch (error) {
        console.error('Error adding comment:', error);
    }
};

const getInitials = (name) => {
    if (!name) return '';
    return name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
};

const getAvatarColor = (name) => {
    if (!name) return '#ccc';
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#EC4899', '#14B8A6', '#F87171'];

    const hash = name.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length];
};
</script>

<template>
    <Dialog v-model:visible="dialogVisible" :header="dialogTitle" :modal="true" class="p-fluid ticket-dialog" :style="{ width: '700px', maxHeight: '90vh' }" :closable="!saving" :closeOnEscape="!saving" @hide="onDialogHide">
        <template #header>
            <div class="flex align-items-center gap-2">
                <i :class="isEditing ? 'pi pi-ticket text-orange-600' : 'pi pi-plus-circle text-green-600'" class="text-xl"></i>
                <span class="font-semibold">{{ dialogTitle }}</span>
            </div>
        </template>

        <TabView>
            <TabPanel header="Detalles del Ticket">
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

                    <!-- Fila 2: Prioridad y Estado -->
                    <div class="formgrid grid compact-form mb-3">
                        <div class="col-12 md:col-6">
                            <div class="field">
                                <label for="priority" class="compact-label"> Prioridad * </label>
                                <Select
                                    id="priority"
                                    v-model="ticketForm.priority"
                                    :options="priorityOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Seleccionar prioridad"
                                    :class="{ 'p-invalid': getFieldError('priority') }"
                                    @change="validateField('priority')"
                                    class="compact-input-select"
                                    fluid
                                />
                                <small class="p-error" v-if="getFieldError('priority')">{{ getFieldError('priority') }}</small>
                            </div>
                        </div>
                        <div class="col-12 md:col-6">
                            <div class="field">
                                <label for="status" class="compact-label"> Estado * </label>
                                <Select
                                    id="status"
                                    v-model="ticketForm.status"
                                    :options="filteredStatusOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Seleccionar estado"
                                    :class="{ 'p-invalid': getFieldError('status') }"
                                    @change="validateField('status')"
                                    class="compact-input-select"
                                    fluid
                                />
                                <small class="p-error" v-if="getFieldError('status')">{{ getFieldError('status') }}</small>
                            </div>
                        </div>
                    </div>

                    <!-- Fila 3: Asignación -->
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

                    <!-- Fila 4: Fecha Límite -->
                    <div class="formgrid grid compact-form mb-3">
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
            </TabPanel>

            <TabPanel header="Historial de Estados" :disabled="!isEditing">
                <TicketStatusHistory v-if="isEditing" :ticket="props.ticket" />
                <div v-else class="p-message p-message-info mt-3">
                    <div class="p-message-wrapper">
                        <span class="p-message-icon pi pi-info-circle"></span>
                        <div class="p-message-text">El historial de estados estará disponible una vez que el ticket sea creado.</div>
                    </div>
                </div>
            </TabPanel>

            <TabPanel header="Comentarios" :disabled="!isEditing">
                <div v-if="ticketCommentsStore.state.isLoading" class="text-center p-4"><i class="pi pi-spin pi-spinner text-xl"></i> Cargando comentarios...</div>
                <div v-else-if="ticketCommentsStore.allComments.length === 0" class="text-center p-4 text-500">No hay comentarios para este ticket.</div>
                <div v-else class="comments-list">
                    <div v-for="comment in ticketCommentsStore.allComments" :key="comment.id" class="comment-item mb-3 p-3 border-round surface-card shadow-1">
                        <div class="flex align-items-center mb-2">
                            <Avatar :image="comment.user?.url_photo_profile" :label="getInitials(comment.user?.name)" :style="{ backgroundColor: getAvatarColor(comment.user?.name), color: '#ffffff' }" shape="circle" class="mr-2" />
                            <div class="font-bold">{{ comment.user?.name || 'Usuario Desconocido' }}</div>
                            <div class="text-sm text-500 ml-auto">{{ new Date(comment.created_at).toLocaleString() }}</div>
                        </div>
                        <div class="comment-content text-700">{{ comment.content }}</div>
                    </div>
                </div>

                <div v-if="isEditing" class="new-comment-form mt-4 p-fluid">
                    <Textarea v-model="newCommentContent" rows="3" placeholder="Añadir un nuevo comentario..." />
                    <Button label="Añadir Comentario" icon="pi pi-comment" class="mt-2" @click="addComment" :loading="ticketCommentsStore.state.isAdding" />
                </div>
            </TabPanel>

            <TabPanel header="Adjuntos" :disabled="!isEditing">
                <TicketAttachments v-if="isEditing" :ticket-id="props.ticket?.id" />
                <div v-else class="p-message p-message-warn mt-3">
                    <div class="p-message-wrapper">
                        <span class="p-message-icon pi pi-exclamation-triangle"></span>
                        <div class="p-message-text">Los adjuntos se pueden gestionar una vez que el ticket ha sido creado.</div>
                    </div>
                </div>
            </TabPanel>
        </TabView>

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

    .compact-form .col-12.md\:col-6 {
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
