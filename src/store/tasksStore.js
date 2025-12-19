import useTasks from '@/composables/useTasks';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useTasksStore = defineStore('tasks', () => {
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

    return {
        tasks,
        selectedTask,
        pagination,
        loading,
        stats,
        fetchTasks,
        fetchTasksByDateRange,
        createTask,
        updateTask,
        deleteTask,
        getStats,
        selectTask,
        clearSelectedTask
    };
});
