import { initials } from '../../utils/initials.js';
import { getImageFrameStyle } from '../../utils/imageFrameStyle.js';

export default function HeroCentered({ content }) {
  const pos = content.photoPosition || { x: 50, y: 50 };
  const zoom = content.photoZoom || 1;
  return (
    <section className="pf-section pf-hero pf-hero-centered">
      <p className="pf-eyebrow">// hola, soy</p>
      {content.photoUrl ? (
        <div className="pf-hero-photo-frame">
          <img
            src={content.photoUrl}
            alt={content.name}
            className="pf-hero-photo"
            style={getImageFrameStyle(pos, zoom)}
          />
        </div>
      ) : (
        <div className="pf-hero-avatar" aria-hidden="true">{initials(content.name)}</div>
      )}
      <h1 className="pf-hero-name">{content.name || 'Tu nombre'}</h1>
      <p className="pf-hero-role">{content.role || 'Tu rol'}</p>
      {content.tagline && <p className="pf-hero-tagline">{content.tagline}</p>}
    </section>
  );
}
