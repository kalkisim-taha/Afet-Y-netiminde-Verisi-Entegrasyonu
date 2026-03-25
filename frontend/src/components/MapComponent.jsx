import React, { useEffect, useState } from 'react';
import { Circle, GeoJSON, MapContainer, Marker, Polyline, Popup, Rectangle, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const ROUTE_STYLES = {
  safest: { color: '#22c55e', weight: 7, opacity: 0.95 },
  balanced: { color: '#f59e0b', weight: 5, opacity: 0.85, dashArray: '8 10' },
  shortest: { color: '#ef4444', weight: 4, opacity: 0.7, dashArray: '4 12' },
  contingency: { color: '#38bdf8', weight: 4, opacity: 0.8, dashArray: '12 10' },
};

const ROLE_COLORS = {
  command: '#0ea5e9',
  logistics: '#a855f7',
  hospital: '#22c55e',
  shelter: '#f59e0b',
  target: '#ef4444',
};

const ROLE_LABELS = {
  command: 'Komuta',
  logistics: 'Lojistik',
  hospital: 'Hastane',
  shelter: 'Toplanma',
  target: 'Hedef',
};

function FitScene({ scenario }) {
  const map = useMap();

  useEffect(() => {
    const syncSize = window.setTimeout(() => {
      map.invalidateSize();
    }, 60);

    if (!scenario) {
      return () => window.clearTimeout(syncSize);
    }

    if (scenario.bounds) {
      map.flyToBounds(scenario.bounds, {
        padding: [24, 24],
        duration: 1.2,
      });
      return () => window.clearTimeout(syncSize);
    }

    map.flyTo(scenario.center, 13, { duration: 1.2 });
    return () => window.clearTimeout(syncSize);
  }, [map, scenario]);

  useEffect(() => {
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [map]);

  return null;
}

function buildSiteIcon(role) {
  const color = ROLE_COLORS[role] || '#94a3b8';
  return L.divIcon({
    className: 'site-pin-wrapper',
    html: `<div class="site-pin" style="--pin-color:${color}"><span></span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const dispatchIcon = L.divIcon({
  className: 'dispatch-unit-wrapper',
  html: '<div class="dispatch-unit"><span></span></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function getBaseLayer(mapStyle) {
  if (mapStyle === 'street') {
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap',
    };
  }

  if (mapStyle === 'dark') {
    return {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap | CARTO',
    };
  }

  return {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  };
}

export default function MapComponent({ scenario, routeData, mapStyle, activeRouteKey, dispatchActive }) {
  const [dispatchIndex, setDispatchIndex] = useState(0);
  const baseLayer = getBaseLayer(mapStyle);
  const activeRoute = routeData?.routes?.[activeRouteKey] || routeData?.routes?.safest || null;

  useEffect(() => {
    if (!dispatchActive || !activeRoute?.path?.length) {
      return undefined;
    }

    let index = 0;
    const resetTimer = window.setTimeout(() => setDispatchIndex(0), 0);
    const interval = window.setInterval(() => {
      if (index >= activeRoute.path.length - 1) {
        window.clearInterval(interval);
        return;
      }

      index += 1;
      setDispatchIndex(index);
    }, 420);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearInterval(interval);
    };
  }, [dispatchActive, activeRoute]);

  return (
    <div className="map-shell">
      <MapContainer center={scenario?.center || [39.0, 35.0]} zoom={13} className="leaflet-host">
        <FitScene scenario={scenario} />
        <TileLayer attribution={baseLayer.attribution} url={baseLayer.url} />

        {scenario?.bounds && (
          <GeoJSON
            data={{
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [scenario.bounds[0][1], scenario.bounds[0][0]],
                  [scenario.bounds[1][1], scenario.bounds[0][0]],
                  [scenario.bounds[1][1], scenario.bounds[1][0]],
                  [scenario.bounds[0][1], scenario.bounds[1][0]],
                  [scenario.bounds[0][1], scenario.bounds[0][0]],
                ]],
              },
            }}
            style={{ color: '#38bdf8', opacity: 0.9, dashArray: '6 8', weight: 2, fillOpacity: 0.04 }}
          />
        )}

        {scenario?.safeCorridors?.map((corridor) => (
          <Polyline
            key={corridor.id}
            positions={corridor.path}
            pathOptions={{ color: '#34d399', weight: 3, opacity: 0.85, dashArray: '10 10' }}
          >
            <Popup>{corridor.label}</Popup>
          </Polyline>
        ))}

        {scenario?.hazards?.map((hazard) => (
          <Circle
            key={hazard.id}
            center={hazard.center}
            radius={hazard.radiusKm * 1000}
            pathOptions={{
              color: hazard.color || '#ef4444',
              weight: 2,
              fillColor: hazard.color || '#ef4444',
              fillOpacity: 0.18,
              className: 'hazard-ring',
            }}
          >
            <Popup>
              <strong>{hazard.label}</strong>
              <br />
              {hazard.typeLabel}
              <br />
              Şiddet: %{Math.round(hazard.severity * 100)}
            </Popup>
          </Circle>
        ))}

        {routeData?.dangerousCells?.slice(0, 140).map((cell, index) => {
          const halfLat = routeData.cellDimensions.lat / 2;
          const halfLon = routeData.cellDimensions.lon / 2;
          const bounds = [
            [cell.lat - halfLat, cell.lon - halfLon],
            [cell.lat + halfLat, cell.lon + halfLon],
          ];
          const color = cell.topDriver?.color || (cell.blocked ? '#ef4444' : '#f59e0b');

          return (
            <Rectangle
              key={`${cell.lat}-${cell.lon}-${index}`}
              bounds={bounds}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: cell.blocked ? 0.34 : 0.18,
                weight: 1,
                className: cell.blocked ? 'blocked-cell' : 'heat-cell',
              }}
            >
              <Popup>
                <strong>{cell.topDriver?.label || 'Riskli hücre'}</strong>
                <br />
                Risk: {cell.risk}
              </Popup>
            </Rectangle>
          );
        })}

        {routeData?.routes &&
          Object.entries(routeData.routes)
            .filter(([, route]) => Boolean(route))
            .map(([routeKey, route]) => {
              const style = ROUTE_STYLES[routeKey] || ROUTE_STYLES.balanced;
              const isActive = routeKey === activeRouteKey;
              return (
                <Polyline
                  key={routeKey}
                  positions={route.path}
                  pathOptions={{
                    ...style,
                    opacity: isActive ? style.opacity : 0.28,
                    weight: isActive ? style.weight : Math.max(2, style.weight - 2),
                  }}
                >
                  <Popup>
                    <strong>{routeKey}</strong>
                    <br />
                    Mesafe: {route.distanceKm} km
                    <br />
                    ETA: {route.etaMinutes} dk
                  </Popup>
                </Polyline>
              );
            })}

        {scenario?.sites?.map((site) => (
          <Marker key={site.id} position={site.coords} icon={buildSiteIcon(site.role)}>
            <Popup>
              <strong>{site.label}</strong>
              <br />
              Rol: {ROLE_LABELS[site.role] || site.role}
            </Popup>
          </Marker>
        ))}

        {dispatchActive && activeRoute?.path?.[dispatchIndex] && (
          <Marker position={activeRoute.path[dispatchIndex]} icon={dispatchIcon}>
            <Popup>İntikal eden ekip</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
