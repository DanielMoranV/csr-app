import axios from './axios';

export const dashboardRayosX = {
    getSummary: (params) => axios.get('/dashboard/rayosx/summary', { params }),
    exportExcel: (params) => axios.get('/dashboard/rayosx/export', { params, responseType: 'blob' })
};
