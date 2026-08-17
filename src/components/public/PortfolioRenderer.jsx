import { useEffect, useMemo } from 'react';
import { SECTION_COMPONENTS } from './sectionComponents.js';
import { resolveDesign } from '../../utils/resolveDesign.js';
import { ensureGoogleFonts } from '../../utils/loadGoogleFonts.js';

export default function PortfolioRenderer({ sections, theme, design, onTrack }) {
  const active = sections.filter((s) => s.enabled);
  const { style, fontFamilies, templateId } = useMemo(() => resolveDesign(design, theme), [design, theme]);
  const fontFamiliesKey = fontFamilies.join(',');

  useEffect(() => {
    ensureGoogleFonts(fontFamilies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontFamiliesKey]);

  return (
    <div className="pf-scope" data-theme={theme} data-template={templateId} style={style}>
      <div className="pf-page">
        {active.length === 0 && (
          <div className="pf-section" style={{ textAlign: 'center', color: 'var(--p-muted)' }}>
            <p>Activa al menos una sección para ver tu portfolio aquí.</p>
          </div>
        )}
        {active.map((section) => {
          const variants = SECTION_COMPONENTS[section.type];
          const Comp = variants ? (variants[section.variant] || Object.values(variants)[0]) : null;
          return Comp ? <Comp key={section.id} content={section.content} onTrack={onTrack} /> : null;
        })}
        <footer className="pf-colophon">
          <p>Tipografía: Fraunces · Inter · JetBrains Mono</p>
        </footer>
      </div>
    </div>
  );
}
