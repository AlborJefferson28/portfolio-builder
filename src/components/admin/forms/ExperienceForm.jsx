import { Plus, Trash2 } from 'lucide-react';
import Field from '../Field.jsx';
import { uid } from '../../../utils/uid.js';

export default function ExperienceForm({ content, onChange }) {
  const items = content.items;
  const updateItem = (id, patch) => onChange({ ...content, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const addItem = () => onChange({ ...content, items: [...items, { id: uid(), role: '', org: '', period: '', description: '' }] });
  const removeItem = (id) => onChange({ ...content, items: items.filter((it) => it.id !== id) });
  return (
    <div className="adm-list-editor">
      {items.map((it) => (
        <div key={it.id} className="adm-list-item">
          <button type="button" className="adm-remove-btn" onClick={() => removeItem(it.id)} aria-label="Eliminar experiencia"><Trash2 size={14} /></button>
          <Field label="Rol"><input className="adm-input" value={it.role} onChange={(e) => updateItem(it.id, { role: e.target.value })} /></Field>
          <Field label="Empresa"><input className="adm-input" value={it.org} onChange={(e) => updateItem(it.id, { org: e.target.value })} /></Field>
          <Field label="Período" hint="Ej. 2023 — Presente"><input className="adm-input" value={it.period} onChange={(e) => updateItem(it.id, { period: e.target.value })} /></Field>
          <Field label="Descripción"><textarea className="adm-textarea" rows={2} value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} /></Field>
        </div>
      ))}
      <button type="button" className="adm-add-btn" onClick={addItem}><Plus size={14} /> Agregar experiencia</button>
    </div>
  );
}
