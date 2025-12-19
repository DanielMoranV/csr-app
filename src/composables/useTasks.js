import { createTask, deleteTask, getTask, getTasks, getTaskStats, markTaskAsViewed, searchTasks, updateTask } from '@/api/tasks';

export default function useTasks() {
    const indexTasks = async (options) => {
        try {
            const response = await getTasks(options);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const storeTask = async (taskData) => {
        try {
            const response = await createTask(taskData);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const showTask = async (id) => {
        try {
            const response = await getTask(id);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const modifyTask = async (id, taskData) => {
        try {
            const response = await updateTask(id, taskData);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const destroyTask = async (id) => {
        try {
            const response = await deleteTask(id);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const findTasks = async (params) => {
        try {
            const response = await searchTasks(params);
            return response;
        } catch (error) {
            throw error;
        }
    };

    const fetchTaskStats = async () => {
        try {
            const response = await getTaskStats();
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const markAsViewed = async (id) => {
        try {
            const response = await markTaskAsViewed(id);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const changeTaskStatus = async (id, statusData) => {
        try {
            const { updateTaskStatus } = await import('@/api/tasks');
            const response = await updateTaskStatus(id, statusData);
            return response.data;
        } catch (error) {
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
        fetchTaskStats,
        markAsViewed,
        changeTaskStatus
    };
}
