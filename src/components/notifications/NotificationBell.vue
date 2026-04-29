<script setup>
import { useNotificationsStore } from '@/store/notificationsStore';
import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import OverlayPanel from 'primevue/overlaypanel';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';

const router = useRouter();
const notificationsStore = useNotificationsStore();

const overlayRef = ref(null);

const togglePanel = async (event) => {
    overlayRef.value.toggle(event);
    // Cargar notificaciones si:
    //   1. La lista está vacía (primera apertura), o
    //   2. isDirty=true (llegó un evento Echo que incrementó el badge sin actualizar la lista)
    if (notificationsStore.state.notifications.length === 0 || notificationsStore.state.isDirty) {
        await notificationsStore.fetchNotifications();
    }
};

// Module visual config
const moduleConfig = {
    tickets: { icon: 'pi pi-ticket', color: '#3b82f6', label: 'Ticket', route: '/tickets' },
    tasks: { icon: 'pi pi-check-square', color: '#10b981', label: 'Tarea', route: '/tareas' },
    documents: { icon: 'pi pi-file', color: '#f59e0b', label: 'Documento', route: '/documentos' }
};

const getModuleConfig = (module) => moduleConfig[module] || { icon: 'pi pi-bell', color: '#6b7280', label: 'Sistema', route: null };

const badgeLabel = computed(() => {
    const n = notificationsStore.state.unreadCount;
    if (n <= 0) return null;
    return n > 99 ? '99+' : String(n);
});

const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `hace ${diffMins}m`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const handleNotificationClick = async (notification) => {
    if (!notification.read_at) {
        await notificationsStore.markAsRead(notification.id);
    }
    const config = getModuleConfig(notification.module);
    if (notification.data?.ticket_id) {
        const query = { ticket_id: notification.data.ticket_id };
        // Abrir en el tab correspondiente según el tipo/action de la notificación
        if (notification.type === 'ticket.comment.created' || notification.action === 'comment') {
            query.open_tab = 'comments';
            // Pasar comment_id para scroll futuro al comentario específico
            if (notification.data?.comment_id) {
                query.comment_id = notification.data.comment_id;
            }
        } else if (notification.type === 'ticket.status.changed' || notification.action === 'status_change') {
            query.open_tab = 'history';
        }
        // ticket.assigned y ticket.created → sin open_tab (abre en Detalles por defecto)
        router.push({ path: '/tickets', query });
        overlayRef.value.hide();
    } else if (config.route) {
        router.push(config.route);
        overlayRef.value.hide();
    }
};

const handleMarkAllAsRead = async () => {
    await notificationsStore.markAllAsRead();
};

const handleLoadMore = async () => {
    await notificationsStore.loadMore();
};
</script>

<template>
    <div class="notification-bell-wrapper">
        <!-- Bell button -->
        <button id="notification-bell-btn" class="layout-topbar-action notification-bell-btn" aria-label="Notificaciones" @click="togglePanel">
            <i class="pi pi-bell"></i>
            <span v-if="badgeLabel" class="notification-badge">{{ badgeLabel }}</span>
        </button>

        <!-- Overlay Panel -->
        <OverlayPanel ref="overlayRef" class="notification-overlay" :dismissable="true">
            <!-- Header -->
            <div class="notif-header">
                <span class="notif-header-title">
                    <i class="pi pi-bell mr-2"></i>Notificaciones
                    <span v-if="notificationsStore.state.unreadCount > 0" class="notif-header-count">
                        {{ notificationsStore.state.unreadCount }}
                    </span>
                </span>
                <button v-if="notificationsStore.state.unreadCount > 0" class="notif-mark-all-btn" @click="handleMarkAllAsRead">Marcar todas como leídas</button>
            </div>

            <!-- Loading skeletons -->
            <div v-if="notificationsStore.state.isLoading && notificationsStore.state.notifications.length === 0" class="notif-skeleton-list">
                <div v-for="i in 4" :key="i" class="notif-skeleton-item">
                    <Skeleton shape="circle" size="2.5rem" />
                    <div class="notif-skeleton-text">
                        <Skeleton width="70%" height="0.875rem" class="mb-2" />
                        <Skeleton width="90%" height="0.75rem" />
                    </div>
                </div>
            </div>

            <!-- Empty state -->
            <div v-else-if="notificationsStore.state.notifications.length === 0" class="notif-empty">
                <i class="pi pi-inbox notif-empty-icon"></i>
                <p>Sin notificaciones</p>
                <small>Estás al día con todo 🎉</small>
            </div>

            <!-- Notification list -->
            <div v-else class="notif-list">
                <div
                    v-for="notif in notificationsStore.state.notifications"
                    :key="notif.id"
                    class="notif-item"
                    :class="{ 'notif-item--unread': !notif.read_at }"
                    :style="{ '--module-color': getModuleConfig(notif.module).color }"
                    @click="handleNotificationClick(notif)"
                >
                    <!-- Module icon -->
                    <div class="notif-icon" :style="{ background: getModuleConfig(notif.module).color + '20', color: getModuleConfig(notif.module).color }">
                        <i :class="getModuleConfig(notif.module).icon"></i>
                    </div>

                    <!-- Content -->
                    <div class="notif-content">
                        <div class="notif-title">{{ notif.title }}</div>
                        <div class="notif-body">{{ notif.body }}</div>
                        <div class="notif-time">{{ formatRelativeTime(notif.created_at) }}</div>
                    </div>

                    <!-- Unread dot -->
                    <div v-if="!notif.read_at" class="notif-unread-dot"></div>
                </div>
            </div>

            <!-- Load more -->
            <div v-if="notificationsStore.hasMorePages" class="notif-footer">
                <Button label="Cargar más" icon="pi pi-chevron-down" text size="small" :loading="notificationsStore.state.isLoading" @click="handleLoadMore" fluid />
            </div>
        </OverlayPanel>
    </div>
