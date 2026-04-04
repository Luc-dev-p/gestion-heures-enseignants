import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AnneeProvider } from './context/AnneeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Enseignants from './pages/Enseignants';
import Matieres from './pages/Matieres';
import Heures from './pages/Heures';
import Paiements from './pages/Paiements';
import Calendrier from './pages/Calendrier';
import MonEspace from './pages/MonEspace';
import Parametres from './pages/Parametres';
import GestionUtilisateurs from './pages/GestionUtilisateurs';
import Sauvegardes from './pages/Sauvegardes';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AnneeProvider>
            <Layout />
          </AnneeProvider>
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="enseignants" element={<Enseignants />} />
        <Route path="matieres" element={<Matieres />} />
        <Route path="heures" element={<Heures />} />
        <Route path="calendrier" element={<Calendrier />} />
        <Route path="paiements" element={<Paiements />} />
        <Route path="mon-espace" element={<MonEspace />} />
        <Route path="parametres" element={<Parametres />} />
        <Route path="utilisateurs" element={<GestionUtilisateurs />} />
        <Route path="sauvegardes" element={<Sauvegardes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}