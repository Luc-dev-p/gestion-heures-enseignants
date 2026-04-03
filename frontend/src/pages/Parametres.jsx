import { useState, useEffect } from 'react';
import { parametreApi } from '../api/parametreApi';
import toast from 'react-hot-toast';
import { Settings, Calendar, Save, Plus, Check, Trash2 } from 'lucide-react';

export default function Parametres() {
  const [parametres, setParametres] = useState([]);
  const [annees, setAnnees] = useState([]);
  const [newAnnee, setNewAnnee] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDeleteAnnee, setConfirmDeleteAnnee] = useState(null);

  const fetchData = async () => {
    try {
      const [resP, resA] = await Promise.all([parametreApi.getAll(), parametreApi.getAnnees()]);
      setParametres(resP.data);
      setAnnees(resA.data);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdateParam = async (id, valeur) => {
    try {
      await parametreApi.update(id, valeur);
      toast.success('Parametre modifie');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const handleSetActive = async (id) => {
    try {
      await parametreApi.setAnneeActive(id);
      toast.success('Annee active changee');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const handleAddAnnee = async (e) => {
    e.preventDefault();
    try {
      await parametreApi.addAnnee(newAnnee);
      toast.success('Annee ajoutee');
      setNewAnnee('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleDeleteAnnee = async (id) => {
    try {
      await parametreApi.deleteAnnee(id);
      toast.success('Annee supprimee');
      setConfirmDeleteAnnee(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleSaveParam = (id) => {
    const input = document.querySelector(`input[data-param-id="${id}"]`);
    if (input) {
      handleUpdateParam(id, input.value);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Parametres</h2>

      {/* Équivalences */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-violet-500" /> Equivalences et Taux
        </h3>
        <div className="space-y-4">
          {parametres.map((p) => (
            <div key={p.id} className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">{p.description || p.cle}</label>
                <input
                  type="text"
                  data-param-id={p.id}
                  defaultValue={p.valeur}
                  onBlur={(e) => { if (e.target.value !== p.valeur) handleUpdateParam(p.id, e.target.value); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              <button onClick={() => handleSaveParam(p.id)}
                className="mt-6 p-2 text-violet-600 hover:bg-violet-50 rounded-lg" title="Sauvegarder">
                <Save className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Années académiques */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-500" /> Annees academiques
        </h3>

        <div className="space-y-2 mb-4">
          {annees.map((a) => (
            <div key={a.id} className={`flex items-center justify-between p-3 rounded-xl border ${a.is_active ? 'border-violet-300 bg-violet-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                {a.is_active && <Check className="w-5 h-5 text-violet-600" />}
                <span className={`font-medium ${a.is_active ? 'text-violet-800' : 'text-gray-700'}`}>{a.libelle}</span>
                {a.is_active && <span className="px-2 py-0.5 bg-violet-200 text-violet-700 rounded-full text-xs font-medium">Active</span>}
              </div>
              <div className="flex items-center gap-2">
                {!a.is_active && (
                  <button onClick={() => handleSetActive(a.id)}
                    className="px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-100 rounded-lg font-medium">
                    Definir active
                  </button>
                )}
                {/* ✅ Bouton supprimer (uniquement si inactive) */}
                {!a.is_active && (
                  <button onClick={() => setConfirmDeleteAnnee(a.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddAnnee} className="flex gap-2">
          <input
            type="text"
            value={newAnnee}
            onChange={(e) => setNewAnnee(e.target.value)}
            placeholder="Ex: 2026-2027"
            required
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm"
          />
          <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </form>
      </div>

      {/* Modal confirmation suppression */}
      {confirmDeleteAnnee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Supprimer cette annee ?</h3>
            <p className="text-sm text-gray-500 mb-6">Cette action est irreversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAnnee(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">Annuler</button>
              <button onClick={() => handleDeleteAnnee(confirmDeleteAnnee)} className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}