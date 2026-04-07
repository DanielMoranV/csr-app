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
import { useConfirm } from 'primevue/useconfirm';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import TicketAttachments from './TicketAttachments.vue';
import TicketStatusChanger from './TicketStatusChanger.vue';
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
    },
    mode: {
        type: String,
        default: 'view', // 'view' | 'edit' | 'create'
        validator: (value) => ['view', 'edit', 'create'].includes(value)
    },
    initialTab: {
        type: Number,
        default: 0 // 0 = Detalles, 1 = Historial, 2 = Comentarios, 3 = Adjuntos
    },
    initialCommentId: {
        type: Number,
        default: null // si viene de notificación, hace scroll al comentario específico
    }
});

const emit = defineEmits(['update:visible', 'save-ticket', 'close', 'switch-to-edit']);

const authStore = useAuthStore();
const ticketCommentsStore = useTicketCommentsStore();
const ticketsStore = useTicketsStore();
const confirm = useConfirm();

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

// Computed para modos del diálogo
const isViewMode = computed(() => props.mode === 'view');
const isEditMode = computed(() => props.mode === 'edit');
const isCreateMode = computed(() => props.mode === 'create');

// Computed para permisos del usuario actual
const currentUser = computed(() => authStore.getUser);

const isCreator = computed(() => {
    return currentUser.value && currentTicket.value?.creator_user_id === currentUser.value.id;
});

const isAssignee = computed(() => {
    if (!currentUser.value || !currentTicket.value) return false;
    const isUserAssignee = currentTicket.value.assignee_user_id === currentUser.value.id;
    const hasAssignedPosition = currentTicket.value.assignee_position === currentUser.value.position;
    return isUserAssignee || hasAssignedPosition;
});

const canEdit = computed(() => {
    // En modo creación, siempre permitir editar
    if (isCreateMode.value) return true;
    // En otros modos, solo el creador puede editar detalles del ticket
    return isCreator.value;
});

const canAddCommentsOrAttachments = computed(() => {
    // Creador y asignados pueden agregar comentarios/adjuntos
    return isCreator.value || isAssignee.value;
});

const canChangeStatus = computed(() => {
    // Solo en modo vista/edición con ticket existente, y solo creador o asignado
    return !isCreateMode.value && currentTicket.value?.id && (isCreator.value || isAssignee.value);
});

// Computed para obtener el ticket actualizado del store
const currentTicket = computed(() => {
    if (!props.ticket?.id) return props.ticket;
    // Buscar el ticket actualizado en el store
    const updatedTicket = ticketsStore.tickets.find((t) => t.id === props.ticket.id);
    return updatedTicket || props.ticket;
});

