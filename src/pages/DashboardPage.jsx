import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, ExternalLink, LogOut, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getInitialData } from '../data/initialData.js';
import ThemeToggle from '../components/admin/ThemeToggle.jsx';
import AppSidebar from '../components/admin/AppSidebar.jsx';
import StatCard from '../components/admin/StatCard.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      setError('');
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, title, slug, published, updated_at, views')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (!cancelled && !error) setPortfolios(data);
      if (!cancelled && error) setError('No se pudo cargar tus portfolios.');
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    const initial = getInitialData();
    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        user_id: user.id,
        title: 'Mi portfolio',
        theme: initial.theme,
        sections: initial.sections,
      })
      .select('id')
      .single();
    setCreating(false);
    if (!error && data) navigate(`/editor/${data.id}`);
    if (error) setError('No se pudo crear el portfolio.');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este portfolio? Esta acción no se puede deshacer.')) return;
    setError('');
    const { data, error } = await supabase.from('portfolios').delete().eq('id', id).select('id');
    if (!error && data && data.length > 0) setPortfolios((prev) => prev.filter((p) => p.id !== id));
    if (error || !data || data.length === 0) setError('No se pudo eliminar el portfolio.');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const totalViews = portfolios.reduce((sum, p) => sum + (p.views || 0), 0);

  return (
    <div className="dash-shell adm-shell">
      <AppSidebar />
      <div className="dash-content">
        <header className="dash-topbar">
          <ThemeToggle />
          <button type="button" className="adm-btn-ghost" onClick={handleSignOut}>
            <LogOut size={14} /> Cerrar sesión
          </button>
        </header>
        <main className="dash-main">
          <div className="dash-main-head">
            <div>
              <h1 className="adm-panel-title">Tus portfolios</h1>
              <p className="adm-panel-desc">Crea, edita o publica tus portfolios.</p>
            </div>
            <button type="button" className="adm-btn-primary" onClick={handleCreate} disabled={creating}>
              <Plus size={14} /> {creating ? 'Creando…' : 'Nuevo portfolio'}
            </button>
          </div>
          {error && <p className="adm-error">{error}</p>}

          <div className="dash-stats">
            <StatCard label="Portfolios activos" value={portfolios.length} />
            <StatCard
              label="Vistas totales (histórico)"
              value={totalViews}
              hint="Antes de activar analytics por portfolio"
            />
          </div>

          {loading && <p className="adm-empty">Cargando…</p>}
          {!loading && portfolios.length === 0 && (
            <p className="adm-empty" style={{ marginTop: 20 }}>Todavía no tienes portfolios. Crea el primero arriba.</p>
          )}

          <div className="dash-grid">
            {portfolios.map((p) => (
              <div key={p.id} className="dash-card">
                <h3 className="dash-card-title">{p.title}</h3>
                <span className="dash-card-meta">
                  {p.published ? `Publicado · /p/${p.slug}` : 'Sin publicar'}
                </span>
                <div className="dash-card-actions">
                  <button type="button" className="adm-btn-ghost" onClick={() => navigate(`/editor/${p.id}`)} aria-label="Editar">
                    <Pencil size={14} />
                  </button>
                  {p.published && (
                    <button type="button" className="adm-btn-ghost" onClick={() => navigate(`/analytics/${p.id}`)} aria-label="Analytics">
                      <BarChart2 size={14} />
                    </button>
                  )}
                  {p.published && (
                    <a className="adm-btn-ghost" href={`/p/${p.slug}`} target="_blank" rel="noreferrer" aria-label="Ver publicado">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button type="button" className="adm-btn-ghost" onClick={() => handleDelete(p.id)} aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
