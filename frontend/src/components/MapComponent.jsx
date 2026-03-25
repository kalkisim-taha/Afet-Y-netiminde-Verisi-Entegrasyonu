import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, Rectangle, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ChangeView({ center, zoom, boundsGeoJSON }) {
  const map = useMap();
  useEffect(() => {
    if (boundsGeoJSON) {
       const geoJsonLayer = L.geoJSON(boundsGeoJSON);
       map.flyToBounds(geoJsonLayer.getBounds(), { padding: [20, 20], duration: 1.5 });
    } else {
       map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map, boundsGeoJSON]);
  return null;
}

function ClickHandler({ onClick }) {
  useMapEvents({ click(e) { if (onClick) onClick(e.latlng); } });
  return null;
}

const getMarkerColor = (mag) => {
  if (mag > 5) return 'red';
  if (mag > 3) return '#f97316';
  return '#10b981';
};

const createCustomIcon = (mag) => {
  const color = getMarkerColor(mag);
  const size = Math.max(12, mag * 5); 
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; box-shadow: 0 0 ${size}px ${color}; border: 2px solid rgba(255,255,255,0.8);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
};

const rescueStartIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const rescueEndIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// V9 Animated Rescue Unit Icon (White/Green pulsing cross)
const rescueUnitIcon = L.divIcon({
  className: 'rescue-unit-icon',
  html: `<div style="background-color: white; width: 24px; height: 24px; border-radius: 50%; box-shadow: 0 0 15px white; border: 3px solid #10b981; display:flex; justify-content:center; align-items:center; z-index: 9999;"><div style="color: #10b981; font-weight: 900; font-size: 16px;">+</div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

export default function MapComponent({ 
  earthquakes, center, selectedCity, cityBoundary, mapStyle,
  onMapClick, onQuakeClick, routeStart, routeEnd, routeData, isOperationMode, dispatchActive
}) {
  const zoom = selectedCity ? 12 : 5;
  const [dispatchIndex, setDispatchIndex] = useState(0);

  // V9 Animation Loop Effect
  useEffect(() => {
    if (dispatchActive && routeData && routeData.safest) {
      let activePath = isOperationMode && routeData.safestAlt ? routeData.safestAlt.path : routeData.safest.path;
      let currentIndex = 0;
      setDispatchIndex(0);
      
      const interval = setInterval(() => {
        if (currentIndex < activePath.length - 1) {
          currentIndex++;
          setDispatchIndex(currentIndex);
        } else {
          clearInterval(interval);
          if('speechSynthesis' in window) {
             const u = new SpeechSynthesisUtterance("Kurtarma ekibi görev noktasına güvenle ulaştı. Operasyon başarılı.");
             u.lang = 'tr-TR'; u.rate = 0.95; window.speechSynthesis.speak(u);
          }
        }
      }, 500); // Renders move every 500ms
      return () => clearInterval(interval);
    } else {
      setDispatchIndex(0);
    }
  }, [dispatchActive, routeData, isOperationMode]);

  let layerUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  let layerAttr = '&copy; OpenStreetMap | CARTO';
  if (mapStyle === 'vibrant') {
      layerUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  } else if (mapStyle === 'satellite') {
      layerUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      layerAttr = '&copy; Esri';
  }

  const geojsonKey = cityBoundary ? JSON.stringify(cityBoundary).length : 'none';

  return (
    <div className={`map-container ${mapStyle === 'satellite' ? 'satellite-active' : ''}`}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <ChangeView center={center} zoom={zoom} boundsGeoJSON={cityBoundary} />
        <ClickHandler onClick={onMapClick} />
        
        <TileLayer attribution={layerAttr} url={layerUrl} />
        
        {cityBoundary && (
            <GeoJSON 
               key={geojsonKey} 
               data={cityBoundary} 
               style={{ color: '#0ea5e9', weight: 4, fillOpacity: 0.05, opacity: 0.8, dashArray: '5, 5' }} 
            />
        )}
        
        {routeData && routeData.dangerousCells && routeData.dangerousCells.map((cell, idx) => {
             const halfLat = routeData.cellDimensions.lat / 2;
             const halfLon = routeData.cellDimensions.lon / 2;
             const bounds = [[cell.lat - halfLat, cell.lon - halfLon], [cell.lat + halfLat, cell.lon + halfLon]];
             let colorStr = '#ef4444'; 
             if (cell.anomaly === 'Flood') colorStr = '#3b82f6';
             if (cell.anomaly === 'Debris') colorStr = '#f97316';
             return (
               <Rectangle key={`danger-${idx}`} bounds={bounds} pathOptions={{ color: colorStr, fillColor: colorStr, fillOpacity: 0.3, weight: 1, className: 'danger-pulse' }}>
                 <Popup>Bölgesel Sektör: {cell.anomaly || 'Sismik Risk/Hasar Yoğunluğu'}</Popup>
               </Rectangle>
             );
        })}

        {/* V9 Dynamic Renders */}
        {routeData && !isOperationMode && routeData.shortest && (
          <Polyline positions={routeData.shortest.path} pathOptions={{ color: '#ef4444', weight: 4, dashArray: '10, 10', opacity: 0.6 }} />
        )}
        
        {routeData && isOperationMode && routeData.safestAlt && (
          <Polyline positions={routeData.safestAlt.path} pathOptions={{ color: '#f59e0b', weight: 5, dashArray: '10, 10', opacity: 1, lineCap: 'round' }} />
        )}

        {routeData && routeData.safest && (
          <Polyline positions={routeData.safest.path} pathOptions={{ color: '#10b981', weight: 8, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
        )}

        {/* Animated Dispatch Marker */}
        {dispatchActive && routeData && (
           <Marker 
              position={
                 (isOperationMode && routeData.safestAlt) 
                     ? routeData.safestAlt.path[dispatchIndex] 
                     : routeData.safest.path[dispatchIndex]
              } 
              icon={rescueUnitIcon}
              zIndexOffset={1000}
           >
              <Popup>Kurtarma Ekibi Görevde. Canlı Takip.</Popup>
           </Marker>
        )}

        {routeStart && <Marker position={routeStart} icon={rescueStartIcon}><Popup>Tahliye Çıkış Noktası (AFAD)</Popup></Marker>}
        {routeEnd && <Marker position={routeEnd} icon={rescueEndIcon}><Popup>Güvenli Toplanma/Varış Alanı</Popup></Marker>}

        {earthquakes.map((quake) => {
          const [lon, lat] = quake.geometry.coordinates;
          const mag = quake.properties.mag;
          return (
            <Marker key={quake.id} position={[lat, lon]} icon={createCustomIcon(mag)}>
              <Popup>
                <div style={{ color: '#0f172a', textAlign: 'center' }}>
                  <strong>{quake.properties.place}</strong><br/>
                  Şiddet: {mag}<br/>
                  <button 
                    className="btn" 
                    style={{marginTop: '0.8rem', background: '#ef4444', color: 'white', fontSize: '0.75rem', padding: '0.4rem 0.6rem'}}
                    onClick={(e) => { e.stopPropagation(); if(onQuakeClick) onQuakeClick([lat, lon]); }}
                  >
                    Kentsel Tahliye Rotası Çiz
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
