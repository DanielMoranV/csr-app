import AppLayout from '@/layout/AppLayout.vue';
import { MODULE_PERMISSIONS } from '@/config/permissions';
import { useAuthStore } from '@/store/authStore';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/dashboard',
            component: AppLayout,
            meta: { requiresAuth: true },
            children: [
                {
                    path: MODULE_PERMISSIONS.dashboard.path,
                    name: MODULE_PERMISSIONS.dashboard.name,
                    component: () => import('@/views/Dashboard.vue'),
                    meta: { requiresAuth: true, positions: MODULE_PERMISSIONS.dashboard.positions }
                },
                {
                    path: MODULE_PERMISSIONS.profile.path,
                    name: MODULE_PERMISSIONS.profile.name,
                    component: () => import('@/views/Profile.vue'),
                    meta: { requiresAuth: true, positions: MODULE_PERMISSIONS.profile.positions }
                },
                {
                    path: MODULE_PERMISSIONS.usuarios.path,
                    name: MODULE_PERMISSIONS.usuarios.name,
                    component: () => import('@/views/users/Users.vue'),
                    meta: { requiresAuth: true, positions: MODULE_PERMISSIONS.usuarios.positions }
                },
                {
                    path: MODULE_PERMISSIONS.sisclinImport.path,
                    name: MODULE_PERMISSIONS.sisclinImport.name,
                    component: () => import('@/views/sisclin/SisclinImport.vue'),
                    meta: { requiresAuth: true, positions: MODULE_PERMISSIONS.sisclinImport.positions }
                },
                {
                    path: MODULE_PERMISSIONS.hospitalAttentions.path,
                    name: MODULE_PERMISSIONS.hospitalAttentions.name,
                    component: () => import('@/views/attentions/HospitalAttentions.vue'),
                    meta: { requiresAuth: true, positions: MODULE_PERMISSIONS.hospitalAttentions.positions }
                },
                {
                    path: MODULE_PERMISSIONS.habitaciones.path,
                    name: MODULE_PERMISSIONS.habitaciones.name,
                    component: () => import('@/views/rooms/Rooms.vue'),
                    meta: { requiresAuth: true, positions: MODULE_PERMISSIONS.habitaciones.positions }
                },
                {
                    path: MODULE_PERMISSIONS.hospitalizacion.path,
                    name: MODULE_PERMISSIONS.hospitalizacion.name,
                    component: () => import('@/views/hospitalization/HospitalizationStatus.vue'),
                    meta: { requiresAuth: true, positions: MODULE_PERMISSIONS.hospitalizacion.positions }
                },
                {
                    path: MODULE_PERMISSIONS.hospitalizacionDisplay.path,
                    name: MODULE_PERMISSIONS.hospitalizacionDisplay.name,
                    component: () => import('@/views/hospitalization/HospitalizationDisplay.vue'),
                    meta: { requiresAuth: true, positions: MODULE_PERMISSIONS.hospitalizacionDisplay.positions }
                },
                {
                    path: MODULE_PERMISSIONS.tickets.path,
                    name: MODULE_PERMISSIONS.tickets.name,
                    component: () => import('@/views/tickets/Tickets.vue'),
                    meta: { requiresAuth: true, positions: MODULE_PERMISSIONS.tickets.positions }
                },
                {
                    path: MODULE_PERMISSIONS.ticketRecurrenceRules.path,
                    name: MODULE_PERMISSIONS.ticketRecurrenceRules.name,
                    component: () => import('@/views/tickets/RecurrenceRules.vue'),
                    meta: { requiresAuth: true, positions: MODULE_PERMISSIONS.ticketRecurrenceRules.positions }
                }
            ]
        },
        {
            path: '/',
            name: 'auth',
            component: () => import('@/views/auth/Login.vue'),
            meta: { requiresGuest: true }
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/auth/Login.vue'),
            meta: { requiresGuest: true }
        },
        {
            path: '/auth/access',
            name: 'accessDenied',
            component: () => import('@/views/pages/auth/Access.vue')
        },
        {
            path: '/auth/error',
            name: 'error',
            component: () => import('@/views/pages/auth/Error.vue')
        },
        {
            // Ruta catch-all para páginas no encontradas - DEBE ir al final
            path: '/:pathMatch(.*)*',
            name: 'notfound-catchall',
            component: () => import('@/views/pages/NotFound.vue')
        }
    ]
});

// Navigation Guards
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();

    // CRÍTICO: Esperar a que AuthStore esté inicializado antes de evaluar rutas
    if (!authStore.isInitialized) {
        // Esperar hasta que se inicialice (máximo 3 segundos)
        let attempts = 0;
        const maxAttempts = 30; // 3 segundos con intervals de 100ms

        while (!authStore.isInitialized && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
        }

        if (!authStore.isInitialized) {
            console.error('❌ [ROUTER] Timeout esperando inicialización del AuthStore');
            // Si no se inicializa, asumir no autenticado
            if (to.matched.some((record) => record.meta.requiresAuth)) {
                return next({ name: 'login' });
            }
        }
    }

    // Verificar si se requiere autenticación
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
    const requiresGuest = to.matched.some((record) => record.meta.requiresGuest);

    try {
        // Si la ruta requiere autenticación
        if (requiresAuth) {
            // Verificar y refrescar token si es necesario
            const isAuthenticated = await authStore.checkAndRefreshToken();

            if (!isAuthenticated) {
                // No autenticado, redirigir al login
                return next({ name: 'login' });
            }

            // Verificar permisos de posición si se especifican
            const requiredPositions = to.meta.positions;
            if (requiredPositions && requiredPositions.length > 0 && !requiredPositions.includes('*')) {
                const userPosition = authStore.getUser?.position;

                if (!userPosition || !requiredPositions.includes(userPosition)) {
                    return next({ name: 'accessDenied' });
                }
            }

            return next();
        }

        // Si la ruta requiere ser invitado (no autenticado)
        if (requiresGuest) {
            const isAuthenticated = authStore.isLoggedIn;

            if (isAuthenticated) {
                // Ya autenticado, redirigir al dashboard
                return next({ name: 'dashboard' });
            }

            return next();
        }

        next();
    } catch (error) {
        console.error('❌ [ROUTER] Error en navigation guard:', error);

        // En caso de error, limpiar autenticación y ir al login
        authStore.clearAuthData();

        if (requiresAuth) {
            return next({ name: 'login' });
        }

        next();
    }
});

// Actualizar actividad del usuario en cada navegación exitosa
router.afterEach((to) => {
    const authStore = useAuthStore();

    if (authStore.isLoggedIn) {
        authStore.updateActivity();
    }
});

export default router;
