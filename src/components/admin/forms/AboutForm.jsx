import Field from '../Field.jsx';

export default function AboutForm({ content, onChange }) {
  return (
    <div className="adm-form-grid">
      <Field label="Bio">
        <textarea className="adm-textarea" rows={5} value={content.body} onChange={(e) => onChange({ ...content, body: e.target.value })} />
      </Field>
    </div>
  );
}
