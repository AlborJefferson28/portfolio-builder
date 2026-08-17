import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, BarChart3, LayoutTemplate, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', enabled: true },
  { key: 'portfolios', label: 'Portfolios', icon: FolderKanban, enabled: false },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, to: '/analytics', enabled: true },
  { key: 'templates', label: 'Templates', icon: LayoutTemplate, enabled: false },
  { key: 'settings', label: 'Settings', icon: Settings, enabled: false },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <nav className="adm-sidebar" aria-label="Navegación principal">
      <div className="adm-brand adm-sidebar-brand"><span className="adm-brand-mark">$</span> portfolio-builder</div>
      <ul className="adm-sidebar-list">
        {NAV_ITEMS.map(({ key, label, icon: Icon, to, enabled }) => (
          <li key={key}>
            {enabled ? (
              <Link to={to} className={`adm-sidebar-link${location.pathname.startsWith(to) ? ' is-active' : ''}`}>
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
