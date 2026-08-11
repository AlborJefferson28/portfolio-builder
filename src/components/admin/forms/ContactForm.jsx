import { Plus, Trash2 } from 'lucide-react';
import Field from '../Field.jsx';
import { uid } from '../../../utils/uid.js';

export default function ContactForm({ content, onChange }) {
  const links = content.links;
  const updateLink = (id, patch) => onChange({ ...content, links: links.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const addLink = () => onChange({ ...content, links: [...links, { id: uid(), label: '', url: '' }] });
  const removeLink = (id) => onChange({ ...content, links: links.filter((l) => l.id !== id) });
  return (
    <div className="adm-form-grid">
      <Field label="Email"><input className="adm-input" value={content.email} onChange={(e) => onChange({ ...content, email: e.target.value })} /></Field>
      <div className="adm-list-editor">
        {links.map((l) => (
          <div key={l.id} className="adm-list-item adm-list-item-row">
            <input className="adm-input" style={{ flex: 1 }} placeholder="Etiqueta" value={l.label} onChange={(e) => updateLink(l.id, { label: e.target.value })} />
            <input className="adm-input" style={{ flex: 2 }} placeholder="https://..." value={l.url} onChange={(e) => updateLink(l.id, { url: e.target.value })} />
            <button type="button" className="adm-remove-btn" onClick={() => removeLink(l.id)} aria-label="Eliminar link"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="adm-add-btn" onClick={addLink}><Plus size={14} /> Agregar red</button>
      </div>
    </div>
  );
}
