import { SECTION_META } from '../../data/sectionMeta.js';

export default function DesignTab({ sections, theme, onVariantChange, onThemeChange }) {
  const withVariants = sections.filter((s) => s.enabled && Object.keys(SECTION_META[s.type].variants).length > 1);
  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">Diseño</h2>
      <div className="adm-theme-row">
        <span className="adm-field-label">Tema</span>
        <div className="adm-segmented">
          <button type="button" className={theme === 'light' ? 'is-active' : ''} onClick={() => onThemeChange('light')}>Claro</button>
          <button type="button" className={theme === 'dark' ? 'is-active' : ''} onClick={() => onThemeChange('dark')}>Oscuro</button>
        </div>
      </div>
      {withVariants.map((s) => (
        <div key={s.id} className="adm-variant-block">
          <span className="adm-field-label">{SECTION_META[s.type].label}</span>
          <div className="adm-variant-options">
            {Object.entries(SECTION_META[s.type].variants).map(([key, meta]) => (
              <button
                type="button"
                key={key}
                className={`adm-variant-card ${s.variant === key ? 'is-active' : ''}`}
                onClick={() => onVariantChange(s.id, key)}
              >
                <span className="adm-variant-card-title">{meta.label}</span>
                <span className="adm-variant-card-desc">{meta.description}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {withVariants.length === 0 && (
        <p className="adm-empty">Activa secciones con variantes de diseño (Hero, Proyectos, Habilidades o Experiencia) para verlas aquí.</p>
      )}
    </div>
  );
}
