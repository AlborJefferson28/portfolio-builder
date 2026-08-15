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
  const [showPassword, setShowPassword] = useState(false);

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
              <div className="auth-password-wrapper">
                <input className="adm-input" type={showPassword ? 'text' : 'password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  )}
                </button>
              </div>
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
        <div className="apm-mock-group">
          <div className="auth-portfolio-mock" aria-hidden="true">
            <div className="apm-scene apm-scene-sections">
              <div className="apm-srow"><span className="apm-spill is-on" /><span className="apm-line apm-sline" /></div>
              <div className="apm-srow"><span className="apm-spill is-on" /><span className="apm-line apm-sline" /></div>
              <div className="apm-srow"><span className="apm-spill apm-spill-3" /><span className="apm-line apm-sline" /></div>
              <div className="apm-srow"><span className="apm-spill apm-spill-4" /><span className="apm-line apm-sline" /></div>
            </div>
            <div className="apm-scene apm-scene-content">
              <div className="apm-crow">
                <span className="apm-line apm-cline-label" />
                <span className="apm-cinput apm-cinput-1" />
              </div>
              <div className="apm-crow">
                <span className="apm-line apm-cline-label" />
                <span className="apm-cinput apm-cinput-2" />
              </div>
            </div>
            <div className="apm-scene apm-scene-design">
              <div className="apm-swatches">
                <span className="apm-swatch apm-swatch-1" />
                <span className="apm-swatch apm-swatch-2" />
                <span className="apm-swatch apm-swatch-3" />
              </div>
              <span className="apm-line apm-dline" />
            </div>
            <div className="apm-scene apm-scene-preview">
              <div className="apm-device">
                <span className="apm-device-hero" />
                <span className="apm-device-card apm-device-card-1" />
                <span className="apm-device-card apm-device-card-2" />
              </div>
            </div>
            <div className="apm-scene apm-scene-publish">
              <div className="apm-chip"><span className="apm-dot" /> Publicado</div>
            </div>
          </div>
          <div className="apm-dots" aria-hidden="true">
            <span className="apm-dot-indicator apm-dot-indicator-1" />
            <span className="apm-dot-indicator apm-dot-indicator-2" />
            <span className="apm-dot-indicator apm-dot-indicator-3" />
            <span className="apm-dot-indicator apm-dot-indicator-4" />
            <span className="apm-dot-indicator apm-dot-indicator-5" />
          </div>
        </div>
        <p className="auth-visual-eyebrow">$ tu-portfolio</p>
        <h2 className="auth-visual-title">Creá y personalizá tu portfolio público en minutos</h2>
      </div>
    </div>
  );
}
