import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/admin/ThemeToggle.jsx';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const action = mode === 'signin'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error: authError } = await action;
    setSubmitting(false);
    if (authError) setError(authError.message);
  };

  const handleGoogle = async () => {
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (authError) setError(authError.message);
  };

  return (
    <div className="auth-shell adm-shell">
      <div className="auth-card">
        <ThemeToggle className="adm-btn-ghost auth-theme-toggle" />
        <h1 className="auth-title">$ portfolio-builder</h1>
        <p className="auth-subtitle">{mode === 'signin' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}</p>

        <button type="button" className="auth-btn-google" onClick={handleGoogle}>
          Continuar con Google
        </button>

        <div className="auth-divider">o con email</div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="adm-field">
            <span className="adm-field-label">Email</span>
            <input className="adm-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="adm-field">
            <span className="adm-field-label">Contraseña</span>
            <input className="adm-input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="adm-error">{error}</p>}
          <button type="submit" className="adm-btn-primary" disabled={submitting}>
            {submitting ? 'Un momento…' : mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'signin' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button type="button" className="adm-link-btn" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Crear una' : 'Iniciar sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}
