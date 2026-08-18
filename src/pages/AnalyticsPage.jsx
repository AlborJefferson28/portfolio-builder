import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from '../components/admin/ThemeToggle.jsx';
import AppSidebar from '../components/admin/AppSidebar.jsx';
import StatCard from '../components/admin/StatCard.jsx';
import CountryChoroplethMap from '../components/analytics/CountryChoroplethMap.jsx';

const RANGE_OPTIONS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
];

const FUNNEL_LABELS = {
  view: 'Vistas',
  scroll_50: 'Scroll 50%',
  project_click: 'Clic en proyecto',
  contact_or_cv: 'Clic en contacto/CV',
};

const PIE_COLORS = ['#D97757', '#8A8272', '#4C6E5D', '#B84C3A'];

export default function AnalyticsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [loadState, setLoadState] = useState('loading');
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [topProjects, setTopProjects] = useState([]);
  const [referrers, setReferrers] = useState([]);
  const [geo, setGeo] = useState([]);
  const [geoMap, setGeoMap] = useState([]);
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    (async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, title, slug')
        .eq('user_id', user.id)
        .eq('published', true)
        .order('updated_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        setLoadState('ready');
        return;
      }
      setPortfolios(data);
      if (id) {
        const current = data.find((p) => p.id === id);
        if (!current) {
          navigate('/analytics', { replace: true });
          return;
        }
        setPortfolioTitle(current.title);
      } else {
        setPortfolioTitle('Todos los portfolios');
      }
      setLoadState('ready');
    })();
    return () => { cancelled = true; };
  }, [id, user.id, navigate]);

  const fetchStats = useCallback(async () => {
    setError('');
    const [
      overviewRes, trendRes, funnelRes, topProjectsRes, referrersRes, geoRes, geoMapRes, devicesRes,
    ] = await Promise.all([
      supabase.rpc('get_portfolio_overview', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_daily_trend', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_funnel', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_top_projects', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_referrers', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_geo', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_geo_map', { p_portfolio_id: id || null, p_days: days }),
      supabase.rpc('get_portfolio_devices', { p_portfolio_id: id || null, p_days: days }),
    ]);
    const anyError = [overviewRes, trendRes, funnelRes, topProjectsRes, referrersRes, geoRes, devicesRes]
      .some((r) => r.error);
    if (anyError) setError('No se pudieron cargar algunas métricas.');
    setOverview((overviewRes.data && overviewRes.data[0]) || null);
    setTrend(trendRes.data || []);
    setFunnel(funnelRes.data || []);
    setTopProjects(topProjectsRes.data || []);
    setReferrers(referrersRes.data || []);
    setGeo(geoRes.data || []);
    setGeoMap(geoMapRes.error ? [] : (geoMapRes.data || []));
    setDevices(devicesRes.data || []);
  }, [id, days]);

  useEffect(() => {
    if (loadState === 'ready') fetchStats();
  }, [loadState, fetchStats]);

  if (loadState === 'loading') return <div className="adm-shell adm-loading-screen">Cargando…</div>;

  const totalViews = overview ? Number(overview.total_views) : 0;
  const isEmpty = totalViews === 0;
  const funnelMax = funnel.reduce((max, f) => Math.max(max, Number(f.sessions)), 0) || 1;
  const noPortfolios = portfolios.length === 0;

  return (
    <div className="dash-shell adm-shell">
      <AppSidebar />
      <div className="dash-content">
        <header className="dash-topbar">
          <ThemeToggle />
        </header>
        <main className="dash-main an-main">
          <div className="dash-main-head">
            <div>
              <h1 className="adm-panel-title">Analytics — {portfolioTitle}</h1>
              <p className="adm-panel-desc">Métricas de visitas de tus portfolios publicados.</p>
            </div>
            {!noPortfolios && (
              <div className="an-filters">
                <select
                  className="adm-input an-portfolio-select"
                  value={id || ''}
                  onChange={(e) => navigate(e.target.value ? `/analytics/${e.target.value}` : '/analytics')}
                >
                  <option value="">Todos los portfolios</option>
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <div className="adm-segmented">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={days === opt.value ? 'is-active' : ''}
                      onClick={() => setDays(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {error && <p className="adm-error">{error}</p>}

          {noPortfolios ? (
            <p className="adm-empty" style={{ marginTop: 20 }}>Todavía no tienes portfolios publicados. Publica uno desde el Dashboard para ver sus métricas aquí.</p>
          ) : isEmpty ? (
            <p className="adm-empty" style={{ marginTop: 20 }}>Todavía no hay datos para este rango.</p>
          ) : (
            <>
              <div className="dash-stats">
                <StatCard label="Vistas totales" value={totalViews} />
                <StatCard label="Visitantes únicos" value={overview ? Number(overview.unique_visitors) : 0} />
                <StatCard label="Tiempo promedio" value={overview && overview.avg_seconds_on_page ? `${Math.round(overview.avg_seconds_on_page)}s` : '—'} />
                <StatCard label="Clic a contacto" value={overview ? `${overview.contact_ctr}%` : '0%'} />
              </div>

              <section className="an-panel">
                <h2 className="an-panel-title">Tendencia de vistas</h2>
                <div className="pf-chart-wrap" style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="views" stroke="#D97757" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="an-panel">
                <h2 className="an-panel-title">Funnel</h2>
                <div className="an-funnel">
                  {funnel.map((f) => (
                    <div key={f.stage} className="an-funnel-row">
                      <span className="an-funnel-label">{FUNNEL_LABELS[f.stage] || f.stage}</span>
                      <div className="an-funnel-bar-track">
                        <div className="an-funnel-bar" style={{ width: `${(Number(f.sessions) / funnelMax) * 100}%` }} />
                      </div>
                      <span className="an-funnel-value">{f.sessions}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="an-grid-2">
                <div className="an-panel">
                  <h2 className="an-panel-title">Top proyectos</h2>
                  {topProjects.length === 0 ? <p className="adm-empty">Sin clics todavía.</p> : (
                    <table className="an-table">
                      <tbody>
                        {topProjects.map((p) => (
                          <tr key={p.target_label}>
                            <td>{p.target_label}</td>
                            <td className="an-table-value">{p.clicks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="an-panel">
                  <h2 className="an-panel-title">Dispositivos</h2>
                  <div className="pf-chart-wrap" style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={devices} dataKey="visits" nameKey="device_type" innerRadius={40} outerRadius={70}>
                          {devices.map((d, i) => <Cell key={d.device_type} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <section className="an-grid-2">
                <div className="an-panel">
                  <h2 className="an-panel-title">Referrers</h2>
                  {referrers.length === 0 ? <p className="adm-empty">Sin datos todavía.</p> : (
                    <ul className="an-list">
                      {referrers.map((r) => (
                        <li key={r.referrer_domain}><span>{r.referrer_domain}</span><span>{r.visits}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="an-panel">
                  <h2 className="an-panel-title">Países</h2>
                  <CountryChoroplethMap geoMap={geoMap} />
                  {geo.length === 0 ? <p className="adm-empty">Sin datos todavía.</p> : (
                    <ul className="an-list">
                      {geo.map((g) => (
                        <li key={g.country}><span>{g.country}</span><span>{g.visits}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
