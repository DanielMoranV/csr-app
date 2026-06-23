import { apiUtils } from '@/api/axios.js';
import { rbac as rbacApi } from '@/api/rbac.js';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

/**
 * Store de administración de Roles y Permisos (RBAC).
 *
 * Maneja el catálogo de permisos (agrupado por módulo), la lista de roles con
 * contadores y las operaciones de sincronización total de permisos/roles.
 */
export const useRbacStore = defineStore('rbac', () => {
    // Estado
    const state = reactive({
        roles: [],
        // Catálogo agrupado: { [module]: Permission[] }
        permissionsCatalog: {},
        currentRole: null,
        isLoading: false,
        isLoadingPermissions: false,
        isSaving: false,
        isDeleting: false
    });

    // Getters
    const roles = computed(() => state.roles);
    const permissionsCatalog = computed(() => state.permissionsCatalog);

    // Nombres legibles de los módulos presentes en el catálogo
    const catalogModules = computed(() => Object.keys(state.permissionsCatalog));

    // Lista plana de todos los permisos del catálogo
    const allPermissions = computed(() => Object.values(state.permissionsCatalog).flat());

    // Acciones --------------------------------------------------------------

    const fetchPermissions = async () => {
        state.isLoadingPermissions = true;
        try {
            const response = await rbacApi.getPermissions();
            if (apiUtils.isSuccess(response)) {
                // data es un objeto { modulo: [permiso...] }
                state.permissionsCatalog = apiUtils.getData(response) || {};
                return response;
            }
            throw response;
        } finally {
            state.isLoadingPermissions = false;
        }
    };

    const fetchRoles = async () => {
        state.isLoading = true;
        try {
            const response = await rbacApi.getRoles();
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.roles = Array.isArray(data) ? data : data?.data || [];
                return response;
            }
            throw response;
        } finally {
            state.isLoading = false;
        }
    };

    const fetchRole = async (id) => {
        state.isLoading = true;
        try {
            const response = await rbacApi.getRole(id);
            if (apiUtils.isSuccess(response)) {
                state.currentRole = apiUtils.getData(response);
                return state.currentRole;
            }
            throw response;
        } finally {
            state.isLoading = false;
        }
    };

    const createRole = async (data) => {
        state.isSaving = true;
        try {
            const response = await rbacApi.createRole(data);
            if (apiUtils.isSuccess(response)) {
                const newRole = apiUtils.getData(response);
                // El listado usa contadores; derivarlos del rol creado
                state.roles.push(normalizeRoleForList(newRole));
                return newRole;
            }
            throw response;
        } finally {
            state.isSaving = false;
        }
    };

    const updateRole = async (id, data) => {
        state.isSaving = true;
        try {
            const response = await rbacApi.updateRole(id, data);
            if (apiUtils.isSuccess(response)) {
                const updated = apiUtils.getData(response);
                patchRoleInList(id, updated);
                if (state.currentRole?.id === id) {
                    state.currentRole = { ...state.currentRole, ...updated };
                }
                return updated;
            }
            throw response;
        } finally {
            state.isSaving = false;
        }
    };

    const deleteRole = async (id) => {
        state.isDeleting = true;
        try {
            const response = await rbacApi.deleteRole(id);
            if (apiUtils.isSuccess(response)) {
                const index = state.roles.findIndex((r) => r.id === id);
                if (index !== -1) state.roles.splice(index, 1);
                if (state.currentRole?.id === id) state.currentRole = null;
                return response;
            }
            throw response;
        } finally {
            state.isDeleting = false;
        }
    };

    const syncRolePermissions = async (id, permissionIds) => {
        state.isSaving = true;
        try {
            const response = await rbacApi.syncRolePermissions(id, permissionIds);
            if (apiUtils.isSuccess(response)) {
                const updated = apiUtils.getData(response);
                if (state.currentRole?.id === id) {
                    state.currentRole = updated;
                }
                // Mantener el contador del listado al día
                patchRoleInList(id, { permissions_count: updated?.permissions?.length ?? permissionIds.length });
                return updated;
            }
            throw response;
        } finally {
            state.isSaving = false;
        }
    };

    const fetchUserRoles = async (userId) => {
        state.isLoading = true;
        try {
            const response = await rbacApi.getUserRoles(userId);
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response) || [];
            }
            throw response;
        } finally {
            state.isLoading = false;
        }
    };

    const syncUserRoles = async (userId, roleIds) => {
        state.isSaving = true;
        try {
            const response = await rbacApi.syncUserRoles(userId, roleIds);
            if (apiUtils.isSuccess(response)) {
                return apiUtils.getData(response) || [];
            }
            throw response;
        } finally {
            state.isSaving = false;
        }
    };

    // Helpers internos ------------------------------------------------------

    const normalizeRoleForList = (role) => ({
        ...role,
        permissions_count: role.permissions_count ?? role.permissions?.length ?? 0,
        users_count: role.users_count ?? 0
    });

    const patchRoleInList = (id, partial) => {
        const index = state.roles.findIndex((r) => r.id === id);
        if (index !== -1) {
            state.roles[index] = { ...state.roles[index], ...partial };
        }
    };

    const clearCurrentRole = () => {
        state.currentRole = null;
    };

    return {
        state,
        // Getters
        roles,
        permissionsCatalog,
        catalogModules,
        allPermissions,
        // Acciones
        fetchPermissions,
        fetchRoles,
        fetchRole,
        createRole,
        updateRole,
        deleteRole,
        syncRolePermissions,
        fetchUserRoles,
        syncUserRoles,
        clearCurrentRole
    };
});
