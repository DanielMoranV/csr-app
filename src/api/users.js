import axios from './axios';

export const users = {
    list: (params) => axios.get('/users', { params }),
    getById: (id) => axios.get(`/users/${id}`),
    create: (data) => axios.post('/users', data),
    update: (id, data) => axios.put(`/users/${id}`, data),
    delete: (id) => axios.delete(`/users/${id}`),
    search: (params) => axios.get('/users/search', { params }),
    getStats: () => axios.get('/users/stats')
};
