<script setup>
import { useAuth } from '@/composables/useAuth';
import { useLayout } from '@/layout/composables/layout';
import { useApiConfigStore } from '@/store/apiConfigStore';
import { computed } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import AppConfigurator from './AppConfigurator.vue';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const { logout, user } = useAuth();
const apiConfigStore = useApiConfigStore();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

// Computadas para el indicador de API
const apiMode = computed(() => apiConfigStore.getCurrentMode);
const apiUrl = computed(() => apiConfigStore.getCurrentBaseURL);
const isLocalMode = computed(() => apiMode.value === 'local');

const handleLogout = () => {
    console.log('Iniciando proceso de cierre de sesión...');
    confirm.require({
        message: '¿Estás seguro que deseas cerrar sesión?',
        header: 'Confirmación',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancelar',
        acceptLabel: 'Sí, cerrar sesión',
        rejectClass: 'p-button-secondary p-button-outlined',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await logout();
                toast.add({
                    severity: 'success',
                    summary: 'Sesión cerrada',
                    detail: 'Has cerrado sesión exitosamente',
                    life: 3000
                });
                router.push('/');
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cerrar sesión',
                    life: 3000
                });
                router.push('/');
            }
        },
        reject: () => {
            // Usuario canceló, no hacer nada
        }
    });
};
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/" class="layout-topbar-logo">
                <img src="/logo-csr.webp" alt="Logo Clínica Santa Rosa" class="layout-logo-image" />
                <span>Clínica Santa Rosa</span>
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <!-- API Status Indicator -->
                <div class="api-status-indicator" v-tooltip.bottom="apiUrl">
                    <span :class="['api-status-badge', { 'local-mode': isLocalMode, 'cloud-mode': !isLocalMode }]">
                        <i :class="['pi', isLocalMode ? 'pi-wifi' : 'pi-cloud']"></i>
                        <span class="api-status-text">{{ isLocalMode ? 'Local' : 'Online' }}</span>
                    </span>
                </div>
                
                <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
                    <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                </button>
                <div class="relative">
                    <button
                        v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
                        type="button"
                        class="layout-topbar-action layout-topbar-action-highlight"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <AppConfigurator />
                </div>
            </div>

            <button
                class="layout-topbar-menu-button layout-topbar-action"
                v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
            >
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <div class="user-info" v-if="user">
                        <span class="user-name">{{ user.name || user.nick || 'Usuario' }}</span>
                        <small class="user-role">{{ user.position || 'Personal médico' }}</small>
                    </div>
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-calendar"></i>
                        <span>Calendario</span>
                    </button>
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-user"></i>
                        <span>Perfil</span>
                    </button>
                    <button type="button" class="layout-topbar-action logout-action" @click="handleLogout">
                        <i class="pi pi-sign-out"></i>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* API Status Indicator */
.api-status-indicator {
    display: flex;
    align-items: center;
    margin-right: 0.5rem;
}

.api-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    transition: all 0.2s ease;
    cursor: default;
}

.api-status-badge.local-mode {
    background-color: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
    border: 1px solid rgba(34, 197, 94, 0.3);
}

.api-status-badge.cloud-mode {
    background-color: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
    border: 1px solid rgba(59, 130, 246, 0.3);
}

.api-status-badge i {
    font-size: 0.875rem;
}

.api-status-text {
    white-space: nowrap;
}

/* Dark mode adjustments */
.app-dark .api-status-badge.local-mode {
    background-color: rgba(34, 197, 94, 0.15);
    color: rgb(74, 222, 128);
}

.app-dark .api-status-badge.cloud-mode {
    background-color: rgba(59, 130, 246, 0.15);
    color: rgb(96, 165, 250);
}

.layout-logo-image {
    width: 32px;
    height: 32px;
    object-fit: contain;
    margin-right: 0.5rem;
}

.user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    margin-right: 1rem;
    padding-right: 1rem;
    border-right: 1px solid var(--surface-border);
}

.user-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-color);
    line-height: 1.2;
}

.user-role {
    font-size: 0.75rem;
    color: var(--text-color-secondary);
    margin-top: 0.125rem;
}

.logout-action {
    color: var(--red-500) !important;
}

.logout-action:hover {
    background: var(--red-50) !important;
    color: var(--red-600) !important;
}

.layout-topbar-menu-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

@media (max-width: 768px) {
    .layout-topbar-logo span {
        display: none;
    }

    .layout-logo-image {
        margin-right: 0;
    }

    /* Hide API status text on mobile, keep icon */
    .api-status-text {
        display: none;
    }

    .api-status-badge {
        padding: 0.375rem 0.5rem;
    }
}
</style>
