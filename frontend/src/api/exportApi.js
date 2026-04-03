import api from './axios';

export const exportApi = {
  excelGlobal: () => api.get('/exports/excel/global', { responseType: 'blob' }),
  excelEnseignant: (id) => api.get(`/exports/excel/enseignant/${id}`, { responseType: 'blob' }),
  pdfEnseignant: (id) => api.get(`/exports/pdf/enseignant/${id}`, { responseType: 'blob' }),
  excelComptabilite: () => api.get('/exports/excel/comptabilite', { responseType: 'blob' }),
  pdfComptabilite: () => api.get('/exports/pdf/comptabilite', { responseType: 'blob' }),
  bulletinIndividuel: (id) => api.get(`/exports/pdf/bulletin/${id}`, { responseType: 'blob' }),
  rapportAnnuel: () => api.get('/exports/pdf/rapport-annuel', { responseType: 'blob' }),
};

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}