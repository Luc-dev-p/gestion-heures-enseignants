import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useAnnee } from '../context/AnneeContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Clock, BookOpen, MapPin, Users, X, Calendar } from 'lucide-react';

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const TYPE_COLORS = {
  CM: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', border: 'border-violet-300' },
  TD: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-300' },
  TP: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-300' },
};

const STATUT_COLORS = {
  en_attente: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
  valide: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Validée' },
  rejete: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejetée' },
};

export default function Calendrier() {
  const { user } = useAuth();
  const { anneeActive, annees } = useAnnee();
  const isAdmin = user?.role === 'admin' || user?.role === 'rh';

  const [heures, setHeures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Récupérer les heures
  const fetchHeures = async () => {
    if (!anneeActive) return;
    try {
      const params = { annee_id: anneeActive };
      let res;
      if (isAdmin) {
        res = await api.get('/heures', { params });
      } else {
        // Enseignant : récupérer via /auth/profile puis /enseignants/me/
        const profileRes = await api.get('/auth/profile');
        const ensRes = await api.get(`/enseignants/me/${profileRes.data.id}`);
        if (ensRes.data) {
          res = await api.get(`/heures/enseignant/${ensRes.data.id}`, { params });
        } else {
          res = { data: [] };
        }
      }
      setHeures(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (anneeActive !== null) {
      setLoading(true);
      fetchHeures();
    }
  }, [anneeActive, currentYear, currentMonth]);

   const formatDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Regrouper les heures par date
  const heuresByDate = useMemo(() => {
    const map = {};
    heures.forEach(h => {
      if (!h.date_cours) return;
      if (!map[h.date_cours]) map[h.date_cours] = [];
      map[h.date_cours].push(h);
    });
    return map;
  }, [heures]);

  // Générer les jours du mois
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Lundi = 0
    const totalDays = lastDay.getDate();

    const days = [];

    // Jours du mois précédent (gris)
    const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const dateStr = formatDateStr(new Date(currentYear, currentMonth - 1, d));
      days.push({ day: d, dateStr, isCurrentMonth: false });
    }

    // Jours du mois courant
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = formatDateStr(new Date(currentYear, currentMonth, d));
      days.push({ day: d, dateStr, isCurrentMonth: true });
    }

    // Jours du mois suivant (gris)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = formatDateStr(new Date(currentYear, currentMonth + 1, d));
      days.push({ day: d, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  const navigateMonth = (dir) => {
    setCurrentDate(new Date(currentYear, currentMonth + dir, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Heures du jour sélectionné
  const selectedHeures = selectedDate ? (heuresByDate[selectedDate] || []) : [];

  // Stats du mois
  const monthStats = useMemo(() => {
    let cm = 0, td = 0, tp = 0, total = 0;
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    heures.forEach(h => {
      if (h.date_cours && h.date_cours.startsWith(monthPrefix) && h.statut === 'valide') {
        const dur = parseFloat(h.duree) || 0;
        if (h.type_heure === 'CM') cm += dur;
        else if (h.type_heure === 'TD') td += dur;
        else if (h.type_heure === 'TP') tp += dur;
        total += dur;
      }
    });
    return { cm, td, tp, total, nbCours: Object.entries(heuresByDate).filter(([d]) => d.startsWith(monthPrefix)).length };
  }, [heures, currentYear, currentMonth, heuresByDate]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div></div>;

  const anneeLabel = annees.find(a => a.id === anneeActive)?.libelle || '';
  const today = formatDateStr(new Date());

  return (
    <div>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-violet-500" />
            Calendrier des cours
          </h2>
          <p className="text-gray-500 text-sm">
            {anneeLabel} — {isAdmin ? 'Vue globale' : 'Vue enseignant'}
          </p>
        </div>
        <button onClick={goToToday}
          className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 font-medium rounded-xl hover:bg-violet-200 transition-colors text-sm">
          <Calendar className="w-4 h-4" /> Aujourd'hui
        </button>
      </div>

      {/* Stats mensuelles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-500">CM</p>
          <p className="text-lg font-bold text-violet-700">{monthStats.cm}h</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-500">TD</p>
          <p className="text-lg font-bold text-blue-700">{monthStats.td}h</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-500">TP</p>
          <p className="text-lg font-bold text-emerald-700">{monthStats.tp}h</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-gray-800">{monthStats.total}h</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500">Séances</p>
          <p className="text-lg font-bold text-gray-800">{monthStats.nbCours}</p>
        </div>
      </div>

      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigateMonth(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-gray-800">
          {MOIS[currentMonth]} {currentYear}
        </h3>
        <button onClick={() => navigateMonth(1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Grille calendrier */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* En-têtes jours */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {JOURS.map(j => (
            <div key={j} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {j}
            </div>
          ))}
        </div>

        {/* Jours */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dayHeures = heuresByDate[day.dateStr] || [];
            const isToday = day.dateStr === today;
            const isSelected = day.dateStr === selectedDate;
            const hasCours = dayHeures.length > 0;

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day.dateStr === selectedDate ? null : day.dateStr)}
                className={`relative min-h-[70px] sm:min-h-[90px] p-1.5 sm:p-2 border-b border-r border-gray-50 text-left transition-colors
                  ${!day.isCurrentMonth ? 'bg-gray-50/50 text-gray-300' : 'hover:bg-violet-50/50 cursor-pointer'}
                  ${isSelected ? 'bg-violet-50 ring-2 ring-inset ring-violet-400' : ''}
                  ${isToday && day.isCurrentMonth ? 'bg-violet-50' : ''}
                `}
              >
                {/* Numéro du jour */}
                <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm font-medium
                  ${isToday && day.isCurrentMonth ? 'bg-violet-600 text-white' : ''}
                  ${day.isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}
                `}>
                  {day.day}
                </span>

                {/* Indicateurs de cours */}
                {hasCours && day.isCurrentMonth && (
                  <div className="mt-0.5 space-y-0.5">
                    {dayHeures.slice(0, 3).map((h, hi) => (
                      <div key={hi} className={`hidden sm:flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium truncate ${TYPE_COLORS[h.type_heure]?.bg || 'bg-gray-100'} ${TYPE_COLORS[h.type_heure]?.text || 'text-gray-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_COLORS[h.type_heure]?.dot || 'bg-gray-400'}`}></span>
                        <span className="truncate">{h.matiere_intitule || h.type_heure}</span>
                      </div>
                    ))}
                    {/* Version mobile : juste des dots */}
                    {dayHeures.length > 0 && (
                      <div className="flex sm:hidden gap-0.5 mt-0.5 justify-center">
                        {dayHeures.slice(0, 4).map((h, hi) => (
                          <span key={hi} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[h.type_heure]?.dot || 'bg-gray-400'}`}></span>
                        ))}
                        {dayHeures.length > 4 && <span className="text-[8px] text-gray-400">+</span>}
                      </div>
                    )}
                    {dayHeures.length > 3 && (
                      <p className="text-[10px] text-gray-400 text-center sm:hidden">+{dayHeures.length - 3}</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 mt-4 px-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-violet-500"></span>
          <span className="text-xs text-gray-500">CM</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span className="text-xs text-gray-500">TD</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-gray-500">TP</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-3 h-3 rounded-full bg-violet-600"></span>
          <span className="text-xs text-gray-500">Aujourd'hui</span>
        </div>
      </div>

      {/* ===== PANNEAU DÉTAIL DU JOUR ===== */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedDate(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-sm text-gray-500">{selectedHeures.length} cours programme(s)</p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Liste des cours */}
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
              {selectedHeures.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Aucun cours ce jour</p>
              ) : (
                selectedHeures
                  .sort((a, b) => (a.type_heure || '').localeCompare(b.type_heure || ''))
                  .map(h => {
                    const typeColor = TYPE_COLORS[h.type_heure] || TYPE_COLORS.TD;
                    const statutColor = STATUT_COLORS[h.statut] || STATUT_COLORS.en_attente;

                    return (
                      <div key={h.id} className={`rounded-xl p-4 border ${typeColor.border} ${typeColor.bg}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">
                              {h.matiere_intitule || 'Matiere inconnue'}
                            </p>
                            {isAdmin && (
                              <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                                <Users className="w-3.5 h-3.5" />
                                {h.enseignant_nom} {h.enseignant_prenom}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor.text} ${typeColor.bg}`}>
                              {h.type_heure} — {h.duree}h
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statutColor.bg} ${statutColor.text}`}>
                              {statutColor.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {h.date_cours}
                          </span>
                          {h.salle && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {h.salle}
                            </span>
                          )}
                        </div>
                        {h.observations && (
                          <p className="text-xs text-gray-400 mt-2 italic">{h.observations}</p>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Résumé du jour */}
            {selectedHeures.length > 0 && (
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Total : <span className="font-bold text-gray-800">{selectedHeures.reduce((s, h) => s + (parseFloat(h.duree) || 0), 0)}h</span>
                </span>
                <span className="text-gray-500">
                  Validées : <span className="font-bold text-emerald-700">{selectedHeures.filter(h => h.statut === 'valide').reduce((s, h) => s + (parseFloat(h.duree) || 0), 0)}h</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}