import { Monitor, Smartphone } from 'lucide-react';
import PortfolioRenderer from '../public/PortfolioRenderer.jsx';

export default function PreviewTab({ sections, theme, viewport, onViewportChange }) {
  return (
    <div className="adm-preview-wrap">
      <div className="adm-preview-toolbar">
        <div className="adm-segmented">
          <button type="button" className={viewport === 'desktop' ? 'is-active' : ''} onClick={() => onViewportChange('desktop')}>
            <Monitor size={14} /> Escritorio
          </button>
          <button type="button" className={viewport === 'mobile' ? 'is-active' : ''} onClick={() => onViewportChange('mobile')}>
            <Smartphone size={14} /> Móvil
          </button>
        </div>
      </div>
      <div className={`adm-preview-frame ${viewport === 'mobile' ? 'is-mobile' : ''}`}>
        <PortfolioRenderer sections={sections} theme={theme} />
      </div>
    </div>
  );
}
