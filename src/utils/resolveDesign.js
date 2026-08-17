import { TEMPLATES } from '../data/templates.js';

function hexToSoftRgba(hex, theme) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const alpha = theme === 'dark' ? 0.16 : 0.12;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function resolveDesign(design, theme) {
  const template = TEMPLATES[design && design.template] || TEMPLATES.editorial;
  const palette = template.palette[theme];

  const accentChoice = (design && design.accent) || { preset: 'default' };
  const accent = accentChoice.custom
    ? { accent: accentChoice.custom, accentSoft: hexToSoftRgba(accentChoice.custom, theme) }
    : (template.accentPresets[accentChoice.preset] || template.accentPresets.default)[theme];

  const fontChoice = (design && design.font) || { preset: 'default' };
  const font = fontChoice.custom || template.fontPairs[fontChoice.preset] || template.fontPairs.default;
  const mono = font.mono || 'JetBrains Mono';

  const style = {
    '--p-bg': palette.bg,
    '--p-bg-elevated': palette.bgElevated,
    '--p-text': palette.text,
    '--p-muted': palette.muted,
    '--p-border': palette.border,
    '--p-accent': accent.accent,
    '--p-accent-soft': accent.accentSoft,
    '--p-radius': template.radius,
    '--font-display': `"${font.display}", serif`,
    '--font-body': `"${font.body}", sans-serif`,
    '--font-mono': `"${mono}", monospace`,
    '--font-display-style': template.displayStyle || 'normal',
  };

  const fontFamilies = Array.from(new Set([font.display, font.body, mono]));

  return { style, fontFamilies, templateId: template.id };
}
