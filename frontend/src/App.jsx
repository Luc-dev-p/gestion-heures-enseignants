import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AnneeProvider } from './context/AnneeContext';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Enseignants from './pages/Enseignants.jsx';
import Matieres from './pages/Matieres.jsx';
import Heures from './pages/Heures.jsx';
import Parametres from './pages/Parametres.jsx';
import GestionUtilisateurs from './pages/GestionUtilisateurs.jsx';
import MonEspace from './pages/MonEspace.jsx';
import Paiements from './pages/Paiements.jsx';
import Calendrier from './pages/Calendrier.jsx';
import Layout from './components/Layout.jsx';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

/* Redirection intelligente selon le rôle */
function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'enseignant') return <Navigate to="/mon-espace" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AnneeProvider>
            <Layout />
          </AnneeProvider>
        </ProtectedRoute>
      }>
        <Route index element={<HomeRedirect />} />
        <Route path="mon-espace" element={<ProtectedRoute roles={['enseignant']}><MonEspace /></ProtectedRoute>} />
        <Route path="dashboard" element={<ProtectedRoute roles={['admin', 'rh']}><Dashboard /></ProtectedRoute>} />
        <Route path="enseignants" element={<ProtectedRoute roles={['admin', 'rh']}><Enseignants /></ProtectedRoute>} />
        <Route path="matieres" element={<ProtectedRoute roles={['admin', 'rh']}><Matieres /></ProtectedRoute>} />
        <Route path="heures" element={<ProtectedRoute roles={['admin', 'rh']}><Heures /></ProtectedRoute>} />
        <Route path="calendrier" element={<ProtectedRoute roles={['admin', 'rh']}><Calendrier /></ProtectedRoute>} />
        <Route path="paiements" element={<ProtectedRoute roles={['admin', 'rh']}><Paiements /></ProtectedRoute>} />
        <Route path="parametres" element={<ProtectedRoute roles={['admin']}><Parametres /></ProtectedRoute>} />
        <Route path="utilisateurs" element={<ProtectedRoute roles={['admin']}><GestionUtilisateurs /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default App;