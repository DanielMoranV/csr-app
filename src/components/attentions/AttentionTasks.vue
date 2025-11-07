<script setup>
import { computed, defineEmits, defineProps, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';

const props = defineProps({
    tasks: {
        type: Array,
        default: () => []
    },
    attentionId: {
        type: Number,
        required: true
    },
    readOnly: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['create-task', 'update-task', 'delete-task']);

const newTaskDescription = ref('');
const newTaskDueDate = ref(null);
const enableDueDate = ref(false);

// Estado para el diálogo de confirmación de eliminación
const confirmDeleteVisible = ref(false);
const taskToDelete = ref(null);

// Fecha mínima: ahora + 1 minuto
const minDate = computed(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 1);
    return date;
});

const createTask = () => {
    if (newTaskDescription.value.trim()) {
        const taskData = {
            id_attentions: props.attentionId,
            description: newTaskDescription.value.trim(),
            status: 'pendiente'
        };

        // Solo incluir due_date si está habilitado y tiene valor
        if (enableDueDate.value && newTaskDueDate.value) {
            const selectedDate = new Date(newTaskDueDate.value);

            // Extraer componentes de fecha/hora LOCAL (no convertir a UTC)
            // El backend con timezone America/Lima interpreta esto como hora de Lima
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const hours = String(selectedDate.getHours()).padStart(2, '0');
            const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
            const seconds = String(selectedDate.getSeconds()).padStart(2, '0');

            // Formato ISO sin timezone: Laravel lo interpreta como hora de Lima
            const localIsoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

            taskData.due_date = localIsoString;
        }

        emit('create-task', taskData);

        // Limpiar formulario
        newTaskDescription.value = '';
        newTaskDueDate.value = null;
        enableDueDate.value = false;
    }
};

const updateTaskStatus = (task, status) => {
    emit('update-task', { ...task, status });
};

// Mostrar diálogo de confirmación de eliminación
const showDeleteConfirmation = (task) => {
    taskToDelete.value = task;
    confirmDeleteVisible.value = true;
};

// Confirmar eliminación de tarea
const confirmDeleteTask = () => {
    if (taskToDelete.value) {
        emit('delete-task', taskToDelete.value.id);
        confirmDeleteVisible.value = false;
        taskToDelete.value = null;
    }
};

// Cancelar eliminación de tarea
const cancelDeleteTask = () => {
    confirmDeleteVisible.value = false;
    taskToDelete.value = null;
};

const getStatusSeverity = (status) => {
    switch (status) {
        case 'realizado':
            return 'success';
        case 'anulado':
            return 'danger';
        case 'pendiente':
        default:
            return 'warning';
    }
};

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        let date;
        // Si la fecha es solo YYYY-MM-DD sin hora, parsear como fecha local
        if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateString.split('-').map(Number);
            date = new Date(year, month - 1, day);
        } else {
            // new Date() automáticamente convierte UTC a hora local del navegador
            date = new Date(dateString);
        }

        if (isNaN(date)) return dateString;
        // Usar la zona horaria local del navegador
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (e) {
        return dateString;
    }
};

const formatRelativeTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;

    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `hace ${diffMinutes} minutos`;
    } else if (diffHours < 24) {
        return `hace ${diffHours} horas`;
    } else if (diffDays < 7) {
        return `hace ${diffDays} días`;
    } else {
        return formatDateTime(dateString);
    }
};

// Formatear tiempo restante hasta due_date
const formatTimeUntilDue = (dueDate) => {
    if (!dueDate) return null;

    // Parsear la fecha UTC del backend
    const date = new Date(dueDate);
    if (isNaN(date)) return null;

    // Obtener la hora actual
    const now = new Date();

    // Calcular diferencia en milisegundos
    const diffMs = date - now;
    const absDiffMs = Math.abs(diffMs);

    // Calcular unidades de tiempo
    const diffMinutes = Math.floor(absDiffMs / (1000 * 60));
    const diffHours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
        // Vencida
        if (diffMinutes < 60) {
            return `Vencida hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
        } else if (diffHours < 24) {
            return `Vencida hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
        } else {
            return `Vencida hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
        }
    } else {
        // Pendiente
        if (diffMinutes < 60) {
            return `Vence en ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
        } else if (diffHours < 24) {
            return `Vence en ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
        } else {
            return `Vence en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
        }
    }
};

