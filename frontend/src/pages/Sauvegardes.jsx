import { useState, useEffect } from 'react';
import { backupApi } from '../api/backupApi';
import toast from 'react-hot-toast';
import {
    Database, Download, Trash2, RefreshCw, Clock,
    HardDrive, Calendar, CheckCircle, XCircle, AlertTriangle, Play, Pause, Settings, X
} from 'lucide-react';

export default function Sauvegardes() {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState(null);
    const [schedule, setSchedule] = useState({ enabled: false, frequency: 'daily', maxBackups: 20 });
    const [showConfig, setShowConfig] = useState(false);

    const fetchBackups = async () => {
        try {
            const res = await backupApi.list();
            setBackups(res.data.backups || []);
        } catch { toast.error('Erreur chargement'); }
        finally { setLoading(false); }
    };

    const fetchSchedule = async () => {
        try { const res = await backupApi.getSchedule(); setSchedule(res.data); } catch {}
    };

    useEffect(() => { fetchBackups(); fetchSchedule(); }, []);

    const handleCreate = async () => {
        try {
            setCreating(true);
            const res = await backupApi.create();
            toast.success(res.data.message);
            fetchBackups();
        } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
        finally { setCreating(false); }
    };

    const handleDownload = async (filename) => {
        try {
            const res = await backupApi.download(filename);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Telechargement lance');
        } catch { toast.error('Erreur telechargement'); }
    };

    const handleDelete = async (filename) => {
        if (!confirm(`Supprimer "${filename}" ?`)) return;
        try {
            await backupApi.delete(filename);
            toast.success('Supprimee');
            fetchBackups();
        } catch { toast.error('Erreur'); }
    };

    const handleRestore = async (filename) => {
        if (!confirm(`ATTENTION : La restauration va remplacer les donnees actuelles.\n\nContinuer avec "${filename}" ?`)) return;
        try {
            setRestoring(filename);
            const res = await backupApi.restore(filename);
            toast.success(res.data.message);
        } catch (err) { toast.error(err.response?.data?.message || 'Erreur restauration'); }
        finally { setRestoring(null); }
    };

    const handleSaveSchedule = async () => {
        try {
            await backupApi.updateSchedule(schedule);
            toast.success('Configuration enregistree');
            setShowConfig(false);
            fetchSchedule();
        } catch { toast.error('Erreur'); }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' o';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
        return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const freqLabel = (f) => {
        switch (f) {
            case 'hourly': return 'Chaque heure';
            case 'daily': return 'Quotidienne (02h00)';
            case 'weekly': return 'Hebdomadaire (dimanche)';
            case 'monthly': return 'Mensuelle (1er du mois)';
            default: return f;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 rounded-xl">
                        <Database className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Sauvegardes</h2>
                        <p className="text-sm text-gray-500">{backups.length} sauvegarde(s) disponible(s)</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowConfig(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
                    >
                        <Settings className="w-4 h-4" /> Configuration
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 transition-all shadow-lg"
                    >
                        {creating ? (
                            <><RefreshCw className="w-4 h-4 animate-spin" /> Creation...</>
                        ) : (
                            <><Database className="w-4 h-4" /> Nouvelle sauvegarde</>
                        )}
                    </button>
                </div>
            </div>

            {/* Statut planification */}
            <div className={`rounded-xl p-4 border-2 ${schedule.enabled ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                    {schedule.enabled ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                        <p className={`font-semibold ${schedule.enabled ? 'text-emerald-800' : 'text-gray-600'}`}>
                            Sauvegarde automatique {schedule.enabled ? 'activee' : 'desactivee'}
                        </p>
                        {schedule.enabled && (
                            <p className="text-sm text-emerald-600">
                                Frequence : {freqLabel(schedule.frequency)} — Max {schedule.maxBackups} sauvegardes
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Liste des sauvegardes */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {backups.length === 0 ? (
                    <div className="text-center py-12">
                        <HardDrive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">Aucune sauvegarde</p>
                        <p className="text-gray-400 text-sm mt-1">Cliquez sur "Nouvelle sauvegarde" pour commencer</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {backups.map((b) => (
                            <div key={b.filename} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`p-2 rounded-lg shrink-0 ${b.type === 'auto' ? 'bg-blue-100' : 'bg-violet-100'}`}>
                                        <Database className={`w-4 h-4 ${b.type === 'auto' ? 'text-blue-600' : 'text-violet-600'}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{b.filename}</p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {formatDate(b.created_at)}
                                            </span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <HardDrive className="w-3 h-3" /> {formatSize(b.size)}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                b.type === 'auto' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'
                                            }`}>
                                                {b.type === 'auto' ? 'Auto' : 'Manuelle'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => handleDownload(b.filename)}
                                        className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title="Telecharger"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleRestore(b.filename)}
                                        disabled={restoring === b.filename}
                                        className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Restaurer"
                                    >
                                        {restoring === b.filename ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(b.filename)}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Configuration */}
            {showConfig && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-violet-500" /> Configuration automatique
                            </h3>
                            <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Active / Desactive */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-medium text-gray-800 text-sm">Sauvegarde automatique</p>
                                    <p className="text-xs text-gray-500">Executer les sauvegardes automatiquement</p>
                                </div>
                                <button
                                    onClick={() => setSchedule({ ...schedule, enabled: !schedule.enabled })}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${schedule.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${schedule.enabled ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>

                            {/* Frequence */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frequence</label>
                                <select
                                    value={schedule.frequency}
                                    onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                                >
                                    <option value="hourly">Chaque heure</option>
                                    <option value="daily">Quotidienne (02h00)</option>
                                    <option value="weekly">Hebdomadaire (dimanche)</option>
                                    <option value="monthly">Mensuelle (1er du mois)</option>
                                </select>
                            </div>

                            {/* Max sauvegardes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre maximum de sauvegardes</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={schedule.maxBackups}
                                    onChange={(e) => setSchedule({ ...schedule, maxBackups: parseInt(e.target.value) || 20 })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Les plus anciennes seront supprimees automatiquement</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowConfig(false)}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveSchedule}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-600"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}