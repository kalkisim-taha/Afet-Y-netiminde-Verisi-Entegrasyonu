import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { AlertOctagon } from 'lucide-react';
import './index.css';

function App() {
  const [earthquakes, setEarthquakes] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityBoundary, setCityBoundary] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [isOperationMode, setIsOperationMode] = useState(false);
  
  // V9 Animation State
  const [dispatchActive, setDispatchActive] = useState(false);

  const [theme, setTheme] = useState('dark');
  const [sensitivity, setSensitivity] = useState('medium');
  const [mapStyle, setMapStyle] = useState('vibrant'); 

  const [mapCenter, setMapCenter] = useState([39.0, 35.0]);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // V9 Voice AI Robot Asistanı
  const playVoiceAlert = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.rate = 0.95; // Slightly robotic/authoritative speed
      utterance.pitch = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const fetchEarthquakes = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/earthquakes');
        setEarthquakes(response.data.features || []);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch earthquakes", error);
        setLoading(false);
      }
    };
    fetchEarthquakes();
  }, []);

  const reverseGeocode = async (lat, lon) => {
    try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        if (res.data.address) {
            return res.data.address.city || res.data.address.town || res.data.address.county || res.data.address.province || res.data.address.suburb || "Bölge";
        }
        return res.data.display_name.split(',')[0];
    } catch(e) { return "Bilinmeyen Konum"; }
  };

  const handleCitySelect = async (city) => {
    setSelectedCity(city);
    setMapCenter(city.coords);
    handleRiskAndWeather(city, sensitivity);

    let finalBoundary = city.boundary;
    if (!finalBoundary) {
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${city.name}&format=json&polygon_geojson=1&limit=1&countrycodes=tr`);
            if (res.data && res.data[0] && res.data[0].geojson) {
                finalBoundary = res.data[0].geojson;
            }
        } catch (e) { console.error("Boundary fetch error"); }
    }
    setCityBoundary(finalBoundary);
  };

  const handleSensitivityChange = (newSens) => {
    setSensitivity(newSens);
    if (selectedCity) {
      handleRiskAndWeather(selectedCity, newSens);
    }
  };

  const handleRiskAndWeather = async (city, currentSens) => {
    try {
      const weatherRes = await axios.get(`http://localhost:5000/api/weather?lat=${city.coords[0]}&lon=${city.coords[1]}`);
      setWeatherData(weatherRes.data);

      const radius = 5.0; 
      const nearbyQuakes = earthquakes.filter(q => {
        const [lon, lat] = q.geometry.coordinates;
        return Math.abs(lat - city.coords[0]) < radius && Math.abs(lon - city.coords[1]) < radius;
      });

      const riskRes = await axios.post('http://localhost:5000/api/risk', {
        features: nearbyQuakes,
        weather: weatherRes.data,
        sensitivity: currentSens
      });
      
      setRiskData(riskRes.data);
    } catch (error) {
      console.error("Failed to calculate risk / fetch weather", error);
    }
  };

  const handleMapClick = async (latlng) => {
    if (!routeStart) {
      setRouteStart([latlng.lat, latlng.lng]);
    } else if (!routeEnd) {
      const endPt = [latlng.lat, latlng.lng];
      setRouteEnd(endPt);
      fetchRouteData(routeStart, endPt);
    } else {
      setRouteStart([latlng.lat, latlng.lng]);
      setRouteEnd(null);
      setRouteData(null);
      setDispatchActive(false);
    }
  };
  
  const handleQuakeClick = (latlng) => {
      setRouteStart([latlng[0], latlng[1]]);
      setRouteEnd(null);
      setRouteData(null);
      setDispatchActive(false);
  };

  const fetchRouteData = async (start, end) => {
    setIsRouting(true);
    playVoiceAlert("GÖKTÜRK 2 Uydu bağlantısı kuruluyor. Sismik risk analizi ve alan taraması başlatıldı.");
    
    try {
      const [sName, eName] = await Promise.all([
          reverseGeocode(start[0], start[1]),
          reverseGeocode(end[0], end[1])
      ]);

      const res = await axios.post('http://localhost:5000/api/route', {
        start, end, features: earthquakes, isOperationMode
      });
      
      setRouteData({ ...res.data, startName: sName, endName: eName });
      
      if (res.data.safest) {
         playVoiceAlert(`Taramalar tamamlandı. Ekipler için en güvenli alternatif tahliye rotası saptandı.`);
      }
    } catch(e) { 
      console.error("Route error:", e); 
      playVoiceAlert("Uydu bağlantısında hata. Rota çizilemedi.");
    } finally {
      setIsRouting(false);
    }
  }

  const clearRoute = () => {
    setRouteStart(null);
    setRouteEnd(null);
    setRouteData(null);
    setDispatchActive(false);
  }

  if (loading) {
    return (
      <div style={{display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center'}}>
        <h2>BKZS Sistemi Başlatılıyor...</h2>
      </div>
    );
  }

  return (
    <div className="app-container">
      {riskData?.triggerAlert && (
         <div className="alert-banner">
            <AlertOctagon size={24} />
            KRİTİK UYARI: {selectedCity?.name} bölgesinde 48 saat içinde yüksek sismik risk tahmin ediliyor!
         </div>
      )}

      {!routeEnd && routeStart && (
        <div style={{position: 'absolute', top: '1rem', left: '400px', zIndex: 999, background: 'var(--accent)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', fontWeight: 600}}>
          AFAD Çıkış (Tahliye) noktası ayarlandı. Acil tahliye / Güvenli varış bölgesini haritaya tıklayarak seçin.
        </div>
      )}
      {isRouting && (
        <div style={{position: 'absolute', top: '1rem', left: '400px', zIndex: 999, background: '#f59e0b', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
           <div className="loader" style={{width: '20px', height: '20px', margin: 0, borderWidth: '2px', borderTopColor: 'white'}}></div>
           GÖKTÜRK-2 Uydu API Bağlantısı Kuruluyor & Yüksek Çözünürlüklü Rota Çiziliyor...
        </div>
      )}

      <Sidebar 
        onCitySelect={handleCitySelect} 
        riskData={riskData} 
        weatherData={weatherData}
        selectedCity={selectedCity}
        theme={theme}
        setTheme={setTheme}
        sensitivity={sensitivity}
        onSensitivityChange={handleSensitivityChange}
        mapStyle={mapStyle}
        setMapStyle={setMapStyle}
        routeData={routeData}
        clearRoute={clearRoute}
        isOperationMode={isOperationMode}
        setIsOperationMode={setIsOperationMode}
        dispatchActive={dispatchActive}
        setDispatchActive={(val) => {
           setDispatchActive(val);
           if (val) playVoiceAlert("Kurtarma timleri güvenli rota üzerinden intikale başladı. Operasyon devam ediyor.");
        }}
      />
      <div className="main-content">
        <MapComponent 
          earthquakes={earthquakes} 
          center={mapCenter} 
          selectedCity={selectedCity}
          cityBoundary={cityBoundary}
          mapStyle={mapStyle}
          onMapClick={handleMapClick}
          onQuakeClick={handleQuakeClick}
          routeStart={routeStart}
          routeEnd={routeEnd}
          routeData={routeData}
          isOperationMode={isOperationMode}
          dispatchActive={dispatchActive}
        />
        <Dashboard 
          earthquakes={earthquakes} 
          riskData={riskData} 
        />
      </div>
    </div>
  );
}

export default App;