// Obtener severidad de la alerta
const getAlertSeverity = (task) => {
    if (!task.alert_status) return null;
    if (task.alert_status === 'vencida') return 'danger';
    if (task.alert_status === 'por_vencer') return 'warn';
    return null;
};

// Obtener icono de alerta
const getAlertIcon = (task) => {
    if (!task.alert_status) return null;
    if (task.alert_status === 'vencida') return 'pi pi-exclamation-circle';
    if (task.alert_status === 'por_vencer') return 'pi pi-clock';
    return null;
};

const getStatusChangeInfo = (task) => {
    // Si no hay historial de estados, verificar si hay cambios basados en created_at vs updated_at
    if (!task.status_history || task.status_history.length === 0) {
        if (task.updated_at && task.updated_at !== task.created_at && task.status !== 'pendiente') {
            return {
                hasChange: true,
                changeType: getStatusChangeText(task.status),
                changeTime: task.updated_at,
                reason: null
            };
        }
        return { hasChange: false };
    }

    // Buscar el último cambio de estado (más reciente)
    const sortedHistory = task.status_history.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));

    const latestChange = sortedHistory[0];
    if (latestChange && latestChange.new_status === task.status) {
        return {
            hasChange: true,
            changeType: getStatusChangeText(latestChange.new_status),
            changeTime: latestChange.changed_at,
            reason: latestChange.reason
        };
    }

    return { hasChange: false };
};

const getStatusChangeText = (status) => {
    switch (status) {
        case 'realizado':
            return 'Marcado como realizado';
        case 'anulado':
            return 'Anulado';
        case 'pendiente':
            return 'Marcado como pendiente';
        default:
            return 'Estado cambiado';
    }
};

const getStatusChangeIcon = (status) => {
    switch (status) {
        case 'realizado':
            return 'pi pi-check-circle';
        case 'anulado':
            return 'pi pi-times-circle';
        case 'pendiente':
            return 'pi pi-clock';
        default:
            return 'pi pi-info-circle';
    }
};

// Obtener información del usuario que creó la tarea
const getCreatedByUser = (task) => {
    if (!task.status_history || task.status_history.length === 0) return null;

    // El primer registro del historial es la creación (old_status === null)
    const creationRecord = task.status_history.find((h) => h.old_status === null);

    if (creationRecord && creationRecord.changed_by) {
        return {
            id: creationRecord.changed_by.id,
            nick: creationRecord.changed_by.nick,
            timestamp: creationRecord.changed_at
        };
    }

    return null;
};

// Obtener información del último usuario que modificó la tarea
const getLastModifiedByUser = (task) => {
    if (!task.status_history || task.status_history.length === 0) return null;

    // Ordenar por fecha descendente para obtener el más reciente
    const sortedHistory = [...task.status_history].sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));

    const latestChange = sortedHistory[0];

    // No mostrar si el último cambio es la creación inicial (old_status === null)
    // Esto evita redundancia con "Creado por"
    if (latestChange && latestChange.old_status === null) {
        return null;
    }

    if (latestChange && latestChange.changed_by) {
        return {
            id: latestChange.changed_by.id,
            nick: latestChange.changed_by.nick,
            timestamp: latestChange.changed_at,
            action: latestChange.reason || getStatusChangeText(latestChange.new_status)
        };
    }

    return null;
};

// Cache para evitar recálculos innecesarios
const statusChangeInfoCache = ref(new Map());

const getStatusChangeInfoCached = (task) => {
    const cacheKey = `${task.id}-${task.status}-${task.updated_at}`;

    if (statusChangeInfoCache.value.has(cacheKey)) {
        return statusChangeInfoCache.value.get(cacheKey);
    }

    const info = getStatusChangeInfo(task);
    statusChangeInfoCache.value.set(cacheKey, info);
    return info;
};

