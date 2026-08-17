import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import PortfolioRenderer from '../components/public/PortfolioRenderer.jsx';
import { trackEvent, getDeviceType } from '../lib/tracking.js';

const SCROLL_THRESHOLDS = [25, 50, 75, 100];

export default function PublicPortfolioPage() {
  const { slug } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState('loading');
  const [portfolio, setPortfolio] = useState(null);
  const userId = user ? user.id : null;
  const trackingEnabledRef = useRef(false);
  const portfolioIdRef = useRef(null);
  const firedThresholdsRef = useRef(new Set());
  const mountedAtRef = useRef(null);

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
      trackingEnabledRef.current = !isOwnerView;
      portfolioIdRef.current = data.id;
      if (!isOwnerView) {
        try {
          const viewedKey = `pb-viewed-${data.id}`;
          if (!sessionStorage.getItem(viewedKey)) {
            trackEvent(data.id, 'view', { device_type: getDeviceType() });
            sessionStorage.setItem(viewedKey, '1');
          }
        } catch {
          trackEvent(data.id, 'view', { device_type: getDeviceType() });
        }
        mountedAtRef.current = Date.now();
      }
    })();
    return () => { cancelled = true; };
  }, [slug, userId, authLoading]);

  useEffect(() => {
    if (!portfolio) return undefined;
    const handleScroll = () => {
      if (!trackingEnabledRef.current) return;
      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      const scrolled = fullHeight <= viewportHeight
        ? 100
        : ((scrollTop + viewportHeight) / fullHeight) * 100;
      for (const threshold of SCROLL_THRESHOLDS) {
        if (scrolled >= threshold && !firedThresholdsRef.current.has(threshold)) {
          firedThresholdsRef.current.add(threshold);
          trackEvent(portfolioIdRef.current, 'scroll_depth', { value: threshold });
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [portfolio]);

  useEffect(() => {
    if (!portfolio) return undefined;
    const sendSessionEnd = () => {
      if (!trackingEnabledRef.current || !mountedAtRef.current) return;
      const seconds = Math.round((Date.now() - mountedAtRef.current) / 1000);
      trackEvent(portfolioIdRef.current, 'session_end', { value: seconds });
      mountedAtRef.current = null;
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') sendSessionEnd();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', sendSessionEnd);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', sendSessionEnd);
    };
  }, [portfolio]);

  const handleTrack = useCallback((eventType, extra) => {
    if (!trackingEnabledRef.current) return;
    trackEvent(portfolioIdRef.current, eventType, extra);
  }, []);

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
      <PortfolioRenderer sections={portfolio.sections} theme={portfolio.theme} onTrack={handleTrack} />
      {isOwner && (
        <a className="pf-edit-fab" href={`/editor/${portfolio.id}`}><Pencil size={14} /> Editar</a>
      )}
    </div>
  );
}
