import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/composables/usePermissions';

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
            
            // Verificar permisos específicos de la ruta
            if (to.meta?.positions) {
                const { canAccessRoute } = usePermissions();
                
                if (canAccessRoute(to.meta.positions)) {
                    next();
                } else {
                    // Redirigir a página de acceso denegado
                    next({
                        path: '/auth/access',
                        query: { from: to.fullPath }
                    });
                }
            } else {
                next();
            }
        } else {
            // No autenticado o token inválido
            next({
                path: '/',
                query: { redirect: to.fullPath }
            });
        }
    } catch (error) {
        console.error('Error en authGuard:', error);

        // En caso de error, redirigir a login
        next({
            path: '/',
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

/**
 * Guard para rutas que requieren posición específica
 * @param {Array|String} requiredPositions - Posiciones requeridas
 */
export function positionGuard(requiredPositions) {
    return (to, from, next) => {
        const authStore = useAuthStore();
        const { hasAnyPosition } = usePermissions();
        
        // Verificar autenticación primero
        if (!authStore.isLoggedIn) {
            next({
                path: '/',
                query: { redirect: to.fullPath }
            });
            return;
        }
        
        // Convertir a array si es string
        const positions = Array.isArray(requiredPositions) 
            ? requiredPositions 
            : [requiredPositions];
        
        // Verificar si tiene la posición requerida
        if (hasAnyPosition(positions)) {
            next();
        } else {
            next({
                path: '/auth/access',
                query: { 
                    from: to.fullPath,
                    required: positions.join(', ')
                }
            });
        }
    };
}

/**
 * Guard para rutas administrativas
 */
export function adminGuard(to, from, next) {
    const { isSystemAdmin, hasFullAccess } = usePermissions();
    
    if (isSystemAdmin.value || hasFullAccess.value) {
        next();
    } else {
        next({
            path: '/auth/access',
            query: { from: to.fullPath, reason: 'admin_required' }
        });
    }
}

/**
 * Guard para rutas médicas
 */
export function medicalGuard(to, from, next) {
    const { isMedicalStaff, hasFullAccess } = usePermissions();
    
    if (isMedicalStaff.value || hasFullAccess.value) {
        next();
    } else {
        next({
            path: '/auth/access',
            query: { from: to.fullPath, reason: 'medical_staff_required' }
        });
    }
}
