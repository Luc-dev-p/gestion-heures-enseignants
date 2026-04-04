import api from './axios';

export const heureApi = {
  // Récupérer toutes les heures (filtrées par année)
  getAll: (anneeId) => {
    const params = anneeId ? { annee_id: anneeId } : {};
    return api.get('/heures', { params });
  },

  // Récupérer une heure par ID
  getById: (id) => api.get(`/heures/${id}`),

  // Créer une heure
  create: (data) => api.post('/heures', data),

  // Mettre à jour une heure
  update: (id, data) => api.put(`/heures/${id}`, data),

  // Supprimer une heure
  delete: (id) => api.delete(`/heures/${id}`),

  // Récupérer les heures d'un enseignant
  getByEnseignant: (id, anneeId) => {
    const params = anneeId ? { annee_id: anneeId } : {};
    return api.get(`/heures/enseignant/${id}`, { params });
  },

  // Récupérer le résumé d'un enseignant
  getResume: (id, anneeId) => {
    const params = anneeId ? { annee_id: anneeId } : {};
    return api.get(`/heures/resume/${id}`, { params });
  },

  // Récupérer toutes les années académiques
  getAnnees: () => api.get('/heures/annees'),

  // Importer un fichier Excel
  importExcel: (file, anneeId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('annee_id', anneeId);
    return api.post('/heures/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // 60 secondes pour les gros fichiers
    });
  }
};