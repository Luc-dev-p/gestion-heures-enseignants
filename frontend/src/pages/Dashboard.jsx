import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Users, BookOpen, Clock, AlertTriangle, TrendingUp, Shield, Download, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [depassements, setDepassements] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [mois, setMois] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [exportingLogs, setExportingLogs] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [s, d, f, m, dep, l] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/departements'),
          api.get('/dashboard/filieres'),
          api.get('/dashboard/mois'),
          api.get('/dashboard/depassements'),
          api.get('/dashboard/logs'),
        ]);
        setStats(s.data);
        setDepartements(d.data);
        setFilieres(f.data);
        setMois(m.data);
        setDepassements(dep.data);
        setLogs(l.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleResetLogs = async () => {
    try {
      await api.delete('/dashboard/logs');
      toast.success('Journal reinitialise');
      setConfirmReset(false);
      // Recharger les logs
      const res = await api.get('/dashboard/logs');
      setLogs(res.data);
    } catch (err) {
      toast.error('Erreur lors de la reinitialisation');
    }
  };

  const handleExportLogsPdf = async () => {
    try {
      setExportingLogs(true);
      const res = await api.get('/export/logs/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const role = user?.role === 'admin' ? 'admin' : 'rh';
      link.setAttribute('download', `journal_${role}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export PDF reussi');
    } catch {
      toast.error('Erreur export PDF');
    } finally {
      setExportingLogs(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div></div>;

  const cards = [
    { label: 'Enseignants', value: stats?.enseignants || 0, icon: Users, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-100', text: 'text-violet-600' },
    { label: 'Matieres', value: stats?.matieres || 0, icon: BookOpen, color: 'from-fuchsia-500 to-fuchsia-600', bg: 'bg-fuchsia-100', text: 'text-fuchsia-600' },
    { label: 'Heures totales', value: `${stats?.heures_total || 0}h`, icon: Clock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-100', text: 'text-amber-600' },
    { label: 'Depassements', value: depassements.length, icon: AlertTriangle, color: 'from-red-500 to-red-600', bg: 'bg-red-100', text: 'text-red-600' },
  ];

  const moisLabels = mois.map(m => {
    const [y, mo] = m.mois.split('-');
    const noms = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${noms[parseInt(mo) - 1]} ${y}`;
  });
  const moisValeurs = mois.map(m => parseFloat(m.total_heures) || 0);
  const maxMois = Math.max(...moisValeurs, 1);

  const depLabels = departements.map(d => d.departement);
  const depValeurs = departements.map(d => parseFloat(d.total_heures) || 0);
  const maxDep = Math.max(...depValeurs, 1);

  const filLabels = filieres.map(f => f.filiere);
  const filValeurs = filieres.map(f => parseFloat(f.total_heures) || 0);
  const maxFil = Math.max(...filValeurs, 1);

  const ACTION_COLORS = { CREATE: 'bg-emerald-100 text-emerald-700', UPDATE: 'bg-blue-100 text-blue-700', DELETE: 'bg-red-100 text-red-700', VALIDATE: 'bg-green-100 text-green-700', REJECT: 'bg-orange-100 text-orange-700' };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord</h2>

      {/* Cartes stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color, bg, text }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{label}</p>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${text}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <div className={`mt-3 h-1 w-12 rounded-full bg-gradient-to-r ${color}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Graphique heures par mois */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-violet-500" /> Heures par mois</h3>
          {mois.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucune donnee</p>
          ) : (
            <div className="space-y-2">
              {mois.map((m, i) => (
                <div key={m.mois} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 text-right">{moisLabels[i]}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${(moisValeurs[i] / maxMois) * 100}%`, minWidth: moisValeurs[i] > 0 ? '2rem' : '0' }}>
                      <span className="text-xs text-white font-medium">{moisValeurs[i]}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dépassements */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Enseignants en depassement</h3>
          {depassements.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucun depassement</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {depassements.map(d => (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <div className="w-8 h-8 bg-red-200 rounded-full flex items-center justify-center text-red-700 text-xs font-bold">
                    {d.nom[0]}{d.prenom[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.nom} {d.prenom}</p>
                    <p className="text-xs text-gray-500">{d.departement}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{parseFloat(d.heures_eq_td).toFixed(1)}h</p>
                    <p className="text-xs text-gray-500">sur {d.heures_contractuelles}h</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Heures par département */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Heures par departement</h3>
          {departements.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucune donnee</p>
          ) : (
            <div className="space-y-2">
              {departements.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 truncate">{d.departement}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(depValeurs[i] / maxDep) * 100}%`, minWidth: depValeurs[i] > 0 ? '2rem' : '0' }}>
                      <span className="text-xs text-white font-medium">{depValeurs[i]}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Heures par filière */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Repartition par filiere</h3>
          {filieres.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aucune donnee</p>
          ) : (
            <div className="space-y-2">
              {filieres.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 truncate">{f.filiere}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(filValeurs[i] / maxFil) * 100}%`, minWidth: filValeurs[i] > 0 ? '2rem' : '0' }}>
                      <span className="text-xs text-white font-medium">{filValeurs[i]}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Journal des actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-500" /> Journal des actions recentes
            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
              {user?.role === 'admin' ? 'Tous les roles' : 'Role RH uniquement'}
            </span>
          </h3>
          <div className="flex items-center gap-2">
            {/* Export PDF */}
            <button onClick={handleExportLogsPdf} disabled={exportingLogs}
              className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-all">
              <Download className="w-4 h-4" />
              {exportingLogs ? 'Export...' : 'Exporter PDF'}
            </button>
            {/* Réinitialiser — admin uniquement */}
            {user?.role === 'admin' && (
              <button onClick={() => setConfirmReset(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all">
                <Trash2 className="w-4 h-4" />
                Reinitialiser
              </button>
            )}
          </div>
        </div>
        {logs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Aucune action enregistree</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Utilisateur</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Role</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Action</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Table</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="px-3 py-2 text-gray-500 text-xs">{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-2 text-gray-700 font-medium">{l.user_nom || 'Systeme'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        l.user_role === 'admin' ? 'bg-violet-100 text-violet-700' :
                        l.user_role === 'rh' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {l.user_role || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[l.action] || 'bg-gray-100 text-gray-700'}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{l.table_concernee}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs max-w-xs truncate">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal confirmation réinitialisation */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Reinitialiser le journal ?</h3>
            <p className="text-sm text-gray-500 mb-6">Toutes les actions enregistrees seront supprimees. Cette action est irreversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">Annuler</button>
              <button onClick={handleResetLogs} className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700">Reinitialiser</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}