import { useState, useEffect } from 'react';
import { enseignantApi } from '../api/enseignantApi';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Search, Users, UserCheck, UserX, X, FileSpreadsheet, FileText, Mail, Lock } from 'lucide-react';
import { exportApi, downloadBlob } from '../api/exportApi';

const GRADES = ['Assistant', 'Maitre-Assistant', 'Professeur', 'Autre'];
const STATUTS = ['Permanent', 'Vacataire'];
const emptyForm = {
  nom: '', prenom: '', grade: 'Assistant', statut: 'Permanent',
  departement: '', taux_horaire: 0, heures_contractuelles: 0,
  email: '', password: '',
};

export default function Enseignants() {
  const [enseignants, setEnseignants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async () => {
    try {
      const [resEns, resStats] = await Promise.all([
        enseignantApi.getAll(),
        enseignantApi.getStats(),
      ]);
      setEnseignants(resEns.data);
      setStats(resStats.data);
    } catch (err) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = enseignants.filter((e) => {
    const term = search.toLowerCase();
    return (
      e.nom.toLowerCase().includes(term) ||
      e.prenom.toLowerCase().includes(term) ||
      e.departement.toLowerCase().includes(term) ||
      (e.email || '').toLowerCase().includes(term)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (ens) => {
    setEditing(ens.id);
    setForm({
      nom: ens.nom,
      prenom: ens.prenom,
      grade: ens.grade,
      statut: ens.statut,
      departement: ens.departement,
      taux_horaire: parseFloat(ens.taux_horaire) || 0,
      heures_contractuelles: parseFloat(ens.heures_contractuelles) || 0,
      email: ens.email || '',
      password: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await enseignantApi.update(editing, form);
        toast.success('Enseignant modifie');
      } else {
        await enseignantApi.create(form);
        toast.success('Enseignant ajoute avec son compte de connexion');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    try {
      await enseignantApi.delete(id);
      toast.success('Enseignant et compte supprimes');
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      toast.error('Erreur de suppression');
    }
  };

  const handleExport = async (type, ens) => {
    try {
      const name = `fiche_${ens.nom}_${ens.prenom}`.replace(/\s+/g, '_');
      if (type === 'excel') {
        const r = await exportApi.excelEnseignant(ens.id);
        downloadBlob(r.data, `${name}.xlsx`);
      } else {
        const r = await exportApi.pdfEnseignant(ens.id);
        downloadBlob(r.data, `${name}.pdf`);
      }
      toast.success('Export reussi');
    } catch { toast.error('Erreur export'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestion des Enseignants</h2>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-600 transition-all shadow-lg">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center"><Users className="w-5 h-5 text-violet-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><UserCheck className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.permanents}</p>
              <p className="text-xs text-gray-500">Permanents</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><UserX className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.vacataires}</p>
              <p className="text-xs text-gray-500">Vacataires</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Rechercher par nom, prenom, email ou departement..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nom</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Prenom</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Grade</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Departement</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Taux/h</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">H. contract.</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Compte</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="10" className="text-center py-8 text-gray-400">{search ? 'Aucun resultat' : 'Aucun enseignant'}</td></tr>
              ) : filtered.map((ens) => (
                <tr key={ens.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{ens.nom}</td>
                  <td className="px-4 py-3 text-gray-600">{ens.prenom}</td>
                  <td className="px-4 py-3 text-gray-600">{ens.email || <span className="text-red-400">Non defini</span>}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">{ens.grade}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${ens.statut === 'Permanent' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{ens.statut}</span></td>
                  <td className="px-4 py-3 text-gray-600">{ens.departement}</td>
                  <td className="px-4 py-3 text-gray-600">{ens.taux_horaire} FCFA</td>
                  <td className="px-4 py-3 text-gray-600">{ens.heures_contractuelles}h</td>
                  <td className="px-4 py-3 text-center">
                    {ens.email ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Actif</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Inactif</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(ens)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Modifier"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleExport('excel', ens)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Excel"><FileSpreadsheet className="w-4 h-4" /></button>
                      <button onClick={() => handleExport('pdf', ens)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="PDF"><FileText className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmDelete(ens.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulaire */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">{editing ? 'Modifier' : 'Ajouter'} un enseignant</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenom *</label>
                  <input type="text" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                  <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm">
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut *</label>
                  <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm">
                    {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departement *</label>
                <input type="text" value={form.departement} onChange={(e) => setForm({ ...form, departement: e.target.value })} required placeholder="Ex: Informatique"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taux horaire (FCFA)</label>
                  <input type="number" step="0.01" value={form.taux_horaire}
                    onChange={(e) => setForm({ ...form, taux_horaire: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heures contractuelles</label>
                  <input type="number" step="0.5" value={form.heures_contractuelles}
                    onChange={(e) => setForm({ ...form, heures_contractuelles: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                </div>
              </div>

              {/* Séparateur : Infos de connexion */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-violet-500" />
                  {editing ? 'Compte de connexion (laisser vide si pas de changement)' : 'Compte de connexion de l\'enseignant'}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Mail className="w-3 h-3 inline mr-1" />
                      Email {!editing && '*'}
                    </label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} {...(!editing && { required: true })}
                      placeholder="enseignant@university.com"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Lock className="w-3 h-3 inline mr-1" />
                      Mot de passe {!editing && '*'}
                    </label>
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} {...(!editing && { required: true })}
                      placeholder={!editing ? 'Minimum 6 caracteres' : 'Nouveau mot de passe'}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                  </div>
                </div>
                {!editing && (
                  <p className="text-xs text-violet-600 mt-2 bg-violet-50 p-2 rounded-lg">
                    Un compte sera cree automatiquement. L'enseignant pourra se connecter avec cet email et mot de passe.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">Annuler</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-600">
                  {editing ? 'Modifier' : 'Ajouter et creer le compte'}
                </button>
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
            <p className="text-sm text-gray-500 mb-6">Le compte de connexion de cet enseignant sera aussi supprime.</p>
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