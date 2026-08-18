import { useEffect, useMemo, useRef } from 'react';
import * as MapLibreGL from 'maplibre-gl';
import Map, { useMap } from './Map.jsx';
import MapGeoJSON from './MapGeoJSON.jsx';
import worldCountries from '../../data/worldCountries.geo.json';
import { ISO2_TO_ISO3 } from '../../data/iso2to3.js';
import { useTheme } from '../../context/ThemeContext.jsx';

function buildChoroplethData(geoMap) {
  // NOTE: `Map` here must be the built-in JS Map, not the React <Map> component
  // imported above (which shadows the global `Map` identifier in this module).
  const visitsByAlpha3 = new globalThis.Map();
  geoMap.forEach((row) => {
    const alpha3 = ISO2_TO_ISO3[row.country_code];
    if (!alpha3) return;
    visitsByAlpha3.set(alpha3, { visits: Number(row.visits), country: row.country });
  });
  return {
    ...worldCountries,
    features: worldCountries.features.map((feature) => {
      const match = visitsByAlpha3.get(feature.id);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          visits: match ? match.visits : 0,
          countryLabel: match ? match.country : feature.properties?.name,
        },
      };
    }),
  };
}

function ChoroplethLayer({ data, maxVisits }) {
  const { map } = useMap();
  const popupRef = useRef(null);

  useEffect(() => {
    popupRef.current = new MapLibreGL.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, []);

  const handleHover = (e) => {
    const popup = popupRef.current;
    if (!popup || !map) return;
    if (!e) {
      popup.remove();
      return;
    }
    const { countryLabel, visits } = e.feature.properties;
    popup
      .setLngLat([e.longitude, e.latitude])
      .setText(`${countryLabel}: ${visits} visita${visits === 1 ? '' : 's'}`)
      .addTo(map);
  };

  return (
    <MapGeoJSON
      data={data}
      interactive
      onHover={handleHover}
      fillPaint={{
        'fill-color': '#D97757',
        'fill-opacity': ['interpolate', ['linear'], ['get', 'visits'], 0, 0.05, maxVisits, 0.85],
      }}
      fillHoverPaint={{ 'fill-opacity': 1 }}
    />
  );
}

export default function CountryChoroplethMap({ geoMap }) {
  const { theme } = useTheme();
  const hasData = geoMap && geoMap.length > 0;
  const data = useMemo(() => (hasData ? buildChoroplethData(geoMap) : null), [geoMap, hasData]);
  const maxVisits = useMemo(
    () => (hasData ? Math.max(...geoMap.map((r) => Number(r.visits))) : 0),
    [geoMap, hasData],
  );

  if (!data) return null;

  return (
    <div className="an-map-wrap">
      <Map theme={theme} center={[10, 20]} zoom={0.4}>
        <ChoroplethLayer data={data} maxVisits={maxVisits} />
      </Map>
    </div>
  );
}
