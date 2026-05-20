import axios from './axios';

export const dashboardErrores = {
    getData: (params) => axios.get('/dashboard/errores', { params }),
    exportExcel: (params) => axios.get('/dashboard/errores/export', { params, responseType: 'blob' })
};
