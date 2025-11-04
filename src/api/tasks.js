import axios from './axios';

export const getTasks = (params) => axios.get('/tasks', { params });
export const getTask = (id) => axios.get(`/tasks/${id}`);
export const createTask = (data) => axios.post('/tasks', data);
export const updateTask = (id, data) => axios.put(`/tasks/${id}`, data);
export const deleteTask = (id) => axios.delete(`/tasks/${id}`);
export const getTaskStats = () => axios.get('/tasks/stats');
export const searchTasks = (params) => axios.get('/tasks/search', { params });
