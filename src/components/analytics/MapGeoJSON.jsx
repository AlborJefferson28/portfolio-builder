import { useEffect, useId, useMemo, useRef } from 'react';
import { useMap } from './Map.jsx';

function mergeHoverPaint(paint, hoverPaint) {
  if (!hoverPaint) return paint;
  const merged = { ...paint };
  for (const [key, hoverValue] of Object.entries(hoverPaint)) {
    if (hoverValue === undefined) continue;
    const baseValue = merged[key];
    merged[key] = baseValue === undefined
      ? hoverValue
      : ['case', ['boolean', ['feature-state', 'hover'], false], hoverValue, baseValue];
  }
  return merged;
}

const GEOJSON_DEFAULT_COLORS = {
  light: { fill: '#d4d4d4', line: '#ffffff' },
  dark: { fill: '#404040', line: '#171717' },
};

export default function MapGeoJSON({
  data, id: propId, promoteId, fillPaint, linePaint, fillHoverPaint,
  onClick, onHover, interactive = false, beforeId,
}) {
  const { map, isLoaded, resolvedTheme } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `geojson-source-${id}`;
  const fillLayerId = `geojson-fill-${id}`;
  const lineLayerId = `geojson-line-${id}`;

  const defaults = GEOJSON_DEFAULT_COLORS[resolvedTheme] ?? GEOJSON_DEFAULT_COLORS.light;
  const showFill = fillPaint !== false;
  const showLine = linePaint !== false;

  const mergedFillPaint = useMemo(
    () => mergeHoverPaint({ 'fill-color': defaults.fill, ...(fillPaint || {}) }, fillHoverPaint),
    [defaults.fill, fillPaint, fillHoverPaint],
  );
  const mergedLinePaint = useMemo(
    () => ({ 'line-color': defaults.line, 'line-width': 0.5, ...(linePaint || {}) }),
    [defaults.line, linePaint],
  );
  const latestRef = useRef({ onClick, onHover });
  latestRef.current = { onClick, onHover };

  useEffect(() => {
    if (!isLoaded || !map) return undefined;
    map.addSource(sourceId, { type: 'geojson', data, ...(promoteId ? { promoteId } : {}) });
    return () => {
      try {
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // style may be mid-reload
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId);
    source?.setData(data);
  }, [isLoaded, map, data, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId);
    if (!source) return;

    if (showFill && !map.getLayer(fillLayerId)) {
      map.addLayer({ id: fillLayerId, type: 'fill', source: sourceId, paint: mergedFillPaint }, beforeId);
    } else if (!showFill && map.getLayer(fillLayerId)) {
      map.removeLayer(fillLayerId);
    }

    if (showLine && !map.getLayer(lineLayerId)) {
      map.addLayer({ id: lineLayerId, type: 'line', source: sourceId, paint: mergedLinePaint }, beforeId);
    } else if (!showLine && map.getLayer(lineLayerId)) {
      map.removeLayer(lineLayerId);
    }

    if (showFill && map.getLayer(fillLayerId)) {
      for (const [key, value] of Object.entries(mergedFillPaint)) {
        map.setPaintProperty(fillLayerId, key, value);
      }
    }
    if (showLine && map.getLayer(lineLayerId)) {
      for (const [key, value] of Object.entries(mergedLinePaint)) {
        map.setPaintProperty(lineLayerId, key, value);
      }
    }
  }, [isLoaded, map, sourceId, fillLayerId, lineLayerId, showFill, showLine, mergedFillPaint, mergedLinePaint, beforeId]);

  useEffect(() => {
    if (!isLoaded || !map || !interactive || !showFill) return undefined;
    let hoveredId = null;

    const setHover = (next) => {
      if (next === hoveredId) return;
      const sourceExists = !!map.getSource(sourceId);
      if (hoveredId != null && sourceExists) {
        map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
      }
      hoveredId = next;
      if (next != null && sourceExists) {
        map.setFeatureState({ source: sourceId, id: next }, { hover: true });
      }
    };

    const handleMouseMove = (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      map.getCanvas().style.cursor = 'pointer';
      const featureId = feature.id;
      if (featureId === hoveredId) return;
      setHover(featureId ?? null);
      latestRef.current.onHover?.({
        feature, longitude: e.lngLat.lng, latitude: e.lngLat.lat, originalEvent: e,
      });
    };

    const handleMouseLeave = () => {
      setHover(null);
      map.getCanvas().style.cursor = '';
      latestRef.current.onHover?.(null);
    };

    const handleClick = (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      latestRef.current.onClick?.({
        feature, longitude: e.lngLat.lng, latitude: e.lngLat.lat, originalEvent: e,
      });
    };

    map.on('mousemove', fillLayerId, handleMouseMove);
    map.on('mouseleave', fillLayerId, handleMouseLeave);
    map.on('click', fillLayerId, handleClick);

    return () => {
      map.off('mousemove', fillLayerId, handleMouseMove);
      map.off('mouseleave', fillLayerId, handleMouseLeave);
      map.off('click', fillLayerId, handleClick);
      setHover(null);
      map.getCanvas().style.cursor = '';
    };
  }, [isLoaded, map, fillLayerId, sourceId, interactive, showFill]);

  return null;
}
