import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, ArrowLeft, Mail, Lock, Eye, EyeOff, CheckCircle, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Écran : login, forgot, reset
  const [screen, setScreen] = useState('login');

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Reset password (via token)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      // L'erreur est déjà gérée dans AuthContext avec toast
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess(true);
      toast.success('Demande envoyee avec succes');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }
    setResetLoading(true);
    try {
      await api.post('/auth/reset-password', { token: '', newPassword });
      toast.success('Mot de passe reinitialise ! Connectez-vous.');
      setScreen('login');
      setEmail('');
      setPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-violet-700 to-fuchsia-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ===== HEADER COMMUN ===== */}
        <div className="flex items-center justify-center gap-3 p-8 pb-0">
          <GraduationCap className="w-10 h-10 text-violet-600" />
          <h1 className="text-2xl font-bold text-gray-800">GestHeures</h1>
        </div>

        {/* ===== ÉCRAN CONNEXION ===== */}
        {screen === 'login' && (
          <div className="p-8">
            <h2 className="text-center text-gray-500 mb-6">Connectez-vous a votre compte</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@university.com"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    required
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-fuchsia-600 transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            {/* Lien mot de passe oublié */}
            <div className="mt-4 text-center">
              <button
                onClick={() => { setScreen('forgot'); setEmail(email); }}
                className="text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors"
              >
                Mot de passe oublie ?
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              Application de gestion des heures des enseignants
            </p>
          </div>
        )}

        {/* ===== ÉCRAN MOT DE PASSE OUBLIÉ ===== */}
        {screen === 'forgot' && !forgotSuccess && (
          <div className="p-8">
            <h2 className="text-center text-gray-500 mb-2">Mot de passe oublie</h2>
            <p className="text-center text-sm text-gray-400 mb-6">
              Entrez votre adresse email pour demander une reinitialisation
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="votre.email@university.com"
                    required
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-fuchsia-600 transition-all shadow-lg disabled:opacity-50"
              >
                {forgotLoading ? 'Envoi en cours...' : 'Envoyer la demande'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setScreen('login')}
                className="text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" /> Retour a la connexion
              </button>
            </div>
          </div>
        )}

        {/* ===== ÉCRAN DEMANDE ENVOYÉE ===== */}
        {screen === 'forgot' && forgotSuccess && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Demande envoyee</h2>
            <p className="text-sm text-gray-500 mb-6">
              Votre demande a ete enregistree. Veuillez contacter l&apos;administrateur pour obtenir votre nouveau mot de passe.
            </p>
            <button
              onClick={() => { setScreen('login'); setForgotSuccess(false); setForgotEmail(''); }}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-fuchsia-600 transition-all shadow-lg"
            >
              Retour a la connexion
            </button>
          </div>
        )}

        {/* ===== ÉCRAN CHANGER MOT DE PASSE ===== */}
        {screen === 'reset' && (
          <div className="p-8">
            <h2 className="text-center text-gray-500 mb-2">Nouveau mot de passe</h2>
            <p className="text-center text-sm text-gray-400 mb-6">
              Choisissez un mot de passe securise (min. 6 caracteres)
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 caracteres"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le mot de passe"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-fuchsia-600 transition-all shadow-lg disabled:opacity-50"
              >
                {resetLoading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => setScreen('login')}
                className="text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" /> Retour a la connexion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}