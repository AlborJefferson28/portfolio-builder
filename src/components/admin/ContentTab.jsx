import ContentForm from './ContentForm.jsx';
import { SECTION_META } from '../../data/sectionMeta.js';

export default function ContentTab({ sections, onUpdateContent }) {
  const active = sections.filter((s) => s.enabled);
  if (active.length === 0) {
    return <div className="adm-panel"><p className="adm-empty">Activa al menos una sección para empezar a editar su contenido.</p></div>;
  }
  return (
    <div className="adm-panel">
      {active.map((s) => (
        <div key={s.id} className="adm-content-block">
          <h3 className="adm-content-heading">{SECTION_META[s.type].label}</h3>
          <ContentForm section={s} onChange={(next) => onUpdateContent(s.id, next)} />
        </div>
      ))}
    </div>
  );
}
