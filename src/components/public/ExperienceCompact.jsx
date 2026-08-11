export default function ExperienceCompact({ content }) {
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
