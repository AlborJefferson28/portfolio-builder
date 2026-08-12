import { useState, useEffect } from 'react';
import { Copy, ExternalLink, X } from 'lucide-react';
import Field from './Field.jsx';

export default function PublishModal({ open, onClose, defaultSlug, publishedSlug, onConfirm }) {
  const [slug, setSlug] = useState(defaultSlug);
  const [view, setView] = useState(publishedSlug ? 'success' : 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setSlug(publishedSlug || defaultSlug);
      setView(publishedSlug ? 'success' : 'edit');
      setError(false);
    }
  }, [open, publishedSlug, defaultSlug]);

  useEffect(() => {
    if (!open) { setEntered(false); return undefined; }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const validSlug = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
  const shareUrl = `${window.location.origin}/p/${slug}`;

  const handleConfirm = async () => {
    setSaving(true);
    setError(false);
    const ok = await onConfirm(slug);
    setSaving(false);
    if (ok) setView('success'); else setError(true);
  };

  return (
    <div className={`adm-modal-overlay${entered ? ' is-entered' : ''}`} onClick={onClose}>
      <div className={`adm-modal${entered ? ' is-entered' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="adm-modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        {view === 'success' ? (
          <>
            <h2 className="adm-modal-title">Portfolio publicado</h2>
            <p className="adm-modal-desc">Comparte este link:</p>
            <div className="adm-copy-row">
              <code className="adm-code">{shareUrl}</code>
              <button type="button" className="adm-btn-ghost" onClick={() => navigator.clipboard.writeText(shareUrl)} aria-label="Copiar">
                <Copy size={14} />
              </button>
            </div>
            <div className="adm-modal-actions">
              <button type="button" className="adm-btn-primary" onClick={() => window.open(shareUrl, '_blank', 'noreferrer')}>
                <ExternalLink size={14} /> Ver portfolio publicado
              </button>
              <button type="button" className="adm-link-btn" onClick={() => setView('edit')}>Cambiar dirección</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="adm-modal-title">Publicar portfolio</h2>
            <p className="adm-modal-desc">Elige la dirección de tu portfolio. Solo minúsculas, números y guiones.</p>
            <Field label="Dirección">
              <input
                className="adm-input"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              />
            </Field>
            <p className="adm-slug-preview">.../p/{slug || '···'}</p>
            {!validSlug && slug.length > 0 && <p className="adm-error">Usa solo minúsculas, números y guiones, sin espacios.</p>}
            {error && <p className="adm-error">Esa dirección ya está en uso, o no se pudo publicar. Intenta con otra.</p>}
            <button type="button" className="adm-btn-primary" disabled={!validSlug || saving} onClick={handleConfirm}>
              {saving ? 'Publicando…' : 'Publicar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
