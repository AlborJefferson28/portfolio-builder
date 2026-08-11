import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import PortfolioRenderer from '../components/public/PortfolioRenderer.jsx';

export default function PublicPortfolioPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState('loading');
  const [portfolio, setPortfolio] = useState(null);

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
      } else {
        setPortfolio(data);
        setState('ready');
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="pf-scope" data-theme="light">
        <div className="pf-status-screen"><p>Cargando portfolio…</p></div>
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
