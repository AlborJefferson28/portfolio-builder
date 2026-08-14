import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import Toggle from './Toggle.jsx';
import ContentForm from './ContentForm.jsx';
import { SECTION_META } from '../../data/sectionMeta.js';

export default function SectionsContentTab({ sections, onToggle, onMove, onUpdateContent }) {
  const [expandedIds, setExpandedIds] = useState(
    () => new Set(sections.filter((s) => s.enabled).map((s) => s.id)),
  );

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleSection = (id, enabled) => {
    onToggle(id, enabled);
    if (!enabled) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">Secciones</h2>
      <p className="adm-panel-desc">Activa, ordena y edita el contenido de cada sección.</p>
      <div className="adm-section-list">
        {sections.map((s, i) => {
          const expanded = expandedIds.has(s.id);
          return (
            <div key={s.id} className="adm-section-block">
              <div className="adm-section-row">
                <div className="adm-reorder">
                  <button type="button" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label="Mover arriba">
                    <ChevronUp size={16} />
                  </button>
                  <button type="button" disabled={i === sections.length - 1} onClick={() => onMove(i, 1)} aria-label="Mover abajo">
                    <ChevronDown size={16} />
                  </button>
                </div>
                <Toggle checked={s.enabled} onChange={(v) => handleToggleSection(s.id, v)} />
                <span className="adm-section-name">{SECTION_META[s.type].label}</span>
                <button
                  type="button"
                  className="adm-section-expand-btn"
                  onClick={() => toggleExpanded(s.id)}
                  aria-label={expanded ? 'Colapsar sección' : 'Expandir sección'}
                  aria-expanded={expanded}
                >
                  <ChevronRight size={16} className={expanded ? 'is-expanded' : ''} />
                </button>
              </div>
              {expanded && (
                <div className="adm-section-block-body">
                  <ContentForm section={s} onChange={(next) => onUpdateContent(s.id, next)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
