import { apiUtils } from '@/api/axios.js';
import { useAuth } from '@/composables/useAuth';
import { useRbacStore } from '@/store/rbacStore';
import { useToast } from 'primevue/usetoast';
import { computed } from 'vue';

/**
 * Composable de administración de Roles y Permisos.
 * Envuelve el store con feedback de UI (toasts) y manejo uniforme de errores
 * (401/403/404/409/422) usando el `message` del backend.
 */
export function useRbac() {
    const rbacStore = useRbacStore();
    const toast = useToast();
    const { user, getCurrentUser } = useAuth();

    // Estado reactivo expuesto
    const roles = computed(() => rbacStore.roles);
    const permissionsCatalog = computed(() => rbacStore.permissionsCatalog);
    const catalogModules = computed(() => rbacStore.catalogModules);
    const allPermissions = computed(() => rbacStore.allPermissions);
    const currentRole = computed(() => rbacStore.state.currentRole);
    const isLoading = computed(() => rbacStore.state.isLoading);
    const isLoadingPermissions = computed(() => rbacStore.state.isLoadingPermissions);
    const isSaving = computed(() => rbacStore.state.isSaving);
    const isDeleting = computed(() => rbacStore.state.isDeleting);

    // Lecturas --------------------------------------------------------------

    const fetchPermissions = async () => {
        try {
            return await rbacStore.fetchPermissions();
        } catch (error) {
            handleError(error, 'Error al cargar el catálogo de permisos');
            throw error;
        }
    };

    const fetchRoles = async () => {
        try {
            return await rbacStore.fetchRoles();
        } catch (error) {
            handleError(error, 'Error al cargar los roles');
            throw error;
        }
    };

    const fetchRole = async (id) => {
        try {
            return await rbacStore.fetchRole(id);
        } catch (error) {
            handleError(error, 'Error al cargar el rol');
            throw error;
        }
    };

    const fetchUserRoles = async (userId) => {
        try {
            return await rbacStore.fetchUserRoles(userId);
        } catch (error) {
            handleError(error, 'Error al cargar los roles del usuario');
            throw error;
        }
    };

    // Escrituras ------------------------------------------------------------

    const createRole = async (data) => {
        try {
            const role = await rbacStore.createRole(data);
            success('Rol creado correctamente');
            return role;
        } catch (error) {
            handleError(error, 'Error al crear el rol');
            throw error;
        }
    };

    const updateRole = async (id, data) => {
        try {
            const role = await rbacStore.updateRole(id, data);
            success('Rol actualizado correctamente');
            await refreshMeIfAffectsRole(id);
            return role;
        } catch (error) {
            handleError(error, 'Error al actualizar el rol');
            throw error;
        }
    };

    const deleteRole = async (id) => {
        try {
            await rbacStore.deleteRole(id);
            success('Rol eliminado correctamente');
        } catch (error) {
            handleError(error, 'Error al eliminar el rol');
            throw error;
        }
    };

    const syncRolePermissions = async (id, permissionIds) => {
        try {
            const role = await rbacStore.syncRolePermissions(id, permissionIds);
            success('Permisos del rol actualizados correctamente');
            // Si el usuario actual tiene este rol, sus permisos pudieron cambiar
            await refreshMeIfAffectsRole(id);
            return role;
        } catch (error) {
            handleError(error, 'Error al guardar los permisos del rol');
            throw error;
        }
    };

    const syncUserRoles = async (userId, roleIds) => {
        try {
            const result = await rbacStore.syncUserRoles(userId, roleIds);
            success('Roles del usuario actualizados correctamente');
            // Si se editaron los roles del propio usuario, refrescar su sesión
            if (isCurrentUser(userId)) {
                await refreshMe();
            }
            return result;
        } catch (error) {
            handleError(error, 'Error al guardar los roles del usuario');
            throw error;
        }
    };

    // Refresco de sesión ----------------------------------------------------

    const isCurrentUser = (userId) => Number(user.value?.id) === Number(userId);

    /** Vuelve a pedir GET /auth/me y actualiza el store de auth. */
    const refreshMe = async () => {
        try {
            await getCurrentUser();
        } catch {
            // No bloquear la UI si falla el refresco; el error de la operación
            // principal ya fue manejado.
        }
    };

    /** Refresca la sesión si el rol modificado pertenece al usuario actual. */
    const refreshMeIfAffectsRole = async (roleId) => {
        const ownsRole = (user.value?.roles || []).some((r) => Number(r.id) === Number(roleId));
        if (ownsRole) await refreshMe();
    };

    // Feedback / errores ----------------------------------------------------

    const success = (detail) => {
        toast.add({ severity: 'success', summary: 'Éxito', detail, life: 3000 });
    };

    /**
     * Maneja errores del backend según el formato del interceptor de axios
     * (objeto plano con `status`, `message` y `errors`).
     */
    const handleError = (error, defaultMessage) => {
        const status = error?.status;
        const message = apiUtils.getMessage(error) || defaultMessage;

        // Errores de validación de Laravel (422)
        if (status === 422 && error?.errors && typeof error.errors === 'object') {
            const flat = apiUtils.getValidationErrorsFlat(error);
            if (flat.length > 0) {
                flat.forEach((detail) => {
                    toast.add({ severity: 'warn', summary: 'Error de validación', detail, life: 5000 });
                });
                return;
            }
        }

        const summaryByStatus = {
            401: 'Sesión inválida',
            403: 'Sin permisos',
            404: 'No encontrado',
            409: 'Operación no permitida'
        };

        toast.add({
            severity: status === 409 || status === 403 ? 'warn' : 'error',
            summary: summaryByStatus[status] || 'Error',
            detail: message || defaultMessage,
            life: status === 409 ? 7000 : 5000
        });
    };

    return {
        // Estado
        roles,
        permissionsCatalog,
        catalogModules,
        allPermissions,
        currentRole,
        isLoading,
        isLoadingPermissions,
        isSaving,
        isDeleting,
        // Lecturas
        fetchPermissions,
        fetchRoles,
        fetchRole,
        fetchUserRoles,
        // Escrituras
        createRole,
        updateRole,
        deleteRole,
        syncRolePermissions,
        syncUserRoles,
        // Utilidades
        refreshMe
    };
}
