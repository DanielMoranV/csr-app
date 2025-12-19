import axios from './axios';

// Auth
export const login = (payload) => axios.post('/auth/login', payload);
export const register = (payload) => axios.post('/auth/register', payload);
export const logout = () => axios.post('/auth/logout');
export const refresh = () => axios.post('/auth/refresh');
export const me = () => axios.post('/auth/me');

// Users Management
export const users = {
    // Obtener lista de usuarios con filtros y ordenamiento (sin paginación)
    getAll: (params = {}) => {
        // Filtrar parámetros para omitir 'paginate' y otros que no están en la documentación
        const { ...cleanParams } = params;

        return axios.get('/users', { params: cleanParams });
    },

    // Obtener lista paginada de usuarios
    getPaginated: (params = {}) => axios.get('/users', { params: { ...params, paginate: true } }),

    // Búsqueda avanzada de usuarios
    search: (params = {}) => axios.get('/users/search', { params }),

    // Obtener lista de usuarios activos con información limitada
    list: () => axios.get('/users/list'),

    // Obtener estadísticas de usuarios
    getStats: () => axios.get('/users/stats'),

    // Obtener usuario por ID
    getById: (id) => axios.get(`/users/${id}`),

    // Crear nuevo usuario
    create: (userData) => axios.post('/users', userData),

    // Actualizar usuario existente
    update: (id, userData) => axios.put(`/users/${id}`, userData),

    // Cambiar estado activo/inactivo
    toggleStatus: (id) => axios.patch(`/users/${id}/toggle-status`),

    // Eliminar usuario
    delete: (id) => axios.delete(`/users/${id}`)
};

// Positions Management
export const positions = {
    search: (query) => axios.get('/positions/search', { params: { query } }),
    getAll: () => axios.get('/positions')
};

// Profile Management
export const profile = {
    // Obtener perfil del usuario actual
    get: () => axios.get('/profile'),

    // Actualizar perfil del usuario
    update: (profileData) => axios.put('/profile', profileData),

    // Cambiar contraseña
    changePassword: (passwordData) => axios.put('/profile/password', passwordData),

    // Subir avatar
    uploadAvatar: (formData) =>
        axios.post('/profile/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    // Eliminar avatar
    deleteAvatar: () => axios.delete('/profile/avatar')
};

// SISCLIN Hospitalization Management
export const sisclin = {
    // Importación masiva de hospitalizaciones
    bulkImportHospitalizations: (data) => axios.post('/sisclin/hospitalization/bulk', data)
};

// Hospital Attentions Management
export { hospitalAttentions } from './hospitalAttentions';

// Hospital Statistics Management
export { hospitalStatistics } from './hospitalStatistics';

// Beds Management
export { beds } from './beds';

// Bed Reservations Management
export { bedReservations } from './bedReservations';

// Tickets Management
export { TicketService } from './tickets';

// Ticket Recurrence Rules Management
export { TicketRecurrenceRuleService } from './ticketRecurrenceRules';

// General Tariffs Management
export { generalTariffs } from './generalTariffs';
