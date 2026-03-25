import React from 'react';
import { ArrowRight, BarChart3, Route, Satellite, ShieldCheck, Waves, Wind } from 'lucide-react';

const TYPE_LABELS = {
  debris: 'Enkaz',
  collapse: 'Yapı hasarı',
  flood: 'Su baskını',
  bridge: 'Köprü riski',
  fire: 'Yangın',
  gas: 'Gaz riski',
  landslide: 'Heyelan',
};

const ROUTE_COPY = {
  safest: 'Primer güvenli koridor',
  balanced: 'Dengeli geçiş',
  shortest: 'Kısa ama riskli hat',
  contingency: 'Yedek acil hat',
};

function toneForRoute(routeKey) {
  if (routeKey === 'safest') return 'positive';
  if (routeKey === 'shortest') return 'danger';
  if (routeKey === 'contingency') return 'neutral';
  return 'warning';
}

export default function Dashboard({
  scenario,
  routeData,
  activeRouteKey,
  setActiveRouteKey,
}) {
  const routeEntries = routeData?.routes
    ? Object.entries(routeData.routes).filter(([, route]) => Boolean(route))
    : [];

  const hazardEntries = Object.entries(scenario?.stats?.countsByType || {});

  return (
    <aside className="dashboard dashboard-grid">
      <div className="panel floating-panel dashboard-card">
        <div className="section-title">
          <BarChart3 size={16} />
          <span>AI tespit dağılımı</span>
        </div>

        <div className="stack-list">
          {hazardEntries.map(([type, count]) => {
            const width = `${Math.max(24, (count / Math.max(scenario.stats.hazardCount, 1)) * 100)}%`;
            return (
              <div key={type} className="stack-row">
                <div className="stack-copy">
                  <strong>{TYPE_LABELS[type] || type}</strong>
                  <span>{count} bulgu</span>
                </div>
                <div className="stack-bar">
                  <div className="stack-fill" style={{ width }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel floating-panel dashboard-card">
          <div className="section-title">
            <ShieldCheck size={16} />
            <span>Risk katmanları</span>
          </div>

        <div className="metric-grid compact">
          <div className="metric-card">
            <span>Toplam bulgu</span>
            <strong>{scenario?.stats?.hazardCount ?? 0}</strong>
          </div>
          <div className="metric-card">
            <span>Kapali segment</span>
            <strong>{scenario?.stats?.blockedSegments ?? 0}</strong>
          </div>
            <div className="metric-card">
              <span>Hazırlılık</span>
              <strong>{scenario?.stats?.readinessScore ?? 0}</strong>
            </div>
            <div className="metric-card">
              <span>Ortalama şiddet</span>
              <strong>{scenario?.stats?.averageSeverity ?? 0}</strong>
            </div>
          </div>

        <div className="weather-strip">
          <div>
            <Waves size={15} />
            <span>{scenario?.weather?.humidity ?? 0}% nem</span>
          </div>
          <div>
            <Wind size={15} />
            <span>{scenario?.weather?.windKmh ?? 0} km/sa rüzgar</span>
          </div>
        </div>
      </div>

      <div className="panel floating-panel dashboard-card">
        <div className="section-title">
          <Route size={16} />
          <span>Koridor karşılaştırması</span>
        </div>

        <div className="mini-route-list compact-route-list route-grid-list">
          {routeEntries.map(([routeKey, route]) => (
            <button
              type="button"
              key={routeKey}
              className={`mini-route-card tone-${toneForRoute(routeKey)} ${activeRouteKey === routeKey ? 'is-active' : ''}`}
              onClick={() => setActiveRouteKey(routeKey)}
            >
              <div>
                <strong>{ROUTE_COPY[routeKey] || routeKey}</strong>
                <p>{route.distanceKm} km</p>
              </div>
              <div>
                <strong>{route.etaMinutes} dk</strong>
                <p>risk {route.riskScore}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {routeData?.analysis && (
        <div className="panel floating-panel dashboard-card">
          <div className="section-title">
            <ArrowRight size={16} />
            <span>Neden bu rota?</span>
          </div>

          <div className="analysis-card analysis-grid-card">
            <div className="analysis-stat">
              <span>Risk azalımı</span>
              <strong>%{Math.round(routeData.analysis.riskReductionPercent || 0)}</strong>
            </div>
            <div className="analysis-stat">
              <span>Kaçınılan hücre</span>
              <strong>{routeData.analysis.avoidedBlockedCells}</strong>
            </div>
            <div className="analysis-stat">
              <span>Tarama kapsamı</span>
              <strong>{routeData.analysis.scanSummary.sectorsScanned}</strong>
            </div>
          </div>

          <div className="bullet-list compact-bullet-list">
            {(routeData.analysis.brief || []).map((line) => (
              <div key={line} className="bullet-item">
                <span className="bullet-dot" />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel floating-panel dashboard-card">
        <div className="section-title">
          <Satellite size={16} />
          <span>BKZS zaman penceresi</span>
        </div>

        <div className="compact-timeline-list timeline-stat-grid">
          <div className="timeline-stat">
            <span>Son tarama</span>
            <strong>{scenario?.mission?.scanAgeMinutes} dk</strong>
            <p>güncellendi</p>
          </div>
          <div className="timeline-stat">
            <span>AI güven</span>
            <strong>%{Math.round((scenario?.mission?.confidence || 0) * 100)}</strong>
            <p>doğrulama</p>
          </div>
          <div className="timeline-stat timeline-stat-wide">
            <span>Aktif rota modu</span>
            <strong>{ROUTE_COPY[activeRouteKey] || activeRouteKey}</strong>
            <p>haritada vurgulanıyor</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
