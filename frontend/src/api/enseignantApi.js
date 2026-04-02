import api from './axios';

export const enseignantApi = {
  getAll: () => api.get('/enseignants'),
  getById: (id) => api.get(`/enseignants/${id}`),
  create: (data) => api.post('/enseignants', data),
  update: (id, data) => api.put(`/enseignants/${id}`, data),
  delete: (id) => api.delete(`/enseignants/${id}`),
  getStats: () => api.get('/enseignants/stats'),
};