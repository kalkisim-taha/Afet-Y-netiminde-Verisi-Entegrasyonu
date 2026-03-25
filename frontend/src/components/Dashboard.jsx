import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Wifi, TrendingUp } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Dashboard({ earthquakes, riskData }) {
  const totalQuakes = earthquakes.length;
  let highestMag = 0;
  earthquakes.forEach(q => {
    if (q.properties.mag > highestMag) highestMag = q.properties.mag;
  });

  const recentQuakes = earthquakes.slice(0, 20).reverse();
  const chartData = {
    labels: recentQuakes.map(q => new Date(q.properties.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [
      {
        label: 'Şiddet Yapay Zeka Trendi',
        data: recentQuakes.map(q => q.properties.mag),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ef4444',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: 'inherit' } },
      title: { display: false }
    },
    scales: {
      x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.1)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(128,128,128,0.1)' } }
    }
  };

  return (
    <div className="dashboard-overlay">
      <div className="glass-panel text-center" style={{padding: '1rem'}}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
          <TrendingUp size={20} color="#3b82f6" />
          Yapay Zeka Tahmin Analizi
        </h3>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>Hacim ve trend modellemesi.</p>
        <div style={{ height: '160px' }}>
          {totalQuakes > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
             <div style={{color: '#94a3b8', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               Veri Bekleniyor...
             </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{padding: '1rem'}}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1rem' }}>
          <Wifi size={18} color="#10b981" />
          Küresel Makro İstatistikler (7 Gün)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <div className="stat-card">
            <span className="text-muted" style={{fontSize: '0.9rem'}}>Toplam Etkinlikler</span>
            <span className="stat-value" style={{fontSize: '1.25rem'}}>{totalQuakes}</span>
          </div>
          <div className="stat-card">
            <span className="text-muted" style={{fontSize: '0.9rem'}}>Tepe Yoğunluğu (Maks. Büyüklük)</span>
            <span className="stat-value" style={{fontSize: '1.25rem', color: '#ef4444'}}>{highestMag.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
