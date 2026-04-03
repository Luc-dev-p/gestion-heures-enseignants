import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';

const AnneeContext = createContext(null);

export function AnneeProvider({ children }) {
  const [annees, setAnnees] = useState([]);
  const [anneeActive, setAnneeActive] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnees = async () => {
      try {
        const res = await axios.get('/heures/annees');
        const data = res.data;
        setAnnees(data);
        // Sélectionner l'année active par défaut (celle avec is_active = true, sinon la plus récente)
        const active = data.find(a => a.is_active);
        setAnneeActive(active ? active.id : (data.length > 0 ? data[0].id : null));
      } catch (err) {
        console.error('Erreur chargement années académiques :', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnees();
  }, []);

  const changerAnnee = useCallback((id) => {
    setAnneeActive(id);
  }, []);

  return (
    <AnneeContext.Provider value={{ annees, anneeActive, setAnneeActive: changerAnnee, loading }}>
      {children}
    </AnneeContext.Provider>
  );
}

export function useAnnee() {
  const context = useContext(AnneeContext);
  if (!context) {
    throw new Error('useAnnee doit être utilisé dans un AnneeProvider');
  }
  return context;
}

export default AnneeContext;