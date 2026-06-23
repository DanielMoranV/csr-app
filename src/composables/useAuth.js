import { useAuthStore } from '@/store/authStore';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

/**
 * Composable para manejo centralizado de autenticación
 * Proporciona métodos y estados reactivos para la autenticación
 */
export function useAuth() {
    const authStore = useAuthStore();
    const router = useRouter();

    // Estados reactivos
    const user = computed(() => authStore.getUser);
    const token = computed(() => authStore.getToken);
    const isAuthenticated = computed(() => authStore.isLoggedIn);
    const isLoading = computed(() => authStore.state.isLoading);
    const isTokenExpired = computed(() => authStore.isTokenExpired);

    // RBAC: permisos y roles del usuario (sistema dinámico modulo.accion)
    const permissions = computed(() => user.value?.permissions || []);
    const roles = computed(() => user.value?.roles || []);
    // is_superuser = true => acceso global (SISTEMAS)
    const isSuperuser = computed(() => user.value?.is_superuser === true);

    // Métodos de autenticación con manejo de errores mejorado
    const login = async (dni, password, options = {}) => {
        const result = await authStore.login(dni, password);

        // Solo redirigir si se solicita explícitamente
        if (options.redirect !== false) {
            const redirectTo = options.redirectTo || router.currentRoute.value.query.redirect || '/dashboard';
            await router.push(redirectTo);
        }

        return result;
    };

    const register = async (userData, options = {}) => {
        const result = await authStore.register(userData);

        // Solo redirigir si se solicita explícitamente
        if (options.redirect !== false) {
            const redirectTo = options.redirectTo || '/dashboard';
            await router.push(redirectTo);
        }

        return result;
    };

    const logout = async (options = {}) => {
        try {
            await authStore.logout();

            // Solo redirigir si se solicita explícitamente
            if (options.redirect !== false) {
                const redirectTo = options.redirectTo || '/login';
                await router.push(redirectTo);
            }
        } catch (error) {
            // Log del error pero continuar con redirección si se solicita
            console.error('Error en logout:', error);
            if (options.redirect !== false) {
                const redirectTo = options.redirectTo || '/login';
                await router.push(redirectTo);
            }
        }
    };

    const refreshToken = async () => {
        try {
            return await authStore.refreshToken();
        } catch (error) {
            // Si falla el refresh, limpiar datos localmente sin redirección automática
            authStore.clearAuthData();
            throw error;
        }
    };

    // Método para verificar autenticación sin redirección automática
    const requireAuth = async () => {
        if (!isAuthenticated.value) {
            return {
                isAuthenticated: false,
                reason: 'not_authenticated',
                redirectInfo: {
                    path: '/login',
                    query: { redirect: router.currentRoute.value.fullPath }
                }
            };
        }

        // Verificar si el token necesita refresh
        try {
            await authStore.checkAndRefreshToken();
            return { isAuthenticated: true };
        } catch (error) {
            return {
                isAuthenticated: false,
                reason: 'token_refresh_failed',
                redirectInfo: {
                    path: '/login',
                    query: { redirect: router.currentRoute.value.fullPath }
                }
            };
        }
    };

    // Verifica si el usuario tiene un permiso específico (slug modulo.accion).
    // Los superusuarios (SISTEMAS) tienen acceso global.
    const hasPermission = (permission) => {
        if (isSuperuser.value) return true;
        if (!user.value || !permission) return false;
        return permissions.value.includes(permission);
    };

    // Verifica si el usuario tiene AL MENOS uno de los permisos indicados.
    const hasAnyPermission = (perms = []) => {
        if (isSuperuser.value) return true;
        if (!Array.isArray(perms) || perms.length === 0) return false;
        return perms.some((perm) => permissions.value.includes(perm));
    };

    // Verifica si el usuario tiene TODOS los permisos indicados.
    const hasAllPermissions = (perms = []) => {
        if (isSuperuser.value) return true;
        if (!Array.isArray(perms) || perms.length === 0) return false;
        return perms.every((perm) => permissions.value.includes(perm));
    };

    // Método para obtener información actualizada del usuario
    const getCurrentUser = async () => {
        try {
            return await authStore.getCurrentUser();
        } catch (error) {
            if (error.status === 401) {
                // Limpiar datos sin redirección automática
                authStore.clearAuthData();
            }
            throw error;
        }
    };

    // Método para actualizar la actividad del usuario
    const updateUserActivity = () => {
        authStore.updateActivity();
    };

    // Método para validar datos de entrada antes de enviar
    const validateLoginData = (dni, password) => {
        return authStore.validateLoginData(dni, password);
    };

    const validateRegisterData = (userData) => {
        return authStore.validateRegisterData(userData);
    };

    return {
        // Estados
        user,
        token,
        isAuthenticated,
        isLoading,
        isTokenExpired,

        // RBAC
        permissions,
        roles,
        isSuperuser,

        // Métodos de autenticación
        login,
        register,
        logout,
        refreshToken,
        getCurrentUser,

        // Utilidades
        requireAuth,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        updateUserActivity,
        validateLoginData,
        validateRegisterData
    };
}
