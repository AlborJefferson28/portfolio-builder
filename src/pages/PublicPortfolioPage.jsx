import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import PortfolioRenderer from '../components/public/PortfolioRenderer.jsx';

export default function PublicPortfolioPage() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState('loading');
  const [portfolio, setPortfolio] = useState(null);
  const userId = user ? user.id : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState('loading');
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, user_id, sections, theme')
        .eq('slug', slug)
        .eq('published', true)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setState('notfound');
        return;
      }
      setPortfolio(data);
      setState('ready');
      if (authLoading) return;
      const isOwnerView = userId === data.user_id;
      const viewedKey = `pb-viewed-${data.id}`;
      if (!isOwnerView && !sessionStorage.getItem(viewedKey)) {
        const { error: viewError } = await supabase.rpc('increment_portfolio_views', { portfolio_id: data.id });
        if (viewError) {
          console.error('No se pudo registrar la vista del portfolio:', viewError);
        } else {
          sessionStorage.setItem(viewedKey, '1');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [slug, userId, authLoading]);

  if (state === 'loading') {
    return (
      <div className="pf-scope" data-theme="light">
        <div className="pf-loading-screen">
          <div className="pf-loading-mark">
            <span className="pf-loading-ring" />
            <span className="pf-loading-ring pf-loading-ring-delay" />
            <span className="pf-loading-core" />
          </div>
          <p className="pf-loading-text">Cargando portfolio</p>
        </div>
      </div>
    );
  }
  if (state === 'notfound') {
    return (
      <div className="pf-scope" data-theme="light">
        <div className="pf-status-screen">
          <p className="pf-status-title">No encontramos este portfolio</p>
          <p className="pf-status-desc">El link puede estar mal escrito, o el portfolio aún no se ha publicado.</p>
        </div>
      </div>
    );
  }

  const isOwner = user && user.id === portfolio.user_id;

  return (
    <div className="pf-public-wrap">
      <PortfolioRenderer sections={portfolio.sections} theme={portfolio.theme} />
      {isOwner && (
        <a className="pf-edit-fab" href={`/editor/${portfolio.id}`}><Pencil size={14} /> Editar</a>
      )}
    </div>
  );
}