const dialogTitle = computed(() => {
    if (isCreateMode.value) return 'Nuevo Ticket';
    if (isEditMode.value) return 'Editar Ticket';
    return 'Ver Ticket'; // modo lectura
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

// Comment editing state
const editingCommentId = ref(null);
const editingCommentContent = ref('');

// Active tab tracking (0 = Detalles, 1 = Historial, 2 = Comentarios, 3 = Adjuntos)
const activeTabIndex = ref(0);

/**
 * Marca como leídos solo los comentarios que el backend reporta como no leídos
 * (is_read_by_me === false). El store actualiza is_read_by_me localmente de
 * forma optimista, por lo que llamadas repetidas (cambio de tab, etc.) son inocuas.
 */
const markVisibleCommentsAsRead = async () => {
    const ticketId = props.ticket?.id;
    if (!ticketId || !isEditing.value) return;

    const unreadComments = ticketCommentsStore.allComments.filter((c) => !c.is_read_by_me);
    if (unreadComments.length === 0) return;

    await Promise.allSettled(unreadComments.map((c) => ticketCommentsStore.markCommentAsRead(ticketId, c.id)));

    // Refrescar el badge del sidebar solo si había comentarios sin leer
    ticketsStore.fetchGlobalUnreadCount();
};

// Sincronizar el flag isCommentsTabActive con el tab visible
watch(activeTabIndex, (newIndex) => {
    ticketCommentsStore.setCommentsTabActive(newIndex === 2);
    if (newIndex === 2) {
        // Si fetchComments aún está cargando, el watch de props.visible lo manejará
        // una vez que termine. Si ya terminó, marcar ahora.
        if (!ticketCommentsStore.state.isLoading) {
            markVisibleCommentsAsRead();
        }
    }
});

// Computed para ancho responsivo del diálogo
const dialogWidth = computed(() => {
    if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        if (width <= 480) return '98vw';
        if (width <= 768) return '95vw';
        if (width <= 1024) return '85vw';
        return '700px';
    }
    return '700px';
});

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

// Status is always read-only in the form — changes must go through TicketStatusChanger (PATCH /tickets/{id}/status)
// filteredStatusOptions is kept only for display purposes in create mode
const filteredStatusOptions = computed(() => {
    // Creation: status is fixed to 'pendiente', this computed is not used in template for create
    // Edit/View: show only the current status as the sole option (read-only dropdown)
    if (!isEditing.value) {
        return statusOptions.value.filter((opt) => opt.value === 'pendiente');
    }
    const currentStatus = currentTicket.value?.status;
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

// Scroll a un comentario específico por ID (viene de notificación)
const scrollToComment = (commentId) => {
    if (!chatContainer.value || !commentId) return;
    const el = chatContainer.value.querySelector(`[data-comment-id="${commentId}"]`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Resaltar brevemente el comentario
        el.classList.add('comment-highlighted');
        setTimeout(() => el.classList.remove('comment-highlighted'), 2000);
    } else {
        scrollToBottom();
    }
};

// Watchers
// Solo actualiza los campos del formulario cuando el ticket cambia en tiempo real.
// La carga de comentarios se hace únicamente en watch(props.visible) con await,
// para evitar el race condition del doble fetchComments.
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
            // Establecer el tab inicial (puede ser Comentarios si viene de una notificación).
            // Siempre forzar el valor para que el watch(activeTabIndex) dispare correctamente
            // cuando el usuario cambie de tab, aunque el valor anterior fuera el mismo.
            activeTabIndex.value = props.initialTab ?? 0;

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
                // Error handled
            }

            if (props.ticket) {
                loadTicketData(props.ticket);
                // Await so that when the user is already on the Comments tab
                // (or switches to it while loading), markVisibleCommentsAsRead sees
                // the populated comments list instead of an empty array.
                await ticketCommentsStore.fetchComments(props.ticket.id);
                if (activeTabIndex.value === 2) {
                    markVisibleCommentsAsRead();
                    // Scroll al comentario específico si viene de notificación
                    nextTick(() => {
                        if (props.initialCommentId) {
                            scrollToComment(props.initialCommentId);
                        } else {
                            scrollToBottom();
                        }
                    });
                }
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
    // Only validate title, description and priority — status is managed by TicketStatusChanger
    const fieldsToValidate = ['title', 'description', 'priority'];
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
    // status is no longer a required user-input field (always 'pendiente' on create, managed via TicketStatusChanger on edit)
    const hasRequiredFields = ticketForm.title && ticketForm.description && ticketForm.priority;
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
    ticketCommentsStore.setCommentsTabActive(false);
    emit('close');
};

const onDialogHide = () => {
    ticketCommentsStore.setCommentsTabActive(false);
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
        // Error handled
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

const wasEdited = (comment) => {
    if (!comment.updated_at || !comment.created_at) return false;
    return new Date(comment.updated_at) - new Date(comment.created_at) > 5000;
};

// --- Comment visual helpers ---
const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#f97316', '#84cc16'];

const getUserInitials = (user) => {
    if (!user?.name) return '?';
    return user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
};

const getUserColor = (userId) => AVATAR_COLORS[(userId || 0) % AVATAR_COLORS.length];

const isSameUserAsPrev = (index) => {
    if (index === 0) return false;
    const comments = ticketCommentsStore.allComments;
    return comments[index].user_id === comments[index - 1].user_id;
};

const isNewDay = (index) => {
    if (index === 0) return true;
    const comments = ticketCommentsStore.allComments;
    const curr = new Date(comments[index].created_at);
    const prev = new Date(comments[index - 1].created_at);
    return curr.toDateString() !== prev.toDateString();
};

const getDayLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {})
    });
};

const formatCommentTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

// --- Inline comment editing ---
const startEditComment = (comment) => {
    editingCommentId.value = comment.id;
    editingCommentContent.value = comment.content;
};

const cancelEditComment = () => {
    editingCommentId.value = null;
    editingCommentContent.value = '';
};