</template>

<style scoped>
/* --- Bell Button --- */
.notification-bell-wrapper {
    position: relative;
    display: inline-flex;
}

.notification-bell-btn {
    position: relative;
}

.notification-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    background: #ef4444;
    color: #fff;
    font-size: 0.6rem;
    font-weight: 700;
    min-width: 1.1rem;
    height: 1.1rem;
    padding: 0 0.2rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    border: 2px solid var(--topbar-bg-color, var(--surface-overlay));
    animation: badge-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes badge-pop {
    0% {
        transform: scale(0);
    }
    100% {
        transform: scale(1);
    }
}

/* --- Overlay Panel Global Overrides (via :deep) --- */
:deep(.notification-overlay.p-overlaypanel) {
    width: 400px;
    max-width: 95vw;
    padding: 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
}

:deep(.notification-overlay .p-overlaypanel-content) {
    padding: 0;
}

/* --- Panel Header --- */
.notif-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid var(--surface-border);
    background: var(--surface-section);
}

.notif-header-title {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.notif-header-count {
    background: #ef4444;
    color: #fff;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    margin-left: 0.25rem;
}

.notif-mark-all-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--primary-color);
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    transition: background 0.15s;
}

.notif-mark-all-btn:hover {
    background: var(--primary-50, var(--surface-hover));
}

/* --- Notification List --- */
.notif-list {
    max-height: 420px;
    overflow-y: auto;
    overscroll-behavior: contain;
}

.notif-list::-webkit-scrollbar {
    width: 4px;
}

.notif-list::-webkit-scrollbar-thumb {
    background: var(--surface-300);
    border-radius: 4px;
}

.notif-item {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    padding: 0.875rem 1.25rem;
    cursor: pointer;
    transition: background 0.15s;
    border-left: 3px solid transparent;
    position: relative;
}

.notif-item:hover {
    background: var(--surface-hover);
}

.notif-item--unread {
    background: color-mix(in srgb, var(--module-color, #3b82f6) 6%, var(--surface-card));
    border-left-color: var(--module-color, var(--primary-color));
}

.notif-item--unread:hover {
    background: color-mix(in srgb, var(--module-color, #3b82f6) 10%, var(--surface-hover));
}

.notif-item + .notif-item {
    border-top: 1px solid var(--surface-border);
}

/* Module icon */
.notif-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
}

/* Content */
.notif-content {
    flex: 1;
    min-width: 0;
}

.notif-title {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0.2rem;
}

.notif-body {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
    margin-bottom: 0.3rem;
}

.notif-time {
    font-size: 0.72rem;
    color: var(--text-color-secondary);
    opacity: 0.75;
}

/* Unread dot */
.notif-unread-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--module-color, var(--primary-color));
    flex-shrink: 0;
    margin-top: 0.35rem;
}

/* --- Skeletons --- */
.notif-skeleton-list {
    padding: 0.5rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.notif-skeleton-item {
    display: flex;
    align-items: center;
    gap: 0.875rem;
}

.notif-skeleton-text {
    flex: 1;
}

/* --- Empty State --- */
.notif-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2.5rem 1rem;
    color: var(--text-color-secondary);
    text-align: center;
}

.notif-empty-icon {
    font-size: 2.5rem;
    opacity: 0.3;
    margin-bottom: 0.75rem;
}

.notif-empty p {
    font-weight: 600;
    margin: 0 0 0.25rem;
}

.notif-empty small {
    font-size: 0.8rem;
}

/* --- Footer --- */
.notif-footer {
    padding: 0.5rem 1.25rem;
    border-top: 1px solid var(--surface-border);
}
</style>
