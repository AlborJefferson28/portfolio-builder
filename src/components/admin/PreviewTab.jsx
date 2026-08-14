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
      <div className={`adm-device-frame ${viewport === 'mobile' ? 'is-mobile' : 'is-desktop'}`}>
        {viewport === 'desktop' && (
          <div className="adm-browser-chrome">
            <span className="adm-browser-dot adm-browser-dot-red" />
            <span className="adm-browser-dot adm-browser-dot-yellow" />
            <span className="adm-browser-dot adm-browser-dot-green" />
            <span className="adm-browser-url">portfolio.studio</span>
          </div>
        )}
        {viewport === 'mobile' && <div className="adm-phone-notch" />}
        <div className={`adm-preview-frame ${viewport === 'mobile' ? 'is-mobile' : ''}`}>
          <PortfolioRenderer sections={sections} theme={theme} />
        </div>
      </div>
    </div>
  );
}