const submitEditComment = async (comment) => {
    const trimmed = editingCommentContent.value.trim();
    if (!trimmed || trimmed === comment.content) {
        cancelEditComment();
        return;
    }
    try {
        await ticketCommentsStore.updateComment(props.ticket.id, comment.id, { content: trimmed });
        cancelEditComment();
    } catch (error) {
        const status = error?.response?.status || error?.status;
        if (status === 403) {
            // This shouldn't happen since we only show the button for own comments,
            // but handle defensively.
            cancelEditComment();
        }
    }
};

const confirmDeleteComment = (comment) => {
    confirm.require({
        message: '¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.',
        header: 'Eliminar Comentario',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancelar',
        acceptLabel: 'Eliminar',
        rejectClass: 'p-button-secondary p-button-outlined',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await ticketCommentsStore.deleteComment(props.ticket.id, comment.id);
            } catch (error) {
                const status = error?.response?.status || error?.status;
                if (status === 403) {
                    // Should not happen for own comments — handled defensively
                }
            }
        }
    });
};
</script>

<template>
    <Dialog v-model:visible="dialogVisible" :header="dialogTitle" :modal="true" class="p-fluid ticket-dialog" :style="{ width: dialogWidth, maxHeight: '90vh' }" :closable="!saving" :closeOnEscape="!saving" @hide="onDialogHide">
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

        <TabView v-model:activeIndex="activeTabIndex">
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
                                    :disabled="isViewMode || !canEdit"
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
                                    :disabled="isViewMode || !canEdit"
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
                                    :disabled="isViewMode || !canEdit"
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
                                <label class="compact-label">
                                    <i class="pi pi-flag text-blue-500 mr-2"></i>
                                    Estado del Ticket
                                </label>
                                <!-- Status is read-only here. Use the TicketStatusChanger in the footer to change it. -->
                                <div class="status-readonly-field">
                                    <span
                                        v-if="ticketForm.status"
                                        class="status-badge-display"
                                        :class="`status-badge-${ticketForm.status?.replace(' ', '-')}`"
                                    >
                                        <i :class="['pi', statusOptions.find(s => s.value === ticketForm.status)?.icon || 'pi-circle']" class="mr-1"></i>
                                        {{ statusOptions.find(s => s.value === ticketForm.status)?.label || ticketForm.status }}
                                    </span>
                                    <span v-else class="status-badge-display status-badge-pending">
                                        <i class="pi pi-clock mr-1"></i> Pendiente
                                    </span>
                                    <small v-if="!isCreateMode" class="field-help text-500 block mt-1">
                                        <i class="pi pi-info-circle"></i> Usa el botón de estado del footer para cambiar
                                    </small>
                                </div>
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
                                    :disabled="isViewMode || !canEdit || !!ticketForm.assignee_position"
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
                                    :disabled="isViewMode || !canEdit || !!ticketForm.assignee_user_id"
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
                                    :disabled="isViewMode || !canEdit"
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
                        <div v-if="ticketCommentsStore.state.isLoading" class="text-center p-4">
                            <i class="pi pi-spin pi-spinner text-xl"></i> Cargando comentarios...
                        </div>
                        <div v-else-if="ticketCommentsStore.allComments.length === 0" class="text-center p-4 text-500">
                            <i class="pi pi-comment text-4xl text-300 mb-3"></i>
                            <div>No hay comentarios para este ticket.</div>
                            <div class="text-sm mt-2">Los comentarios y actualizaciones del equipo aparecerán aquí.</div>
                        </div>
                        <div v-else class="comments-list">
                            <template v-for="(comment, index) in ticketCommentsStore.allComments" :key="comment.id">

                                <!-- Separador de día -->
                                <div v-if="isNewDay(index)" class="day-separator">
                                    <span class="day-separator-label">{{ getDayLabel(comment.created_at) }}</span>
                                </div>

                                <!-- Fila de comentario -->
                                <div
                                    :data-comment-id="comment.id"
                                    class="comment-row"
                                    :class="{
                                        'is-own': isOwnComment(comment),
                                        'is-grouped': !isNewDay(index) && isSameUserAsPrev(index)
                                    }"
                                >
                                    <!-- Avatar (solo para comentarios de otros) -->
                                    <div
                                        v-if="!isOwnComment(comment)"
                                        class="comment-avatar"
                                        :class="{ 'comment-avatar--placeholder': !isNewDay(index) && isSameUserAsPrev(index) }"
                                        :style="{ background: getUserColor(comment.user_id) }"
                                        :title="comment.user?.name"
                                    >
                                        <span v-if="isNewDay(index) || !isSameUserAsPrev(index)">{{ getUserInitials(comment.user) }}</span>
                                    </div>

                                    <!-- Burbuja -->
                                    <div class="comment-bubble">
                                        <!-- Nombre del autor (solo primera burbuja del grupo) -->
                                        <div
                                            v-if="!isOwnComment(comment) && (isNewDay(index) || !isSameUserAsPrev(index))"
                                            class="comment-author-name"
                                            :style="{ color: getUserColor(comment.user_id) }"
                                        >
                                            {{ comment.user?.name || 'Usuario' }}
                                        </div>

                                        <!-- Modo edición inline -->
                                        <div v-if="editingCommentId === comment.id" class="comment-edit-form">
                                            <Textarea
                                                v-model="editingCommentContent"
                                                rows="3"
                                                class="comment-edit-textarea"
                                                fluid
                                                auto-resize
                                                @keydown.escape="cancelEditComment"
                                            />
                                            <div class="comment-edit-actions">
                                                <Button
                                                    label="Guardar"
                                                    icon="pi pi-check"
                                                    size="small"
                                                    @click="submitEditComment(comment)"
                                                    :loading="ticketCommentsStore.state.isUpdating"
                                                    :disabled="!editingCommentContent.trim() || editingCommentContent.trim() === comment.content"
                                                />
                                                <Button
                                                    label="Cancelar"
                                                    icon="pi pi-times"
                                                    size="small"
                                                    severity="secondary"
                                                    outlined
                                                    @click="cancelEditComment"
                                                    :disabled="ticketCommentsStore.state.isUpdating"
                                                />
                                            </div>
                                        </div>

                                        <!-- Modo normal -->
                                        <template v-else>
                                            <div class="comment-content">{{ comment.content }}</div>
                                            <div class="comment-meta">
                                                <span class="comment-time">{{ formatCommentTime(comment.created_at) }}</span>
                                                <span v-if="wasEdited(comment)" class="comment-edited-tag">
                                                    <i class="pi pi-pencil"></i> editado
                                                </span>
                                            </div>
                                            <!-- Visto / Enviado (solo comentarios propios) -->
                                            <template v-if="isOwnComment(comment)">
                                                <div
                                                    v-if="ticketCommentsStore.readReceipts[comment.id]?.length > 0"
                                                    class="comment-seen-by"
                                                >
                                                    <i class="pi pi-check-circle"></i>
                                                    <span>
                                                        Visto por {{ ticketCommentsStore.readReceipts[comment.id][0].read_by.name }}
                                                        <template v-if="ticketCommentsStore.readReceipts[comment.id].length > 1">
                                                            y {{ ticketCommentsStore.readReceipts[comment.id].length - 1 }} más
                                                        </template>
                                                    </span>
                                                </div>
                                                <div v-else class="comment-seen-by comment-seen-pending">
                                                    <i class="pi pi-check"></i>
                                                    <span>Enviado</span>
                                                </div>
                                            </template>
                                        </template>

                                        <!-- Acciones (hover, solo comentarios propios) -->
                                        <div
                                            v-if="isOwnComment(comment) && editingCommentId !== comment.id"
                                            class="comment-actions"
                                        >
                                            <button
                                                class="comment-action-btn"
                                                title="Editar"
                                                @click="startEditComment(comment)"
                                                :disabled="ticketCommentsStore.state.isDeleting"
                                            >
                                                <i class="pi pi-pencil"></i>
                                            </button>
                                            <button
                                                class="comment-action-btn comment-action-delete"
                                                title="Eliminar"
                                                @click="confirmDeleteComment(comment)"
                                                :disabled="ticketCommentsStore.state.isDeleting"
                                            >
                                                <i class="pi pi-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                            </template>
                        </div>
                    </div>

                    <div v-if="isEditing && canAddCommentsOrAttachments" class="new-comment-form">
                        <div class="new-comment-input-row">
                            <Textarea
                                v-model="newCommentContent"
                                rows="2"
                                placeholder="Escribe un comentario... (Ctrl+Enter para enviar)"
                                fluid
                                auto-resize
                                @keydown.ctrl.enter.prevent="addComment"
                            />
                            <Button
                                icon="pi pi-send"
                                class="new-comment-send-btn"
                                :loading="ticketCommentsStore.state.isAdding"
                                :disabled="!newCommentContent.trim()"
                                @click="addComment"
                                rounded
                                aria-label="Enviar comentario"
                            />
                        </div>
                    </div>
                    <div v-else-if="isEditing && !canAddCommentsOrAttachments" class="comment-readonly-notice">
                        <i class="pi pi-lock"></i>
                        <span>Solo el creador y los asignados pueden comentar.</span>
                    </div>
                </div>
            </TabPanel>

            <TabPanel header="📎 Adjuntos" :disabled="!isEditing">
                <TicketAttachments v-if="isEditing" :ticket-id="props.ticket?.id" :can-upload="canAddCommentsOrAttachments" />
                <div v-else class="p-message p-message-warn mt-3">
                    <div class="p-message-wrapper">
                        <span class="p-message-icon pi pi-exclamation-triangle"></span>
                        <div class="p-message-text">Los archivos adjuntos (capturas de pantalla, documentos, etc.) se pueden agregar una vez que el ticket ha sido creado.</div>
                    </div>
                </div>
            </TabPanel>
        </TabView>

        <template #footer>
            <div class="flex justify-content-between align-items-center w-full">
                <!-- Botón Editar visible solo en modo vista para creadores -->
                <div v-if="isViewMode && canEdit">
                    <Button
                        label="Editar Ticket"
                        icon="pi pi-pencil"
                        @click="$emit('switch-to-edit')"
                        severity="primary"
                    />
                </div>
                <div v-else-if="!isViewMode" class="text-500 text-sm">
                    * Campos obligatorios
                </div>
                <div v-else>
                    <!-- Espacio vacío para mantener alineación -->
                </div>

                <!-- Botones de acción -->
                <div class="flex align-items-center gap-2">
                    <TicketStatusChanger
                        v-if="canChangeStatus"
                        :ticket="currentTicket"
                    />
                    <Button
                        :label="isViewMode ? 'Cerrar' : 'Cancelar'"
                        icon="pi pi-times"
                        class="p-button-outlined"
                        @click="closeDialog"
                        :disabled="saving"
                    />
                    <Button
                        v-if="!isViewMode"
                        :label="isCreateMode ? 'Crear Ticket' : 'Actualizar Ticket'"
                        :icon="isCreateMode ? 'pi pi-plus' : 'pi pi-check'"
                        @click="saveTicket"
                        :loading="saving"
                        :disabled="!isFormValid || !canEdit"
                        class="p-button-success"
                    />
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
    height: 52vh;
    max-height: 520px;
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    overflow: hidden;
    background: var(--surface-ground);
}

