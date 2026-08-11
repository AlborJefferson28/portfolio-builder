import Field from '../Field.jsx';

export default function HeroForm({ content, onChange }) {
  const set = (k, v) => onChange({ ...content, [k]: v });
  return (
    <div className="adm-form-grid">
      <Field label="Nombre"><input className="adm-input" value={content.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Rol"><input className="adm-input" value={content.role} onChange={(e) => set('role', e.target.value)} /></Field>
      <Field label="Tagline" hint="Una frase corta debajo de tu nombre">
        <textarea className="adm-textarea" rows={2} value={content.tagline} onChange={(e) => set('tagline', e.target.value)} />
      </Field>
      <Field label="Foto (URL)" hint="Opcional. Si lo dejas vacío, se muestran tus iniciales.">
        <input className="adm-input" value={content.photoUrl} onChange={(e) => set('photoUrl', e.target.value)} placeholder="https://..." />
      </Field>
    </div>
  );
}
