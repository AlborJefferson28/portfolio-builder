import { useState } from 'react';
import { TEMPLATES } from '../../data/templates.js';
import { CUSTOM_FONTS } from '../../data/customFonts.js';
import TemplateSwitchModal from './TemplateSwitchModal.jsx';

const TEMPLATE_IDS = Object.keys(TEMPLATES);
const DEFAULT_CUSTOM_COLOR = '#D97757';

function TemplateMiniPreview({ template, theme }) {
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

export default function TemplatesTab({ design, theme, onApplyTemplate, onAccentChange, onFontChange }) {
  const [pendingTemplateId, setPendingTemplateId] = useState(null);
  const [customColorValue, setCustomColorValue] = useState(DEFAULT_CUSTOM_COLOR);
  const [customFontDisplay, setCustomFontDisplay] = useState(CUSTOM_FONTS[0]);
  const [customFontBody, setCustomFontBody] = useState(CUSTOM_FONTS[0]);

  const currentTemplateId = design.template;
  const currentTemplate = TEMPLATES[currentTemplateId];
  const isCustomAccent = Boolean(design.accent && design.accent.custom);
  const isCustomFont = Boolean(design.font && design.font.custom);

  const handleCardClick = (id) => {
    if (id === currentTemplateId) return;
    setPendingTemplateId(id);
  };

  const confirmSwitch = () => {
    onApplyTemplate(pendingTemplateId);
    setPendingTemplateId(null);
  };

  return (
    <div className="adm-panel">
      <h2 className="adm-panel-title">Plantillas</h2>
      <p className="adm-panel-desc">Elige un estilo completo para tu portfolio: paleta, tipografía y layout por defecto.</p>

      <div className="adm-template-grid">
        {TEMPLATE_IDS.map((id) => {
          const template = TEMPLATES[id];
          const isActive = id === currentTemplateId;
          return (
            <button
              type="button"
              key={id}
              className={`adm-template-card ${isActive ? 'is-active' : ''}`}
              onClick={() => handleCardClick(id)}
            >
              <TemplateMiniPreview template={template} theme={theme} />
              <span className="adm-template-card-title">{template.label}</span>
              <span className="adm-template-card-desc">{template.description}</span>
              {isActive && <span className="adm-template-card-badge">Activa</span>}
            </button>
          );
        })}
      </div>

      <div className="adm-variant-block">
        <span className="adm-field-label">Acento</span>
        <div className="adm-swatch-row">
          {Object.entries(currentTemplate.accentPresets).map(([key, preset]) => (
            <button
              type="button"
              key={key}
              className={`adm-swatch ${!isCustomAccent && design.accent.preset === key ? 'is-active' : ''}`}
              style={{ background: preset[theme].accent }}
              title={preset.label}
              aria-label={preset.label}
              onClick={() => onAccentChange({ preset: key })}
            />
          ))}
          <button
            type="button"
            className={`adm-swatch adm-swatch-custom ${isCustomAccent ? 'is-active' : ''}`}
            onClick={() => onAccentChange({ custom: customColorValue })}
            title="Personalizado"
            aria-label="Personalizado"
          >
            +
          </button>
          {isCustomAccent && (
            <input
              type="color"
              className="adm-swatch-color-input"
              value={design.accent.custom}
              onChange={(e) => {
                setCustomColorValue(e.target.value);
                onAccentChange({ custom: e.target.value });
              }}
            />
          )}
        </div>
      </div>

      <div className="adm-variant-block">
        <span className="adm-field-label">Fuente</span>
        <div className="adm-variant-options">
          {Object.entries(currentTemplate.fontPairs).map(([key, pair]) => (
            <button
              type="button"
              key={key}
              className={`adm-variant-card ${!isCustomFont && design.font.preset === key ? 'is-active' : ''}`}
              onClick={() => onFontChange({ preset: key })}
            >
              <span className="adm-variant-card-title" style={{ fontFamily: `"${pair.display}", serif` }}>{pair.label}</span>
              <span className="adm-variant-card-desc">{pair.display} + {pair.body}</span>
            </button>
          ))}
          <button
            type="button"
            className={`adm-variant-card ${isCustomFont ? 'is-active' : ''}`}
            onClick={() => onFontChange({ custom: { display: customFontDisplay, body: customFontBody } })}
          >
            <span className="adm-variant-card-title">Personalizado</span>
            <span className="adm-variant-card-desc">Elige título y cuerpo</span>
          </button>
        </div>
        {isCustomFont && (
          <div className="adm-custom-font-row">
            <label className="adm-field">
              <span className="adm-field-label">Título</span>
              <select
                className="adm-input"
                value={design.font.custom.display}
                onChange={(e) => {
                  setCustomFontDisplay(e.target.value);
                  onFontChange({ custom: { display: e.target.value, body: design.font.custom.body } });
                }}
              >
                {CUSTOM_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className="adm-field">
              <span className="adm-field-label">Cuerpo</span>
              <select
                className="adm-input"
                value={design.font.custom.body}
                onChange={(e) => {
                  setCustomFontBody(e.target.value);
                  onFontChange({ custom: { display: design.font.custom.display, body: e.target.value } });
                }}
              >
                {CUSTOM_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      <TemplateSwitchModal
        open={pendingTemplateId !== null}
        templateLabel={pendingTemplateId ? TEMPLATES[pendingTemplateId].label : ''}
        onConfirm={confirmSwitch}
        onCancel={() => setPendingTemplateId(null)}
      />
    </div>
  );
}
