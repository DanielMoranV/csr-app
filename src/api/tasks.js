import axios from './axios';

export const tasks = {
    list: (params) => axios.get('/tasks', { params }),
    getById: (id) => axios.get(`/tasks/${id}`),
    create: (data) => axios.post('/tasks', data),
    update: (id, data) => axios.put(`/tasks/${id}`, data),
    delete: (id) => axios.delete(`/tasks/${id}`),
    getStats: () => axios.get('/tasks/stats')
};
