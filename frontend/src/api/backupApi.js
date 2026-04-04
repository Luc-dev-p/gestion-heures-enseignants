import api from './axios';

export const backupApi = {
    list: () => api.get('/backup'),
    create: () => api.post('/backup/create'),
    download: (filename) => api.get(`/backup/download/${filename}`, { responseType: 'blob' }),
    delete: (filename) => api.delete(`/backup/${filename}`),
    restore: (filename) => api.post(`/backup/restore/${filename}`),
    getSchedule: () => api.get('/backup/schedule'),
    updateSchedule: (config) => api.put('/backup/schedule', config),
};