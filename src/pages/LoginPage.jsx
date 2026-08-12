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
    <div className="auth-split adm-shell">
      <div className="auth-form-pane">
        <ThemeToggle className="adm-btn-ghost auth-theme-toggle" />
        <div className="auth-form-inner">
          <h1 className="auth-title">{mode === 'signin' ? 'Bienvenido de vuelta' : 'Creá tu cuenta'}</h1>
          <p className="auth-subtitle">
            {mode === 'signin' ? 'Iniciá sesión para continuar' : 'Empezá a armar tu portfolio'}
          </p>

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
            {mode === 'signin' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
            <button type="button" className="adm-link-btn" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Crear una' : 'Iniciar sesión'}
            </button>
          </p>
        </div>
      </div>

      <div className="auth-visual-pane">
        <div className="auth-portfolio-mock" aria-hidden="true">
          <div className="apm-avatar" />
          <div className="apm-line apm-line-name" />
          <div className="apm-line apm-line-tagline" />
          <div className="apm-projects">
            <div className="apm-project apm-project-1" />
            <div className="apm-project apm-project-2" />
            <div className="apm-project apm-project-3" />
          </div>
          <div className="apm-chip"><span className="apm-dot" /> Publicado</div>
        </div>
        <p className="auth-visual-eyebrow">$ tu-portfolio</p>
        <h2 className="auth-visual-title">Creá y personalizá tu portfolio público en minutos</h2>
      </div>
    </div>
  );
}
