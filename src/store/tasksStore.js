import { defineStore } from 'pinia';
import { ref } from 'vue';
import useTasks from '@/composables/useTasks';

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
            console.error('Error fetching tasks:', error);
        } finally {
            loading.value = false;
        }
    };

    const fetchTasksByDateRange = async (startDate, endDate) => {
        loading.value = true;
        try {
            const { data } = await findTasks({ start_date: startDate, end_date: endDate });
            tasks.value = data;
        } catch (error) {
            console.error('Error fetching tasks by date range:', error);
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
            console.error('Error creating task:', error);
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
            console.error('Error updating task:', error);
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
            console.error('Error deleting task:', error);
        } finally {
            loading.value = false;
        }
    };

    const getStats = async () => {
        try {
            const response = await fetchTaskStats();
            stats.value = response.data;
        } catch (error) {
            console.error('Error fetching stats:', error);
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