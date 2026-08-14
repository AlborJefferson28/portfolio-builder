import { useRef, useState } from 'react';
import { ImagePlus, Link2, Trash2, Crop } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { uploadPortfolioImage } from '../../lib/imageUpload.js';
import { getImageFrameStyle } from '../../utils/imageFrameStyle.js';

const DEFAULT_POSITION = { x: 50, y: 50 };
const DEFAULT_ZOOM = 1;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

const FRAME_SHAPE_CLASS = {
  circle: 'adm-frame-editor-circle',
  '4:5': 'adm-frame-editor-4-5',
  '16:9': 'adm-frame-editor-16-9',
};

export default function ImageUploadField({
  value,
  onChange,
  label,
  hint,
  position,
  zoom,
  onPositionChange,
  onZoomChange,
  frameShape = 'circle',
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [editingFrame, setEditingFrame] = useState(false);
  const fileInputRef = useRef(null);
  const frameRef = useRef(null);
  const dragRef = useRef(null);

  const pos = position || DEFAULT_POSITION;
  const z = zoom || DEFAULT_ZOOM;
  const canEditFrame = Boolean(onPositionChange && onZoomChange);

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
    setEditingFrame(false);
  };

  const handlePointerDown = (e) => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPos: pos,
      width: frame.offsetWidth,
      height: frame.offsetHeight,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const { startX, startY, startPos, width, height } = dragRef.current;
    const dxPct = ((e.clientX - startX) / width) * 100;
    const dyPct = ((e.clientY - startY) / height) * 100;
    onPositionChange({
      x: clamp(startPos.x - dxPct, 0, 100),
      y: clamp(startPos.y - dyPct, 0, 100),
    });
  };

  const handlePointerUp = (e) => {
    const frame = frameRef.current;
    if (frame && frame.hasPointerCapture(e.pointerId)) frame.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  const handleReset = () => {
    onPositionChange(DEFAULT_POSITION);
    onZoomChange(DEFAULT_ZOOM);
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
          {value && canEditFrame && (
            <button type="button" className="adm-image-upload-link-btn" onClick={() => setEditingFrame((s) => !s)}>
              <Crop size={12} /> Editar encuadre
            </button>
          )}
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
      {editingFrame && value && canEditFrame && (
        <div className="adm-frame-editor">
          <div
            ref={frameRef}
            className={`adm-frame-editor-frame ${FRAME_SHAPE_CLASS[frameShape] || FRAME_SHAPE_CLASS.circle}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              src={value}
              alt=""
              style={getImageFrameStyle(pos, z)}
              draggable={false}
            />
          </div>
          <div className="adm-frame-editor-controls">
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              className="adm-range"
              value={z}
              onChange={(e) => onZoomChange(Number(e.target.value))}
            />
            <button type="button" className="adm-image-upload-link-btn" onClick={handleReset}>Restablecer</button>
            <button type="button" className="adm-image-upload-btn" onClick={() => setEditingFrame(false)}>Listo</button>
          </div>
        </div>
      )}
      {error && <span className="adm-image-upload-error">{error}</span>}
      {hint && <span className="adm-field-hint">{hint}</span>}
    </div>
  );
}
