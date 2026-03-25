import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Orbit, Radar } from 'lucide-react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import './index.css';

const API_BASE = 'http://localhost:5000';

function getSite(scenario, siteId) {
  return scenario?.sites?.find((site) => site.id === siteId) || null;
}

function App() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedStartSiteId, setSelectedStartSiteId] = useState('');
  const [selectedEndSiteId, setSelectedEndSiteId] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [activeRouteKey, setActiveRouteKey] = useState('safest');
  const [dispatchActive, setDispatchActive] = useState(false);
  const [scanPulse, setScanPulse] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRouting, setIsRouting] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [mapStyle, setMapStyle] = useState('satellite');
  const [statusText, setStatusText] = useState('BKZS görev konsolu hazırlanıyor');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/scenarios`);
        const incomingScenarios = response.data || [];
        setScenarios(incomingScenarios);

        if (incomingScenarios.length > 0) {
          const firstScenario = incomingScenarios[0];
          setSelectedScenario(firstScenario);
          setSelectedStartSiteId(firstScenario.defaultRoute.startSiteId);
          setSelectedEndSiteId(firstScenario.defaultRoute.endSiteId);
          await fetchRoute(firstScenario, firstScenario.defaultRoute.startSiteId, firstScenario.defaultRoute.endSiteId, false);
        }
      } catch (error) {
        console.error('Failed to load scenarios', error);
        setStatusText('Senaryo verisi yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    loadScenarios();
  }, []);

  const fetchRoute = async (scenario, startSiteId, endSiteId, withScanAnimation = true) => {
    if (!scenario) {
      return;
    }

    const startSite = getSite(scenario, startSiteId);
    const endSite = getSite(scenario, endSiteId);
    if (!startSite || !endSite) {
      return;
    }

    setIsRouting(true);
    setDispatchActive(false);
    setStatusText(withScanAnimation ? 'Yerli uydu taraması ve rota yeniden hesaplanıyor' : 'Güvenli rota oluşturuluyor');

    if (withScanAnimation) {
      setScanPulse(true);
    }

    try {
      const response = await axios.post(`${API_BASE}/api/route`, {
        scenarioId: scenario.id,
        start: startSite.coords,
        end: endSite.coords,
        includeContingency: true,
      });

      setRouteData(response.data);
      setSelectedScenario(response.data.scenario);
      setActiveRouteKey(response.data.analysis?.recommendedMode || 'safest');
      setStatusText('Görev koridoru hazır. En güvenli rota aktif.');
    } catch (error) {
      console.error('Route request failed', error);
      setStatusText('Rota hesaplanamadı');
    } finally {
      setIsRouting(false);
      window.setTimeout(() => setScanPulse(false), 900);
    }
  };

  const handleScenarioSelect = (scenarioId) => {
    const scenario = scenarios.find((entry) => entry.id === scenarioId);
    if (!scenario) {
      return;
    }

    const nextStart = scenario.defaultRoute.startSiteId;
    const nextEnd = scenario.defaultRoute.endSiteId;

    setSelectedScenario(scenario);
    setSelectedStartSiteId(nextStart);
    setSelectedEndSiteId(nextEnd);
    setRouteData(null);
    setStatusText(`${scenario.city} görev alanı yükleniyor`);
    fetchRoute(scenario, nextStart, nextEnd, true);
  };

  const handleRefresh = () => {
    fetchRoute(selectedScenario, selectedStartSiteId, selectedEndSiteId, true);
  };

  const handleRouteUpdate = (startSiteId = selectedStartSiteId, endSiteId = selectedEndSiteId) => {
    fetchRoute(selectedScenario, startSiteId, endSiteId, false);
  };

  const handleStartChange = (siteId) => {
    setSelectedStartSiteId(siteId);
    handleRouteUpdate(siteId, selectedEndSiteId);
  };

  const handleEndChange = (siteId) => {
    setSelectedEndSiteId(siteId);
    handleRouteUpdate(selectedStartSiteId, siteId);
  };

  if (loading) {
    return (
      <div className="launch-screen">
        <div className="launch-core">
          <Orbit size={42} />
        </div>
        <h1>BKZS Mission Console</h1>
        <p>Uydu tarama, risk birleştirme ve güvenli koridor motoru başlatılıyor.</p>
      </div>
    );
  }

  const alertState = selectedScenario?.stats?.criticalCount >= 2;
  const activeStart = getSite(selectedScenario, selectedStartSiteId);
  const activeEnd = getSite(selectedScenario, selectedEndSiteId);

  return (
    <div className="app-shell">
      <Sidebar
        scenarios={scenarios}
        selectedScenario={selectedScenario}
        selectedStartSiteId={selectedStartSiteId}
        selectedEndSiteId={selectedEndSiteId}
        onScenarioSelect={handleScenarioSelect}
        onStartChange={handleStartChange}
        onEndChange={handleEndChange}
        onRefresh={handleRefresh}
        routeData={routeData}
        dispatchActive={dispatchActive}
        setDispatchActive={setDispatchActive}
        theme={theme}
        setTheme={setTheme}
        mapStyle={mapStyle}
        setMapStyle={setMapStyle}
        isRouting={isRouting}
      />

      <main className="workspace">
        <section className="mission-strip">
          <div>
            <p className="eyebrow">Afet Yönetiminde Yerli Uydu Verisi Entegrasyonu</p>
            <h1>{selectedScenario?.name}</h1>
            <p className="mission-brief">{selectedScenario?.mission?.brief}</p>
          </div>

          <div className="scan-chip-row">
            <div className={`scan-chip ${scanPulse ? 'is-active' : ''}`}>
              <Radar size={16} />
              <span>{statusText}</span>
            </div>
            {alertState && selectedScenario && (
              <div className="scan-chip danger-chip">
                <AlertTriangle size={16} />
                <span>{`${selectedScenario.city} görev alanında kritik bulgular var`}</span>
              </div>
            )}
            {activeStart && activeEnd && (
              <div className="scan-chip subtle">
                <span>{`${activeStart.label} -> ${activeEnd.label}`}</span>
              </div>
            )}
          </div>
        </section>

        <section className="map-stage">
          <MapComponent
            scenario={selectedScenario}
            routeData={routeData}
            mapStyle={mapStyle}
            activeRouteKey={activeRouteKey}
            dispatchActive={dispatchActive}
          />
          <Dashboard
            scenario={selectedScenario}
            routeData={routeData}
            activeRouteKey={activeRouteKey}
            setActiveRouteKey={setActiveRouteKey}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
