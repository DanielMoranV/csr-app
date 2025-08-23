import { useAuthStore } from '@/store/authStore';

/**
 * Route guard para autenticación
 * Protege rutas que requieren autenticación
 */
export async function authGuard(to, from, next) {
    const authStore = useAuthStore();

    try {
        // Verificar si hay autenticación válida
        const isValidAuth = await authStore.checkAndRefreshToken();

        if (isValidAuth) {
            // Usuario autenticado y token válido
            authStore.updateActivity();
            next();
        } else {
            // No autenticado o token inválido
            next({
                path: '/login',
                query: { redirect: to.fullPath }
            });
        }
    } catch (error) {
        console.error('Error en authGuard:', error);

        // En caso de error, redirigir a login
        next({
            path: '/login',
            query: { redirect: to.fullPath }
        });
    }
}

/**
 * Route guard para rutas de invitados (login, register)
 * Redirige a dashboard si ya está autenticado
 */
export function guestGuard(to, from, next) {
    const authStore = useAuthStore();

    if (authStore.isLoggedIn && !authStore.isTokenExpired) {
        // Usuario ya está autenticado, redirigir a dashboard
        next('/dashboard');
    } else {
        // Usuario no autenticado, permitir acceso a ruta de invitado
        next();
    }
}
