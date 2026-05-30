import axios from './axios';

export const dashboardEcografia = {
    getSummary: (params) => axios.get('/dashboard/ecografia/summary', { params }),
    getData: (params) => axios.get('/dashboard/ecografia', { params }),
    exportExcel: (params) => axios.get('/dashboard/ecografia/export', { params, responseType: 'blob' })
};
