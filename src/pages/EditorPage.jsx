import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layers, FileText, Palette, Eye, ExternalLink, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import SectionsTab from '../components/admin/SectionsTab.jsx';
import ContentTab from '../components/admin/ContentTab.jsx';
import DesignTab from '../components/admin/DesignTab.jsx';
import PreviewTab from '../components/admin/PreviewTab.jsx';
import PublishModal from '../components/admin/PublishModal.jsx';
import { slugify } from '../utils/slugify.js';

export default function EditorPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [portfolio, setPortfolio] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [tab, setTab] = useState('sections');
  const [viewport, setViewport] = useState('desktop');
  const [modalOpen, setModalOpen] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const skippedInitialSave = useRef(false);
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('portfolios').select('*').eq('id', id).single();
      if (cancelled) return;
      if (error || !data || data.user_id !== user.id) {
        setLoadState('notfound');
      } else {
        setPortfolio(data);
        setLoadState('ready');
      }
    })();
    return () => { cancelled = true; };
  }, [id, user.id]);

  // Runs its cleanup exactly once, at unmount, before the autosave effect's
  // own cleanup — so the autosave effect can tell "we're navigating away"
  // apart from "a normal debounce restart".
  useEffect(() => {
    isUnmountingRef.current = false;
    return () => { isUnmountingRef.current = true; };
  }, []);

  useEffect(() => {
    if (loadState !== 'ready') return undefined;
    if (!skippedInitialSave.current) {
      skippedInitialSave.current = true;
      return undefined;
    }
    setSaveState('saving');
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .update({ sections: portfolio.sections, theme: portfolio.theme, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      setSaveState(!error && data && data.length > 0 ? 'saved' : 'idle');
    }, 600);
    return () => {
      clearTimeout(t);
      if (isUnmountingRef.current) {
        // Best-effort save of pending edits on navigation away; fire-and-forget.
        supabase
          .from('portfolios')
          .update({ sections: portfolio.sections, theme: portfolio.theme, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('id')
          .then(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio && portfolio.sections, portfolio && portfolio.theme]);

  const updateSectionContent = useCallback((sectionId, content) => {
    setPortfolio((p) => ({ ...p, sections: p.sections.map((s) => (s.id === sectionId ? { ...s, content } : s)) }));
  }, []);
  const toggleSection = useCallback((sectionId, enabled) => {
    setPortfolio((p) => ({ ...p, sections: p.sections.map((s) => (s.id === sectionId ? { ...s, enabled } : s)) }));
  }, []);
  const moveSection = useCallback((index, dir) => {
    setPortfolio((p) => {
      const next = [...p.sections];
      const target = index + dir;
      if (target < 0 || target >= next.length) return p;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...p, sections: next };
    });
  }, []);
  const setVariant = useCallback((sectionId, variant) => {
    setPortfolio((p) => ({ ...p, sections: p.sections.map((s) => (s.id === sectionId ? { ...s, variant } : s)) }));
  }, []);
  const setTheme = useCallback((theme) => setPortfolio((p) => ({ ...p, theme })), []);

  const handlePublish = async (slug) => {
    const { data, error } = await supabase
      .from('portfolios')
      .update({ slug, published: true, published_at: new Date().toISOString() })
      .eq('id', id)
      .select('id');
    if (error || !data || data.length === 0) return false;
    setPortfolio((p) => ({ ...p, slug, published: true }));
    return true;
  };

  if (loadState === 'loading') return <div className="adm-loading-screen">Cargando…</div>;
  if (loadState === 'notfound') {
    return (
      <div className="adm-loading-screen" style={{ flexDirection: 'column', gap: 12 }}>
        <p>No encontramos este portfolio.</p>
        <Link className="adm-btn-primary" to="/dashboard">Volver al panel</Link>
      </div>
    );
  }

  const heroSection = portfolio.sections.find((s) => s.type === 'hero');
  const defaultSlug = slugify(heroSection && heroSection.content ? heroSection.content.name : 'mi-portfolio');

  return (
    <div className="adm-shell">
      <header className="adm-header">
        <Link to="/dashboard" className="adm-btn-ghost" aria-label="Volver al panel"><ArrowLeft size={14} /></Link>
        <div className="adm-brand"><span className="adm-brand-mark">$</span> {portfolio.title}</div>
        <nav className="adm-tabs">
          <button className={tab === 'sections' ? 'is-active' : ''} onClick={() => setTab('sections')}><Layers size={14} /> Secciones</button>
          <button className={tab === 'content' ? 'is-active' : ''} onClick={() => setTab('content')}><FileText size={14} /> Contenido</button>
          <button className={tab === 'design' ? 'is-active' : ''} onClick={() => setTab('design')}><Palette size={14} /> Diseño</button>
          <button className={tab === 'preview' ? 'is-active' : ''} onClick={() => setTab('preview')}><Eye size={14} /> Vista previa</button>
        </nav>
        <div className="adm-header-actions">
          <span className="adm-save-indicator">
            {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? 'Guardado' : ''}
          </span>
          {portfolio.published && (
            <a className="adm-btn-ghost" href={`/p/${portfolio.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Ver publicado
            </a>
          )}
          <button className="adm-btn-primary" onClick={() => setModalOpen(true)}>Publicar</button>
        </div>
      </header>

      <main className="adm-main">
        {tab === 'sections' && <SectionsTab sections={portfolio.sections} onToggle={toggleSection} onMove={moveSection} />}
        {tab === 'content' && <ContentTab sections={portfolio.sections} onUpdateContent={updateSectionContent} />}
        {tab === 'design' && <DesignTab sections={portfolio.sections} theme={portfolio.theme} onVariantChange={setVariant} onThemeChange={setTheme} />}
        {tab === 'preview' && (
          <PreviewTab sections={portfolio.sections} theme={portfolio.theme} viewport={viewport} onViewportChange={setViewport} />
        )}
      </main>

      <PublishModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultSlug={portfolio.slug || defaultSlug}
        publishedSlug={portfolio.published ? portfolio.slug : null}
        onConfirm={handlePublish}
      />
    </div>
  );
}
