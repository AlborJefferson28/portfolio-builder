import { useEffect, useRef, useState } from 'react';
import { getImageFrameStyle } from '../../utils/imageFrameStyle.js';

const FRAME_SHAPE_CLASS = {
  circle: 'adm-frame-editor-circle',
  '4:5': 'adm-frame-editor-4-5',
  '16:9': 'adm-frame-editor-16-9',
};

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export default function ImageFrameModal({ value, frameShape, initialPosition, initialZoom, onConfirm, onCancel }) {
  const [position, setPosition] = useState(initialPosition || { x: 50, y: 50 });
  const [zoom, setZoom] = useState(initialZoom || 1);
  const [entered, setEntered] = useState(false);
  const frameRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const handlePointerDown = (e) => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPos: position,
      width: frame.offsetWidth,
      height: frame.offsetHeight,
    };
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const { startX, startY, startPos, width, height } = dragRef.current;
    const dxPct = ((e.clientX - startX) / width) * 100;
    const dyPct = ((e.clientY - startY) / height) * 100;
    setPosition({
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
    setPosition({ x: 50, y: 50 });
    setZoom(1);
  };

  return (
    <div className={`adm-modal-overlay${entered ? ' is-entered' : ''}`} onClick={onCancel}>
      <div className={`adm-modal adm-frame-modal${entered ? ' is-entered' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="adm-modal-title">Ajusta el encuadre</h2>
        <p className="adm-modal-desc">Arrastra la imagen para reposicionarla y usa el control para hacer zoom.</p>
        <div
          ref={frameRef}
          className={`adm-frame-editor-frame ${FRAME_SHAPE_CLASS[frameShape] || FRAME_SHAPE_CLASS.circle}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img src={value} alt="" style={getImageFrameStyle(position, zoom)} draggable={false} />
        </div>
        <div className="adm-frame-editor-controls">
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            className="adm-range"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <button type="button" className="adm-image-upload-link-btn" onClick={handleReset}>Restablecer</button>
        </div>
        <div className="adm-frame-modal-footer">
          <button type="button" className="adm-btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="adm-btn-primary" onClick={() => onConfirm(position, zoom)}>Listo</button>
        </div>
      </div>
    </div>
  );
}
