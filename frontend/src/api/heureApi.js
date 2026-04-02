import api from './axios';

export const heureApi = {
  getAll: () => api.get('/heures'),
  getByEnseignant: (id) => api.get(`/heures/enseignant/${id}`),
  getResume: (id) => api.get(`/heures/resume/${id}`),
  create: (data) => api.post('/heures', data),
  delete: (id) => api.delete(`/heures/${id}`),
  getAnnees: () => api.get('/heures/annees'),
};