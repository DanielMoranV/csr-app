import axios from './axios';

export const patients = {
    list: (params) => axios.get('/patients', { params }),
    getById: (id) => axios.get(`/patients/${id}`),
    create: (data) => axios.post('/patients', data),
    update: (id, data) => axios.put(`/patients/${id}`, data),
    delete: (id) => axios.delete(`/patients/${id}`),
    search: (params) => axios.get('/patients/search', { params }),
    getStats: () => axios.get('/patients/stats')
};
