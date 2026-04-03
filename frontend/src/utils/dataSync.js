// dataSync.js — Système d'événements pour synchroniser les données entre composants
// Aucune dépendance externe requise.

const listeners = new Set();

export function emitDataChange(type) {
  listeners.forEach((listener) => {
    try {
      listener(type);
    } catch (e) {
      console.error('[dataSync] listener error:', e);
    }
  });
}

export function onDataChanged(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}