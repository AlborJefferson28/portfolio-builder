import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, BarChart3, LayoutTemplate, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

const BASE_NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', enabled: true },
  { key: 'portfolios', label: 'Portfolios', icon: FolderKanban, enabled: false },
  { key: 'templates', label: 'Templates', icon: LayoutTemplate, enabled: false },
  { key: 'settings', label: 'Settings', icon: Settings, enabled: false },
];

export default function AppSidebar() {
  const { user } = useAuth();
  const [analyticsPortfolioId, setAnalyticsPortfolioId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .eq('published', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setAnalyticsPortfolioId(data ? data.id : null);
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  const navItems = [
    ...BASE_NAV_ITEMS.slice(0, 1),
    {
      key: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      to: analyticsPortfolioId ? `/analytics/${analyticsPortfolioId}` : undefined,
      enabled: Boolean(analyticsPortfolioId),
    },
    ...BASE_NAV_ITEMS.slice(1),
  ];

  return (
    <nav className="adm-sidebar" aria-label="Navegación principal">
      <div className="adm-brand adm-sidebar-brand"><span className="adm-brand-mark">$</span> portfolio-builder</div>
      <ul className="adm-sidebar-list">
        {navItems.map(({ key, label, icon: Icon, to, enabled }) => (
          <li key={key}>
            {enabled ? (
              <Link to={to} className="adm-sidebar-link is-active">
                <Icon size={16} /> {label}
              </Link>
            ) : (
              <span className="adm-sidebar-link is-disabled" aria-disabled="true">
                <Icon size={16} /> {label}
                <span className="adm-sidebar-badge">Próximamente</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
