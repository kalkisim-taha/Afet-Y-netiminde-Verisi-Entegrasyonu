import React from 'react';
import {
  Activity,
  Layers,
  Map,
  Moon,
  RefreshCw,
  Satellite,
  Sparkles,
  Sun,
  Truck,
} from 'lucide-react';

function formatClock(isoString) {
  if (!isoString) {
    return '--:--';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

function formatPercent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

export default function Sidebar({
  scenarios,
  selectedScenario,
  selectedStartSiteId,
  selectedEndSiteId,
  onScenarioSelect,
  onStartChange,
  onEndChange,
  onRefresh,
  routeData,
  dispatchActive,
  setDispatchActive,
  theme,
  setTheme,
  mapStyle,
  setMapStyle,
  isRouting,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <div className="brand-row">
            <Activity size={28} />
            <div>
              <p className="eyebrow">BKZS destekli</p>
              <h2>Mission Console</h2>
            </div>
          </div>
          <p className="muted-copy">
            Uydu tespitlerini, risk katmanlarını ve kurtarma rotalarını tek ekranda birleştiren demo.
          </p>
        </div>
        <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} type="button">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <section className="panel">
        <div className="section-title">
          <Sparkles size={16} />
          <span>Görev senaryoları</span>
        </div>

        <div className="scenario-grid">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className={`scenario-card ${selectedScenario?.id === scenario.id ? 'is-selected' : ''}`}
              onClick={() => onScenarioSelect(scenario.id)}
            >
              <div>
                <strong>{scenario.city}</strong>
                <p>{scenario.mission.title}</p>
              </div>
              <span>{scenario.stats.criticalCount} kritik bulgu</span>
            </button>
          ))}
        </div>
      </section>

      {selectedScenario && (
        <section className="panel">
          <div className="section-title">
            <Satellite size={16} />
            <span>Uydu görev özeti</span>
          </div>

          <div className="metric-grid compact">
            <div className="metric-card">
              <span>Son tarama</span>
              <strong>{formatClock(selectedScenario.mission.updatedAt)}</strong>
            </div>
            <div className="metric-card">
              <span>Sonraki pencere</span>
              <strong>{formatClock(selectedScenario.mission.nextWindow)}</strong>
            </div>
            <div className="metric-card">
              <span>Çözünürlük</span>
              <strong>{selectedScenario.mission.resolutionLabel}</strong>
            </div>
            <div className="metric-card">
              <span>Güven skoru</span>
              <strong>{formatPercent(selectedScenario.mission.confidence)}</strong>
            </div>
          </div>
        </section>
      )}

      {selectedScenario && (
        <div className="sidebar-inline-panels">
          <section className="panel panel-wide">
            <div className="section-title">
              <Map size={16} />
              <span>Görev noktası seçimi</span>
            </div>

            <label className="field-label" htmlFor="start-site">
              Çıkış noktası
            </label>
            <select
              id="start-site"
              className="select-input"
              value={selectedStartSiteId}
              onChange={(event) => onStartChange(event.target.value)}
            >
              {selectedScenario.sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.label}
                </option>
              ))}
            </select>

            <label className="field-label" htmlFor="end-site">
              Hedef noktası
            </label>
            <select
              id="end-site"
              className="select-input"
              value={selectedEndSiteId}
              onChange={(event) => onEndChange(event.target.value)}
            >
              {selectedScenario.sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.label}
                </option>
              ))}
            </select>

            <div className="action-row">
              <button className="btn primary" type="button" onClick={onRefresh} disabled={isRouting}>
                <RefreshCw size={16} className={isRouting ? 'spin' : ''} />
                Uydu taramayı yenile
              </button>
              <button
                className={`btn ${dispatchActive ? 'success' : ''}`}
                type="button"
                onClick={() => setDispatchActive(!dispatchActive)}
                disabled={!routeData}
              >
                <Truck size={16} />
                {dispatchActive ? 'İntikal aktif' : 'Ekibi sevk et'}
              </button>
            </div>
          </section>

          <section className="panel panel-narrow">
            <div className="section-title">
              <Layers size={16} />
              <span>Harita katmanı</span>
            </div>

            <div className="toggle-row sidebar-toggle-column">
              {[
                { id: 'satellite', label: 'Uydu' },
                { id: 'dark', label: 'Gece' },
                { id: 'street', label: 'Sokak' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`toggle-chip ${mapStyle === option.id ? 'is-active' : ''}`}
                  onClick={() => setMapStyle(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
