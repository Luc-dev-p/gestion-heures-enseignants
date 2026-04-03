import { useState, useEffect } from 'react';
import { paiementApi } from '../api/paiementApi';
import { exportApi, downloadBlob } from '../api/exportApi';
import toast from 'react-hot-toast';
import { Search, Wallet, CreditCard, CheckCircle, AlertTriangle, X, FileText, Download, Users, Clock, TrendingUp, History } from 'lucide-react';

export default function Paiements() {
  const [paiements, setPaiements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEns, setSelectedEns] = useState(null);
  const [periode, setPeriode] = useState('');
  const [montant, setMontant] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [historiqueOpen, setHistoriqueOpen] = useState(false);
  const [historique, setHistorique] = useState([]);
  const [histEnsName, setHistEnsName] = useState('');

  const fetchData = async () => {
    try {
      const [resP, resS] = await Promise.all([
        paiementApi.getAll(),
        paiementApi.getStats(),
      ]);
      setPaiements(resP.data);
      setStats(resS.data);
    } catch (err) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = paiements.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.nom.toLowerCase().includes(term) ||
      p.prenom.toLowerCase().includes(term) ||
      p.departement.toLowerCase().includes(term) ||
      p.grade.toLowerCase().includes(term)
    );
  });

  const openPayer = (ens) => {
    setSelectedEns(ens);
    setPeriode(new Date().getFullYear() + '-' + String(new Date().getFullYear() + 1).slice(2));
    setMontant(ens.montant.toString());
    setNotes('');
    setModalOpen(true);
  };

  const handleSubmitPaiement = async (e) => {
    e.preventDefault();
    if (!selectedEns || !montant || !periode) return;
    try {
      setSubmitting(true);
      await paiementApi.create({
        enseignant_id: selectedEns.id,
        periode,
        montant: parseFloat(montant),
        nb_heures_cm: selectedEns.cm,
        nb_heures_td: selectedEns.td,
        nb_heures_tp: selectedEns.tp,
        nb_heures_eq_td: selectedEns.heures_eq_td,
        nb_heures_complementaires: selectedEns.heures_complementaires,
        taux_horaire: selectedEns.taux_horaire,
        notes,
      });
      toast.success(`Paiement de ${parseFloat(montant).toLocaleString()} FCFA enregistre pour ${selectedEns.prenom} ${selectedEns.nom}`);
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const openHistorique = async (ens) => {
    setHistEnsName(`${ens.prenom} ${ens.nom}`);
    try {
      const res = await paiementApi.getHistorique(ens.id);
      setHistorique(res.data);
      setHistoriqueOpen(true);
    } catch {
      toast.error('Erreur de chargement');
    }
  };

  const handleExportBulletin = async (ens) => {
    try {
      setExporting(true);
      const name = `Bulletin_${ens.nom}_${ens.prenom}`.replace(/\s+/g, '_');
      const r = await exportApi.bulletinIndividuel(ens.id);
      downloadBlob(r.data, `${name}.pdf`);
      toast.success('Bulletin genere');
    } catch { toast.error('Erreur export'); }
    finally { setExporting(false); }
  };

  const handleExportRapport = async () => {
    try {
      setExporting(true);
      const r = await exportApi.rapportAnnuel();
      downloadBlob(r.data, 'rapport_annuel.pdf');
      toast.success('Rapport genere');
    } catch { toast.error('Erreur export'); }
    finally { setExporting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div></div>;

  const totalMontantGlobal = paiements.reduce((s, p) => s + p.montant, 0);
  const totalComplementaires = paiements.reduce((s, p) => s + p.heures_complementaires, 0);
  const nbDepassement = paiements.filter(p => p.heures_complementaires > 0).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestion des Paiements</h2>
          <p className="text-gray-500 text-sm">Suivi et paiement des heures complementaires</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportRapport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-600 disabled:opacity-50 shadow-lg">
            <Download className="w-4 h-4" />{exporting ? 'Export...' : 'Rapport Annuel PDF'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center"><Users className="w-5 h-5 text-violet-600" /></div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{paiements.length}</p>
            <p className="text-xs text-gray-500">Enseignants</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{totalComplementaires.toFixed(1)}h</p>
            <p className="text-xs text-gray-500">Heures complementaires</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><Wallet className="w-5 h-5 text-emerald-600" /></div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{totalMontantGlobal.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Montant total (FCFA)</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><CreditCard className="w-5 h-5 text-red-600" /></div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{stats?.total_montant_paye?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500">Deja paye (FCFA)</p>
          </div>
        </div>
      </div>

      {/* Paiements effectues */}
      {stats && stats.nb_paiements > 0 && (
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 mb-6 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-sm text-emerald-800">
            <span className="font-semibold">{stats.nb_paiements} paiement(s)</span> enregistre(s) pour {stats.enseignants_payes} enseignant(s)
            {stats.periodes.length > 0 && <span className="text-emerald-600"> — Periodes: {stats.periodes.join(', ')}</span>}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Rechercher par nom, prenom, departement, grade..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Enseignant</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Departement</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">CM</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">TD</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">TP</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Eq-TD</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Compl.</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Montant</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="10" className="text-center py-8 text-gray-400">{search ? 'Aucun resultat' : 'Aucun enseignant'}</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{p.prenom} {p.nom}</p>
                      <p className="text-xs text-gray-400">{p.grade} — {p.statut}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.departement}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{p.cm.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{p.td.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{p.tp.toFixed(1)}h</td>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">{p.heures_eq_td.toFixed(1)}h</td>
                  <td className="px-4 py-3">
                    {p.heures_complementaires > 0 ? (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">{p.heures_complementaires.toFixed(1)}h</span>
                    ) : (
                      <span className="text-gray-400 text-xs">0h</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">
                    {p.montant > 0 ? `${p.montant.toLocaleString()} FCFA` : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.dernier_paiement ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" />Paye
                      </span>
                    ) : p.montant > 0 ? (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">En attente</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {p.heures_complementaires > 0 && (
                        <button onClick={() => openPayer(p)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Enregistrer paiement">
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => openHistorique(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Historique">
                        <History className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleExportBulletin(p)} disabled={exporting} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-50" title="Bulletin PDF">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Résumé en bas */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-gray-500">Total: <span className="font-bold text-gray-800">{filtered.length} enseignant(s)</span></span>
          <span className="text-gray-500">Complementaires: <span className="font-bold text-amber-700">{filtered.reduce((s, p) => s + p.heures_complementaires, 0).toFixed(1)}h</span></span>
          <span className="text-gray-500">Montant: <span className="font-bold text-gray-800">{filtered.reduce((s, p) => s + p.montant, 0).toLocaleString()} FCFA</span></span>
          <span className="text-gray-500">Depassements: <span className="font-bold text-red-600">{filtered.filter(p => p.heures_complementaires > 0).length}</span></span>
        </div>
      </div>

      {/* Modal Paiement */}
      {modalOpen && selectedEns && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-600" /> Enregistrer un paiement</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="bg-violet-50 rounded-xl p-4 mb-4">
                <p className="font-semibold text-violet-800">{selectedEns.prenom} {selectedEns.nom}</p>
                <p className="text-sm text-violet-600">{selectedEns.grade} — {selectedEns.departement}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-violet-700">
                  <span>Eq-TD: {selectedEns.heures_eq_td.toFixed(1)}h</span>
                  <span>Contractuelles: {selectedEns.heures_contractuelles}h</span>
                  <span>Complementaires: {selectedEns.heures_complementaires.toFixed(1)}h</span>
                  <span>Taux: {selectedEns.taux_horaire} FCFA/h</span>
                </div>
              </div>

              <form onSubmit={handleSubmitPaiement} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Periode *</label>
                    <input type="text" value={periode} onChange={(e) => setPeriode(e.target.value)} required placeholder="2025-2026"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA) *</label>
                    <input type="number" step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="2" placeholder="Observations..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">Annuler</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                    {submitting ? 'Enregistrement...' : 'Confirmer le paiement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {historiqueOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><History className="w-5 h-5 text-blue-600" /> Historique — {histEnsName}</h3>
              <button onClick={() => setHistoriqueOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-96">
              {historique.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Aucun paiement enregistre</p>
              ) : (
                <div className="space-y-3">
                  {historique.map((h) => (
                    <div key={h.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">{parseFloat(h.montant).toLocaleString()} FCFA</span>
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">{h.periode}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                        <span>Eq-TD: {parseFloat(h.nb_heures_eq_td || 0).toFixed(1)}h</span>
                        <span>Compl.: {parseFloat(h.nb_heures_complementaires || 0).toFixed(1)}h</span>
                        <span>Date: {h.date_paiement}</span>
                        <span>Par: {h.createur_nom || 'Système'}</span>
                      </div>
                      {h.notes && <p className="text-xs text-gray-400 mt-2 italic">{h.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}