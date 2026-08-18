import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function DeleteConfirmModal({ open, title, deleting, onConfirm, onCancel }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) { setEntered(false); return undefined; }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={`adm-modal-overlay${entered ? ' is-entered' : ''}`} onClick={onCancel}>
      <div className={`adm-modal${entered ? ' is-entered' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="adm-modal-close" onClick={onCancel} aria-label="Cerrar"><X size={18} /></button>
        <h2 className="adm-modal-title">¿Eliminar &quot;{title}&quot;?</h2>
        <p className="adm-modal-desc">Esta acción no se puede deshacer. El portfolio y todo su contenido se van a borrar permanentemente.</p>
        <div className="adm-modal-actions">
          <button type="button" className="adm-btn-danger" disabled={deleting} onClick={onConfirm}>
            {deleting ? 'Eliminando…' : 'Eliminar portfolio'}
          </button>
          <button type="button" className="adm-link-btn" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
