import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { TEMPLATES } from '../../data/templates.js';
import { PREVIEW_SECTIONS } from '../../data/templatePreviewContent.js';
import { applyTemplateVariants } from '../../utils/applyTemplateVariants.js';
import PortfolioRenderer from '../public/PortfolioRenderer.jsx';

export default function TemplateDetailPanel({ open, templateId, onClose, onUseTemplate, creating }) {
  const [entered, setEntered] = useState(false);

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

  if (!open || !templateId) return null;

  const template = TEMPLATES[templateId];
  const sections = applyTemplateVariants(PREVIEW_SECTIONS, template);
  const design = { template: templateId, accent: { preset: 'default' }, font: { preset: 'default' } };

  return (
    <div className={`adm-tpl-detail-overlay${entered ? ' is-entered' : ''}`} onClick={onClose}>
      <div className={`adm-tpl-detail-panel${entered ? ' is-entered' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="adm-modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        <div className="adm-tpl-detail-header">
          <span className="adm-tpl-detail-eyebrow">{template.label}</span>
          <span className="adm-tpl-detail-desc">{template.description}</span>
        </div>
        <div className="adm-tpl-detail-body">
          <PortfolioRenderer sections={sections} theme="light" design={design} />
        </div>
        <div className="adm-tpl-detail-footer">
          <button type="button" className="adm-btn-primary" disabled={creating} onClick={onUseTemplate}>
            <Sparkles size={14} /> {creating ? 'Creando…' : 'Usar esta plantilla'}
          </button>
        </div>
      </div>
    </div>
  );
}
