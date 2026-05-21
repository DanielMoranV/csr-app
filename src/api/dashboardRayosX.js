import axios from './axios';

export const dashboardRayosX = {
    getSummary: (params) => axios.get('/dashboard/rayosx/summary', { params }),
    getTendencia: (params) => axios.get('/dashboard/rayosx/tendencia', { params }),
    exportExcel: (params) => axios.get('/dashboard/rayosx/export', { params, responseType: 'blob' })
};
