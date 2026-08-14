import { Plus, Trash2 } from 'lucide-react';
import Field from '../Field.jsx';
import AutoTextarea from '../AutoTextarea.jsx';
import { uid } from '../../../utils/uid.js';

export default function ProjectsForm({ content, onChange }) {
  const items = content.items;
  const updateItem = (id, patch) => onChange({ ...content, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const addItem = () => onChange({ ...content, items: [...items, { id: uid(), title: '', description: '', stack: '', url: '' }] });
  const removeItem = (id) => onChange({ ...content, items: items.filter((it) => it.id !== id) });
  return (
    <div className="adm-list-editor">
      {items.map((it) => (
        <div key={it.id} className="adm-list-item">
          <button type="button" className="adm-remove-btn" onClick={() => removeItem(it.id)} aria-label="Eliminar proyecto"><Trash2 size={14} /></button>
          <Field label="Título"><input className="adm-input" value={it.title} onChange={(e) => updateItem(it.id, { title: e.target.value })} /></Field>
          <Field label="Descripción"><AutoTextarea className="adm-textarea" rows={2} value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} /></Field>
          <Field label="Stack" hint="Separado por comas"><input className="adm-input" value={it.stack} onChange={(e) => updateItem(it.id, { stack: e.target.value })} /></Field>
          <Field label="Link" hint="Opcional"><input className="adm-input" value={it.url} onChange={(e) => updateItem(it.id, { url: e.target.value })} placeholder="https://..." /></Field>
        </div>
      ))}
      <button type="button" className="adm-add-btn" onClick={addItem}><Plus size={14} /> Agregar proyecto</button>
    </div>
  );
}
