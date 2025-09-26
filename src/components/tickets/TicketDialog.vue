<script setup>
import { positions, users } from '@/api';
import { apiUtils } from '@/api/axios';
import { useAuthStore } from '@/store/authStore';
import { useTicketCommentsStore } from '@/store/ticketCommentsStore';
import { useTicketsStore } from '@/store/ticketsStore';
import Button from 'primevue/button';
import Calendar from 'primevue/calendar';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import TabPanel from 'primevue/tabpanel';
import TabView from 'primevue/tabview';
import Textarea from 'primevue/textarea';
import { computed, nextTick, reactive, ref, watch } from 'vue';
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
    const updatedTicket = ticketsStore.tickets.find((t) => t.id === props.ticket.id);
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
    { label: '🟢 Baja', value: 'baja', color: '#10B981', description: 'Tareas rutinarias, puede esperar' },
    { label: '🟡 Media', value: 'media', color: '#F59E0B', description: 'Requiere atención en el día' },
    { label: '🟠 Alta', value: 'alta', color: '#EF4444', description: 'Requiere atención inmediata' },
    { label: '🔴 Urgente', value: 'urgente', color: '#DC2626', description: 'Emergencia operativa - resolver YA' }
]);

const statusOptions = ref([
    { label: '📋 Pendiente', value: 'pendiente', color: '#6B7280', description: 'Ticket registrado, pendiente de asignación' },
    { label: '🚀 En Proceso', value: 'en proceso', color: '#3B82F6', description: 'Personal trabajando en la solución' },
    { label: '✅ Resuelto', value: 'concluido', color: '#10B981', description: 'Problema solucionado satisfactoriamente' },
    { label: '❌ Rechazado', value: 'rechazado', color: '#EF4444', description: 'No procede o requiere replanteamiento' },
    { label: '🚫 Anulado', value: 'anulado', color: '#6B7280', description: 'Ticket cancelado o anulado' }
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

// Referencias para el scroll
const chatContainer = ref(null);

// Método para hacer scroll hacia abajo
const scrollToBottom = () => {
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
};

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

// Watcher para hacer scroll cuando cambien los comentarios
watch(
    () => ticketCommentsStore.allComments,
    () => {
        // Usar nextTick para asegurar que el DOM se actualice antes del scroll
        nextTick(() => {
            scrollToBottom();
        });
    },
    { deep: true }
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

// Watcher para hacer scroll cuando el diálogo se abra
watch(
    () => props.visible,
    (visible) => {
        if (visible && props.ticket?.id) {
            // Hacer scroll después de que se carguen los comentarios
            setTimeout(() => {
                scrollToBottom();
            }, 500);
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
                validationErrors.value.title = 'El título del ticket es obligatorio';
            } else if (ticketForm.title.trim().length < 5) {
                validationErrors.value.title = 'Describa brevemente el problema (mínimo 5 caracteres)';
            } else if (ticketForm.title.trim().length > 255) {
                validationErrors.value.title = 'El título no puede exceder 255 caracteres';
            } else {
                delete validationErrors.value.title;
            }
            break;

        case 'description':
            if (!ticketForm.description?.trim()) {
                validationErrors.value.description = 'La descripción detallada es obligatoria';
            } else if (ticketForm.description.trim().length < 10) {
                validationErrors.value.description = 'Proporcione más detalles (mínimo 10 caracteres)';
            } else {
                delete validationErrors.value.description;
            }
            break;

        case 'assignee_user_id':
        case 'assignee_position':
            if (ticketForm.assignee_user_id && ticketForm.assignee_position) {
                validationErrors.value.assignee = 'Seleccione solo un profesional O una especialidad, no ambos';
            } else {
                delete validationErrors.value.assignee;
            }
            break;

        case 'due_date':
            if (ticketForm.due_date) {
                const selectedDate = new Date(ticketForm.due_date);
                const now = new Date();
                if (selectedDate < now) {
                    validationErrors.value.due_date = 'La fecha límite no puede ser en el pasado';
                } else if (selectedDate > new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)) {
                    validationErrors.value.due_date = 'La fecha no puede ser mayor a un año';
                } else {
                    delete validationErrors.value.due_date;
                }
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
        validationErrors.value.assignee = 'No se puede asignar a un usuario y un cargo al mismo tiempo';
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

const addComment = async () => {
    if (!newCommentContent.value.trim()) return;
    if (!props.ticket?.id) return; // Cannot add comment to a new ticket

    try {
        await ticketCommentsStore.addComment(props.ticket.id, { content: newCommentContent.value });
        newCommentContent.value = ''; // Clear input

        // Hacer scroll hacia abajo después de agregar el comentario
        nextTick(() => {
            scrollToBottom();
        });
    } catch (error) {
        console.error('Error adding comment:', error);
    }
};

const isOwnComment = (comment) => {
    const currentUser = authStore.getUser;
    return currentUser && currentUser.id === comment.user?.id;
};

const formatCommentDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', { hour: 'numeric', minute: 'numeric', day: 'numeric', month: 'short' });
};
</script>

<template>
    <Dialog v-model:visible="dialogVisible" :header="dialogTitle" :modal="true" class="p-fluid ticket-dialog" :style="{ width: '700px', maxHeight: '90vh' }" :closable="!saving" :closeOnEscape="!saving" @hide="onDialogHide">
        <template #header>
            <div class="flex align-items-center gap-2">
                <i :class="isEditing ? 'pi pi-ticket text-blue-600' : 'pi pi-plus-circle text-green-600'" class="text-xl"></i>
                <span class="font-semibold">{{ dialogTitle }}</span>
                <div v-if="currentTicket?.priority" class="ml-auto">
                    <span class="priority-badge" :class="`priority-${currentTicket.priority}`">
                        {{ priorityOptions.find((p) => p.value === currentTicket.priority)?.label || currentTicket.priority }}
                    </span>
                </div>
            </div>
        </template>

        <TabView>
            <TabPanel header="📝 Detalles del Ticket">
                <form @submit.prevent="saveTicket" class="mt-3">
                    <!-- Fila 1: Título y Descripción -->
                    <div class="formgrid grid compact-form mb-3">
                        <div class="col-12">
                            <div class="field">
                                <label for="title" class="compact-label">
                                    <i class="pi pi-clipboard text-primary-500 mr-2"></i>
                                    Título del Ticket *
                                </label>
                                <InputText
                                    id="title"
                                    v-model="ticketForm.title"
                                    :class="{ 'p-invalid': getFieldError('title') }"
                                    placeholder="Ej: Falla en impresora consulta 3, Solicitud de insumos, Error en sistema de citas"
                                    maxlength="255"
                                    @blur="validateField('title')"
                                    class="compact-input"
                                    fluid
                                />
                                <small class="field-help text-500">Describa brevemente el problema o solicitud</small>
                                <small class="p-error" v-if="getFieldError('title')">{{ getFieldError('title') }}</small>
                            </div>
                        </div>
                        <div class="col-12">
                            <div class="field">
                                <label for="description" class="compact-label">
                                    <i class="pi pi-file-edit text-primary-500 mr-2"></i>
                                    Descripción Detallada *
                                </label>
                                <Textarea
                                    id="description"
                                    v-model="ticketForm.description"
                                    :class="{ 'p-invalid': getFieldError('description') }"
                                    placeholder="Describa detalladamente: ubicación del problema, pasos para reproducir el error, impacto en las operaciones, recursos necesarios, etc."
                                    rows="5"
                                    cols="30"
                                    @blur="validateField('description')"
                                    class="compact-input"
                                    fluid
                                />
                                <small class="field-help text-500">Incluya toda la información relevante para resolver el problema</small>
                                <small class="p-error" v-if="getFieldError('description')">{{ getFieldError('description') }}</small>
                            </div>
                        </div>
                    </div>

                    <!-- Fila 2: Prioridad y Estado -->
                    <div class="formgrid grid compact-form mb-3">
                        <div class="col-12 md:col-6">
                            <div class="field">
                                <label for="priority" class="compact-label">
                                    <i class="pi pi-exclamation-triangle text-orange-500 mr-2"></i>
                                    Prioridad *
                                </label>
                                <Select
                                    id="priority"
                                    v-model="ticketForm.priority"
                                    :options="priorityOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Seleccionar prioridad"
                                    :class="{ 'p-invalid': getFieldError('priority') }"
                                    @change="validateField('priority')"
                                    class="compact-input-select priority-select"
                                    fluid
                                >
                                    <template #option="slotProps">
                                        <div class="priority-option" :style="{ borderLeft: `4px solid ${slotProps.option.color}` }">
                                            <div class="font-semibold">{{ slotProps.option.label }}</div>
                                            <div class="text-sm text-500">{{ slotProps.option.description }}</div>
                                        </div>
                                    </template>
                                </Select>
                                <small class="field-help text-500">Seleccione según el impacto en las operaciones de la clínica</small>
                                <small class="p-error" v-if="getFieldError('priority')">{{ getFieldError('priority') }}</small>
                            </div>
                        </div>

                        <div class="col-12 md:col-6">
                            <div class="field">
                                <label for="status" class="compact-label">
                                    <i class="pi pi-flag text-blue-500 mr-2"></i>
                                    Estado del Ticket *
                                </label>
                                <Select
                                    id="status"
                                    v-model="ticketForm.status"
                                    :options="filteredStatusOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Seleccionar estado"
                                    :class="{ 'p-invalid': getFieldError('status') }"
                                    @change="validateField('status')"
                                    class="compact-input-select status-select"
                                    fluid
                                >
                                    <template #option="slotProps">
                                        <div class="status-option" :style="{ borderLeft: `4px solid ${slotProps.option.color}` }">
                                            <div class="font-semibold">{{ slotProps.option.label }}</div>
                                            <div class="text-sm text-500">{{ slotProps.option.description }}</div>
                                        </div>
                                    </template>
                                </Select>
                                <small class="field-help text-500">Estado actual del proceso de resolución</small>
                                <small class="p-error" v-if="getFieldError('status')">{{ getFieldError('status') }}</small>
                            </div>
                        </div>
                    </div>

                    <!-- Fila 3: Asignación -->
                    <div class="formgrid grid compact-form mb-3">
                        <div class="col-12 md:col-6">
                            <div class="field">
                                <label for="assignee_user_id" class="compact-label">
                                    <i class="pi pi-user-plus text-green-500 mr-2"></i>
                                    Asignar a Usuario (Opcional)
                                </label>
                                <Select
                                    id="assignee_user_id"
                                    v-model="ticketForm.assignee_user_id"
                                    :options="clientSearchResults"
                                    optionLabel="name"
                                    optionValue="id"
                                    placeholder="Buscar personal: administrativo, técnico, enfermero/a..."
                                    :filter="true"
                                    filterPlaceholder="Escriba el nombre del usuario"
                                    @filter="searchClients"
                                    :class="{ 'p-invalid': getFieldError('assignee') }"
                                    @change="validateField('assignee_user_id')"
                                    class="compact-input-select"
                                    fluid
                                    :showClear="true"
                                />
                                <small class="field-help text-500">Asigne a una persona específica responsable de resolver</small>
                                <small class="p-error" v-if="getFieldError('assignee')">{{ getFieldError('assignee') }}</small>
                            </div>
                        </div>

                        <div class="col-12 md:col-6">
                            <div class="field">
                                <label for="assignee_position" class="compact-label">
                                    <i class="pi pi-briefcase text-blue-500 mr-2"></i>
                                    Asignar por Cargo/Departamento (Opcional)
                                </label>
                                <Select
                                    id="assignee_position"
                                    v-model="ticketForm.assignee_position"
                                    :options="positionSearchResults"
                                    optionLabel="name"
                                    optionValue="id"
                                    placeholder="Ej: Administración, IT, Mantención, Enfermería..."
                                    :filter="true"
                                    filterPlaceholder="Buscar cargo o departamento"
                                    @filter="searchPositions"
                                    :class="{ 'p-invalid': getFieldError('assignee') }"
                                    @change="validateField('assignee_position')"
                                    class="compact-input-select"
                                    fluid
                                    :showClear="true"
                                />
                                <small class="field-help text-500">Asigne a un departamento o cargo específico</small>
                                <small class="p-error" v-if="getFieldError('assignee')">{{ getFieldError('assignee') }}</small>
                            </div>
                        </div>
                    </div>

                    <!-- Fila 4: Fecha Límite -->
                    <div class="formgrid grid compact-form mb-3">
                        <div class="col-12">
                            <div class="field">
                                <label for="due_date" class="compact-label">
                                    <i class="pi pi-clock text-orange-500 mr-2"></i>
                                    Fecha Límite (Opcional)
                                </label>
                                <Calendar
                                    id="due_date"
                                    v-model="ticketForm.due_date"
                                    showTime
                                    hourFormat="24"
                                    dateFormat="dd/mm/yy"
                                    placeholder="Fecha límite para resolver el ticket"
                                    @blur="validateField('due_date')"
                                    class="compact-input-select"
                                    fluid
                                    :showIcon="true"
                                    :showClear="true"
                                />
                                <small class="field-help text-500">Establezca cuándo debe estar resuelto este ticket</small>
                                <small class="p-error" v-if="getFieldError('due_date')">{{ getFieldError('due_date') }}</small>
                            </div>
                        </div>
                    </div>
                </form>
            </TabPanel>

            <TabPanel header="📈 Historial de Estados" :disabled="!isEditing">
                <TicketStatusHistory v-if="isEditing" :ticket="props.ticket" />
                <div v-else class="p-message p-message-info mt-3">
                    <div class="p-message-wrapper">
                        <span class="p-message-icon pi pi-info-circle"></span>
                        <div class="p-message-text">El historial de estados estará disponible una vez que el ticket sea creado.</div>
                    </div>
                </div>
            </TabPanel>

            <TabPanel header="💬 Comentarios" :disabled="!isEditing">
                <div class="chat-wrapper">
                    <div ref="chatContainer" class="chat-container">
                        <div v-if="ticketCommentsStore.state.isLoading" class="text-center p-4"><i class="pi pi-spin pi-spinner text-xl"></i> Cargando comentarios...</div>
                        <div v-else-if="ticketCommentsStore.allComments.length === 0" class="text-center p-4 text-500">
                            <i class="pi pi-comment text-4xl text-300 mb-3"></i>
                            <div>No hay comentarios para este ticket.</div>
                            <div class="text-sm mt-2">Los comentarios y actualizaciones del equipo aparecerán aquí.</div>
                        </div>
                        <div v-else class="comments-list">
                            <div v-for="comment in ticketCommentsStore.allComments" :key="comment.id" class="comment-row" :class="{ 'is-own': isOwnComment(comment) }">
                                <div class="comment-bubble">
                                    <div class="comment-header font-bold">{{ isOwnComment(comment) ? 'Tú' : comment.user?.name || 'Usuario Desconocido' }}</div>
                                    <div class="comment-content text-700">{{ comment.content }}</div>
                                    <div class="comment-footer text-xs text-500 mt-1">{{ formatCommentDate(comment.created_at) }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="isEditing" class="new-comment-form p-fluid">
                        <Textarea v-model="newCommentContent" rows="3" placeholder="Añadir comentario, actualización de progreso o nota..." @keydown.enter.prevent="addComment" fluid />
                        <Button label="Añadir Comentario" icon="pi pi-send" class="mt-2" @click="addComment" :loading="ticketCommentsStore.state.isAdding" fluid />
                    </div>
                </div>
            </TabPanel>

            <TabPanel header="📎 Adjuntos" :disabled="!isEditing">
                <TicketAttachments v-if="isEditing" :ticket-id="props.ticket?.id" />
                <div v-else class="p-message p-message-warn mt-3">
                    <div class="p-message-wrapper">
                        <span class="p-message-icon pi pi-exclamation-triangle"></span>
                        <div class="p-message-text">Los archivos adjuntos (capturas de pantalla, documentos, etc.) se pueden agregar una vez que el ticket ha sido creado.</div>
                    </div>
                </div>
            </TabPanel>
        </TabView>

        <template #footer>
            <div class="flex justify-content-between align-items-center">
                <div class="text-500 text-sm">* Campos obligatorios</div>
                <div class="flex gap-2">
                    <Button label="Cancelar" icon="pi pi-times" class="p-button-outlined" @click="closeDialog" :disabled="saving" />
                    <Button :label="isEditing ? 'Actualizar Ticket' : 'Crear Ticket'" :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'" @click="saveTicket" :loading="saving" :disabled="!isFormValid" class="p-button-success" />
                </div>
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
/* CHAT STYLES */
.chat-wrapper {
    display: flex;
    flex-direction: column;
    height: 55vh;
}

.chat-container {
    flex-grow: 1;
    overflow-y: auto;
    padding: 1rem;
    background-color: var(--surface-ground);
    border-radius: 6px;
    scroll-behavior: smooth;
}

.chat-container::-webkit-scrollbar {
    width: 6px;
}

.chat-container::-webkit-scrollbar-track {
    background: var(--surface-100);
    border-radius: 3px;
}

.chat-container::-webkit-scrollbar-thumb {
    background: var(--primary-300);
    border-radius: 3px;
}

.chat-container::-webkit-scrollbar-thumb:hover {
    background: var(--primary-400);
}

.comments-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.comment-row {
    display: flex;
    max-width: 80%;
}

.comment-row.is-own {
    align-self: flex-end;
}

.comment-row:not(.is-own) {
    align-self: flex-start;
}

.comment-bubble {
    padding: 0.75rem 1rem;
    border-radius: 18px;
    word-wrap: break-word;
    white-space: pre-wrap;
    line-height: 1.4;
}

.comment-row.is-own .comment-bubble {
    background-color: var(--primary-color);
    color: var(--primary-color-text);
    border-bottom-right-radius: 4px;
}

.comment-row:not(.is-own) .comment-bubble {
    background-color: var(--surface-card);
    border: 1px solid var(--surface-border);
    color: var(--text-color);
    border-bottom-left-radius: 4px;
}

.comment-header {
    font-size: 0.8rem;
    margin-bottom: 0.25rem;
    color: var(--text-color-secondary);
}

.comment-row.is-own .comment-header {
    color: var(--primary-color-text);
    opacity: 0.8;
}

.comment-footer {
    text-align: right;
    opacity: 0.7;
}

.new-comment-form {
    flex-shrink: 0;
    padding: 1rem;
    background-color: var(--surface-section);
    border-top: 1px solid var(--surface-border);
}

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
    min-height: 6rem;
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
.field-help {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    margin-top: 0.25rem;
    display: block;
    line-height: 1.3;
    font-style: italic;
    background: var(--surface-100);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border-left: 2px solid var(--primary-200);
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
    background: linear-gradient(135deg, var(--blue-50) 0%, var(--surface-0) 100%);
    border-bottom: 2px solid var(--blue-100);
    border-radius: 8px 8px 0 0;
}

/* Priority badge styles */
.priority-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.priority-badge.priority-baja {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
}

.priority-badge.priority-media {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
}

.priority-badge.priority-alta {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
}

.priority-badge.priority-urgente {
    background: #fee2e2;
    color: #7f1d1d;
    border: 1px solid #fecaca;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.7;
    }
}

/* Footer compacto */
:deep(.p-dialog-footer) {
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
    border-top: 2px solid var(--blue-100);
    border-radius: 0 0 8px 8px;
}

/* Botones mejorados */
:deep(.p-button) {
    border-radius: 8px;
    font-weight: 600;
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    border: 2px solid transparent;
}

:deep(.p-button-success) {
    background: linear-gradient(45deg, #10b981, #059669);
    border-color: #10b981;
}

:deep(.p-button-outlined) {
    border-color: var(--surface-400);
    color: var(--text-color-secondary);
}

/* Custom option styles */
.priority-option,
.status-option {
    padding: 0.5rem;
    border-radius: 4px;
    transition: all 0.2s ease;
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
</style>
