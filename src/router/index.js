import AppLayout from '@/layout/AppLayout.vue';
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
                    path: '/dashboard',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue'),
                    meta: { requiresAuth: true, positions: ['*'] }
                },
                {
                    path: '/profile',
                    name: 'profile',
                    component: () => import('@/views/Profile.vue'),
                    meta: { requiresAuth: true, positions: ['*'] }
                },
                {
                    path: '/usuarios',
                    name: 'usuarios',
                    component: () => import('@/views/users/Users.vue'),
                    meta: { requiresAuth: true, positions: ['SISTEMAS', 'RRHH', 'ADMINISTRACION'] }
                },
                {
                    path: '/sisclin/import',
                    name: 'sisclin-import',
                    component: () => import('@/views/sisclin/SisclinImport.vue'),
                    meta: { requiresAuth: true, positions: ['SISTEMAS', 'ADMINISTRACION', 'DIRECTOR MEDICO', 'HOSPITALIZACION'] }
                },
                {
                    path: '/hospital-attentions',
                    name: 'hospital-attentions',
                    component: () => import('@/views/attentions/HospitalAttentions.vue'),
                    meta: { requiresAuth: true, positions: ['*'] }
                },
                {
                    path: '/habitaciones',
                    name: 'habitaciones',
                    component: () => import('@/views/rooms/Rooms.vue'),
                    meta: { requiresAuth: true, positions: ['SISTEMAS', 'RRHH', 'ADMINISTRACION', 'HOSPITALIZACION'] }
                },
                {
                    path: '/hospitalizacion',
                    name: 'hospitalizacion',
                    component: () => import('@/views/hospitalization/HospitalizationStatus.vue'),
                    meta: { requiresAuth: true, positions: ['*'] }
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
    console.log(`🧭 [ROUTER] Navegando de "${from.name || from.path}" a "${to.name || to.path}"`);

    const authStore = useAuthStore();

    // CRÍTICO: Esperar a que AuthStore esté inicializado antes de evaluar rutas
    if (!authStore.isInitialized) {
        console.log('⏳ [ROUTER] AuthStore no está inicializado, esperando...');
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
        } else {
            console.log('✅ [ROUTER] AuthStore inicializado, continuando navegación');
        }
    }

    // Verificar si se requiere autenticación
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
    const requiresGuest = to.matched.some((record) => record.meta.requiresGuest);

    console.log('🧭 [ROUTER] Estado de la ruta:', {
        requiresAuth,
        requiresGuest,
        currentAuthState: authStore.isLoggedIn
    });

    try {
        // Si la ruta requiere autenticación
        if (requiresAuth) {
            console.log('🔐 [ROUTER] Ruta requiere autenticación, verificando...');

            // Verificar y refrescar token si es necesario
            const isAuthenticated = await authStore.checkAndRefreshToken();

            console.log('🔐 [ROUTER] Resultado de verificación de autenticación:', isAuthenticated);

            if (!isAuthenticated) {
                // No autenticado, redirigir al login
                console.log('❌ [ROUTER] Usuario no autenticado, redirigiendo al login');
                return next({ name: 'login' });
            }

            // Verificar permisos de posición si se especifican
            const requiredPositions = to.meta.positions;
            if (requiredPositions && requiredPositions.length > 0 && !requiredPositions.includes('*')) {
                const userPosition = authStore.getUser?.position;

                console.log('🔐 [ROUTER] Verificando permisos:', {
                    requiredPositions,
                    userPosition
                });

                if (!userPosition || !requiredPositions.includes(userPosition)) {
                    console.log('❌ [ROUTER] Usuario sin permisos suficientes, redirigiendo a acceso denegado');
                    return next({ name: 'accessDenied' });
                }
            }

            console.log('✅ [ROUTER] Autenticación y permisos verificados, permitiendo navegación');
            return next();
        }

        // Si la ruta requiere ser invitado (no autenticado)
        if (requiresGuest) {
            console.log('👤 [ROUTER] Ruta requiere ser invitado (no autenticado)');
            const isAuthenticated = authStore.isLoggedIn;

            if (isAuthenticated) {
                // Ya autenticado, redirigir al dashboard
                console.log('✅ [ROUTER] Usuario ya autenticado, redirigiendo al dashboard');
                return next({ name: 'dashboard' });
            }

            console.log('👤 [ROUTER] Usuario no autenticado, permitiendo acceso a ruta de invitado');
            return next();
        }

        // Ruta libre, continuar
        console.log('🆓 [ROUTER] Ruta libre, continuando navegación');
        next();
    } catch (error) {
        console.error('❌ [ROUTER] Error en navigation guard:', error);

        // En caso de error, limpiar autenticación y ir al login
        authStore.clearAuthData();

        if (requiresAuth) {
            console.log('🔧 [ROUTER] Error en ruta protegida, redirigiendo al login');
            return next({ name: 'login' });
        }

        console.log('🔧 [ROUTER] Error en ruta libre, continuando navegación');
        next();
    }
});

// Actualizar actividad del usuario en cada navegación exitosa
router.afterEach((to, from) => {
    console.log(`✅ [ROUTER] Navegación completada a "${to.name || to.path}"`);
    const authStore = useAuthStore();

    if (authStore.isLoggedIn) {
        authStore.updateActivity();
        console.log('⚡ [ROUTER] Actividad de usuario actualizada');
    }
});

export default router;
