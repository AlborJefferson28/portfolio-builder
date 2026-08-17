export default function ContactBlock({ content, onTrack = () => {} }) {
  return (
    <section className="pf-section pf-contact">
      <p className="pf-eyebrow">// contacto</p>
      <h2 className="pf-contact-heading">Hablemos</h2>
      {content.email && (
        <a
          className="pf-contact-email"
          href={`mailto:${content.email}`}
          onClick={() => onTrack('contact_click', { target_id: 'email', target_label: content.email })}
        >
          {content.email}
        </a>
      )}
      {content.cvUrl && (
        <a
          className="pf-cv-download"
          href={content.cvUrl}
          download
          onClick={() => onTrack('cv_click', { target_label: 'CV' })}
        >
          Descargar CV
        </a>
      )}
      {content.links && content.links.length > 0 && (
        <div className="pf-contact-links">
          {content.links.map((l) => (
            <a
              key={l.id}
              className="pf-contact-link"
              href={l.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => onTrack('contact_click', { target_id: l.id, target_label: l.label })}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
