import {
  createContext, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import * as MapLibreGL from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

if (typeof window !== 'undefined' && !MapLibreGL.getWorkerUrl()) {
  MapLibreGL.setWorkerUrl(
    `https://unpkg.com/maplibre-gl@${MapLibreGL.getVersion()}/dist/maplibre-gl-worker.mjs`,
  );
}

const DEFAULT_STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

const MapContext = createContext(null);

export function useMap() {
  const context = useContext(MapContext);
  if (!context) throw new Error('useMap must be used within a Map component');
  return context;
}

export default function Map({
  children, className, theme = 'light', center = [10, 20], zoom = 0.4, loading = false,
}) {
  const containerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [initError, setInitError] = useState(false);
  const currentStyleRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const initialStyle = theme === 'dark' ? DEFAULT_STYLES.dark : DEFAULT_STYLES.light;
    currentStyleRef.current = initialStyle;

    let map;
    try {
      map = new MapLibreGL.Map({
        container: containerRef.current,
        style: initialStyle,
        center,
        zoom,
        renderWorldCopies: false,
        attributionControl: { compact: true },
      });
    } catch (err) {
      console.error('map init failed:', err);
      setInitError(true);
      return undefined;
    }

    const handleLoad = () => setIsLoaded(true);
    const handleStyleLoad = () => setIsStyleLoaded(true);
    const handleError = (e) => console.error('map error:', e.error);
    map.on('load', handleLoad);
    map.on('style.load', handleStyleLoad);
    map.on('error', handleError);
    setMapInstance(map);

    return () => {
      map.off('load', handleLoad);
      map.off('style.load', handleStyleLoad);
      map.off('error', handleError);
      map.remove();
      setIsLoaded(false);
      setIsStyleLoaded(false);
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstance) return;
    const newStyle = theme === 'dark' ? DEFAULT_STYLES.dark : DEFAULT_STYLES.light;
    if (currentStyleRef.current === newStyle) return;
    currentStyleRef.current = newStyle;
    setIsStyleLoaded(false);
    mapInstance.setStyle(newStyle, { diff: false });
  }, [mapInstance, theme]);

  const contextValue = useMemo(() => ({
    map: mapInstance,
    isLoaded: isLoaded && isStyleLoaded,
    resolvedTheme: theme,
  }), [mapInstance, isLoaded, isStyleLoaded, theme]);

  if (initError) {
    return <div ref={containerRef} className={`an-map${className ? ` ${className}` : ''}`} />;
  }

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className={`an-map${className ? ` ${className}` : ''}`}>
        {(!isLoaded || loading) && (
          <div className="an-map-loading">
            <span />
            <span />
            <span />
          </div>
        )}
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
}