.chat-container {
    flex-grow: 1;
    overflow-y: auto;
    padding: 1rem 1rem 0.5rem;
    scroll-behavior: smooth;
}

@media (max-width: 768px) {
    .chat-wrapper {
        height: 42vh;
        max-height: 420px;
    }
}

@media (max-width: 480px) {
    .chat-wrapper {
        height: 38vh;
        max-height: 340px;
        border-radius: 8px;
    }

    .chat-container {
        padding: 0.75rem 0.75rem 0.5rem;
    }
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

/* ========================================
   COMMENT LIST
   ======================================== */
.comments-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-bottom: 0.5rem;
}

/* --- Day separator --- */
.day-separator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.75rem 0 0.5rem;
    text-align: center;
}

.day-separator::before,
.day-separator::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--surface-border);
}

.day-separator-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-color-secondary);
    white-space: nowrap;
    padding: 0.2rem 0.6rem;
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    border-radius: 999px;
    letter-spacing: 0.02em;
}

/* --- Comment row --- */
.comment-row {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    max-width: 82%;
    margin-top: 0.5rem;
}

.comment-row.is-grouped {
    margin-top: 0.15rem;
}

.comment-row.is-own {
    align-self: flex-end;
    flex-direction: row-reverse;
}

.comment-row:not(.is-own) {
    align-self: flex-start;
}

