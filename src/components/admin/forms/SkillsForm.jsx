import { Plus, Trash2 } from 'lucide-react';
import { uid } from '../../../utils/uid.js';

export default function SkillsForm({ content, onChange }) {
  const items = content.items;
  const updateItem = (id, patch) => onChange({ ...content, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const addItem = () => onChange({ ...content, items: [...items, { id: uid(), name: '', level: 70 }] });
  const removeItem = (id) => onChange({ ...content, items: items.filter((it) => it.id !== id) });
  return (
    <div className="adm-list-editor">
      {items.map((it) => (
        <div key={it.id} className="adm-list-item adm-list-item-row">
          <input className="adm-input" style={{ flex: 1 }} value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} placeholder="Nombre" />
          <input type="range" min="0" max="100" value={it.level} onChange={(e) => updateItem(it.id, { level: Number(e.target.value) })} className="adm-range" />
          <span className="adm-range-value">{it.level}</span>
          <button type="button" className="adm-remove-btn" onClick={() => removeItem(it.id)} aria-label="Eliminar habilidad"><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" className="adm-add-btn" onClick={addItem}><Plus size={14} /> Agregar habilidad</button>
    </div>
  );
}
