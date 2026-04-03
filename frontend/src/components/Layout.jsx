import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, Clock, LogOut, Menu, X,
  GraduationCap, Download, Settings, Shield, User, ChevronDown, Wallet, KeyRound
} from 'lucide-react';
import { useState } from 'react';
import { exportApi, downloadBlob } from '../api/exportApi';
import toast from 'react-hot-toast';
import { useAnnee } from '../context/AnneeContext';
import { CalendarDays } from 'lucide-react';

export default function Layout() {
  const { user, logout, changePassword } = useAuth();
  const { annees, anneeActive, setAnneeActive, loading: loadingAnnees } = useAnnee();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Modal changement mot de passe
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const handleExport = async (type, filename) => {
    try {
      setExporting(true);
      let res;
      if (type === 'excel-global') res = await exportApi.excelGlobal();
      else if (type === 'excel-compta') res = await exportApi.excelComptabilite();
      else if (type === 'pdf-compta') res = await exportApi.pdfComptabilite();
      downloadBlob(res.data, filename);
      toast.success('Export réussi');
    } catch { toast.error('Erreur export'); }
    finally { setExporting(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPwd.length < 6) {
      toast.error('Minimum 6 caracteres requis');
      return;
    }
    try {
      setChangingPwd(true);
      await changePassword(currentPwd, newPwd);
      setPasswordModal(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch { /* erreur déjà gérée */ }
    finally { setChangingPwd(false); }
  };

  const enseignantLinks = [
    { to: '/mon-espace', icon: User, label: 'Mon Espace' },
  ];

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/enseignants', icon: Users, label: 'Enseignants' },
    { to: '/matieres', icon: BookOpen, label: 'Matières' },
    { to: '/heures', icon: Clock, label: 'Heures' },
    { to: '/calendrier', icon: CalendarDays, label: 'Calendrier' },
    { to: '/paiements', icon: Wallet, label: 'Paiements' },
  ];

  const settingsLinks = [
    { to: '/parametres', icon: Settings, label: 'Paramètres' },
    { to: '/utilisateurs', icon: Shield, label: 'Utilisateurs' },
  ];

  const exportItems = [
    { type: 'excel-global', filename: 'heures_globales.xlsx', label: 'Global Excel' },
    { type: 'excel-compta', filename: 'etat_comptabilite.xlsx', label: 'Comptabilité Excel' },
    { type: 'pdf-compta', filename: 'etat_comptabilite.pdf', label: 'Comptabilité PDF' },
  ];

  const isAdmin = user?.role === 'admin';
  const isAdminOrRh = user?.role === 'admin' || user?.role === 'rh';

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-white/20 text-white shadow-lg'
        : 'text-violet-200 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="min-h-screen flex">
      {/* ===== SIDEBAR ===== */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-violet-900 to-violet-800 transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b border-violet-700 shrink-0">
          <GraduationCap className="w-7 h-7 text-white" />
          <span className="text-white font-bold text-lg">GestHeures</span>
          <button className="lg:hidden ml-auto text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sélecteur d'année académique */}
        {!loadingAnnees && annees.length > 0 && (
          <div className="px-4 py-3 border-b border-violet-700 shrink-0">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-violet-300 shrink-0" />
              <select
                value={anneeActive || ''}
                onChange={(e) => setAnneeActive(Number(e.target.value))}
                className="w-full bg-white/10 border border-violet-500/30 text-white text-sm rounded-lg px-3 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                           cursor-pointer hover:bg-white/15 transition-colors appearance-none"
              >
                {annees.map((a) => (
                  <option key={a.id} value={a.id} className="text-gray-900 bg-white">
                    {a.libelle} {a.is_active ? '●' : ''}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-violet-400 mt-1 pl-6">Année académique active</p>
          </div>
        )}

        {/* Navigation scrollable */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 sidebar-scroll">

          {/* Enseignant uniquement */}
          {user?.role === 'enseignant' && (
            enseignantLinks.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} end onClick={() => setSidebarOpen(false)} className={linkClass}>
                <Icon className="w-5 h-5" />{label}
              </NavLink>
            ))
          )}

          {/* Gestion — admin / rh */}
          {isAdminOrRh && (
            <>
              <p className="px-4 pt-3 pb-1 text-[10px] text-violet-400 uppercase tracking-widest font-semibold">Gestion</p>
              {adminLinks.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} className={linkClass}>
                  <Icon className="w-5 h-5" />{label}
                </NavLink>
              ))}
            </>
          )}

          {/* Administration — admin uniquement */}
          {isAdmin && (
            <>
              <p className="px-4 pt-3 pb-1 text-[10px] text-violet-400 uppercase tracking-widest font-semibold">Administration</p>
              {settingsLinks.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} className={linkClass}>
                  <Icon className="w-5 h-5" />{label}
                </NavLink>
              ))}
            </>
          )}

          {/* Exports — admin / rh */}
          {isAdminOrRh && (
            <>
              <p className="px-4 pt-3 pb-1 text-[10px] text-violet-400 uppercase tracking-widest font-semibold">Exports</p>
              <div className="group relative">
                <button
                  disabled={exporting}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium w-full text-violet-200 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  <span className="flex-1 text-left">Exports</span>
                  <ChevronDown className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" />
                </button>
                <div className="overflow-hidden max-h-0 group-hover:max-h-56 transition-all duration-300 ease-in-out">
                  <div className="pl-3 pt-1 pb-1 space-y-0.5">
                    {exportItems.map(({ type, filename, label }) => (
                      <button
                        key={type}
                        onClick={() => handleExport(type, filename)}
                        disabled={exporting}
                        className="flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm text-violet-300 hover:bg-white/10 hover:text-white transition-all w-full disabled:opacity-50"
                      >
                        <Download className="w-4 h-4 opacity-60" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-violet-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.nom?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.nom || 'Admin'}</p>
              <p className="text-violet-300 text-xs truncate">{user?.role || 'Administrateur'}</p>
            </div>
            <button onClick={() => setPasswordModal(true)} className="text-violet-300 hover:text-white shrink-0" title="Changer mot de passe">
              <KeyRound className="w-4 h-4" />
            </button>
            <button onClick={logout} className="text-violet-300 hover:text-white shrink-0" title="Se deconnecter">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Contenu principal */}
      <div className="flex-1 lg:ml-64">
        <header className="bg-white shadow-sm border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-4">
          <button className="lg:hidden text-gray-600" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">Gestion des Heures</h1>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* ===== MODAL CHANGER MOT DE PASSE ===== */}
      {passwordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-violet-500" /> Changer le mot de passe
              </h3>
              <button onClick={() => { setPasswordModal(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required
                  placeholder="Votre mot de passe actuel"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required minLength={6}
                  placeholder="Min. 6 caracteres"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
                <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required minLength={6}
                  placeholder="Retapez le nouveau mot de passe"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setPasswordModal(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={changingPwd}
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-medium rounded-xl hover:from-violet-700 hover:to-fuchsia-600 disabled:opacity-50">
                  {changingPwd ? 'Enregistrement...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scrollbar personnalisé */}
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}