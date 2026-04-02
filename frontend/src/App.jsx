import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Enseignants from './pages/Enseignants.jsx';
import Matieres from './pages/Matieres.jsx';
import Heures from './pages/Heures.jsx';
import Layout from './components/Layout.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="enseignants" element={<Enseignants />} />
        <Route path="matieres" element={<Matieres />} />
        <Route path="heures" element={<Heures />} />
      </Route>
    </Routes>
  );
}

export default App;