import api from './axios.js';

export const NotificationService = {
    /**
     * Get paginated notifications for the authenticated user.
     * GET /notifications
     * @param {object} params - Optional filters: module, unread (true), per_page (1-100)
     */
    getNotifications: (params = {}) => {
        return api.get('/notifications', { params });
    },

    /**
     * Get unread counts (total + by module) for the bell badge.
     * GET /notifications/unread-count
     * Response: { data: { total: 12, by_module: { tickets: 8, tasks: 4 } } }
     */
    getUnreadCount: () => {
        return api.get('/notifications/unread-count');
    },

    /**
     * Mark a single notification as read.
     * PATCH /notifications/{id}/read
     */
    markAsRead: (notificationId) => {
        return api.patch(`/notifications/${notificationId}/read`);
    },

    /**
     * Mark all notifications as read, optionally filtered by module.
     * PATCH /notifications/read-all
     * @param {object} body - Optional: { module: "tickets" }. Without body marks ALL as read.
     */
    markAllAsRead: (body = {}) => {
        return api.patch('/notifications/read-all', body);
    }
};
