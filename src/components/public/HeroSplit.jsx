import { initials } from '../../utils/initials.js';

export default function HeroSplit({ content }) {
  const pos = content.photoPosition || { x: 50, y: 50 };
  const zoom = content.photoZoom || 1;
  return (
    <section className="pf-section pf-hero pf-hero-split">
      <div>
        <p className="pf-eyebrow">// hola, soy</p>
        <h1 className="pf-hero-name">{content.name || 'Tu nombre'}</h1>
        <p className="pf-hero-role">{content.role || 'Tu rol'}</p>
        {content.tagline && <p className="pf-hero-tagline">{content.tagline}</p>}
      </div>
      <div className="pf-hero-visual">
        {content.photoUrl ? (
          <img
            src={content.photoUrl}
            alt={content.name}
            style={{ objectPosition: `${pos.x}% ${pos.y}%`, transform: `scale(${zoom})` }}
          />
        ) : initials(content.name)}
      </div>
    </section>
  );
}