/* --- Avatar --- */
.comment-avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
    letter-spacing: 0.03em;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

/* Placeholder transparent cuando es mensaje agrupado */
.comment-avatar--placeholder {
    background: transparent !important;
    box-shadow: none;
}

/* --- Bubble --- */
.comment-bubble {
    position: relative;
    padding: 0.55rem 0.85rem 0.45rem;
    border-radius: 16px;
    word-wrap: break-word;
    white-space: pre-wrap;
    line-height: 1.5;
    min-width: 80px;
    max-width: 100%;
}

/* Comentarios propios */
.comment-row.is-own .comment-bubble {
    background: color-mix(in srgb, var(--primary-color) 14%, var(--surface-card));
    color: var(--text-color);
    border: 1px solid color-mix(in srgb, var(--primary-color) 25%, transparent);
    border-bottom-right-radius: 4px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}

/* Comentarios de otros */
.comment-row:not(.is-own) .comment-bubble {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    color: var(--text-color);
    border-bottom-left-radius: 4px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}

/* Primero del grupo sin esquina redondeada arriba */
.comment-row.is-grouped.is-own .comment-bubble {
    border-top-right-radius: 6px;
}
.comment-row.is-grouped:not(.is-own) .comment-bubble {
    border-top-left-radius: 6px;
}

