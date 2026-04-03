import api from './axios';

const heureApi = {
  getAll: (anneeId) => {
    const params = anneeId ? { annee_id: anneeId } : {};
    return api.get('/heures', { params });
  },

  getByEnseignant: (id, anneeId) => {
    const params = anneeId ? { annee_id: anneeId } : {};
    return api.get(`/heures/enseignant/${id}`, { params });
  },

  getResume: (id, anneeId) => {
    const params = anneeId ? { annee_id: anneeId } : {};
    return api.get(`/heures/resume/${id}`, { params });
  },

  getAnnees: () => api.get('/heures/annees'),

  create: (data) => api.post('/heures', data),

  valider: (id) => api.put(`/heures/valider/${id}`),

  rejeter: (id) => api.put(`/heures/rejeter/${id}`),

  delete: (id) => api.delete(`/heures/${id}`),
};

export { heureApi };