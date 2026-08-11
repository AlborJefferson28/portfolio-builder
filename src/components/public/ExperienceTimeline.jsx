export default function ExperienceTimeline({ content }) {
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
