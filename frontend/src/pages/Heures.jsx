import { useState, useEffect } from 'react';
import { heureApi } from '../api/heureApi';
import { enseignantApi } from '../api/enseignantApi';
import { matiereApi } from '../api/matiereApi';
import toast from 'react-hot-toast';
import { Plus, Trash2, Clock, Calculator, X, AlertTriangle } from 'lucide-react';

const TYPES = ['CM', 'TD', 'TP'];
const emptyForm = { enseignant_id: '', matiere_id: '', date_cours: '', type_heure: 'CM', duree: 1.5, salle: '', observations: '' };

export default function Heures() {
  const [heures, setHeures] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [anneeActive, setAnneeActive] = useState(2);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [resume, setResume] = useState(null);
  const [selectedEns, setSelectedEns] = useState('');

  const fetchData = async () => {
    try {
      const [resH, resE, resM] = await Promise.all([
        heureApi.getAll(),
        enseignantApi.getAll(),
        matiereApi.getAll(),
      ]);
      setHeures(resH.data);
      setEnseignants(resE.data);
      setMatieres(resM.data);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Charger le résumé quand on sélectionne un enseignant
  useEffect(() => {
    if (selectedEns) {
      heureApi.getResume(selectedEns).then(res => setResume(res.data)).catch(() => {});
    } else {
      setResume(null);
    }
  }, [selectedEns, heures]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await heureApi.create({ ...form, annee_id: anneeActive });
      toast.success('Heure enregistree');
      setModalOpen(false);
      setForm(emptyForm);
      fetchData();
    } catch (err) { toast.error('Erreur'); }
  };

  const handleDelete = async (id) => {
    try { await heureApi.delete(id); toast.success('Heure supprimee'); fetchData(); }
    catch { toast.error('Erreur'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Saisie des Heures</h2>
        <button onClick={() => { setForm(emptyForm); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-600 transition-all shadow-lg">
          <Plus className="w-4 h-4" /> Saisir des heures
        </button>
      </div>

      {/* Résumé enseignant */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Calculator className="w-4 h-4 text-violet-500" /> Voir le resume d'un enseignant</label>
        <select value={selectedEns} onChange={(e) => setSelectedEns(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm">
          <option value="">-- Choisir un enseignant --</option>
          {enseignants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
        </select>

        {resume && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-violet-50 rounded-lg p-3">
              <p className="text-xs text-violet-600 font-medium">CM</p>
              <p className="text-xl font-bold text-violet-800">{resume.cm}h</p>
              <p className="text-xs text-violet-500">= {resume.cm * resume.eq_cm_td}h eq TD</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium">TD</p>
              <p className="text-xl font-bold text-blue-800">{resume.td}h</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-xs text-emerald-600 font-medium">TP</p>
              <p className="text-xl font-bold text-emerald-800">{resume.tp}h</p>
              <p className="text-xs text-emerald-500">= {resume.tp * resume.eq_tp_td}h eq TD</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-600 font-medium">Total eq TD</p>
              <p className="text-xl font-bold text-amber-800">{resume.heures_eq_td}h</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">Contractuelles</p>
              <p className="text-xl font-bold text-gray-800">{resume.heures_contractuelles}h</p>
            </div>
            <div className={`rounded-lg p-3 ${resume.heures_complementaires > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className={`text-xs font-medium ${resume.heures_complementaires > 0 ? 'text-red-600' : 'text-green-600'}`}>Complementaires</p>
              <p className={`text-xl font-bold ${resume.heures_complementaires > 0 ? 'text-red-800' : 'text-green-800'}`}>{resume.heures_complementaires}h</p>
            </div>
            {resume.heures_complementaires > 0 && (
              <div className="bg-red-50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-red-600 font-medium">Montant complementaires</p>
                <p className="text-xl font-bold text-red-800">{resume.montant_complementaires.toLocaleString()} FCFA</p>
              </div>
            )}
            {resume.heures_eq_td > resume.heures_contractuelles && resume.heures_complementaires === 0 && (
              <div className="bg-amber-50 rounded-lg p-3 flex items-center gap-2 col-span-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <p className="text-sm text-amber-700">Depassement detecte !</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Enseignant</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Matiere</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Duree</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Salle</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {heures.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-gray-400">Aucune heure saisie</td></tr>
              ) : heures.map((h) => (
                <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{h.date_cours}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{h.enseignant_nom} {h.enseignant_prenom}</td>
                  <td className="px-4 py-3 text-gray-600">{h.matiere_intitule || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      h.type_heure === 'CM' ? 'bg-violet-100 text-violet-700' :
                      h.type_heure === 'TD' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>{h.type_heure}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{h.duree}h</td>
                  <td className="px-4 py-3 text-gray-600">{h.salle || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDelete(h.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Clock className="w-5 h-5 text-violet-500" /> Saisir des heures</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enseignant *</label>
                  <select value={form.enseignant_id} onChange={(e) => setForm({ ...form, enseignant_id: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm">
                    <option value="">-- Choisir --</option>
                    {enseignants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matiere *</label>
                  <select value={form.matiere_id} onChange={(e) => setForm({ ...form, matiere_id: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm">
                    <option value="">-- Choisir --</option>
                    {matieres.map(m => <option key={m.id} value={m.id}>{m.intitule}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={form.date_cours} onChange={(e) => setForm({ ...form, date_cours: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={form.type_heure} onChange={(e) => setForm({ ...form, type_heure: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duree (h) *</label>
                  <input type="number" step="0.5" min="0.5" value={form.duree}
                    onChange={(e) => setForm({ ...form, duree: parseFloat(e.target.value) || 0 })} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salle</label>
                  <input type="text" value={form.salle} onChange={(e) => setForm({ ...form, salle: e.target.value })}
                    placeholder="Ex: A101"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })}
                  rows="2" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-600">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}