import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/admin/ThemeToggle.jsx';
import AppSidebar from '../components/admin/AppSidebar.jsx';

export default function AnalyticsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, title, slug')
        .eq('user_id', user.id)
        .eq('published', true)
        .order('updated_at', { ascending: false });
      if (!cancelled && !error) setPortfolios(data);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  return (
    <div className="dash-shell adm-shell">
      <AppSidebar />
      <div className="dash-content">
        <header className="dash-topbar">
          <ThemeToggle />
        </header>
        <main className="dash-main">
          <div className="dash-main-head">
            <div>
              <h1 className="adm-panel-title">Analytics</h1>
              <p className="adm-panel-desc">Elige qué portfolio quieres ver.</p>
            </div>
          </div>

          {loading && <p className="adm-empty">Cargando…</p>}
          {!loading && portfolios.length === 0 && (
            <p className="adm-empty" style={{ marginTop: 20 }}>Todavía no tienes portfolios publicados. Publica uno desde el Dashboard para ver sus métricas aquí.</p>
          )}

          <div className="dash-grid">
            {portfolios.map((p) => (
              <button
                key={p.id}
                type="button"
                className="dash-card an-picker-card"
                onClick={() => navigate(`/analytics/${p.id}`)}
              >
                <h3 className="dash-card-title">{p.title}</h3>
                <span className="dash-card-meta">/p/{p.slug}</span>
                <span className="an-picker-cta"><BarChart2 size={14} /> Ver analytics</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