/* --- Nombre del autor --- */
.comment-author-name {
    font-size: 0.72rem;
    font-weight: 700;
    margin-bottom: 0.2rem;
    letter-spacing: 0.01em;
}

/* --- Contenido --- */
.comment-content {
    font-size: 0.88rem;
    line-height: 1.5;
}

/* --- Meta (hora + editado) --- */
.comment-meta {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.25rem;
}

.comment-time {
    font-size: 0.68rem;
    opacity: 0.6;
}

.comment-row.is-own .comment-time {
    color: var(--text-color-secondary);
}

.comment-edited-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.65rem;
    font-style: italic;
    opacity: 0.55;
}

.comment-edited-tag i {
    font-size: 0.6rem;
}

/* --- "Visto por X" / "Enviado" — WhatsApp-style --- */
.comment-seen-by {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.68rem;
    color: var(--text-color-secondary);
    opacity: 0.85;
    margin-top: 0.1rem;
}

.comment-seen-by i {
    font-size: 0.72rem;
    color: var(--primary-color);
}

.comment-seen-pending {
    opacity: 0.45;
}

.comment-seen-pending i {
    color: var(--text-color-secondary);
}

/* --- Botones de acción (hover) --- */
.comment-actions {
    position: absolute;
    top: -0.6rem;
    right: 0.4rem;
    display: flex;
    gap: 0.15rem;
    background: var(--surface-overlay);
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    padding: 0.15rem 0.25rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    z-index: 2;
}

.comment-bubble:hover .comment-actions {
    opacity: 1;
    pointer-events: auto;
}

.comment-action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.2rem 0.3rem;
    border-radius: 5px;
    color: var(--text-color-secondary);
    font-size: 0.72rem;
    line-height: 1;
    transition: color 0.15s, background 0.15s;
}

.comment-action-btn:hover:not(:disabled) {
    color: var(--text-color);
    background: var(--surface-hover);
}

.comment-action-btn:disabled {
    cursor: not-allowed;
    opacity: 0.3;
}

.comment-action-delete:hover:not(:disabled) {
    color: var(--red-500) !important;
    background: color-mix(in srgb, var(--red-500) 10%, transparent) !important;
}

/* --- Inline edit --- */
.comment-edit-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.comment-edit-textarea {
    border-radius: 8px;
    font-size: 0.88rem;
    background: rgba(255,255,255,0.15) !important;
    color: inherit !important;
    border-color: rgba(255,255,255,0.3) !important;
}

.comment-edit-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
}

/* --- Highlight al navegar desde notificación --- */
.comment-highlighted .comment-bubble {
    animation: comment-highlight-fade 2s ease-out forwards;
}

@keyframes comment-highlight-fade {
    0%   { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    100% { outline: 2px solid transparent; outline-offset: 2px; }
}

/* ========================================
   NEW COMMENT FORM
   ======================================== */
.new-comment-form {
    padding: 0.75rem 0.75rem 0.5rem;
    border-top: 1px solid var(--surface-border);
    background: var(--surface-section);
}

.new-comment-input-row {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
}

.new-comment-input-row :deep(.p-textarea) {
    border-radius: 20px;
    padding: 0.6rem 1rem;
    font-size: 0.88rem;
    resize: none;
    flex: 1;
    max-height: 120px;
}

.new-comment-send-btn {
    width: 2.4rem !important;
    height: 2.4rem !important;
    min-width: 2.4rem !important;
    flex-shrink: 0;
}

.comment-readonly-notice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    font-size: 0.82rem;
    color: var(--text-color-secondary);
    border-top: 1px solid var(--surface-border);
    background: var(--surface-section);
}

