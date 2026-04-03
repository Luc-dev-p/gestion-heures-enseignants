import api from './axios';

export const paiementApi = {
  getAll: () => api.get('/paiements'),
  getStats: () => api.get('/paiements/stats'),
  getHistorique: (id) => api.get(`/paiements/historique/${id}`),
  create: (data) => api.post('/paiements', data),
  delete: (id) => api.delete(`/paiements/${id}`),
};