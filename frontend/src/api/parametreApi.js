import api from './axios';

export const parametreApi = {
  getAll: () => api.get('/parametres'),
  update: (id, valeur) => api.put(`/parametres/${id}`, { valeur }),
  getAnnees: () => api.get('/parametres/annees'),
  setAnneeActive: (id) => api.put(`/parametres/annees/${id}/active`),
  addAnnee: (libelle) => api.post('/parametres/annees', { libelle }),
};