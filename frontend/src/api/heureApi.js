import api from './axios';

const heureApi = {
  getAll: () => api.get('/heures'),
  getByEnseignant: (id) => api.get(`/heures/enseignant/${id}`),
  getResume: (id) => api.get(`/heures/resume/${id}`),
  getAnnees: () => api.get('/heures/annees'),
  create: (data) => api.post('/heures', data),
  valider: (id) => api.put(`/heures/valider/${id}`),
  rejeter: (id) => api.put(`/heures/rejeter/${id}`),
  delete: (id) => api.delete(`/heures/${id}`),
};

export { heureApi };