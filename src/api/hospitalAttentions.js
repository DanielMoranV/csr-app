import axios from './axios';

export const hospitalAttentions = {
    list: (params) => axios.get('/hospital-attentions', { params }),
    getById: (id) => axios.get(`/hospital-attentions/${id}`),
    create: (data) => axios.post('/hospital-attentions', data),
    update: (id, data) => axios.put(`/hospital-attentions/${id}`, data),
    delete: (id) => axios.delete(`/hospital-attentions/${id}`),
    search: (params) => axios.get('/hospital-attentions/search', { params }),
    getStats: () => axios.get('/hospital-attentions/stats')
};
