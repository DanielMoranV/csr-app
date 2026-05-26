import axios from './axios';

export const dashboardEmergencia = {
    getData: (params) => axios.get('/dashboard/emergencia', { params }),
    exportExcel: (params) => axios.get('/dashboard/emergencia/export', { params, responseType: 'blob' }),
    getDiagnosticos: (params) => axios.get('/dashboard/emergencia/diagnosticos', { params }),
    getSinDiagnostico: (params) => axios.get('/dashboard/sin-diagnostico/emergencia', { params }),
    exportSinDiagnostico: (params) => axios.get('/dashboard/sin-diagnostico/emergencia/export', { params, responseType: 'blob' }),
    exportAuditoria: (params) => axios.get('/dashboard/auditoria/export', { params, responseType: 'blob', timeout: 30000 }),
    getContinuidad: (params) => axios.get('/dashboard/emergencia/continuidad', { params })
};
