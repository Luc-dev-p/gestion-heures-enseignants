import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Enseignants from './pages/Enseignants.jsx';
import Matieres from './pages/Matieres.jsx';
import Heures from './pages/Heures.jsx';
import Parametres from './pages/Parametres.jsx';
import GestionUtilisateurs from './pages/GestionUtilisateurs.jsx';
import MonEspace from './pages/MonEspace.jsx';
import Layout from './components/Layout.jsx';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/mon-espace" replace />} />
        <Route path="mon-espace" element={<MonEspace />} />
        <Route path="dashboard" element={<ProtectedRoute roles={['admin', 'rh']}><Dashboard /></ProtectedRoute>} />
        <Route path="enseignants" element={<ProtectedRoute roles={['admin', 'rh']}><Enseignants /></ProtectedRoute>} />
        <Route path="matieres" element={<ProtectedRoute roles={['admin', 'rh']}><Matieres /></ProtectedRoute>} />
        <Route path="heures" element={<ProtectedRoute roles={['admin', 'rh']}><Heures /></ProtectedRoute>} />
        <Route path="parametres" element={<ProtectedRoute roles={['admin']}><Parametres /></ProtectedRoute>} />
        <Route path="utilisateurs" element={<ProtectedRoute roles={['admin']}><GestionUtilisateurs /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default App;