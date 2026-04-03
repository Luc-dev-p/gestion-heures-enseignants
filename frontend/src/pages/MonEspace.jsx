import { useState, useEffect } from 'react';
import api from '../api/axios';
import { exportApi, downloadBlob } from '../api/exportApi';
import { useAnnee } from '../context/AnneeContext';
import { Clock, Calculator, FileSpreadsheet, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MonEspace() {
  const { anneeActive, annees } = useAnnee();
  const [profile, setProfile] = useState(null);
  const [monEnseignant, setMonEnseignant] = useState(null);
  const [resume, setResume] = useState(null);
  const [heures, setHeures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchMyData = async () => {
    try {
      // 1. Profil utilisateur connecté
      const resProfile = await api.get('/auth/profile');
      setProfile(resProfile.data);

      // 2. Trouver l'enseignant lié via user_id
      const resEns = await api.get(`/enseignants/me/${resProfile.data.id}`);
      setMonEnseignant(resEns.data);

      if (resEns.data) {
        const params = anneeActive ? { annee_id: anneeActive } : {};

        // 3. Résumé des heures (filtré par année)
        const resResume = await api.get(`/heures/resume/${resEns.data.id}`, { params });
        setResume(resResume.data);

        // 4. Mes heures (filtrées par année)
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div></div>;

  const anneeLabel = annees.find(a => a.id === anneeActive)?.libelle || '';

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

      {resume ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
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
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6 text-center text-gray-400">
          Aucune heure enregistree pour cette annee
        </div>
      )}

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
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${h.type_heure === 'CM' ? 'bg-violet-100 text-violet-700' : h.type_heure === 'TD' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{h.type_heure}</span></td>
                    <td className="px-4 py-3 text-gray-600">{h.duree}h</td>
                    <td className="px-4 py-3 text-gray-600">{h.salle || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}