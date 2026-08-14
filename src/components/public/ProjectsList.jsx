export default function ProjectsList({ content }) {
  return (
    <section className="pf-section pf-projects">
      <p className="pf-eyebrow">// proyectos</p>
      <h2 className="pf-projects-heading">Proyectos</h2>
      <div className="pf-projects-list">
        {content.items.map((p, i) => (
          <div key={p.id} className="pf-project-row">
            <span className="pf-project-index">{String(i + 1).padStart(2, '0')}</span>
            <div>
              {p.imageUrl && <img src={p.imageUrl} alt={p.title || 'Proyecto'} className="pf-project-image" />}
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
