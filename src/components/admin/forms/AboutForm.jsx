import Field from '../Field.jsx';
import AutoTextarea from '../AutoTextarea.jsx';

export default function AboutForm({ content, onChange }) {
  return (
    <div className="adm-form-grid">
      <Field label="Bio">
        <AutoTextarea className="adm-textarea" rows={5} value={content.body} onChange={(e) => onChange({ ...content, body: e.target.value })} />
      </Field>
    </div>
  );
}
