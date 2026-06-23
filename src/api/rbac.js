import axios from './axios';

/**
 * API service para administración de Roles y Permisos (RBAC).
 *
 * Todas las rutas requieren el permiso `roles.manage` (excepto el listado de
 * usuarios, que usa `users.view`). El header Authorization Bearer ya lo agrega
 * el interceptor de axios.
 */
export const rbac = {
    /**
     * Catálogo de permisos agrupado por módulo.
     * @returns {Promise} data: { [module]: Permission[] }
     */
    getPermissions: () => axios.get('/permissions'),

    /**
     * Lista de roles con contadores (permissions_count, users_count).
     * @returns {Promise} data: Role[]
     */
    getRoles: () => axios.get('/roles'),

    /**
     * Un rol con su arreglo de permisos.
     * @param {number} id - ID del rol
     * @returns {Promise} data: Role & { permissions: Permission[] }
     */
    getRole: (id) => axios.get(`/roles/${id}`),

    /**
     * Crea un rol.
     * @param {{ name: string, description?: string, permissions?: number[] }} data
     * @returns {Promise} data: Role creado con permissions
     */
    createRole: (data) => axios.post('/roles', data),

    /**
     * Edita nombre/descripción de un rol.
     * @param {number} id - ID del rol
     * @param {{ name?: string, description?: string }} data
     * @returns {Promise}
     */
    updateRole: (id, data) => axios.put(`/roles/${id}`, data),

    /**
     * Elimina un rol. Falla con 409 si es de sistema o tiene usuarios asignados.
     * @param {number} id - ID del rol
     * @returns {Promise}
     */
    deleteRole: (id) => axios.delete(`/roles/${id}`),

    /**
     * Sincronización total de permisos de un rol (reemplaza el conjunto completo).
     * @param {number} id - ID del rol
     * @param {number[]} permissionIds - IDs de permisos deseados
     * @returns {Promise} data: Role con permissions
     */
    syncRolePermissions: (id, permissionIds) => axios.put(`/roles/${id}/permissions`, { permissions: permissionIds }),

    /**
     * Roles asignados a un usuario.
     * @param {number} userId - ID del usuario
     * @returns {Promise} data: Role[]
     */
    getUserRoles: (userId) => axios.get(`/users/${userId}/roles`),

    /**
     * Sincronización total de roles de un usuario (reemplaza el conjunto completo).
     * @param {number} userId - ID del usuario
     * @param {number[]} roleIds - IDs de roles deseados
     * @returns {Promise} data: Role[] del usuario
     */
    syncUserRoles: (userId, roleIds) => axios.put(`/users/${userId}/roles`, { roles: roleIds })
};
