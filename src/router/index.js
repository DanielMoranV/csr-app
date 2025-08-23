import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/dashboard',
            component: AppLayout,
            children: [
                {
                    path: '/dashboard',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue'),
                    meta: { positions: ['*'] }
                },
                {
                    path: '/perfil',
                    name: 'perfil',
                    component: () => import('@/views/Perfil.vue'),
                    meta: { positions: ['*'] } // Acceso público
                },
                {
                    path: '/usuarios',
                    name: 'usuarios',
                    component: () => import('@/views/Usuarios.vue'),
                    meta: { positions: ['SISTEMAS', 'RRHH', 'ADMINISTRACION'] }
                }
            ]
        },
        {
            path: '/',
            name: 'auth',
            component: () => import('@/views/auth/Login.vue')
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

export default router;
