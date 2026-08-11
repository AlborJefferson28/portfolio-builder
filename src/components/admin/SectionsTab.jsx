import { ChevronUp, ChevronDown } from 'lucide-react';
import Toggle from './Toggle.jsx';
import { SECTION_META } from '../../data/sectionMeta.js';

export default function SectionsTab({ sections, onToggle, onMove }) {
  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">Secciones</h2>
      <p className="adm-panel-desc">Activa las secciones que quieres mostrar y ordénalas con las flechas.</p>
      <ul className="adm-section-list">
        {sections.map((s, i) => (
          <li key={s.id} className="adm-section-row">
            <Toggle checked={s.enabled} onChange={(v) => onToggle(s.id, v)} />
            <span className="adm-section-name">{SECTION_META[s.type].label}</span>
            <div className="adm-reorder">
              <button type="button" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label="Mover arriba">
                <ChevronUp size={16} />
              </button>
              <button type="button" disabled={i === sections.length - 1} onClick={() => onMove(i, 1)} aria-label="Mover abajo">
                <ChevronDown size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
