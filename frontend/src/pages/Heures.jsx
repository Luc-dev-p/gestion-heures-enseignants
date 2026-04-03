import { useState, useEffect } from 'react';
import { heureApi } from '../api/heureApi';
import { enseignantApi } from '../api/enseignantApi';
import { matiereApi } from '../api/matiereApi';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Trash2, Clock, Calculator, X, AlertTriangle, CheckCircle, XCircle, Filter, Calendar } from 'lucide-react';
import { useDataSync } from '../hooks/useDataSync';
import { emitDataChange } from '../utils/dataSync';
import { useAnnee } from '../context/AnneeContext';

const TYPES = ['CM', 'TD', 'TP'];
const emptyForm = { enseignant_id: '', matiere_id: '', date_cours: '', type_heure: 'CM', duree: 1.5, salle: '', observations: '' };

export default function Heures() {
  const { annees, anneeActive, setAnneeActive } = useAnnee();
  const [heures, setHeures] = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [resume, setResume] = useState(null);
  const [selectedEns, setSelectedEns] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');

  const fetchData = async () => {
    try {
      const params = {};
      if (anneeActive) params.annee_id = anneeActive;

      const [resH, resE, resM] = await Promise.all([
        api.get('/heures', { params }),
        enseignantApi.getAll(),
        matiereApi.getAll(),
      ]);
      setHeures(resH.data);
      setEnseignants(resE.data);
      setMatieres(resM.data);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [anneeActive]);

  // Ecouter les changements d'enseignants pour actualiser la liste deroulante
  useDataSync(['enseignants', 'utilisateurs'], fetchData);

  // Charger le résumé quand on sélectionne un enseignant
  useEffect(() => {
    if (selectedEns) {
      const params = {};
      if (anneeActive) params.annee_id = anneeActive;
      api.get(`/heures/resume/${selectedEns}`, { params })
        .then(res => setResume(res.data))
        .catch(() => setResume(null));
    } else {
      setResume(null);
    }
  }, [selectedEns, heures, anneeActive]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await heureApi.create({ ...form, annee_id: anneeActive });
      toast.success('Heure enregistree (en attente de validation)');
      setModalOpen(false);
      setForm(emptyForm);
      fetchData();
      emitDataChange('heures');
    } catch (err) { toast.error('Erreur'); }
  };

  const handleDelete = async (id) => {
    try {
      await heureApi.delete(id);
      toast.success('Heure supprimee');
      fetchData();
      emitDataChange('heures');
    } catch { toast.error('Erreur'); }
  };

  const handleValider = async (id) => {
    try {
      await heureApi.valider(id);
      toast.success('Heure validee');
      fetchData();
      emitDataChange('heures');
    } catch { toast.error('Erreur'); }
  };

  const handleRejeter = async (id) => {
    try {
      await heureApi.rejeter(id);
      toast.success('Heure rejetee');
      fetchData();
      emitDataChange('heures');
    } catch { toast.error('Erreur'); }
  };

  // Filtrer par statut
  const filteredHeures = filterStatut === 'tous'
    ? heures
    : heures.filter(h => h.statut === filterStatut);

  // Compteurs par statut
  const nbEnAttente = heures.filter(h => h.statut === 'en_attente').length;
  const nbValidees = heures.filter(h => h.statut === 'valide').length;
  const nbRejetees = heures.filter(h => h.statut === 'rejete').length;

  // Badge de statut
  const getStatutBadge = (statut) => {
    switch (statut) {
      case 'valide':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" /> Validee
          </span>
        );
      case 'rejete':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" /> Rejetee
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" /> En attente
          </span>
        );
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Saisie et Validation des Heures</h2>
        <button onClick={() => { setForm(emptyForm); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-600 transition-all shadow-lg">
          <Plus className="w-4 h-4" /> Saisir des heures
        </button>
      </div>

      {/* Filtres : Année académique + Statut */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6 space-y-3">
        {/* Sélecteur d'année académique */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4 text-violet-500" /> Annee academique :
          </div>
          <select value={anneeActive || ''} onChange={(e) => setAnneeActive(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-violet-50 text-violet-700">
            <option value="">Toutes les annees</option>
            {annees.map(a => (
              <option key={a.id} value={a.id}>
                {a.libelle} {a.is_active ? '(active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Filtres par statut */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="w-4 h-4 text-violet-500" /> Filtrer par statut :
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterStatut('tous')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterStatut === 'tous' ? 'bg-violet-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Tous ({heures.length})
            </button>
            <button onClick={() => setFilterStatut('en_attente')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterStatut === 'en_attente' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
              En attente ({nbEnAttente})
            </button>
            <button onClick={() => setFilterStatut('valide')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterStatut === 'valide' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
              Validees ({nbValidees})
            </button>
            <button onClick={() => setFilterStatut('rejete')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filterStatut === 'rejete' ? 'bg-red-500 text-white shadow-sm' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
              Rejetees ({nbRejetees})
            </button>
          </div>
        </div>
      </div>

      {/* Résumé enseignant */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Calculator className="w-4 h-4 text-violet-500" /> Voir le resume d'un enseignant (heures validees uniquement)</label>
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
            {resume.nb_en_attente > 0 && (
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-600 font-medium">En attente</p>
                <p className="text-xl font-bold text-amber-800">{resume.nb_en_attente}</p>
              </div>
            )}
            {resume.nb_rejetees > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-600 font-medium">Rejetees</p>
                <p className="text-xl font-bold text-red-800">{resume.nb_rejetees}</p>
              </div>
            )}
            {resume.heures_complementaires > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
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
              {filteredHeures.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-gray-400">{filterStatut !== 'tous' ? 'Aucune heure avec ce statut' : 'Aucune heure saisie'}</td></tr>
              ) : filteredHeures.map((h) => (
                <tr key={h.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${h.statut === 'rejete' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">{getStatutBadge(h.statut)}</td>
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
                    <div className="flex items-center justify-center gap-1">
                      {h.statut === 'en_attente' && (
                        <>
                          <button onClick={() => handleValider(h.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Valider">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleRejeter(h.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Rejeter">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {h.statut === 'rejete' && (
                        <button onClick={() => handleValider(h.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Valider">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(h.id)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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