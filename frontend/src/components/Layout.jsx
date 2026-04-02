import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, Clock, LogOut, Menu, X, GraduationCap, Download, Settings, Shield, User
} from 'lucide-react';
import { useState } from 'react';
import { exportApi, downloadBlob } from '../api/exportApi';
import toast from 'react-hot-toast';

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type, filename) => {
    try {
      setExporting(true);
      let res;
      if (type === 'excel-global') res = await exportApi.excelGlobal();
      else if (type === 'excel-compta') res = await exportApi.excelComptabilite();
      else if (type === 'pdf-compta') res = await exportApi.pdfComptabilite();
      downloadBlob(res.data, filename);
      toast.success('Export reussi');
    } catch { toast.error('Erreur export'); }
    finally { setExporting(false); }
  };

  // Menu pour l'enseignant (limité)
  const enseignantLinks = [
    { to: '/mon-espace', icon: User, label: 'Mon Espace' },
  ];

  // Menu pour admin et rh
  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/enseignants', icon: Users, label: 'Enseignants' },
    { to: '/matieres', icon: BookOpen, label: 'Matieres' },
    { to: '/heures', icon: Clock, label: 'Heures' },
  ];

  const settingsLinks = [
    { to: '/parametres', icon: Settings, label: 'Parametres' },
    { to: '/utilisateurs', icon: Shield, label: 'Utilisateurs' },
  ];

  const isAdmin = user?.role === 'admin';
  const isAdminOrRh = user?.role === 'admin' || user?.role === 'rh';

  return (
    <div className="min-h-screen flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-violet-900 to-violet-800 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 p-6 border-b border-violet-700">
          <GraduationCap className="w-8 h-8 text-white" />
          <span className="text-white font-bold text-lg">GestHeures</span>
          <button className="lg:hidden ml-auto text-white" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="p-4 space-y-1">
          {/* Menu enseignant */}
          {enseignantLinks.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/mon-espace'} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-white/20 text-white shadow-lg' : 'text-violet-200 hover:bg-white/10 hover:text-white'}`}>
              <Icon className="w-5 h-5" />{label}
            </NavLink>
          ))}

          {/* Menu admin / rh */}
          {isAdminOrRh && (
            <>
              <div className="pt-3 pb-1 px-4"><span className="text-xs text-violet-400 uppercase tracking-wider">Gestion</span></div>
              {adminLinks.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-white/20 text-white shadow-lg' : 'text-violet-200 hover:bg-white/10 hover:text-white'}`}>
                  <Icon className="w-5 h-5" />{label}
                </NavLink>
              ))}
            </>
          )}

          {/* Menu admin seulement */}
          {isAdmin && (
            <>
              <div className="pt-3 pb-1 px-4"><span className="text-xs text-violet-400 uppercase tracking-wider">Administration</span></div>
              {settingsLinks.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-white/20 text-white shadow-lg' : 'text-violet-200 hover:bg-white/10 hover:text-white'}`}>
                  <Icon className="w-5 h-5" />{label}
                </NavLink>
              ))}
            </>
          )}

          {/* Exports pour admin / rh */}
          {isAdminOrRh && (
            <>
              <div className="pt-3 pb-1 px-4"><span className="text-xs text-violet-400 uppercase tracking-wider">Exports</span></div>
              <button onClick={() => handleExport('excel-global', 'heures_globales.xlsx')} disabled={exporting}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-violet-200 hover:bg-white/10 hover:text-white transition-all w-full disabled:opacity-50">
                <Download className="w-5 h-5" />{exporting ? 'Export...' : 'Global Excel'}
              </button>
              <button onClick={() => handleExport('excel-compta', 'etat_comptabilite.xlsx')} disabled={exporting}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-violet-200 hover:bg-white/10 hover:text-white transition-all w-full disabled:opacity-50">
                <Download className="w-5 h-5" />Comptabilite Excel
              </button>
              <button onClick={() => handleExport('pdf-compta', 'etat_comptabilite.pdf')} disabled={exporting}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-violet-200 hover:bg-white/10 hover:text-white transition-all w-full disabled:opacity-50">
                <Download className="w-5 h-5" />Comptabilite PDF
              </button>
            </>
          )}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-violet-700">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold">{user?.nom?.[0] || 'A'}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.nom || 'Admin'}</p>
              <p className="text-violet-300 text-xs truncate">{user?.role || 'Administrateur'}</p>
            </div>
            <button onClick={logout} className="text-violet-300 hover:text-white"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 lg:ml-64">
        <header className="bg-white shadow-sm border-b border-gray-100 px-6 py-4 flex items-center gap-4">
          <button className="lg:hidden text-gray-600" onClick={() => setSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
          <h1 className="text-xl font-semibold text-gray-800">Gestion des Heures</h1>
        </header>
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  );
}