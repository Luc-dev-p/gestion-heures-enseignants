import { useState, useEffect } from 'react';
import api from '../api/axios';
import { exportApi, downloadBlob } from '../api/exportApi';
import { useAnnee } from '../context/AnneeContext';
import { Clock, Calculator, FileSpreadsheet, FileText, Calendar, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  CM: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', border: 'border-violet-300' },
  TD: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-300' },
  TP: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-300' },
};

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const JOURS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function MonEspace() {
  const { anneeActive, annees } = useAnnee();
  const [profile, setProfile] = useState(null);
  const [monEnseignant, setMonEnseignant] = useState(null);
  const [resume, setResume] = useState(null);
  const [heures, setHeures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('resume'); // resume, heures, calendrier

  // État mini-calendrier
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const fetchMyData = async () => {
    try {
      const resProfile = await api.get('/auth/profile');
      setProfile(resProfile.data);

      const resEns = await api.get(`/enseignants/me/${resProfile.data.id}`);
      setMonEnseignant(resEns.data);

      if (resEns.data) {
        const params = anneeActive ? { annee_id: anneeActive } : {};

        const resResume = await api.get(`/heures/resume/${resEns.data.id}`, { params });
        setResume(resResume.data);

        const resHeures = await api.get(`/heures/enseignant/${resEns.data.id}`, { params });
        setHeures(resHeures.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Aucun profil enseignant trouve. Contactez l\'administrateur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (anneeActive !== null) fetchMyData();
  }, [anneeActive]);

  const handleExport = async (type) => {
    if (!monEnseignant) return;
    try {
      setExporting(true);
      const name = `mes_heures_${monEnseignant.nom}`;
      let res;
      if (type === 'excel') {
        res = await exportApi.excelEnseignant(monEnseignant.id);
        downloadBlob(res.data, `${name}.xlsx`);
      } else {
        res = await exportApi.pdfEnseignant(monEnseignant.id);
        downloadBlob(res.data, `${name}.pdf`);
      }
      toast.success('Export reussi');
    } catch { toast.error('Erreur export'); }
    finally { setExporting(false); }
  };

  // ===== MINI CALENDRIER =====
  const formatDateStr = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const heuresByDate = {};
  heures.forEach(h => {
    if (!h.date_cours) return;
    if (!heuresByDate[h.date_cours]) heuresByDate[h.date_cours] = [];
    heuresByDate[h.date_cours].push(h);
  });

  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const prevMonthLast = new Date(calYear, calMonth, 0).getDate();

  const calDays = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    calDays.push({ day: prevMonthLast - i, dateStr: formatDateStr(new Date(calYear, calMonth - 1, prevMonthLast - i)), isCurrent: false });
  }
  for (let d = 1; d <= totalDays; d++) {
    calDays.push({ day: d, dateStr: formatDateStr(new Date(calYear, calMonth, d)), isCurrent: true });
  }
  const remaining = 42 - calDays.length;
  for (let d = 1; d <= remaining; d++) {
    calDays.push({ day: d, dateStr: formatDateStr(new Date(calYear, calMonth + 1, d)), isCurrent: false });
  }

  const todayStr = formatDateStr(new Date());
  const selectedHeures = selectedDate ? (heuresByDate[selectedDate] || []) : [];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div></div>;

  const anneeLabel = annees.find(a => a.id === anneeActive)?.libelle || '';

  const tabs = [
    { id: 'resume', label: 'Résumé', icon: Calculator },
    { id: 'heures', label: 'Mes heures', icon: Clock },
    { id: 'calendrier', label: 'Calendrier', icon: Calendar },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Mon Espace</h2>
          <p className="text-gray-500 text-sm">Bienvenue, {profile?.nom} ({monEnseignant?.grade} - {monEnseignant?.departement})</p>
          {anneeLabel && <p className="text-violet-500 text-sm font-medium">Annee : {anneeLabel}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('excel')} disabled={exporting || !monEnseignant}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50">
            <FileSpreadsheet className="w-4 h-4" />{exporting ? 'Export...' : 'Mon Excel'}
          </button>
          <button onClick={() => handleExport('pdf')} disabled={exporting || !monEnseignant}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50">
            <FileText className="w-4 h-4" />Mon PDF
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ===== ONGLET RÉSUMÉ ===== */}
      {activeTab === 'resume' && (
        resume ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calculator className="w-5 h-5 text-violet-500" /> Mon resume horaire</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-violet-50 rounded-xl p-4">
                <p className="text-xs text-violet-600 font-medium">CM</p>
                <p className="text-2xl font-bold text-violet-800">{resume.cm}h</p>
                <p className="text-xs text-violet-500">= {resume.cm * resume.eq_cm_td}h eq TD</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-600 font-medium">TD</p>
                <p className="text-2xl font-bold text-blue-800">{resume.td}h</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-xs text-emerald-600 font-medium">TP</p>
                <p className="text-2xl font-bold text-emerald-800">{resume.tp}h</p>
                <p className="text-xs text-emerald-500">= {resume.tp * resume.eq_tp_td}h eq TD</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs text-amber-600 font-medium">Total eq TD</p>
                <p className="text-2xl font-bold text-amber-800">{resume.heures_eq_td}h</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-600 font-medium">Contractuelles</p>
                <p className="text-2xl font-bold text-gray-800">{resume.heures_contractuelles}h</p>
              </div>
              <div className={`rounded-xl p-4 ${resume.heures_complementaires > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className={`text-xs font-medium ${resume.heures_complementaires > 0 ? 'text-red-600' : 'text-green-600'}`}>Complementaires</p>
                <p className={`text-2xl font-bold ${resume.heures_complementaires > 0 ? 'text-red-800' : 'text-green-800'}`}>{resume.heures_complementaires}h</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                <p className="text-xs text-gray-600 font-medium">Taux horaire</p>
                <p className="text-2xl font-bold text-gray-800">{resume.taux_horaire} FCFA</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center text-gray-400">
            Aucune heure enregistree pour cette annee
          </div>
        )
      )}

      {/* ===== ONGLET MES HEURES ===== */}
      {activeTab === 'heures' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Clock className="w-5 h-5 text-violet-500" /> Mes heures</h3>
          </div>
          {heures.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Aucune heure enregistree pour cette annee</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Matiere</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Duree</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Salle</th>
                  </tr>
                </thead>
                <tbody>
                  {heures.map(h => (
                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{h.date_cours}</td>
                      <td className="px-4 py-3 text-gray-800">{h.matiere_intitule || '-'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[h.type_heure]?.bg} ${TYPE_COLORS[h.type_heure]?.text}`}>{h.type_heure}</span></td>
                      <td className="px-4 py-3 text-gray-600">{h.duree}h</td>
                      <td className="px-4 py-3 text-gray-600">{h.salle || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== ONGLET CALENDRIER ===== */}
      {activeTab === 'calendrier' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mini calendrier */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              {/* Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))} className="p-1 rounded hover:bg-gray-100"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
                <h4 className="text-sm font-bold text-gray-800">{MOIS[calMonth]} {calYear}</h4>
                <button onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))} className="p-1 rounded hover:bg-gray-100"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
              </div>

              {/* Jours */}
              <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                {JOURS_SHORT.map(j => (
                  <div key={j} className="text-[10px] font-semibold text-gray-400 py-1">{j}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {calDays.map((d, i) => {
                  const dayH = heuresByDate[d.dateStr] || [];
                  const isT = d.dateStr === todayStr;
                  const isSel = d.dateStr === selectedDate;
                  return (
                    <button key={i} onClick={() => setSelectedDate(d.dateStr === selectedDate ? null : d.dateStr)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors
                        ${!d.isCurrent ? 'text-gray-300' : 'text-gray-700 hover:bg-violet-50'}
                        ${isT && d.isCurrent ? 'bg-violet-600 text-white font-bold' : ''}
                        ${isSel && d.isCurrent ? 'ring-2 ring-violet-400' : ''}
                      `}>
                      {d.day}
                      {dayH.length > 0 && d.isCurrent && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayH.slice(0, 3).map((h, hi) => (
                            <span key={hi} className={`w-1 h-1 rounded-full ${isT ? 'bg-white' : TYPE_COLORS[h.type_heure]?.dot}`}></span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Légende */}
              <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500"></span><span className="text-[10px] text-gray-400">CM</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="text-[10px] text-gray-400">TD</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-[10px] text-gray-400">TP</span></div>
              </div>
            </div>
          </div>

          {/* Détail du jour */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-500" />
                {selectedDate
                  ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Selectionnez un jour'
                }
              </h4>

              {!selectedDate ? (
                <p className="text-gray-400 text-center py-12">Cliquez sur un jour du calendrier pour voir les details</p>
              ) : selectedHeures.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">Aucun cours ce jour</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedHeures.map(h => {
                    const tc = TYPE_COLORS[h.type_heure] || TYPE_COLORS.TD;
                    return (
                      <div key={h.id} className={`rounded-xl p-4 border ${tc.border} ${tc.bg}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-800">{h.matiere_intitule || 'Matiere'}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tc.text} ${tc.bg}`}>
                            {h.type_heure} — {h.duree}h
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          {h.salle && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{h.salle}</span>}
                          {h.observations && <span className="italic">{h.observations}</span>}
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-sm text-gray-500 pt-2 border-t border-gray-100">
                    Total du jour : <span className="font-bold text-gray-800">{selectedHeures.reduce((s, h) => s + (parseFloat(h.duree) || 0), 0)}h</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}