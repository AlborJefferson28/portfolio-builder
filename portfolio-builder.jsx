// Portfolio Builder — prototipo funcional
// - El borrador se guarda en almacenamiento privado del artifact mientras editas.
// - "Publicar" guarda una copia en almacenamiento COMPARTIDO bajo la clave portfolio:<slug>.
// - La vista pública se activa vía hash routing (#/p/<slug>): un artifact no puede
//   provisionar subdominios/DNS reales, así que esto simula esa ruta dentro del mismo artifact.

import React, { useState, useEffect } from 'react';
import {
  ChevronUp, ChevronDown, Plus, Trash2, Copy, ExternalLink,
  Layers, FileText, Palette, Eye, Monitor, Smartphone, Pencil, X,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

/* ============================== Utils ============================== */

let uidCounter = 0;
function uid() {
  uidCounter += 1;
  return `id_${uidCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(text) {
  const base = (text || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'mi-portfolio';
}

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

/* ============================ Section meta =========================== */

const SECTION_META = {
  hero: {
    label: 'Hero',
    variants: {
      centered: { label: 'Centrado', description: 'Todo alineado al centro, enfoque directo.' },
      split: { label: 'Editorial dividido', description: 'Texto a un lado, foto grande al otro.' },
    },
  },
  about: {
    label: 'Sobre mí',
    variants: {
      default: { label: 'Simple', description: 'Un bloque de texto legible.' },
    },
  },
  projects: {
    label: 'Proyectos',
    variants: {
      grid: { label: 'Grid', description: 'Tarjetas en cuadrícula, tipo galería.' },
      list: { label: 'Lista numerada', description: 'Fila por fila, con índice.' },
    },
  },
  skills: {
    label: 'Habilidades',
    variants: {
      tags: { label: 'Tags', description: 'Etiquetas agrupadas, sin niveles.' },
      bar: { label: 'Gráfico de barras', description: 'Nivel de cada habilidad en barras.' },
      radar: { label: 'Gráfico radar', description: 'Vista comparativa tipo radar.' },
    },
  },
  experience: {
    label: 'Experiencia',
    variants: {
      timeline: { label: 'Línea de tiempo', description: 'Vertical, con marcador por período.' },
      compact: { label: 'Lista compacta', description: 'Más densa, sin elementos gráficos.' },
    },
  },
  contact: {
    label: 'Contacto',
    variants: {
      default: { label: 'Simple', description: 'Email destacado + redes.' },
    },
  },
};

function getInitialData() {
  return {
    theme: 'light',
    meta: { publishedSlug: null, publishedAt: null },
    sections: [
      {
        id: 'hero', type: 'hero', enabled: true, variant: 'centered',
        content: {
          name: 'Jefferson',
          role: 'Frontend Developer',
          tagline: 'Construyo y despliego productos web de principio a fin, del diseño a producción.',
          photoUrl: '',
        },
      },
      {
        id: 'about', type: 'about', enabled: true, variant: 'default',
        content: {
          body: 'Desarrollador frontend y solo builder, basado en Colombia. Diseño, construyo y despliego mis propios proyectos de principio a fin — desde la idea hasta producción — usando React, TypeScript y Supabase como base habitual.',
        },
      },
      {
        id: 'projects', type: 'projects', enabled: true, variant: 'grid',
        content: {
          items: [
            { id: uid(), title: 'Ready MVP', description: 'Plataforma de operación comercial para pymes en Colombia.', stack: 'React, TypeScript, Supabase', url: '' },
            { id: uid(), title: 'HackSim Terminal', description: 'Simulador de hacking en el navegador con estética de terminal.', stack: 'React, TypeScript', url: '' },
            { id: uid(), title: 'Budget App', description: 'Aplicación de finanzas personales para seguimiento de gastos.', stack: 'React, Vite, Supabase', url: '' },
            { id: uid(), title: 'Football Prediction System', description: 'Sistema de predicción de resultados de fútbol con pipeline de ML.', stack: 'Python, FastAPI, React', url: '' },
          ],
        },
      },
      {
        id: 'skills', type: 'skills', enabled: true, variant: 'bar',
        content: {
          items: [
            { id: uid(), name: 'React', level: 90 },
            { id: uid(), name: 'TypeScript', level: 85 },
            { id: uid(), name: 'Supabase', level: 75 },
            { id: uid(), name: 'TailwindCSS', level: 85 },
            { id: uid(), name: 'Vite', level: 80 },
          ],
        },
      },
      {
        id: 'experience', type: 'experience', enabled: true, variant: 'timeline',
        content: {
          items: [
            { id: uid(), role: 'Frontend Developer', org: 'Tu empresa', period: '2023 — Presente', description: 'Describe aquí tu rol y tus logros principales.' },
          ],
        },
      },
      {
        id: 'contact', type: 'contact', enabled: true, variant: 'default',
        content: {
          email: 'tucorreo@ejemplo.com',
          links: [
            { id: uid(), label: 'GitHub', url: 'https://github.com/tu-usuario' },
            { id: uid(), label: 'LinkedIn', url: 'https://linkedin.com/in/tu-usuario' },
          ],
        },
      },
    ],
  };
}

/* ======================= Public section components ==================== */

function HeroCentered({ content }) {
  return (
    <section className="pf-section pf-hero pf-hero-centered">
      <p className="pf-eyebrow">// hola, soy</p>
      {content.photoUrl ? (
        <img src={content.photoUrl} alt={content.name} className="pf-hero-photo" />
      ) : (
        <div className="pf-hero-avatar" aria-hidden="true">{initials(content.name)}</div>
      )}
      <h1 className="pf-hero-name">{content.name || 'Tu nombre'}</h1>
      <p className="pf-hero-role">{content.role || 'Tu rol'}</p>
      {content.tagline && <p className="pf-hero-tagline">{content.tagline}</p>}
    </section>
  );
}

function HeroSplit({ content }) {
  return (
    <section className="pf-section pf-hero pf-hero-split">
      <div>
        <p className="pf-eyebrow">// hola, soy</p>
        <h1 className="pf-hero-name">{content.name || 'Tu nombre'}</h1>
        <p className="pf-hero-role">{content.role || 'Tu rol'}</p>
        {content.tagline && <p className="pf-hero-tagline">{content.tagline}</p>}
      </div>
      <div className="pf-hero-visual">
        {content.photoUrl ? <img src={content.photoUrl} alt={content.name} /> : initials(content.name)}
      </div>
    </section>
  );
}

function AboutBlock({ content }) {
  return (
    <section className="pf-section pf-about">
      <p className="pf-eyebrow">// sobre mí</p>
      <p className="pf-about-body">{content.body}</p>
    </section>
  );
}

function ProjectsGrid({ content }) {
  return (
    <section className="pf-section pf-projects">
      <p className="pf-eyebrow">// proyectos</p>
      <h2 className="pf-projects-heading">Proyectos</h2>
      <div className="pf-projects-grid">
        {content.items.map((p) => (
          <article key={p.id} className="pf-project-card">
            <h3 className="pf-project-title">{p.title || 'Proyecto'}</h3>
            {p.description && <p className="pf-project-desc">{p.description}</p>}
            {p.stack && (
              <div className="pf-project-stack">
                {p.stack.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                  <span key={i} className="pf-tag">{s}</span>
                ))}
              </div>
            )}
            {p.url && <a className="pf-project-link" href={p.url} target="_blank" rel="noreferrer">Ver proyecto →</a>}
          </article>
        ))}
      </div>
    </section>
  );
}

function ProjectsList({ content }) {
  return (
    <section className="pf-section pf-projects">
      <p className="pf-eyebrow">// proyectos</p>
      <h2 className="pf-projects-heading">Proyectos</h2>
      <div className="pf-projects-list">
        {content.items.map((p, i) => (
          <div key={p.id} className="pf-project-row">
            <span className="pf-project-index">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3 className="pf-project-title">{p.title || 'Proyecto'}</h3>
              {p.description && <p className="pf-project-desc">{p.description}</p>}
              {p.stack && (
                <div className="pf-project-stack">
                  {p.stack.split(',').map((s) => s.trim()).filter(Boolean).map((s, i2) => (
                    <span key={i2} className="pf-tag">{s}</span>
                  ))}
                </div>
              )}
              {p.url && <a className="pf-project-link" href={p.url} target="_blank" rel="noreferrer">Ver proyecto →</a>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SkillsTags({ content }) {
  return (
    <section className="pf-section pf-skills">
      <p className="pf-eyebrow">// habilidades</p>
      <h2 className="pf-skills-heading">Habilidades</h2>
      <div className="pf-skills-tags">
        {content.items.map((it) => <span key={it.id} className="pf-skill-tag">{it.name}</span>)}
      </div>
    </section>
  );
}

function SkillsBar({ content }) {
  return (
    <section className="pf-section pf-skills">
      <p className="pf-eyebrow">// habilidades</p>
      <h2 className="pf-skills-heading">Habilidades</h2>
      <div className="pf-chart-wrap" style={{ height: Math.max(220, content.items.length * 46) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={content.items} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 13, fill: '#8A8272', fontFamily: 'Inter, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="level" fill="#D97757" radius={[0, 6, 6, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function SkillsRadar({ content }) {
  return (
    <section className="pf-section pf-skills">
      <p className="pf-eyebrow">// habilidades</p>
      <h2 className="pf-skills-heading">Habilidades</h2>
      <div className="pf-chart-wrap" style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={content.items} outerRadius="70%">
            <PolarGrid stroke="#B5AC98" />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#8A8272', fontFamily: 'Inter, sans-serif' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="level" stroke="#D97757" fill="#D97757" fillOpacity={0.28} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ExperienceTimeline({ content }) {
  return (
    <section className="pf-section pf-experience">
      <p className="pf-eyebrow">// experiencia</p>
      <h2 className="pf-experience-heading">Experiencia</h2>
      <div className="pf-timeline">
        {content.items.map((it) => (
          <div key={it.id} className="pf-timeline-item">
            <p className="pf-timeline-period">{it.period}</p>
            <h3 className="pf-timeline-role">{it.role}{it.org ? ` · ${it.org}` : ''}</h3>
            {it.description && <p className="pf-timeline-desc">{it.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function ExperienceCompact({ content }) {
  return (
    <section className="pf-section pf-experience">
      <p className="pf-eyebrow">// experiencia</p>
      <h2 className="pf-experience-heading">Experiencia</h2>
      <div>
        {content.items.map((it) => (
          <div key={it.id} className="pf-exp-compact-item">
            <div>
              <h3 className="pf-timeline-role" style={{ marginBottom: it.description ? 4 : 0 }}>
                {it.role}{it.org ? ` · ${it.org}` : ''}
              </h3>
              {it.description && <p className="pf-timeline-desc">{it.description}</p>}
            </div>
            <p className="pf-timeline-period" style={{ whiteSpace: 'nowrap' }}>{it.period}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactBlock({ content }) {
  return (
    <section className="pf-section pf-contact">
      <p className="pf-eyebrow">// contacto</p>
      <h2 className="pf-contact-heading">Hablemos</h2>
      {content.email && <a className="pf-contact-email" href={`mailto:${content.email}`}>{content.email}</a>}
      {content.links && content.links.length > 0 && (
        <div className="pf-contact-links">
          {content.links.map((l) => (
            <a key={l.id} className="pf-contact-link" href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
          ))}
        </div>
      )}
    </section>
  );
}

const SECTION_COMPONENTS = {
  hero: { centered: HeroCentered, split: HeroSplit },
  about: { default: AboutBlock },
  projects: { grid: ProjectsGrid, list: ProjectsList },
  skills: { tags: SkillsTags, bar: SkillsBar, radar: SkillsRadar },
  experience: { timeline: ExperienceTimeline, compact: ExperienceCompact },
  contact: { default: ContactBlock },
};

function PortfolioRenderer({ sections, theme }) {
  const active = sections.filter((s) => s.enabled);
  return (
    <div className="pf-scope" data-theme={theme}>
      <div className="pf-page">
        {active.length === 0 && (
          <div className="pf-section" style={{ textAlign: 'center', color: 'var(--p-muted)' }}>
            <p>Activa al menos una sección para ver tu portfolio aquí.</p>
          </div>
        )}
        {active.map((section) => {
          const variants = SECTION_COMPONENTS[section.type];
          const Comp = variants ? (variants[section.variant] || Object.values(variants)[0]) : null;
          return Comp ? <Comp key={section.id} content={section.content} /> : null;
        })}
        <footer className="pf-colophon">
          <p>Tipografía: Fraunces · Inter · JetBrains Mono</p>
        </footer>
      </div>
    </div>
  );
}

/* ============================= Admin atoms ============================= */

function Field({ label, hint, children }) {
  return (
    <label className="adm-field">
      <span className="adm-field-label">{label}</span>
      {children}
      {hint && <span className="adm-field-hint">{hint}</span>}
    </label>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`adm-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="adm-toggle-thumb" />
    </button>
  );
}

