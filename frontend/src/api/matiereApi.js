import api from './axios';

export const matiereApi = {
  getAll: () => api.get('/matieres'),
  getById: (id) => api.get(`/matieres/${id}`),
  create: (data) => api.post('/matieres', data),
  update: (id, data) => api.put(`/matieres/${id}`, data),
  delete: (id) => api.delete(`/matieres/${id}`),
};