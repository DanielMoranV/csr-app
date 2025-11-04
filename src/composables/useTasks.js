import { createTask, deleteTask, getTask, getTasks, getTaskStats, searchTasks, updateTask } from '@/api/tasks';

export default function useTasks() {
    const indexTasks = async (options) => {
        try {
            const response = await getTasks(options);
            console.log('Fetched tasks:', response);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            throw error;
        }
    };

    const storeTask = async (taskData) => {
        try {
            const response = await createTask(taskData);
            return response.data;
        } catch (error) {
            console.error('Failed to create task:', error);
            throw error;
        }
    };

    const showTask = async (id) => {
        try {
            const response = await getTask(id);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch task ${id}:`, error);
            throw error;
        }
    };

    const modifyTask = async (id, taskData) => {
        try {
            const response = await updateTask(id, taskData);
            return response.data;
        } catch (error) {
            console.error(`Failed to update task ${id}:`, error);
            throw error;
        }
    };

    const destroyTask = async (id) => {
        try {
            const response = await deleteTask(id);
            return response.data;
        } catch (error) {
            console.error(`Failed to delete task ${id}:`, error);
            throw error;
        }
    };

    const findTasks = async (params) => {
        try {
            console.log('[useTasks] Llamando al endpoint /tasks/search con params:', params);
            const response = await searchTasks(params);
            console.log('[useTasks] Respuesta del axios (después del interceptor):', response);
            console.log('[useTasks] Tipo de response:', typeof response);
            console.log('[useTasks] response.data:', response.data);
            return response;
        } catch (error) {
            console.error('[useTasks] Failed to search tasks:', error);
            throw error;
        }
    };

    const fetchTaskStats = async () => {
        try {
            const response = await getTaskStats();
            return response.data;
        } catch (error) {
            console.error('Failed to fetch task stats:', error);
            throw error;
        }
    };

    return {
        indexTasks,
        storeTask,
        showTask,
        modifyTask,
        destroyTask,
        findTasks,
        fetchTaskStats
    };
}
