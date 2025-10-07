import { onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '@/store/authStore';

/**
 * Composable para auto-refresh preventivo del token JWT
 * Programa el refresh del token antes de que expire para evitar interrupciones
 *
 * Uso:
 * - Importar en App.vue para aplicar globalmente
 * - Se ejecuta automáticamente cuando el componente se monta
 * - Se limpia automáticamente cuando el componente se desmonta
 *
 * @example
 * import { useTokenRefresh } from '@/composables/useTokenRefresh'
 *
 * export default {
 *   setup() {
 *     useTokenRefresh()
 *   }
 * }
 */
export function useTokenRefresh() {
    const authStore = useAuthStore();
    let refreshTimeout = null;

    // Refrescar 5 minutos antes de que expire (configurable)
    const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutos en milisegundos

    /**
     * Programa el próximo refresh del token
     * Calcula cuándo debe refrescarse basándose en la expiración actual
     */
    function scheduleRefresh() {
        // Limpiar timeout anterior si existe
        if (refreshTimeout) {
            clearTimeout(refreshTimeout);
            refreshTimeout = null;
        }

        // Verificar que haya token y expiración
        if (!authStore.state.tokenExpiresAt || !authStore.state.isAuthenticated) {
            if (import.meta.env.DEV) {
                console.log('[TokenRefresh] No hay token o no está autenticado, cancelando schedule');
            }
            return;
        }

        const now = Date.now();
        const expiresAt = authStore.state.tokenExpiresAt;
        const timeUntilExpiry = expiresAt - now;

        // Si el token ya expiró, no programar refresh
        if (timeUntilExpiry <= 0) {
            if (import.meta.env.DEV) {
                console.warn('[TokenRefresh] Token ya expirado, limpiando sesión');
            }
            authStore.clearAuthData();
            return;
        }

        // Calcular cuándo refrescar (5 min antes de expirar)
        const refreshTime = timeUntilExpiry - REFRESH_BEFORE_EXPIRY_MS;

        // Si ya estamos dentro de la ventana de refresh, refrescar inmediatamente
        if (refreshTime <= 0) {
            if (import.meta.env.DEV) {
                console.log('[TokenRefresh] Token cerca de expirar, refrescando inmediatamente');
            }
            performRefresh();
            return;
        }

        // Programar refresh
        const refreshDate = new Date(now + refreshTime);
        if (import.meta.env.DEV) {
            console.log(`[TokenRefresh] Programado para: ${refreshDate.toLocaleTimeString()}`);
            console.log(`[TokenRefresh] Token expira en: ${Math.round(timeUntilExpiry / 60000)} minutos`);
        }

        refreshTimeout = setTimeout(async () => {
            performRefresh();
        }, refreshTime);
    }

    /**
     * Ejecuta el refresh del token
     */
    async function performRefresh() {
        try {
            if (import.meta.env.DEV) {
                console.log('[TokenRefresh] Ejecutando refresh preventivo...');
            }

            await authStore.refreshToken();

            if (import.meta.env.DEV) {
                console.log('[TokenRefresh] ✅ Token refrescado exitosamente');
            }

            // Reprogramar el siguiente refresh
            scheduleRefresh();
        } catch (error) {
            console.error('[TokenRefresh] ❌ Error al refrescar token:', error);

            // Si falla el refresh, limpiar sesión
            authStore.clearAuthData();

            // Redirigir a login
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
    }

    /**
     * Cancela el refresh programado
     */
    function cancelScheduledRefresh() {
        if (refreshTimeout) {
            clearTimeout(refreshTimeout);
            refreshTimeout = null;

            if (import.meta.env.DEV) {
                console.log('[TokenRefresh] Schedule cancelado');
            }
        }
    }

    // Programar refresh cuando se monta el componente
    onMounted(() => {
        if (authStore.state.isAuthenticated) {
            if (import.meta.env.DEV) {
                console.log('[TokenRefresh] Iniciando auto-refresh preventivo');
            }
            scheduleRefresh();
        }
    });

    // Limpiar timeout cuando se desmonta el componente
    onUnmounted(() => {
        cancelScheduledRefresh();
    });

    // Observar cambios en autenticación para reprogramar
    watch(
        () => authStore.state.isAuthenticated,
        (isAuthenticated) => {
            if (isAuthenticated) {
                // Usuario se autenticó, programar refresh
                scheduleRefresh();
            } else {
                // Usuario cerró sesión, cancelar refresh
                cancelScheduledRefresh();
            }
        }
    );

    // Observar cambios en la expiración del token para reprogramar
    watch(
        () => authStore.state.tokenExpiresAt,
        (newExpiry) => {
            if (newExpiry && authStore.state.isAuthenticated) {
                // Token actualizado (ej: después de login o refresh manual)
                scheduleRefresh();
            }
        }
    );

    return {
        scheduleRefresh,
        cancelScheduledRefresh,
        performRefresh
    };
}