// Limpiar caché cuando cambian las tareas
watch(
    () => props.tasks,
    () => {
        statusChangeInfoCache.value.clear();
    },
    { deep: true }
);
</script>

<template>
    <div class="p-4">
        <!-- New Task Input -->
        <div v-if="!readOnly" class="space-y-3 mb-4">
            <!-- Descripción de la tarea -->
            <div class="flex gap-2">
                <InputText v-model="newTaskDescription" placeholder="Nueva tarea..." class="flex-grow" @keyup.enter="createTask" />
                <Button icon="pi pi-plus" @click="createTask" :disabled="!newTaskDescription.trim() || (enableDueDate && !newTaskDueDate)" />
            </div>

            <!-- Opciones de fecha límite -->
            <div class="border rounded-lg p-3 bg-gray-50">
                <div class="flex items-center gap-2 mb-2">
                    <Checkbox v-model="enableDueDate" inputId="enableDueDate" :binary="true" />
                    <label for="enableDueDate" class="font-medium text-sm cursor-pointer">Establecer fecha límite (opcional)</label>
                </div>

                <!-- DatePicker para due_date -->
                <div v-if="enableDueDate" class="ml-6">
                    <DatePicker v-model="newTaskDueDate" :minDate="minDate" showTime hourFormat="24" showIcon iconDisplay="input" dateFormat="dd/mm/yy" placeholder="Seleccionar fecha y hora límite" class="w-full" />
                    <small class="text-gray-500 block mt-1">
                        <i class="pi pi-info-circle mr-1"></i>
                        La tarea generará alertas automáticas al alcanzar el 80% del tiempo y al vencer.
                    </small>
                </div>
            </div>
        </div>

        <!-- Task List -->
        <div v-if="tasks.length > 0" class="flex flex-col gap-3">
            <div v-for="task in tasks" :key="task.id" class="border rounded-lg p-3 hover:shadow-md transition-shadow" :data-alert="task.alert_status || null">
                <!-- Task Header -->
                <div class="flex items-start justify-between mb-2">
                    <div class="flex-grow">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <span :class="{ 'line-through text-gray-500': task.status === 'realizado' || task.status === 'anulado' }" class="font-medium">
                                {{ task.description }}
                            </span>
                            <Tag :value="task.status" :severity="getStatusSeverity(task.status)" class="text-xs" />

                            <!-- Alerta visual si tiene alert_status -->
                            <Tag v-if="task.alert_status && task.status === 'pendiente'" :severity="getAlertSeverity(task)" class="text-xs">
                                <i :class="getAlertIcon(task)" class="mr-1"></i>
                                {{ task.alert_status === 'vencida' ? 'VENCIDA' : 'POR VENCER' }}
                            </Tag>
                        </div>

                        <!-- Due Date Info -->
                        <div
                            v-if="task.due_date"
                            class="mb-2 px-3 py-2 rounded"
                            :class="{ 'bg-blue-50 border-l-4 border-blue-400': !task.completed_at, 'bg-green-50 border-l-4 border-green-500': task.is_completed_on_time, 'bg-orange-50 border-l-4 border-orange-500': task.is_completed_late }"
                        >
                            <div class="flex items-center gap-2 text-sm">
                                <i class="pi pi-calendar" :class="{ 'text-blue-600': !task.completed_at, 'text-green-600': task.is_completed_on_time, 'text-orange-600': task.is_completed_late }"></i>
                                <span class="font-medium" :class="{ 'text-blue-900': !task.completed_at, 'text-green-900': task.is_completed_on_time, 'text-orange-900': task.is_completed_late }">Fecha límite:</span>
                                <span :class="{ 'text-blue-700': !task.completed_at, 'text-green-700': task.is_completed_on_time, 'text-orange-700': task.is_completed_late }">{{ formatDateTime(task.due_date) }}</span>
                            </div>

                            <!-- Tiempo restante o vencimiento (solo si NO está completada) -->
                            <div
                                v-if="!task.completed_at && formatTimeUntilDue(task.due_date)"
                                class="flex items-center gap-2 text-sm mt-1"
                                :class="{ 'text-red-600 font-semibold': task.alert_status === 'vencida', 'text-amber-600 font-medium': task.alert_status === 'por_vencer', 'text-blue-600': !task.alert_status }"
                            >
                                <i :class="task.alert_status === 'vencida' ? 'pi pi-exclamation-triangle' : task.alert_status === 'por_vencer' ? 'pi pi-clock' : 'pi pi-hourglass'"></i>
                                <span>{{ formatTimeUntilDue(task.due_date) }}</span>
                            </div>

                            <!-- Información de completado -->
                            <div v-if="task.completed_at" class="mt-2 pt-2 border-t" :class="{ 'border-green-200': task.is_completed_on_time, 'border-orange-200': task.is_completed_late }">
                                <div class="flex items-center gap-2 text-sm">
                                    <i class="pi pi-check-circle" :class="{ 'text-green-600': task.is_completed_on_time, 'text-orange-600': task.is_completed_late }"></i>
                                    <span class="font-medium" :class="{ 'text-green-900': task.is_completed_on_time, 'text-orange-900': task.is_completed_late }">Completado:</span>
                                    <span :class="{ 'text-green-700': task.is_completed_on_time, 'text-orange-700': task.is_completed_late }">{{ formatDateTime(task.completed_at) }}</span>
                                </div>
                                <div v-if="task.is_completed_late" class="flex items-center gap-2 text-sm mt-1 text-orange-700 font-medium">
                                    <i class="pi pi-exclamation-circle"></i>
                                    <span>Completada fuera de plazo</span>
                                </div>
                                <div v-if="task.is_completed_on_time" class="flex items-center gap-2 text-sm mt-1 text-green-700 font-medium">
                                    <i class="pi pi-check"></i>
                                    <span>Completada a tiempo</span>
                                </div>
                            </div>
                        </div>

                        <!-- Timestamps y Usuario Info -->
                        <div class="text-xs text-gray-500 space-y-1">
                            <!-- Creado por -->
                            <div v-if="getCreatedByUser(task)" class="flex items-center gap-2 flex-wrap">
                                <div class="flex items-center gap-1">
                                    <i class="pi pi-user-plus text-blue-600"></i>
                                    <span>Creado por:</span>
                                </div>
                                <Tag :value="getCreatedByUser(task).nick" severity="info" class="text-xs" />
                                <span class="text-gray-400">{{ formatRelativeTime(getCreatedByUser(task).timestamp) }}</span>
                            </div>
                            <div v-else-if="task.created_at" class="flex items-center gap-1">
                                <i class="pi pi-clock"></i>
                                <span>Creado: {{ formatRelativeTime(task.created_at) }}</span>
                            </div>

                            <!-- Última modificación por -->
                            <div v-if="getLastModifiedByUser(task)" class="flex items-center gap-2 flex-wrap">
                                <div class="flex items-center gap-1">
                                    <i :class="getStatusChangeIcon(task.status)" :style="{ color: task.status === 'realizado' ? '#10b981' : task.status === 'anulado' ? '#ef4444' : '#f59e0b' }"></i>
                                    <span>{{ getLastModifiedByUser(task).action }}:</span>
                                </div>
                                <Tag :value="getLastModifiedByUser(task).nick" severity="success" class="text-xs" />
                                <span class="text-gray-400">{{ formatRelativeTime(getLastModifiedByUser(task).timestamp) }}</span>
                            </div>

                            <!-- Fallback: Status Change Information (sin usuario) -->
                            <div v-else-if="getStatusChangeInfoCached(task).hasChange" class="space-y-1">
                                <div class="flex items-center gap-1">
                                    <i :class="getStatusChangeIcon(task.status)" :style="{ color: task.status === 'realizado' ? '#10b981' : task.status === 'anulado' ? '#ef4444' : '#f59e0b' }"></i>
                                    <span>{{ getStatusChangeInfoCached(task).changeType }}: {{ formatRelativeTime(getStatusChangeInfoCached(task).changeTime) }}</span>
                                </div>
                                <div v-if="getStatusChangeInfoCached(task).reason" class="flex items-center gap-1 ml-4 text-gray-600">
                                    <i class="pi pi-info-circle text-xs"></i>
                                    <span class="italic">{{ getStatusChangeInfoCached(task).reason }}</span>
                                </div>
                            </div>

                            <!-- Fallback: Updated timestamp -->
                            <div v-else-if="task.updated_at && task.updated_at !== task.created_at" class="flex items-center gap-1">
                                <i class="pi pi-refresh"></i>
                                <span>Actualizado: {{ formatRelativeTime(task.updated_at) }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div v-if="!readOnly" class="flex items-center gap-1 ml-2">
                        <Button v-if="task.status === 'pendiente'" icon="pi pi-check" class="p-button-rounded p-button-success p-button-text p-button-sm" @click="updateTaskStatus(task, 'realizado')" v-tooltip.top="'Marcar como realizado'" />
                        <Button v-if="task.status === 'pendiente'" icon="pi pi-ban" class="p-button-rounded p-button-warning p-button-text p-button-sm" @click="updateTaskStatus(task, 'anulado')" v-tooltip.top="'Anular tarea'" />
                        <Button icon="pi pi-trash" class="p-button-rounded p-button-danger p-button-text p-button-sm" @click="showDeleteConfirmation(task)" v-tooltip.top="'Eliminar tarea'" />
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="text-center text-gray-500 py-6">
            <i class="pi pi-inbox text-2xl mb-2 block"></i>
            No hay tareas asociadas.
        </div>

        <!-- Diálogo de confirmación de eliminación -->
        <Dialog v-model:visible="confirmDeleteVisible" :modal="true" header="Confirmar eliminación" :style="{ width: '450px' }">
            <div class="flex items-start gap-3 mb-4">
                <i class="pi pi-exclamation-triangle text-4xl text-red-500"></i>
                <div>
                    <p class="text-base mb-2">¿Estás seguro de que deseas eliminar esta tarea?</p>
                    <p v-if="taskToDelete" class="text-sm text-gray-600 bg-gray-50 p-3 rounded border-l-4 border-red-500">
                        <strong>Tarea:</strong> {{ taskToDelete.description }}
                    </p>
                    <p class="text-sm text-gray-500 mt-2">
                        <i class="pi pi-info-circle mr-1"></i>
                        Esta acción no se puede deshacer.
                    </p>
                </div>
            </div>
            <template #footer>
                <Button label="Cancelar" icon="pi pi-times" @click="cancelDeleteTask" severity="secondary" outlined />
                <Button label="Eliminar" icon="pi pi-trash" @click="confirmDeleteTask" severity="danger" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.p-button-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
}

.p-button-sm .pi {
    font-size: 0.875rem;
}

/* Hover effects for task cards */
.border:hover {
    border-color: #cbd5e1;
}

/* Space utility for form */
.space-y-3 > * + * {
    margin-top: 0.75rem;
}

/* Alert borders for overdue tasks */
.border-rounded-lg:has([data-alert='vencida']) {
    border-left: 4px solid #ef4444;
}

.border-rounded-lg:has([data-alert='por_vencer']) {
    border-left: 4px solid #f59e0b;
}

/* Due date info box animations */
.bg-blue-50,
.bg-green-50,
.bg-orange-50 {
    transition: all 0.2s ease;
}

.bg-blue-50:hover {
    background-color: #dbeafe;
}

.bg-green-50:hover {
    background-color: #dcfce7;
}

.bg-orange-50:hover {
    background-color: #ffedd5;
}

/* Border colors for completed tasks */
.border-green-200 {
    border-color: #bbf7d0;
}

.border-orange-200 {
    border-color: #fed7aa;
}
</style>
