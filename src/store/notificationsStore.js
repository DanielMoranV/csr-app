import { apiUtils } from '@/api/axios.js';
import { NotificationService } from '@/api/notifications.js';
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';

export const useNotificationsStore = defineStore('notifications', () => {
    const state = reactive({
        notifications: [],
        unreadCount: 0,
        unreadByModule: {}, // { tickets: 8, tasks: 4 }
        isLoading: false,
        isLoadingCount: false,
        // Marca que el badge fue incrementado va Echo y la lista puede estar desactualizada.
        // NotificationBell usa este flag para refrescar la lista al abrir el panel.
        isDirty: false,
        pagination: {
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 10
        }
    });

    // Getters
    const hasUnread = computed(() => state.unreadCount > 0);
    const hasMorePages = computed(() => state.pagination.current_page < state.pagination.last_page);
    const unreadForModule = (module) => state.unreadByModule?.[module] || 0;

    // --- Actions ---

    const fetchNotifications = async (params = {}) => {
        state.isLoading = true;
        try {
            const response = await NotificationService.getNotifications({ per_page: state.pagination.per_page, ...params });
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                // Handle Laravel paginated response
                if (data && typeof data === 'object' && data.data) {
                    const isLoadMore = params.page && params.page > 1;
                    if (isLoadMore) {
                        state.notifications.push(...data.data);
                    } else {
                        state.notifications = data.data;
                    }
                    state.pagination = {
                        current_page: data.current_page || 1,
                        last_page: data.last_page || 1,
                        total: data.total || 0,
                        per_page: data.per_page || 10
                    };
                } else if (Array.isArray(data)) {
                    state.notifications = data;
                }
                // La lista está actualizada: limpiar el flag dirty
                state.isDirty = false;
            }
        } catch {
            // silently fail — notifications are not critical
        } finally {
            state.isLoading = false;
        }
    };

    const fetchUnreadCount = async () => {
        state.isLoadingCount = true;
        try {
            const response = await NotificationService.getUnreadCount();
            if (apiUtils.isSuccess(response)) {
                const data = apiUtils.getData(response);
                state.unreadCount = data?.total || 0;
                state.unreadByModule = data?.by_module || {};
            }
        } catch {
            // silently fail
        } finally {
            state.isLoadingCount = false;
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const response = await NotificationService.markAsRead(notificationId);
            if (apiUtils.isSuccess(response)) {
                const index = state.notifications.findIndex((n) => n.id === notificationId);
                if (index !== -1 && !state.notifications[index].read_at) {
                    state.notifications[index].read_at = new Date().toISOString();
                    // Decrement counters
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                    const mod = state.notifications[index].module;
                    if (mod && state.unreadByModule[mod]) {
                        state.unreadByModule[mod] = Math.max(0, state.unreadByModule[mod] - 1);
                    }
                }
            }
        } catch {
            // silently fail
        }
    };

    const markAllAsRead = async (module) => {
        try {
            const body = module ? { module } : {};
            const response = await NotificationService.markAllAsRead(body);
            if (apiUtils.isSuccess(response)) {
                // Update local state
                state.notifications.forEach((n) => {
                    if (!module || n.module === module) {
                        if (!n.read_at) n.read_at = new Date().toISOString();
                    }
                });
                if (module) {
                    const previousCount = state.unreadByModule[module] || 0;
                    state.unreadByModule[module] = 0;
                    state.unreadCount = Math.max(0, state.unreadCount - previousCount);
                } else {
                    state.unreadCount = 0;
                    Object.keys(state.unreadByModule).forEach((k) => (state.unreadByModule[k] = 0));
                }
            }
        } catch {
            // silently fail
        }
    };

    const loadMore = async () => {
        if (!hasMorePages.value) return;
        await fetchNotifications({ page: state.pagination.current_page + 1 });
    };

    /**
     * Incrementa el conteo de no leídas para un módulo específico.
     * Usar en lugar de mutar state directamente desde otros stores.
     * Establece isDirty=true para que NotificationBell refresque la lista al abrir.
     */
    const bumpUnreadCount = (module) => {
        state.unreadCount++;
        if (module) {
            state.unreadByModule[module] = (state.unreadByModule[module] || 0) + 1;
        }
        state.isDirty = true;
    };

    /**
     * Handle a new notification arriving via Echo.
     * Call this from ticketsStore or any store that listens to an echo event
     * that generates a notification (e.g., ticket.comment.created).
     */
    const handleNewNotification = (notification) => {
        if (!notification) return;
        const exists = state.notifications.some((n) => n.id === notification.id);
        if (!exists) {
            state.notifications.unshift(notification);
            state.pagination.total++;
        }
        if (!notification.read_at) {
            state.unreadCount++;
            const mod = notification.module;
            if (mod) {
                state.unreadByModule[mod] = (state.unreadByModule[mod] || 0) + 1;
            }
        }
    };

    return {
        state,
        hasUnread,
        hasMorePages,
        unreadForModule,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        loadMore,
        bumpUnreadCount,
        handleNewNotification
    };
});
