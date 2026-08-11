import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, ExternalLink, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getInitialData } from '../data/initialData.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, title, slug, published, updated_at')
        .order('updated_at', { ascending: false });
      if (!cancelled && !error) setPortfolios(data);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    setCreating(true);
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
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('portfolios').delete().eq('id', id);
    if (!error) setPortfolios((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="dash-shell">
      <header className="dash-header">
        <div className="adm-brand"><span className="adm-brand-mark">$</span> portfolio-builder</div>
        <button type="button" className="adm-btn-ghost" onClick={handleSignOut}>
          <LogOut size={14} /> Cerrar sesión
        </button>
      </header>
      <main className="dash-main">
        <h1 className="adm-panel-title">Tus portfolios</h1>
        <p className="adm-panel-desc">Crea, edita o publica tus portfolios.</p>
        <button type="button" className="adm-btn-primary" onClick={handleCreate} disabled={creating}>
          <Plus size={14} /> {creating ? 'Creando…' : 'Nuevo portfolio'}
        </button>

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
                <button type="button" className="adm-btn-ghost" onClick={() => navigate(`/editor/${p.id}`)}>
                  <Pencil size={14} /> Editar
                </button>
                {p.published && (
                  <a className="adm-btn-ghost" href={`/p/${p.slug}`} target="_blank" rel="noreferrer">
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
  );
}
