<script setup>
import { defineEmits, defineProps, ref, watch } from 'vue';

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

const createTask = () => {
    if (newTaskDescription.value.trim()) {
        emit('create-task', {
            id_attentions: props.attentionId,
            description: newTaskDescription.value.trim(),
            status: 'pendiente'
        });
        newTaskDescription.value = '';
    }
};

const updateTaskStatus = (task, status) => {
    emit('update-task', { ...task, status });
};

const deleteTask = (task) => {
    emit('delete-task', task.id);
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
            date = new Date(dateString);
        }

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
        <div v-if="!readOnly" class="flex gap-2 mb-4">
            <InputText v-model="newTaskDescription" placeholder="Nueva tarea..." class="flex-grow" @keyup.enter="createTask" />
            <Button icon="pi pi-plus" @click="createTask" :disabled="!newTaskDescription.trim()" />
        </div>

        <!-- Task List -->
        <div v-if="tasks.length > 0" class="flex flex-col gap-3">
            <div v-for="task in tasks" :key="task.id" class="border rounded-lg p-3 hover:shadow-md transition-shadow">
                <!-- Task Header -->
                <div class="flex items-start justify-between mb-2">
                    <div class="flex-grow">
                        <div class="flex items-center gap-2 mb-1">
                            <span :class="{ 'line-through text-gray-500': task.status === 'realizado' || task.status === 'anulado' }" class="font-medium">
                                {{ task.description }}
                            </span>
                            <Tag :value="task.status" :severity="getStatusSeverity(task.status)" class="text-xs" />
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
                        <Button icon="pi pi-trash" class="p-button-rounded p-button-danger p-button-text p-button-sm" @click="deleteTask(task)" v-tooltip.top="'Eliminar tarea'" />
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="text-center text-gray-500 py-6">
            <i class="pi pi-inbox text-2xl mb-2 block"></i>
            No hay tareas asociadas.
        </div>
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
</style>
