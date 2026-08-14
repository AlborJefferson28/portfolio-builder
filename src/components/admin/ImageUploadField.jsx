import { useRef, useState } from 'react';
import { ImagePlus, Link2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { uploadPortfolioImage } from '../../lib/imageUpload.js';

export default function ImageUploadField({ value, onChange, label, hint }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!user) {
      setError('Tu sesión expiró. Vuelve a iniciar sesión.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const newUrl = await uploadPortfolioImage(file, user.id);
      onChange(newUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className="adm-field">
      <span className="adm-field-label">{label}</span>
      <div className="adm-image-upload">
        <div className="adm-image-upload-preview">
          {value ? <img src={value} alt="" /> : <ImagePlus size={20} />}
        </div>
        <div className="adm-image-upload-actions">
          <button
            type="button"
            className="adm-image-upload-btn"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            {uploading ? 'Subiendo…' : 'Subir imagen'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={handleFileChange}
          />
          <button type="button" className="adm-image-upload-link-btn" onClick={() => setShowUrlInput((s) => !s)}>
            <Link2 size={12} /> o pegar una URL
          </button>
          {value && (
            <button type="button" className="adm-image-upload-remove" onClick={handleRemove} aria-label="Quitar imagen">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {showUrlInput && (
        <input
          className="adm-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
      )}
      {error && <span className="adm-image-upload-error">{error}</span>}
      {hint && <span className="adm-field-hint">{hint}</span>}
    </div>
  );
}
