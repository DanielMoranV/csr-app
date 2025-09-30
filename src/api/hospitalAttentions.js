import axios from './axios';

export const hospitalAttentions = {
    list: (params) => axios.get('/hospital-attentions', { params }),
    getById: async (id) => {
        const response = await axios.get(`/hospital-attentions/${id}`);
        const attention = response.data;

        // Assume attention object has a 'tasks' array
        if (attention.tasks && Array.isArray(attention.tasks)) {
            const pendingTasks = attention.tasks.filter((task) => task.status === 'pending'); // Assuming 'status' property and 'pending' value
            attention.hasPendingTasks = pendingTasks.length > 0;
            attention.pendingTasksCount = pendingTasks.length;
        } else {
            attention.hasPendingTasks = false;
            attention.pendingTasksCount = 0;
        }

        return response; // Return the original response object, but with modified data
    },
    create: (data) => axios.post('/hospital-attentions', data),
    update: (id, data) => axios.put(`/hospital-attentions/${id}`, data),
    delete: (id) => axios.delete(`/hospital-attentions/${id}`),
    search: (params) => axios.get('/hospital-attentions/search', { params }),
    getStats: () => axios.get('/hospital-attentions/stats'),

    // Task related endpoints
    createTask: (data) => axios.post('/tasks', data),
    updateTask: (id, data) => axios.put(`/tasks/${id}`, data),
    deleteTask: (id) => axios.delete(`/tasks/${id}`),

    // Details Attention related endpoints
    listDetails: (params) => axios.get('/details-attention', { params }),
    getDetailsById: (id) => axios.get(`/details-attention/${id}`),
    createDetails: (data) => axios.post('/details-attention', data),
    updateDetails: (id, data) => axios.put(`/details-attention/${id}`, data),
    deleteDetails: (id) => axios.delete(`/details-attention/${id}`),
    searchDetails: (params) => axios.get('/details-attention/search', { params }),
    getDetailsStats: () => axios.get('/details-attention/stats'),

    // Task stats
    getTaskStats: () => axios.get('/tasks/stats')
};
