import Field from '../Field.jsx';
import AutoTextarea from '../AutoTextarea.jsx';
import ImageUploadField from '../ImageUploadField.jsx';

export default function HeroForm({ content, variant, onChange }) {
  const set = (k, v) => onChange({ ...content, [k]: v });
  const frameShape = variant === 'split' ? '4:5' : 'circle';
  return (
    <div className="adm-form-grid">
      <Field label="Nombre"><input className="adm-input" value={content.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Rol"><input className="adm-input" value={content.role} onChange={(e) => set('role', e.target.value)} /></Field>
      <Field label="Tagline" hint="Una frase corta debajo de tu nombre">
        <AutoTextarea className="adm-textarea" rows={2} value={content.tagline} onChange={(e) => set('tagline', e.target.value)} />
      </Field>
      <ImageUploadField
        label="Foto"
        hint="Sube una imagen o pega una URL. Si lo dejas vacío, se muestran tus iniciales."
        value={content.photoUrl}
        onChange={(v) => set('photoUrl', v)}
        position={content.photoPosition}
        zoom={content.photoZoom}
        onPositionChange={(p) => set('photoPosition', p)}
        onZoomChange={(z) => set('photoZoom', z)}
        frameShape={frameShape}
      />
    </div>
  );
}
