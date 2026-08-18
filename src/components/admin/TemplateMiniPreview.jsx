export default function TemplateMiniPreview({ template, theme }) {
  const palette = template.palette[theme];
  const accent = template.accentPresets.default[theme];
  const font = template.fontPairs.default;
  return (
    <div className="adm-template-preview" style={{ background: palette.bg, borderRadius: template.radius }}>
      <span
        className="adm-template-preview-name"
        style={{ fontFamily: `"${font.display}", serif`, fontStyle: template.displayStyle || 'normal', color: palette.text }}
      >
        Ana Torres
      </span>
      <span
        className="adm-template-preview-role"
        style={{ fontFamily: `"${font.mono || 'JetBrains Mono'}", monospace`, color: accent.accent }}
      >
        Product Designer
      </span>
    </div>
  );
}
