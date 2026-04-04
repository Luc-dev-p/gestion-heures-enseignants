import api from './axios';

export const notificationApi = {
    getAll: (params = {}) => api.get('/notifications', { params }),
    getUnreadCount: () => api.get('/notifications/count'),
    markAsRead: (id) => api.put(`/notifications/read/${id}`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`),
};