.comment-seen-time {
    opacity: 0.7;
}

/* --- Status readonly badge --- */
.status-readonly-field {
    padding: 0.5rem 0;
}

.status-badge-display {
    display: inline-flex;
    align-items: center;
    padding: 0.4rem 0.85rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.02em;
}

.status-badge-pendiente {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;
}

.status-badge-en-proceso {
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #93c5fd;
}

.status-badge-concluido {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #6ee7b7;
}

.status-badge-rechazado {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fca5a5;
}

.status-badge-anulado {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
}

.status-badge-pending {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;
}

/* Dark mode adjustments */
:root.app-dark .status-badge-pendiente {
    background: rgba(251, 191, 36, 0.15);
    color: #fcd34d;
    border-color: rgba(251, 191, 36, 0.3);
}

:root.app-dark .status-badge-en-proceso {
    background: rgba(59, 130, 246, 0.15);
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.3);
}

:root.app-dark .status-badge-concluido {
    background: rgba(16, 185, 129, 0.15);
    color: #6ee7b7;
    border-color: rgba(16, 185, 129, 0.3);
}

:root.app-dark .status-badge-rechazado {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.3);
}

:root.app-dark .status-badge-anulado {
    background: rgba(107, 114, 128, 0.15);
    color: #9ca3af;
    border-color: rgba(107, 114, 128, 0.3);
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

    /* Botones más táctiles en tablet */
    :deep(.p-button) {
        min-height: 44px;
        padding: 0.6rem 1rem;
    }

    /* Campos de entrada más grandes para mejor interacción */
    .compact-input,
    :deep(.compact-input) {
        min-height: 44px !important;
        height: auto !important;
    }

    .compact-input-select,
    :deep(.compact-input-select) {
        min-height: 44px !important;
    }

    :deep(.p-inputtext.compact-input) {
        min-height: 44px;
    }

    :deep(.p-dropdown.compact-input-select) {
        min-height: 44px;
    }

    :deep(.p-calendar.compact-input-select .p-inputtext) {
        min-height: 44px !important;
    }

    /* Ajustar tabs para móvil */
    :deep(.p-tabview-nav) {
        flex-wrap: nowrap;
        overflow-x: auto;
    }

    :deep(.p-tabview-nav-link) {
        padding: 0.75rem 1rem;
        white-space: nowrap;
        font-size: 0.85rem;
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
        padding: 0.25rem;
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
        min-height: 48px;
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
    }
    .flex.gap-2 {
        gap: 0.5rem;
    }

    /* Header compacto en móvil */
    :deep(.p-dialog-header .flex) {
        flex-wrap: wrap;
    }

    :deep(.p-dialog-header .text-xl) {
        font-size: 1rem;
    }

    :deep(.p-dialog-header .font-semibold) {
        font-size: 0.95rem;
    }

    /* Footer en columna para móviles pequeños */
    :deep(.p-dialog-footer > div) {
        flex-direction: column;
        gap: 0.75rem;
    }

    :deep(.p-dialog-footer .flex.gap-2) {
        width: 100%;
        flex-direction: column;
    }

    :deep(.p-dialog-footer .p-button) {
        width: 100%;
    }

    /* Inputs aún más táctiles */
    .compact-input,
    :deep(.compact-input) {
        min-height: 48px !important;
        font-size: 1rem !important;
    }

    .compact-input-select,
    :deep(.compact-input-select) {
        min-height: 48px !important;
    }

    /* Tabs scrollables horizontalmente */
    :deep(.p-tabview-nav) {
        -webkit-overflow-scrolling: touch;
    }

    :deep(.p-tabview-nav-link) {
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
    }

    /* Comentarios más compactos */
    .comment-bubble {
        padding: 0.5rem 0.75rem;
        font-size: 0.85rem;
    }

    .new-comment-form {
        padding: 0.75rem;
    }

    .new-comment-form :deep(.p-textarea) {
        font-size: 0.9rem;
    }

    /* Field help más compacto */
    .field-help {
        font-size: 0.7rem;
        padding: 0.2rem 0.4rem;
    }

    /* Priority badge más pequeño */
    .priority-badge {
        padding: 0.2rem 0.5rem;
        font-size: 0.65rem;
    }
}
</style>