/* =============================== Tabs =================================== */

function SectionsTab({ sections, onToggle, onMove }) {
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

function HeroForm({ content, onChange }) {
  const set = (k, v) => onChange({ ...content, [k]: v });
  return (
    <div className="adm-form-grid">
      <Field label="Nombre"><input className="adm-input" value={content.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Rol"><input className="adm-input" value={content.role} onChange={(e) => set('role', e.target.value)} /></Field>
      <Field label="Tagline" hint="Una frase corta debajo de tu nombre">
        <textarea className="adm-textarea" rows={2} value={content.tagline} onChange={(e) => set('tagline', e.target.value)} />
      </Field>
      <Field label="Foto (URL)" hint="Opcional. Si lo dejas vacío, se muestran tus iniciales.">
        <input className="adm-input" value={content.photoUrl} onChange={(e) => set('photoUrl', e.target.value)} placeholder="https://..." />
      </Field>
    </div>
  );
}

function AboutForm({ content, onChange }) {
  return (
    <div className="adm-form-grid">
      <Field label="Bio">
        <textarea className="adm-textarea" rows={5} value={content.body} onChange={(e) => onChange({ ...content, body: e.target.value })} />
      </Field>
    </div>
  );
}

function ProjectsForm({ content, onChange }) {
  const items = content.items;
  const updateItem = (id, patch) => onChange({ ...content, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const addItem = () => onChange({ ...content, items: [...items, { id: uid(), title: '', description: '', stack: '', url: '' }] });
  const removeItem = (id) => onChange({ ...content, items: items.filter((it) => it.id !== id) });
  return (
    <div className="adm-list-editor">
      {items.map((it) => (
        <div key={it.id} className="adm-list-item">
          <button type="button" className="adm-remove-btn" onClick={() => removeItem(it.id)} aria-label="Eliminar proyecto"><Trash2 size={14} /></button>
          <Field label="Título"><input className="adm-input" value={it.title} onChange={(e) => updateItem(it.id, { title: e.target.value })} /></Field>
          <Field label="Descripción"><textarea className="adm-textarea" rows={2} value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} /></Field>
          <Field label="Stack" hint="Separado por comas"><input className="adm-input" value={it.stack} onChange={(e) => updateItem(it.id, { stack: e.target.value })} /></Field>
          <Field label="Link" hint="Opcional"><input className="adm-input" value={it.url} onChange={(e) => updateItem(it.id, { url: e.target.value })} placeholder="https://..." /></Field>
        </div>
      ))}
      <button type="button" className="adm-add-btn" onClick={addItem}><Plus size={14} /> Agregar proyecto</button>
    </div>
  );
}

function SkillsForm({ content, onChange }) {
  const items = content.items;
  const updateItem = (id, patch) => onChange({ ...content, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const addItem = () => onChange({ ...content, items: [...items, { id: uid(), name: '', level: 70 }] });
  const removeItem = (id) => onChange({ ...content, items: items.filter((it) => it.id !== id) });
  return (
    <div className="adm-list-editor">
      {items.map((it) => (
        <div key={it.id} className="adm-list-item adm-list-item-row">
          <input className="adm-input" style={{ flex: 1 }} value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} placeholder="Nombre" />
          <input type="range" min="0" max="100" value={it.level} onChange={(e) => updateItem(it.id, { level: Number(e.target.value) })} className="adm-range" />
          <span className="adm-range-value">{it.level}</span>
          <button type="button" className="adm-remove-btn" onClick={() => removeItem(it.id)} aria-label="Eliminar habilidad"><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" className="adm-add-btn" onClick={addItem}><Plus size={14} /> Agregar habilidad</button>
    </div>
  );
}

function ExperienceForm({ content, onChange }) {
  const items = content.items;
  const updateItem = (id, patch) => onChange({ ...content, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const addItem = () => onChange({ ...content, items: [...items, { id: uid(), role: '', org: '', period: '', description: '' }] });
  const removeItem = (id) => onChange({ ...content, items: items.filter((it) => it.id !== id) });
  return (
    <div className="adm-list-editor">
      {items.map((it) => (
        <div key={it.id} className="adm-list-item">
          <button type="button" className="adm-remove-btn" onClick={() => removeItem(it.id)} aria-label="Eliminar experiencia"><Trash2 size={14} /></button>
          <Field label="Rol"><input className="adm-input" value={it.role} onChange={(e) => updateItem(it.id, { role: e.target.value })} /></Field>
          <Field label="Empresa"><input className="adm-input" value={it.org} onChange={(e) => updateItem(it.id, { org: e.target.value })} /></Field>
          <Field label="Período" hint="Ej. 2023 — Presente"><input className="adm-input" value={it.period} onChange={(e) => updateItem(it.id, { period: e.target.value })} /></Field>
          <Field label="Descripción"><textarea className="adm-textarea" rows={2} value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} /></Field>
        </div>
      ))}
      <button type="button" className="adm-add-btn" onClick={addItem}><Plus size={14} /> Agregar experiencia</button>
    </div>
  );
}

function ContactForm({ content, onChange }) {
  const links = content.links;
  const updateLink = (id, patch) => onChange({ ...content, links: links.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const addLink = () => onChange({ ...content, links: [...links, { id: uid(), label: '', url: '' }] });
  const removeLink = (id) => onChange({ ...content, links: links.filter((l) => l.id !== id) });
  return (
    <div className="adm-form-grid">
      <Field label="Email"><input className="adm-input" value={content.email} onChange={(e) => onChange({ ...content, email: e.target.value })} /></Field>
      <div className="adm-list-editor">
        {links.map((l) => (
          <div key={l.id} className="adm-list-item adm-list-item-row">
            <input className="adm-input" style={{ flex: 1 }} placeholder="Etiqueta" value={l.label} onChange={(e) => updateLink(l.id, { label: e.target.value })} />
            <input className="adm-input" style={{ flex: 2 }} placeholder="https://..." value={l.url} onChange={(e) => updateLink(l.id, { url: e.target.value })} />
            <button type="button" className="adm-remove-btn" onClick={() => removeLink(l.id)} aria-label="Eliminar link"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="adm-add-btn" onClick={addLink}><Plus size={14} /> Agregar red</button>
      </div>
    </div>
  );
}

function ContentForm({ section, onChange }) {
  switch (section.type) {
    case 'hero': return <HeroForm content={section.content} onChange={onChange} />;
    case 'about': return <AboutForm content={section.content} onChange={onChange} />;
    case 'projects': return <ProjectsForm content={section.content} onChange={onChange} />;
    case 'skills': return <SkillsForm content={section.content} onChange={onChange} />;
    case 'experience': return <ExperienceForm content={section.content} onChange={onChange} />;
    case 'contact': return <ContactForm content={section.content} onChange={onChange} />;
    default: return null;
  }
}

function ContentTab({ sections, onUpdateContent }) {
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

function DesignTab({ sections, theme, onVariantChange, onThemeChange }) {
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

function PreviewTab({ sections, theme, viewport, onViewportChange }) {
  return (
    <div className="adm-preview-wrap">
      <div className="adm-preview-toolbar">
        <div className="adm-segmented">
          <button type="button" className={viewport === 'desktop' ? 'is-active' : ''} onClick={() => onViewportChange('desktop')}>
            <Monitor size={14} /> Escritorio
          </button>
          <button type="button" className={viewport === 'mobile' ? 'is-active' : ''} onClick={() => onViewportChange('mobile')}>
            <Smartphone size={14} /> Móvil
          </button>
        </div>
      </div>
      <div className={`adm-preview-frame ${viewport === 'mobile' ? 'is-mobile' : ''}`}>
        <PortfolioRenderer sections={sections} theme={theme} />
      </div>
    </div>
  );
}

function PublishModal({ open, onClose, defaultSlug, publishedSlug, onConfirm }) {
  const [slug, setSlug] = useState(defaultSlug);
  const [view, setView] = useState(publishedSlug ? 'success' : 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open) {
      setSlug(publishedSlug || defaultSlug);
      setView(publishedSlug ? 'success' : 'edit');
      setError(false);
    }
  }, [open, publishedSlug, defaultSlug]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const validSlug = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
  const shareFragment = `#/p/${slug}`;

  const handleConfirm = async () => {
    setSaving(true);
    setError(false);
    const ok = await onConfirm(slug);
    setSaving(false);
    if (ok) setView('success'); else setError(true);
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="adm-modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        {view === 'success' ? (
          <>
            <h2 className="adm-modal-title">Portfolio publicado</h2>
            <p className="adm-modal-desc">Comparte tu portfolio agregando esto al final de la URL de este artifact:</p>
            <div className="adm-copy-row">
              <code className="adm-code">{shareFragment}</code>
              <button type="button" className="adm-btn-ghost" onClick={() => navigator.clipboard.writeText(shareFragment)} aria-label="Copiar">
                <Copy size={14} />
              </button>
            </div>
            <div className="adm-modal-actions">
              <button type="button" className="adm-btn-primary" onClick={() => { window.location.hash = `/p/${slug}`; }}>
                <ExternalLink size={14} /> Ver portfolio publicado
              </button>
              <button type="button" className="adm-link-btn" onClick={() => setView('edit')}>Cambiar dirección</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="adm-modal-title">Publicar portfolio</h2>
            <p className="adm-modal-desc">Elige la dirección de tu portfolio. Solo minúsculas, números y guiones.</p>
            <Field label="Dirección">
              <input
                className="adm-input"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              />
            </Field>
            <p className="adm-slug-preview">.../#/p/{slug || '···'}</p>
            {!validSlug && slug.length > 0 && <p className="adm-error">Usa solo minúsculas, números y guiones, sin espacios.</p>}
            {error && <p className="adm-error">No se pudo publicar. Intenta de nuevo.</p>}
            <button type="button" className="adm-btn-primary" disabled={!validSlug || saving} onClick={handleConfirm}>
              {saving ? 'Publicando…' : 'Publicar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================== Admin app =============================== */

function AdminApp({ onOpenPublished }) {
  const [data, setData] = useState(getInitialData);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('sections');
  const [viewport, setViewport] = useState('desktop');
  const [modalOpen, setModalOpen] = useState(false);
  const [saveState, setSaveState] = useState('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get('draft', false);
        if (!cancelled && res && res.value) setData(JSON.parse(res.value));
      } catch (e) {
        // no hay borrador todavía, se usan los datos de ejemplo
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return undefined;
    setSaveState('saving');
    const t = setTimeout(async () => {
      try {
        await window.storage.set('draft', JSON.stringify(data), false);
        setSaveState('saved');
      } catch (e) {
        setSaveState('idle');
      }
    }, 600);
    return () => clearTimeout(t);
  }, [data, loaded]);

  const updateSectionContent = (id, content) => {
    setData((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, content } : s)) }));
  };
  const toggleSection = (id, enabled) => {
    setData((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, enabled } : s)) }));
  };
  const moveSection = (index, dir) => {
    setData((d) => {
      const next = [...d.sections];
      const target = index + dir;
      if (target < 0 || target >= next.length) return d;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, sections: next };
    });
  };
  const setVariant = (id, variant) => {
    setData((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, variant } : s)) }));
  };
  const setTheme = (theme) => setData((d) => ({ ...d, theme }));

  const heroSection = data.sections.find((s) => s.type === 'hero');
  const defaultSlug = slugify(heroSection && heroSection.content ? heroSection.content.name : 'mi-portfolio');

  const handlePublish = async (slug) => {
    try {
      const payload = { sections: data.sections, theme: data.theme, publishedAt: new Date().toISOString() };
      const result = await window.storage.set(`portfolio:${slug}`, JSON.stringify(payload), true);
      if (!result) return false;
      setData((d) => ({ ...d, meta: { ...d.meta, publishedSlug: slug, publishedAt: payload.publishedAt } }));
      return true;
    } catch (e) {
      return false;
    }
  };

  const resetDraft = async () => {
    const fresh = getInitialData();
    setData(fresh);
    try { await window.storage.set('draft', JSON.stringify(fresh), false); } catch (e) { /* noop */ }
  };

  return (
    <div className="adm-shell">
      <header className="adm-header">
        <div className="adm-brand"><span className="adm-brand-mark">$</span> portfolio-builder</div>
        <nav className="adm-tabs">
          <button className={tab === 'sections' ? 'is-active' : ''} onClick={() => setTab('sections')}><Layers size={14} /> Secciones</button>
          <button className={tab === 'content' ? 'is-active' : ''} onClick={() => setTab('content')}><FileText size={14} /> Contenido</button>
          <button className={tab === 'design' ? 'is-active' : ''} onClick={() => setTab('design')}><Palette size={14} /> Diseño</button>
          <button className={tab === 'preview' ? 'is-active' : ''} onClick={() => setTab('preview')}><Eye size={14} /> Vista previa</button>
        </nav>
        <div className="adm-header-actions">
          <span className="adm-save-indicator">
            {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? 'Borrador guardado' : ''}
          </span>
          {data.meta.publishedSlug && (
            <button className="adm-btn-ghost" onClick={() => onOpenPublished(data.meta.publishedSlug)}>
              <ExternalLink size={14} /> Ver publicado
            </button>
          )}
          <button className="adm-btn-primary" onClick={() => setModalOpen(true)}>Publicar</button>
        </div>
      </header>

      <main className="adm-main">
        {tab === 'sections' && <SectionsTab sections={data.sections} onToggle={toggleSection} onMove={moveSection} />}
        {tab === 'content' && <ContentTab sections={data.sections} onUpdateContent={updateSectionContent} />}
        {tab === 'design' && <DesignTab sections={data.sections} theme={data.theme} onVariantChange={setVariant} onThemeChange={setTheme} />}
        {tab === 'preview' && (
          <PreviewTab sections={data.sections} theme={data.theme} viewport={viewport} onViewportChange={setViewport} />
        )}
      </main>

      <footer className="adm-footer">
        <button className="adm-link-btn" onClick={resetDraft}>Reiniciar borrador</button>
      </footer>

      <PublishModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultSlug={data.meta.publishedSlug || defaultSlug}
        publishedSlug={data.meta.publishedSlug}
        onConfirm={handlePublish}
      />
    </div>
  );
}

/* ============================== Public view =============================== */

function PublicView({ slug, onBack }) {
  const [state, setState] = useState('loading');
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState('loading');
      try {
        const res = await window.storage.get(`portfolio:${slug}`, true);
        if (!cancelled) {
          if (res && res.value) {
            setPayload(JSON.parse(res.value));
            setState('ready');
          } else {
            setState('notfound');
          }
        }
      } catch (e) {
        if (!cancelled) setState('notfound');
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (state === 'loading') {
    return (
      <div className="pf-scope" data-theme="light">
        <div className="pf-status-screen"><p>Cargando portfolio…</p></div>
      </div>
    );
  }
  if (state === 'notfound') {
    return (
      <div className="pf-scope" data-theme="light">
        <div className="pf-status-screen">
          <p className="pf-status-title">No encontramos este portfolio</p>
          <p className="pf-status-desc">El link puede estar mal escrito, o el portfolio aún no se ha publicado.</p>
          <button className="adm-btn-primary" onClick={onBack}>Ir al editor</button>
        </div>
      </div>
    );
  }
  return (
    <div className="pf-public-wrap">
      <PortfolioRenderer sections={payload.sections} theme={payload.theme} />
      <button className="pf-edit-fab" onClick={onBack} aria-label="Editar portfolio"><Pencil size={14} /> Editar</button>
    </div>
  );
}

/* =============================== Styles ================================= */

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

      .adm-shell, .pf-scope {
        --font-display: 'Fraunces', Georgia, serif;
        --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        --font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace;
      }
      .adm-shell *, .pf-scope * { box-sizing: border-box; }

      /* ---------- Admin chrome ---------- */
      .adm-shell {
        --a-bg: #FAF8F4; --a-panel: #FFFFFF; --a-border: #E7E2D8; --a-text: #262019;
        --a-muted: #8A8272; --a-accent: #D97757; --a-accent-contrast: #FFFFFF;
        min-height: 100vh; background: var(--a-bg); color: var(--a-text);
        font-family: var(--font-body); display: flex; flex-direction: column;
      }
      .adm-header {
        display: flex; align-items: center; gap: 24px; padding: 14px 20px;
        border-bottom: 1px solid var(--a-border); background: var(--a-panel);
        flex-wrap: wrap; position: sticky; top: 0; z-index: 10;
      }
      .adm-brand { font-family: var(--font-mono); font-size: 13px; color: var(--a-muted); white-space: nowrap; }
      .adm-brand-mark { color: var(--a-accent); margin-right: 4px; }
      .adm-tabs { display: flex; gap: 4px; flex: 1; flex-wrap: wrap; }
      .adm-tabs button {
        display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: none;
        background: transparent; color: var(--a-muted); font-size: 13px; font-weight: 500;
        border-radius: 7px; cursor: pointer; font-family: var(--font-body);
      }
      .adm-tabs button:hover { background: var(--a-bg); color: var(--a-text); }
      .adm-tabs button.is-active { background: #F4E3D8; color: #A8501F; }
      .adm-header-actions { display: flex; align-items: center; gap: 10px; }
      .adm-save-indicator { font-size: 12px; color: var(--a-muted); }

      .adm-btn-primary {
        background: var(--a-accent); color: var(--a-accent-contrast); border: none; padding: 9px 16px;
        border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-body);
        display: inline-flex; align-items: center; gap: 6px;
      }
      .adm-btn-primary:hover { background: #C4643F; }
      .adm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .adm-btn-ghost {
        background: transparent; border: 1px solid var(--a-border); color: var(--a-text); padding: 8px 12px;
        border-radius: 7px; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center;
        gap: 6px; font-family: var(--font-body);
      }
      .adm-link-btn {
        background: none; border: none; color: var(--a-muted); font-size: 12.5px; text-decoration: underline;
        cursor: pointer; font-family: var(--font-body); padding: 4px;
      }

      .adm-main { flex: 1; padding: 28px 20px 60px; max-width: 760px; margin: 0 auto; width: 100%; }
      .adm-panel-title { font-family: var(--font-display); font-size: 22px; font-weight: 600; margin: 0 0 4px; }
      .adm-panel-desc { color: var(--a-muted); font-size: 13.5px; margin: 0 0 20px; }
      .adm-empty { color: var(--a-muted); font-size: 13.5px; }

      .adm-section-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .adm-section-row {
        display: flex; align-items: center; gap: 14px; background: var(--a-panel);
        border: 1px solid var(--a-border); border-radius: 10px; padding: 12px 14px;
      }
      .adm-section-name { flex: 1; font-size: 14px; font-weight: 500; }
      .adm-reorder { display: flex; gap: 2px; }
      .adm-reorder button { background: none; border: none; color: var(--a-muted); cursor: pointer; padding: 4px; border-radius: 5px; }
      .adm-reorder button:hover:not(:disabled) { background: var(--a-bg); color: var(--a-text); }
      .adm-reorder button:disabled { opacity: 0.3; cursor: default; }

      .adm-toggle {
        width: 34px; height: 20px; border-radius: 999px; border: none; background: #D8D1C2;
        position: relative; cursor: pointer; flex-shrink: 0; transition: background 0.15s;
      }
      .adm-toggle.is-on { background: var(--a-accent); }
      .adm-toggle-thumb {
        position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
        background: #fff; transition: transform 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.2);
      }
      .adm-toggle.is-on .adm-toggle-thumb { transform: translateX(14px); }

      .adm-content-block { margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid var(--a-border); }
      .adm-content-block:last-child { border-bottom: none; }
      .adm-content-heading {
        font-family: var(--font-mono); font-size: 12px; text-transform: uppercase;
        letter-spacing: 0.06em; color: var(--a-muted); margin: 0 0 14px;
      }

      .adm-form-grid { display: flex; flex-direction: column; gap: 14px; }
      .adm-field { display: flex; flex-direction: column; gap: 5px; }
      .adm-field-label { font-size: 12.5px; font-weight: 600; color: var(--a-text); }
      .adm-field-hint { font-size: 11.5px; color: var(--a-muted); }
      .adm-input, .adm-textarea {
        border: 1px solid var(--a-border); border-radius: 7px; padding: 9px 11px; font-size: 13.5px;
        font-family: var(--font-body); color: var(--a-text); background: var(--a-panel); width: 100%;
      }
      .adm-input:focus, .adm-textarea:focus { outline: 2px solid var(--a-accent); outline-offset: 1px; }
      .adm-textarea { resize: vertical; }

      .adm-list-editor { display: flex; flex-direction: column; gap: 12px; }
      .adm-list-item {
        border: 1px solid var(--a-border); border-radius: 10px; padding: 14px; display: flex;
        flex-direction: column; gap: 10px; position: relative; background: var(--a-panel);
      }
      .adm-list-item-row { flex-direction: row; align-items: center; padding: 10px 12px; }
      .adm-remove-btn {
        position: absolute; top: 10px; right: 10px; background: none; border: none;
        color: var(--a-muted); cursor: pointer; padding: 4px; border-radius: 5px;
      }
      .adm-list-item-row .adm-remove-btn { position: static; margin-left: auto; }
      .adm-remove-btn:hover { color: #B84C3A; background: #F6E4DE; }
      .adm-add-btn {
        display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; background: none;
        border: 1px dashed var(--a-border); color: var(--a-muted); padding: 8px 12px; border-radius: 7px;
        font-size: 13px; cursor: pointer; font-family: var(--font-body);
      }
      .adm-add-btn:hover { border-color: var(--a-accent); color: var(--a-accent); }
      .adm-range { flex: 1; accent-color: var(--a-accent); }
      .adm-range-value { font-family: var(--font-mono); font-size: 12px; color: var(--a-muted); width: 28px; text-align: right; }

      .adm-theme-row { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
      .adm-segmented { display: inline-flex; border: 1px solid var(--a-border); border-radius: 8px; padding: 2px; }
      .adm-segmented button {
        border: none; background: none; padding: 6px 12px; font-size: 12.5px; border-radius: 6px;
        cursor: pointer; color: var(--a-muted); display: inline-flex; align-items: center; gap: 5px;
        font-family: var(--font-body);
      }
      .adm-segmented button.is-active { background: var(--a-accent); color: #fff; }

      .adm-variant-block { margin-bottom: 26px; }
      .adm-variant-block .adm-field-label { display: block; margin-bottom: 10px; }
      .adm-variant-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
      .adm-variant-card {
        text-align: left; border: 1px solid var(--a-border); background: var(--a-panel); border-radius: 10px;
        padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; font-family: var(--font-body);
      }
      .adm-variant-card.is-active { border-color: var(--a-accent); background: #FBF0EA; }
      .adm-variant-card-title { font-size: 13px; font-weight: 600; }
      .adm-variant-card-desc { font-size: 12px; color: var(--a-muted); line-height: 1.4; }

      .adm-preview-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
      .adm-preview-toolbar { display: flex; justify-content: center; }
      .adm-preview-frame {
        width: 100%; max-width: 900px; border: 1px solid var(--a-border); border-radius: 14px;
        overflow: hidden; background: #fff; max-height: 640px; overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      }
      .adm-preview-frame.is-mobile { max-width: 380px; }

      .adm-footer { text-align: center; padding: 14px; }

      .adm-modal-overlay {
        position: fixed; inset: 0; background: rgba(28, 24, 16, 0.45); display: flex;
        align-items: center; justify-content: center; padding: 20px; z-index: 50;
      }
      .adm-modal {
        background: #fff; border-radius: 14px; padding: 28px; max-width: 400px; width: 100%;
        position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.2); font-family: var(--font-body);
      }
      .adm-modal-close {
        position: absolute; top: 14px; right: 14px; background: none; border: none;
        color: #8A8272; cursor: pointer; padding: 4px; display: flex;
      }
      .adm-modal-title { font-family: var(--font-display); font-size: 19px; margin: 0 0 8px; }
      .adm-modal-desc { font-size: 13px; color: #8A8272; margin: 0 0 16px; line-height: 1.5; }
      .adm-slug-preview { font-family: var(--font-mono); font-size: 12px; color: #8A8272; margin: 8px 0 0; }
      .adm-error { font-size: 12px; color: #B84C3A; margin: 6px 0 0; }
      .adm-copy-row {
        display: flex; align-items: center; gap: 8px; background: #FAF8F4; border: 1px solid #E7E2D8;
        border-radius: 8px; padding: 8px 10px; margin-bottom: 18px;
      }
      .adm-code { font-family: var(--font-mono); font-size: 13px; flex: 1; overflow-x: auto; white-space: nowrap; }
      .adm-modal-actions { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
      .adm-modal .adm-btn-primary { margin-top: 6px; width: 100%; justify-content: center; }

      /* ---------- Public portfolio render ---------- */
      .pf-scope {
        --p-bg: #F5F2EC; --p-bg-elevated: #FBF9F5; --p-text: #1C1810; --p-muted: #726B5C;
        --p-border: #E4DDCE; --p-accent: #D97757; --p-accent-soft: rgba(217,119,87,0.12);
      }
      .pf-scope[data-theme="dark"] {
        --p-bg: #1B1712; --p-bg-elevated: #221E17; --p-text: #F2ECE0; --p-muted: #A69C89;
        --p-border: #3A342A; --p-accent: #E08962; --p-accent-soft: rgba(224,137,98,0.14);
      }
      .pf-page { background: var(--p-bg); color: var(--p-text); font-family: var(--font-body); min-height: 100vh; }
      .pf-section { padding: 64px 24px; max-width: 860px; margin: 0 auto; }
      .pf-eyebrow { font-family: var(--font-mono); font-size: 12.5px; color: var(--p-accent); margin: 0 0 14px; letter-spacing: 0.02em; }
      .pf-status-screen {
        min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center;
        text-align: center; gap: 10px; padding: 40px; font-family: var(--font-body); background: var(--p-bg); color: var(--p-text);
      }
      .pf-status-title { font-family: var(--font-display); font-size: 20px; margin: 0; }
      .pf-status-desc { color: var(--p-muted); font-size: 14px; max-width: 360px; margin: 0 0 8px; }

      .pf-section.pf-hero { text-align: center; padding-top: 90px; }
      .pf-hero-centered .pf-hero-avatar, .pf-hero-centered .pf-hero-photo {
        width: 84px; height: 84px; border-radius: 50%; margin: 0 auto 22px; object-fit: cover;
        display: flex; align-items: center; justify-content: center; background: var(--p-accent-soft);
        color: var(--p-accent); font-family: var(--font-display); font-size: 26px; border: 1px solid var(--p-border);
      }
      .pf-hero-name { font-family: var(--font-display); font-size: clamp(36px, 7vw, 58px); font-weight: 600; margin: 0 0 6px; line-height: 1.05; }
      .pf-hero-role { font-family: var(--font-mono); font-size: 13.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--p-muted); margin: 0 0 20px; }
      .pf-hero-tagline { font-size: 17px; color: var(--p-muted); max-width: 480px; margin: 0 auto; line-height: 1.6; }

      .pf-hero.pf-hero-split {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 40px;
        align-items: center; text-align: left; padding-top: 90px;
      }
      .pf-hero-split .pf-hero-name { font-size: clamp(32px, 5.5vw, 50px); }
      .pf-hero-split .pf-hero-tagline { margin: 0; max-width: none; }
      .pf-hero-split .pf-hero-visual {
        aspect-ratio: 4/5; border-radius: 16px; background: var(--p-accent-soft); display: flex;
        align-items: center; justify-content: center; font-family: var(--font-display); font-size: 60px;
        color: var(--p-accent); overflow: hidden; border: 1px solid var(--p-border);
      }
      .pf-hero-split .pf-hero-visual img { width: 100%; height: 100%; object-fit: cover; }

      .pf-about-body { font-size: 17px; line-height: 1.75; max-width: 640px; color: var(--p-text); margin: 0; }

      .pf-projects-heading, .pf-skills-heading, .pf-experience-heading, .pf-contact-heading {
        font-family: var(--font-display); font-size: 30px; margin: 0 0 30px;
      }
      .pf-projects-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
      .pf-project-card {
        border: 1px solid var(--p-border); border-radius: 14px; padding: 22px; background: var(--p-bg-elevated);
        display: flex; flex-direction: column; gap: 10px; transition: transform 0.15s, border-color 0.15s;
      }
      .pf-project-card:hover { transform: translateY(-2px); border-color: var(--p-accent); }
      .pf-project-title { font-family: var(--font-display); font-size: 19px; font-weight: 600; margin: 0; }
      .pf-project-desc { font-size: 14px; color: var(--p-muted); line-height: 1.55; margin: 0; }
      .pf-project-stack { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
      .pf-tag {
        font-family: var(--font-mono); font-size: 11px; padding: 3px 8px; border-radius: 5px;
        background: var(--p-accent-soft); color: var(--p-accent);
      }
      .pf-project-link { font-size: 12.5px; color: var(--p-accent); text-decoration: none; margin-top: 4px; }

      .pf-projects-list { display: flex; flex-direction: column; }
      .pf-project-row { display: grid; grid-template-columns: 50px 1fr; gap: 18px; padding: 22px 0; border-bottom: 1px solid var(--p-border); }
      .pf-project-row:first-child { border-top: 1px solid var(--p-border); }
      .pf-project-index { font-family: var(--font-mono); color: var(--p-muted); font-size: 13px; }

      .pf-skills-tags { display: flex; flex-wrap: wrap; gap: 10px; }
      .pf-skill-tag { font-family: var(--font-mono); font-size: 13px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--p-border); color: var(--p-text); }
      .pf-chart-wrap { width: 100%; }

      .pf-timeline { position: relative; padding-left: 24px; display: flex; flex-direction: column; gap: 30px; }
      .pf-timeline::before { content: ''; position: absolute; left: 4px; top: 6px; bottom: 6px; width: 1px; background: var(--p-border); }
      .pf-timeline-item { position: relative; }
      .pf-timeline-item::before { content: ''; position: absolute; left: -24px; top: 5px; width: 9px; height: 9px; border-radius: 50%; background: var(--p-accent); }
      .pf-timeline-period { font-family: var(--font-mono); font-size: 12px; color: var(--p-muted); margin: 0 0 4px; }
      .pf-timeline-role { font-family: var(--font-display); font-size: 18px; font-weight: 600; margin: 0 0 4px; }
      .pf-timeline-desc { font-size: 14px; color: var(--p-muted); line-height: 1.6; margin: 0; }

      .pf-exp-compact-item { padding: 14px 0; border-bottom: 1px solid var(--p-border); display: flex; justify-content: space-between; gap: 16px; }
      .pf-exp-compact-item:first-child { border-top: 1px solid var(--p-border); }

      .pf-contact { text-align: center; }
      .pf-contact-email {
        font-family: var(--font-display); font-size: clamp(22px, 4vw, 32px); color: var(--p-accent);
        text-decoration: none; display: inline-block; margin-bottom: 24px; word-break: break-word;
      }
      .pf-contact-links { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
      .pf-contact-link { font-family: var(--font-mono); font-size: 13px; padding: 9px 16px; border-radius: 999px; border: 1px solid var(--p-border); color: var(--p-text); text-decoration: none; }
      .pf-contact-link:hover { border-color: var(--p-accent); color: var(--p-accent); }

      .pf-colophon { text-align: center; padding: 30px 24px 50px; }
      .pf-colophon p { font-family: var(--font-mono); font-size: 11px; color: var(--p-muted); margin: 0; }

      .pf-public-wrap { min-height: 100vh; position: relative; }
      .pf-edit-fab {
        position: fixed; bottom: 20px; right: 20px; background: #1C1810; color: #fff; border: none;
        padding: 10px 16px; border-radius: 999px; font-size: 13px; cursor: pointer; display: inline-flex;
        align-items: center; gap: 6px; font-family: var(--font-body); box-shadow: 0 8px 20px rgba(0,0,0,0.25); opacity: 0.85;
      }
      .pf-edit-fab:hover { opacity: 1; }

      @media (max-width: 640px) {
        .adm-main { padding: 20px 14px 50px; }
        .pf-project-row { grid-template-columns: 30px 1fr; }
        .pf-hero-split .pf-hero-visual { max-width: 260px; margin: 0 auto; aspect-ratio: 1/1; }
      }
      @media (prefers-reduced-motion: reduce) {
        .adm-shell *, .pf-scope * { transition: none !important; animation: none !important; }
      }
    `}</style>
  );
}

/* ================================= App ==================================== */

function parseHash() {
  const h = window.location.hash || '';
  const match = h.match(/^#\/p\/([a-z0-9-]+)$/);
  return match ? match[1] : null;
}

export default function App() {
  const [slug, setSlug] = useState(parseHash);

  useEffect(() => {
    const onHashChange = () => setSlug(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const goToAdmin = () => { window.location.hash = ''; setSlug(null); };
  const openPublished = (s) => { window.location.hash = `/p/${s}`; };

  return (
    <>
      <GlobalStyles />
      {slug ? <PublicView slug={slug} onBack={goToAdmin} /> : <AdminApp onOpenPublished={openPublished} />}
    </>
  );
}
