export default function SkillsTags({ content }) {
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
