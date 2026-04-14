import useTasks from '@/composables/useTasks';
import useEcho from '@/websocket/echo';
import { defineStore } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';
import { useNotificationsStore } from './notificationsStore';

export const useTasksStore = defineStore('tasks', () => {
    const toast = useToast();

    const tasks = ref([]);
    const selectedTask = ref(null);
    const pagination = ref({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
        from: 0,
        to: 0
    });
    const loading = ref(false);
    const stats = ref({});

    // Guard para no suscribir canales dos veces (ej. hot-reload, doble initEchoListeners)
    const echoListening = ref(false);

    const { indexTasks, storeTask, showTask, modifyTask, destroyTask, findTasks, fetchTaskStats } = useTasks();

    const fetchTasks = async (options = {}) => {
        loading.value = true;
        try {
            const { data, pagination: pag } = await indexTasks(options);
            tasks.value = data;
            if (pag) {
                pagination.value = pag;
            }
        } catch (error) {
            // Error handled
        } finally {
            loading.value = false;
        }
    };

    const fetchTasksByDateRange = async (params) => {
        loading.value = true;
        try {
            const response = await findTasks(params);

            // El composable devuelve { success, message, data }
            if (response && response.data) {
                tasks.value = response.data;
            } else {
                tasks.value = [];
            }
        } catch (error) {
            // Error handled
            tasks.value = [];
        } finally {
            loading.value = false;
        }
    };

    const createTask = async (taskData) => {
        loading.value = true;
        try {
            await storeTask(taskData);
            await fetchTasks(); // Refresh list
        } catch (error) {
            // Error handled
        } finally {
            loading.value = false;
        }
    };

    const updateTask = async (id, taskData) => {
        loading.value = true;
        try {
            await modifyTask(id, taskData);
            await fetchTasks(); // Refresh list
        } catch (error) {
            // Error handled
        } finally {
            loading.value = false;
        }
    };

    const deleteTask = async (id) => {
        loading.value = true;
        try {
            await destroyTask(id);
            await fetchTasks(); // Refresh list
        } catch (error) {
            // Error handled
        } finally {
            loading.value = false;
        }
    };

    const getStats = async () => {
        try {
            const response = await fetchTaskStats();
            stats.value = response.data;
        } catch (error) {
            // Error handled
        }
    };

    const selectTask = (task) => {
        selectedTask.value = { ...task };
    };

    const clearSelectedTask = () => {
        selectedTask.value = null;
    };

    // --- REAL-TIME EVENT HANDLERS ---

    /**
     * task.created — llega en canal público 'tasks' y privado 'user.{id}.tasks'.
     * Payload: { task, areas, assignee_ids, timestamp }
     */
    const handleTaskCreated = (e) => {
        const task = e.task;
        if (!task) return;

        // Agregar si no existe ya en la lista local
        const exists = tasks.value.some((t) => t.id === task.id);
        if (!exists) {
            tasks.value.unshift(task);
            pagination.value.total++;
        }

        toast.add({
            severity: 'info',
            summary: 'Nueva Tarea Asignada',
            detail: task.description || `Tarea #${task.id} creada`,
            life: 5000
        });
    };

    /**
     * task.updated — llega en canal público 'tasks' y privado 'user.{id}.tasks'.
     * Payload: { task, areas, assignee_ids, original_data, timestamp }
     */
    const handleTaskUpdated = (e) => {
        const task = e.task;
        if (!task) return;

        const index = tasks.value.findIndex((t) => t.id === task.id);
        if (index !== -1) {
            tasks.value[index] = task;
        }

        if (selectedTask.value?.id === task.id) {
            selectedTask.value = { ...task };
        }
    };

    /**
     * task.overdue — tarea vencida.
     * Payload: { task_id, description, status, due_date, id_attentions, alert_id, alert_type, notified_at }
     * Toast sticky: el usuario debe cerrarlo manualmente.
     */
    const handleTaskOverdue = (e) => {
        const { task_id, description } = e;

        // Incrementar badge de notificaciones
        const notificationsStore = useNotificationsStore();
        notificationsStore.bumpUnreadCount('tasks');

        toast.add({
            severity: 'error',
            summary: '🚨 Tarea Vencida',
            detail: description || `La tarea #${task_id} ha vencido`,
            sticky: true,
            group: 'task-alerts'
        });
    };

    /**
     * task.nearing-due — tarea próxima a vencer (al 80% del tiempo).
     * Mismo payload que task.overdue con alert_type: 'por_vencer'.
     * Toast sticky: el usuario debe cerrarlo manualmente.
     */
    const handleTaskNearingDue = (e) => {
        const { task_id, description } = e;

        // Incrementar badge de notificaciones
        const notificationsStore = useNotificationsStore();
        notificationsStore.bumpUnreadCount('tasks');

        toast.add({
            severity: 'warn',
            summary: '⏰ Tarea por Vencer',
            detail: description || `La tarea #${task_id} está próxima a vencer`,
            sticky: true,
            group: 'task-alerts'
        });
    };

    // --- ECHO LIFECYCLE ---

    /**
     * Suscribirse a los canales de tareas.
     * Llamar desde authStore.login() y authStore.initialize() cuando hay sesión activa.
     * @param {number} userId - ID del usuario autenticado
     */
    const initEchoListeners = (userId) => {
        if (echoListening.value) return; // evitar doble suscripción
        if (!userId) return;

        // Canal público — todos los usuarios de tareas
        useEcho
            .channel('tasks')
            .listen('.task.created', handleTaskCreated)
            .listen('.task.updated', handleTaskUpdated)
            .listen('.task.overdue', handleTaskOverdue)
            .listen('.task.nearing-due', handleTaskNearingDue);

        // Canal privado — tareas asignadas específicamente a este usuario
        useEcho
            .private(`user.${userId}.tasks`)
            .listen('.task.created', handleTaskCreated)
            .listen('.task.updated', handleTaskUpdated);

        echoListening.value = true;
    };

    /**
     * Desuscribirse de los canales de tareas.
     * Llamar desde authStore.logout().
     * @param {number} userId - ID del usuario autenticado (para el canal privado)
     */
    const leaveEchoChannels = (userId) => {
        useEcho.leave('tasks');
        if (userId) {
            useEcho.leave(`user.${userId}.tasks`);
        }
        echoListening.value = false;
    };

    return {
        tasks,
        selectedTask,
        pagination,
        loading,
        stats,
        echoListening,
        fetchTasks,
        fetchTasksByDateRange,
        createTask,
        updateTask,
        deleteTask,
        getStats,
        selectTask,
        clearSelectedTask,
        // Real-time handlers
        handleTaskCreated,
        handleTaskUpdated,
        handleTaskOverdue,
        handleTaskNearingDue,
        // Echo lifecycle
        initEchoListeners,
        leaveEchoChannels
    };
});
