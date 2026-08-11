export default function ContactBlock({ content }) {
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
