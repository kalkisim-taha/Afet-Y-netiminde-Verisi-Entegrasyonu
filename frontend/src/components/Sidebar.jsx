import React, { useState } from 'react';
import axios from 'axios';
import { Activity, Thermometer, Wind, Droplets, Moon, Sun, Map, Layers, Navigation, Satellite, AlertTriangle, ShieldCheck, Search, Truck } from 'lucide-react';

const CITIES = [
  { name: 'İstanbul', coords: [41.0082, 28.9784] },
  { name: 'İzmir', coords: [38.4192, 27.1287] },
  { name: 'Hatay', coords: [36.2000, 36.1667] }
];

// Helper to format ETA text cleanly
const formatETA = (minutes) => {
    if (minutes < 60) return `${minutes} dk`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs} sa ${mins} dk`;
};

export default function Sidebar({ 
  onCitySelect, riskData, weatherData, selectedCity, theme, setTheme, 
  sensitivity, onSensitivityChange, mapStyle, setMapStyle, routeData, clearRoute,
  isOperationMode, setIsOperationMode, dispatchActive, setDispatchActive
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${searchQuery}&format=json&polygon_geojson=1&limit=3&countrycodes=tr`);
      if (res.data) {
         setSearchResults(res.data);
      }
    } catch(e) { console.error(e); }
  };

  const selectSearchResult = (item) => {
    onCitySelect({ 
       name: item.display_name.split(',')[0], 
       coords: [parseFloat(item.lat), parseFloat(item.lon)],
       boundary: item.geojson
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity color="#0ea5e9" size={32} />
          <h2 style={{margin: 0, fontSize: '1.25rem'}}>BKZS Sistemi</h2>
        </div>
        <button className="btn" style={{padding: '0.4rem', width: 'auto', margin: 0}} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <p style={{fontSize: '0.8rem', marginBottom: '1rem', color: 'var(--text-muted)'}}>
        Mahalle/İlçe arayın veya haritada istenilen noktalara tıklayarak Kentsel Tahliye rotası çizin.
      </p>

      {/* Şehir Arama (Nominatim ile Sınır Çizimi) */}
      <form onSubmit={handleSearch} style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem'}}>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="İl/İlçe/Mahalle Ara..." 
          className="select-input" 
          style={{margin: 0, flex: 1}}
        />
        <button type="submit" className="btn" style={{padding: '0.5rem', width: 'auto', margin: 0, background: '#0ea5e9', color: 'white', borderColor: '#0ea5e9'}}><Search size={18}/></button>
      </form>
      {searchResults.length > 0 && (
         <div style={{background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '8px', marginBottom: '1rem', padding: '0.5rem', maxHeight: '150px', overflowY: 'auto'}}>
            {searchResults.map(res => (
              <div key={res.place_id} onClick={() => selectSearchResult(res)} style={{padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem'}}>
                 {res.display_name}
              </div>
            ))}
         </div>
      )}

      {/* V8 Kapsamlı Rota Paneli */}
      {routeData && (
        <div className="glass-panel" style={{ marginBottom: '1rem', border: '1px solid #0ea5e9', background: 'rgba(14, 165, 233, 0.05)' }}>
          <div style={{fontSize: '1rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem'}}>
             <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Navigation size={18} color="#0ea5e9"/> Kentsel Adresleme Rotası </div>
             <button className="btn" style={{padding: '0.2rem 0.5rem', fontSize: '0.75rem', width: 'auto', margin: 0}} onClick={clearRoute}>Sıfırla</button>
          </div>

          <div style={{fontSize: '0.8rem', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '6px', borderLeft: '2px solid #0ea5e9'}}>
             <strong style={{display: 'block', color: 'var(--text-muted)'}}>Başlangıç:</strong> {routeData.startName} <br/>
             <strong style={{display: 'block', color: 'var(--text-muted)', marginTop: '0.25rem'}}>Hedef (Güvenli Alan):</strong> {routeData.endName}
          </div>

          <div style={{display: 'flex', gap: '0.5rem', flexDirection: 'column'}}>
            
            {/* V9 ETA Updates */}
            {!isOperationMode && routeData.shortest && (
              <div style={{flex: 1, background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', borderLeft: '4px solid #ef4444', display: 'flex', justifyContent: 'space-between'}}>
                 <div>
                   <strong style={{color: '#ef4444', fontSize: '0.85rem', display: 'block'}}>TEHLİKELİ (KISA HATT)</strong>
                   <p style={{fontSize: '0.75rem', margin: '0.1rem 0'}}>Yıkıntı/Risk Engeli Çok Yüksek</p>
                 </div>
                 <div style={{textAlign: 'right'}}>
                    <strong style={{fontSize: '1rem', display: 'block'}}>{routeData.shortest.distance}km</strong>
                    <span style={{fontSize: '0.8rem', color: '#ef4444', fontWeight: 'bold'}}>{formatETA(routeData.shortest.eta)}</span>
                 </div>
              </div>
            )}

            <div style={{flex: 1, background: 'rgba(16, 185, 129, 0.15)', padding: '0.75rem', borderRadius: '8px', borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between'}}>
               <div>
                 <strong style={{color: '#10b981', fontSize: '0.85rem', display: 'block'}}>PRİMER TAVSİYE HATT</strong>
                 <p style={{fontSize: '0.75rem', margin: '0.1rem 0'}}>A* Optimizasyon Skoru: <strong>{routeData.safest.score}</strong></p>
               </div>
               <div style={{textAlign: 'right'}}>
                  <strong style={{fontSize: '1rem', display: 'block'}}>{routeData.safest.distance}km</strong>
                  <span style={{fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold'}}>Tahmini: {formatETA(routeData.safest.eta)}</span>
               </div>
            </div>

            {isOperationMode && routeData.safestAlt && (
              <div style={{flex: 1, background: 'rgba(245, 158, 11, 0.15)', padding: '0.75rem', borderRadius: '8px', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between'}}>
                 <div>
                   <strong style={{color: '#f59e0b', fontSize: '0.85rem', display: 'block'}}>ALTERNATİF (ACİL) HAT</strong>
                   <p style={{fontSize: '0.75rem', margin: '0.1rem 0'}}>B Planı Geçiş Koridoru</p>
                 </div>
                 <div style={{textAlign: 'right'}}>
                    <strong style={{fontSize: '1rem', display: 'block'}}>{routeData.safestAlt.distance}km</strong>
                    <span style={{fontSize: '0.85rem', color: '#f59e0b', fontWeight: 'bold'}}>Tahmini: {formatETA(routeData.safestAlt.eta)}</span>
                 </div>
              </div>
            )}
            
            {/* V9 Animated Dispatch Engine */}
            {!dispatchActive ? (
                <button className="btn" style={{background: '#10b981', color: 'white', marginTop: '0.5rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '0.5rem'}} onClick={() => setDispatchActive(true)}>
                    <Truck size={18}/> KURTARMA EKİBİNİ İNTİKAL ETTİR
                </button>
            ) : (
                <div style={{textAlign: 'center', padding: '0.5rem', color: '#10b981', fontWeight: 'bold', border: '1px dashed #10b981', borderRadius: '8px', marginTop: '0.5rem'}}>
                    Ekipler Yönlendirildi. Canlı Takip Aktif!
                </div>
            )}

          </div>

          {routeData.satelliteReport && (
            <div style={{marginTop: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(14,165,233,0.3)'}}>
              <strong style={{fontSize: '0.85rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem'}}>
                <Satellite size={16}/> Yüksek Çözünürlüklü Şehir Taraması
              </strong>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem'}}>
                 <span className="text-muted">Mikro Sektör (Grid):</span> <strong style={{color: 'white'}}>{routeData.satelliteReport.sectorsScanned} Blok</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem'}}>
                 <span className="text-muted" style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}><AlertTriangle size={12} color="#f97316"/> Yapısal Hasar/Enkaz:</span> 
                 <strong style={{color: '#f97316'}}>{routeData.satelliteReport.debrisFound} Sokak</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      <div className="glass-panel" style={{padding: '1rem', marginBottom: '1rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--panel-border)'}}>
          <span style={{fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: isOperationMode ? '#10b981' : 'inherit'}}>
              <ShieldCheck size={16}/> Operasyon Modu (V8)
          </span>
          <button className={`btn ${isOperationMode ? 'active' : ''}`} style={{padding: '0.25rem 0.5rem', width: 'auto', margin: 0, background: isOperationMode ? '#10b981' : ''}} onClick={() => setIsOperationMode(!isOperationMode)}>
            {isOperationMode ? 'AÇIK (A+ Rotalar)' : 'KAPALI'}
          </button>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <span style={{fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Layers size={16}/> Harita Katmanı</span>
          <div style={{display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '8px'}}>
            <button className={`btn ${mapStyle === 'vibrant' ? 'active' : ''}`} style={{padding: '0.25rem 0.5rem', width: 'auto', margin: 0, fontSize: '0.7rem'}} onClick={() => setMapStyle('vibrant')}>
              Canlı (Sokak)
            </button>
            <button className={`btn ${mapStyle === 'dark' ? 'active' : ''}`} style={{padding: '0.25rem 0.5rem', width: 'auto', margin: 0, fontSize: '0.7rem'}} onClick={() => setMapStyle('dark')}>
              Karanlık
            </button>
            <button className={`btn ${mapStyle === 'satellite' ? 'active' : ''}`} style={{padding: '0.25rem 0.5rem', width: 'auto', margin: 0, fontSize: '0.7rem'}} onClick={() => setMapStyle('satellite')}>
              Uydu
            </button>
          </div>
        </div>
      </div>

      <div className="city-list" style={{ marginBottom: '1rem' }}>
        <h4 style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase'}}>Öncelikli Konumlar</h4>
        {CITIES.map(city => (
          <div 
            key={city.name}
            className={`city-item ${selectedCity?.name === city.name ? 'active' : ''}`}
            onClick={() => onCitySelect(city)}
          >
            <span style={{fontSize: '0.9rem'}}>{city.name}</span>
            <Map size={16} />
          </div>
        ))}
      </div>

      {weatherData && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h4 style={{marginBottom: '0.5rem', fontSize: '0.875rem'}}>Meteorolojik Durum (Kurtarma Zorluğu)</h4>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem'}}>
             <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}><Thermometer size={14} color="#f59e0b"/> {weatherData.temperature_2m}°C</div>
             <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}><Wind size={14} color="#3b82f6"/> {weatherData.wind_speed_10m} km/s</div>
             <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}><Droplets size={14} color="#10b981"/> %{weatherData.relative_humidity_2m}</div>
          </div>
        </div>
      )}

    </div>
  );
}
