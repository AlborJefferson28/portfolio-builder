import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getInitialData } from '../data/initialData.js';
import { TEMPLATES } from '../data/templates.js';
import { applyTemplateVariants } from '../utils/applyTemplateVariants.js';
import ThemeToggle from '../components/admin/ThemeToggle.jsx';
import AppSidebar from '../components/admin/AppSidebar.jsx';
import TemplateDetailPanel from '../components/admin/TemplateDetailPanel.jsx';

const TEMPLATE_IDS = Object.keys(TEMPLATES);

function TemplateCard({ template, onOpen }) {
  const palette = template.palette.light;
  const accent = template.accentPresets.default.light;
  const font = template.fontPairs.default;
  return (
    <button type="button" className="adm-tpl-card" onClick={() => onOpen(template.id)}>
      <div className="adm-tpl-card-preview" style={{ background: palette.bg, borderRadius: template.radius }}>
        <span
          className="adm-tpl-card-preview-name"
          style={{ fontFamily: `"${font.display}", serif`, fontStyle: template.displayStyle || 'normal', color: palette.text }}
        >
          Ana Torres
        </span>
        <span
          className="adm-tpl-card-preview-role"
          style={{ fontFamily: `"${font.mono || 'JetBrains Mono'}", monospace`, color: accent.accent }}
        >
          Product Designer
        </span>
        <div className="adm-tpl-card-overlay">
          <span className="adm-tpl-card-overlay-cta">Ver detalle</span>
        </div>
      </div>
      <div className="adm-tpl-card-meta">
        <span className="adm-tpl-card-title">{template.label}</span>
        <span className="adm-tpl-card-fonts">{font.display} + {font.body}</span>
      </div>
    </button>
  );
}

export default function TemplatesGalleryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleUseTemplate = async () => {
    if (!activeTemplateId) return;
    setCreating(true);
    setError('');
    const template = TEMPLATES[activeTemplateId];
    const initial = getInitialData();
    const sections = applyTemplateVariants(initial.sections, template);
    const { data, error: insertError } = await supabase
      .from('portfolios')
      .insert({
        user_id: user.id,
        title: 'Mi portfolio',
        theme: initial.theme,
        sections,
        design: { template: activeTemplateId, accent: { preset: 'default' }, font: { preset: 'default' } },
      })
      .select('id')
      .single();
    setCreating(false);
    if (!insertError && data) navigate(`/editor/${data.id}`);
    if (insertError) setError('No se pudo crear el portfolio.');
  };

  return (
    <div className="dash-shell adm-shell">
      <AppSidebar />
      <div className="dash-content">
        <header className="dash-topbar">
          <ThemeToggle />
        </header>
        <main className="dash-main adm-tpl-gallery-main">
          <div className="dash-main-head">
            <div>
              <h1 className="adm-panel-title">Templates</h1>
              <p className="adm-panel-desc">Una biblioteca de estilos completos. Elegí uno para ver el detalle y empezar tu portfolio con ese diseño ya aplicado.</p>
            </div>
          </div>
          {error && <p className="adm-error">{error}</p>}

          <div className="adm-tpl-grid">
            {TEMPLATE_IDS.map((id) => (
              <TemplateCard key={id} template={TEMPLATES[id]} onOpen={setActiveTemplateId} />
            ))}
          </div>
        </main>
      </div>

      <TemplateDetailPanel
        open={activeTemplateId !== null}
        templateId={activeTemplateId}
        onClose={() => setActiveTemplateId(null)}
        onUseTemplate={handleUseTemplate}
        creating={creating}
      />
    </div>
  );
}
