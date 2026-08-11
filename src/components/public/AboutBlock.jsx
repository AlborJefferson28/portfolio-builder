export default function AboutBlock({ content }) {
  return (
    <section className="pf-section pf-about">
      <p className="pf-eyebrow">// sobre mí</p>
      <p className="pf-about-body">{content.body}</p>
    </section>
  );
}
