import { useRef, useState } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import Field from '../Field.jsx';
import { uid } from '../../../utils/uid.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { uploadPortfolioCv, deletePortfolioCv } from '../../../lib/cvUpload.js';

export default function ContactForm({ content, onChange, portfolioId }) {
  const { user } = useAuth();
  const links = content.links;
  const [uploadingCv, setUploadingCv] = useState(false);
  const [cvError, setCvError] = useState('');
  const cvInputRef = useRef(null);

  const updateLink = (id, patch) => onChange({ ...content, links: links.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const addLink = () => onChange({ ...content, links: [...links, { id: uid(), label: '', url: '' }] });
  const removeLink = (id) => onChange({ ...content, links: links.filter((l) => l.id !== id) });

  const handleCvChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setCvError('');
    setUploadingCv(true);
    try {
      const url = await uploadPortfolioCv(file, user.id, portfolioId);
      onChange({ ...content, cvUrl: url });
    } catch (err) {
      setCvError(err.message);
    } finally {
      setUploadingCv(false);
    }
  };

  const handleRemoveCv = () => {
    deletePortfolioCv(user.id, portfolioId);
    onChange({ ...content, cvUrl: '' });
  };

  return (
    <div className="adm-form-grid">
      <Field label="Email"><input className="adm-input" value={content.email} onChange={(e) => onChange({ ...content, email: e.target.value })} /></Field>
      <Field label="CV (PDF)">
        <div className="adm-cv-upload">
          {content.cvUrl ? (
            <>
              <a className="adm-cv-upload-name" href={content.cvUrl} target="_blank" rel="noreferrer"><FileText size={14} /> CV subido</a>
              <button type="button" className="adm-image-upload-remove" onClick={handleRemoveCv} aria-label="Quitar CV"><Trash2 size={14} /></button>
            </>
          ) : (
            <button type="button" className="adm-image-upload-btn" onClick={() => cvInputRef.current.click()} disabled={uploadingCv}>
              {uploadingCv ? 'Subiendo…' : 'Subir CV'}
            </button>
          )}
          <input ref={cvInputRef} type="file" accept="application/pdf" hidden onChange={handleCvChange} />
        </div>
        {cvError && <span className="adm-image-upload-error">{cvError}</span>}
      </Field>
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
