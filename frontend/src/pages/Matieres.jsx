import { useState, useEffect } from 'react';
import { matiereApi } from '../api/matiereApi';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Search, BookOpen, X } from 'lucide-react';

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2'];
const emptyForm = { intitule: '', filiere: '', niveau: 'L1', volume_horaire_prevu: 0 };

export default function Matieres() {
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async () => {
    try {
      const res = await matiereApi.getAll();
      setMatieres(res.data);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = matieres.filter((m) => {
    const term = search.toLowerCase();
    return m.intitule.toLowerCase().includes(term) || m.filiere.toLowerCase().includes(term);
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (m) => {
    setEditing(m.id);
    setForm({
      intitule: m.intitule, filiere: m.filiere, niveau: m.niveau,
      volume_horaire_prevu: parseFloat(m.volume_horaire_prevu) || 0,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await matiereApi.update(editing, form); toast.success('Matiere modifiee'); }
      else { await matiereApi.create(form); toast.success('Matiere ajoutee'); }
      setModalOpen(false); fetchData();
    } catch (err) { toast.error('Erreur'); }
  };

  const handleDelete = async (id) => {
    try { await matiereApi.delete(id); toast.success('Matiere supprimee'); setConfirmDelete(null); fetchData(); }
    catch { toast.error('Erreur de suppression'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestion des Matieres</h2>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-600 transition-all shadow-lg">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Rechercher une matiere..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Intitule</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Filiere</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Niveau</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Volume prevu</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-400">{search ? 'Aucun resultat' : 'Aucune matiere'}</td></tr>
              ) : filtered.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2"><BookOpen className="w-4 h-4 text-violet-500" />{m.intitule}</td>
                  <td className="px-4 py-3 text-gray-600">{m.filiere}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">{m.niveau}</span></td>
                  <td className="px-4 py-3 text-gray-600">{m.volume_horaire_prevu}h</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(m)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmDelete(m.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
              <h3 className="text-lg font-bold text-gray-800">{editing ? 'Modifier' : 'Ajouter'} une matiere</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Intitule *</label>
                <input type="text" value={form.intitule} onChange={(e) => setForm({ ...form, intitule: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filiere *</label>
                  <input type="text" value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })} required placeholder="Ex: Informatique"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Niveau *</label>
                  <select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm">
                    {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volume horaire prevu (h)</label>
                <input type="number" step="0.5" value={form.volume_horaire_prevu}
                  onChange={(e) => setForm({ ...form, volume_horaire_prevu: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-600">{editing ? 'Modifier' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-600" /></div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Supprimer ?</h3>
            <p className="text-sm text-gray-500 mb-6">Cette action est irreversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">Annuler</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}