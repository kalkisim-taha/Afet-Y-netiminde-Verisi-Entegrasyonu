const SCENARIOS = [
  {
    id: 'hatay-urban',
    name: 'Hatay Merkez Kurtarma Koridoru',
    city: 'Hatay',
    center: [36.2015, 36.1607],
    bounds: [
      [36.186, 36.136],
      [36.217, 36.191],
    ],
    mission: {
      title: 'Yoğun enkaz altında güvenli ulaşım',
      brief:
        'Afet sonrası uydu taraması ile enkaz, su birikmesi ve köprü riski tespit edilerek ekipler için güvenli koridor üretilir.',
      updatedAt: '2026-03-25T17:06:00Z',
      nextWindow: '2026-03-25T17:18:00Z',
      scanAgeMinutes: 6,
      sourceLabel: 'Yerli uydu uyumlu demo veri',
      resolutionLabel: '0.9 m',
      scanAreaKm2: 18.4,
      confidence: 0.91,
    },
    weather: {
      temperatureC: 22,
      windKmh: 14,
      humidity: 43,
      visibilityKm: 9.6,
    },
    sites: [
      { id: 'cmd', label: 'AFAD Komuta', role: 'command', coords: [36.1948, 36.1452] },
      { id: 'log', label: 'Mobil Lojistik', role: 'logistics', coords: [36.1889, 36.1738] },
      { id: 'field', label: 'Saha Hastanesi', role: 'hospital', coords: [36.2108, 36.1845] },
      { id: 'shelter', label: 'Toplanma Alanı', role: 'shelter', coords: [36.2141, 36.1522] },
      { id: 'rescue', label: 'Arama Kurtarma Noktası', role: 'target', coords: [36.2062, 36.1764] },
    ],
    defaultRoute: { startSiteId: 'cmd', endSiteId: 'rescue' },
    hazards: [
      { id: 'hz-1', type: 'debris', label: 'Enkaz koridoru', center: [36.2002, 36.1577], radiusKm: 0.75, severity: 0.94 },
      { id: 'hz-2', type: 'collapse', label: 'Yıkık yapı kümesi', center: [36.2059, 36.1699], radiusKm: 0.48, severity: 0.88 },
      { id: 'hz-3', type: 'flood', label: 'Su birikmesi', center: [36.1968, 36.1728], radiusKm: 0.52, severity: 0.74 },
      { id: 'hz-4', type: 'bridge', label: 'Viyaduk servis riski', center: [36.2037, 36.1814], radiusKm: 0.44, severity: 0.92 },
      { id: 'hz-5', type: 'gas', label: 'Gaz sızıntısı ihtimali', center: [36.2089, 36.1626], radiusKm: 0.36, severity: 0.67 },
    ],
    safeCorridors: [
      { id: 'sc-1', label: 'Kuzey lojistik koridoru', path: [[36.1932, 36.1449], [36.2119, 36.1826]], widthKm: 0.42, boost: 26 },
      { id: 'sc-2', label: 'Okul caddesi acil şerit', path: [[36.1896, 36.1718], [36.2132, 36.1534]], widthKm: 0.28, boost: 18 },
    ],
  },
  {
    id: 'izmir-flood',
    name: 'İzmir Kıyı Tahliye Ağları',
    city: 'İzmir',
    center: [38.4325, 27.153],
    bounds: [
      [38.414, 27.129],
      [38.448, 27.183],
    ],
    mission: {
      title: 'Sel sonrası acil erişim planlama',
      brief:
        'Kıyı bandında su baskını ve yol kapanması tespitleri birleştirilerek ekipler için alternatif tahliye ağları çıkarılır.',
      updatedAt: '2026-03-25T16:52:00Z',
      nextWindow: '2026-03-25T17:10:00Z',
      scanAgeMinutes: 9,
      sourceLabel: 'Yerli uydu uyumlu demo veri',
      resolutionLabel: '1.2 m',
      scanAreaKm2: 21.8,
      confidence: 0.87,
    },
    weather: {
      temperatureC: 19,
      windKmh: 22,
      humidity: 66,
      visibilityKm: 7.8,
    },
    sites: [
      { id: 'cmd', label: 'Seferihisar Komuta', role: 'command', coords: [38.4209, 27.1359] },
      { id: 'dock', label: 'Lojistik İskele', role: 'logistics', coords: [38.4261, 27.1704] },
      { id: 'field', label: 'Sahra Hastanesi', role: 'hospital', coords: [38.4444, 27.1745] },
      { id: 'shelter', label: 'Yüksek Alan Toplanma', role: 'shelter', coords: [38.4414, 27.1411] },
      { id: 'rescue', label: 'Kritik Mahalle', role: 'target', coords: [38.4338, 27.1631] },
    ],
    defaultRoute: { startSiteId: 'dock', endSiteId: 'rescue' },
    hazards: [
      { id: 'hz-1', type: 'flood', label: 'Kıyı taşkın cebi', center: [38.4314, 27.1573], radiusKm: 0.88, severity: 0.95 },
      { id: 'hz-2', type: 'debris', label: 'Sürüklenen araç yoğunluğu', center: [38.4369, 27.1481], radiusKm: 0.56, severity: 0.79 },
      { id: 'hz-3', type: 'bridge', label: 'Alt geçit servisi dışı', center: [38.4298, 27.1687], radiusKm: 0.47, severity: 0.89 },
      { id: 'hz-4', type: 'gas', label: 'Enerji hattı riski', center: [38.4396, 27.1605], radiusKm: 0.31, severity: 0.63 },
    ],
    safeCorridors: [
      { id: 'sc-1', label: 'Yüksek kot tahliye şeridi', path: [[38.4211, 27.1364], [38.4445, 27.1738]], widthKm: 0.38, boost: 24 },
      { id: 'sc-2', label: 'İç mahalle servis hattı', path: [[38.4411, 27.1413], [38.4341, 27.1642]], widthKm: 0.22, boost: 14 },
    ],
  },
  {
    id: 'istanbul-logistics',
    name: 'İstanbul Lojistik Acil Geçiş',
    city: 'İstanbul',
    center: [41.0156, 28.9638],
    bounds: [
      [40.996, 28.939],
      [41.033, 28.99],
    ],
    mission: {
      title: 'Köprü ve arter riski altında lojistik sevk',
      brief:
        'Yol üstü yapısal hasar ve duman tespitlerinden sonra kritik yardım malzemesi için geçiş puanı en yüksek rota seçilir.',
      updatedAt: '2026-03-25T17:01:00Z',
      nextWindow: '2026-03-25T17:14:00Z',
      scanAgeMinutes: 7,
      sourceLabel: 'Yerli uydu uyumlu demo veri',
      resolutionLabel: '0.8 m',
      scanAreaKm2: 24.6,
      confidence: 0.89,
    },
    weather: {
      temperatureC: 17,
      windKmh: 18,
      humidity: 58,
      visibilityKm: 8.9,
    },
    sites: [
      { id: 'cmd', label: 'İl Kriz Merkezi', role: 'command', coords: [41.0049, 28.9463] },
      { id: 'warehouse', label: 'Acil Yardım Deposu', role: 'logistics', coords: [41.0102, 28.9816] },
      { id: 'field', label: 'Marmara Saha Hastanesi', role: 'hospital', coords: [41.0286, 28.9861] },
      { id: 'shelter', label: 'Stadyum Toplanma', role: 'shelter', coords: [41.0271, 28.9508] },
      { id: 'rescue', label: 'Kritik Dağıtım Noktası', role: 'target', coords: [41.0184, 28.9727] },
    ],
    defaultRoute: { startSiteId: 'warehouse', endSiteId: 'rescue' },
    hazards: [
      { id: 'hz-1', type: 'fire', label: 'Sanayi duman hattı', center: [41.0157, 28.9651], radiusKm: 0.69, severity: 0.86 },
      { id: 'hz-2', type: 'bridge', label: 'Bağlantı rampası hasarı', center: [41.0217, 28.9577], radiusKm: 0.52, severity: 0.91 },
      { id: 'hz-3', type: 'debris', label: 'Arter üzeri enkaz', center: [41.0104, 28.9738], radiusKm: 0.43, severity: 0.78 },
      { id: 'hz-4', type: 'collapse', label: 'Yanal yapı hasarı', center: [41.0231, 28.9806], radiusKm: 0.35, severity: 0.74 },
    ],
    safeCorridors: [
      { id: 'sc-1', label: 'Kuzey servis aksı', path: [[41.0048, 28.9469], [41.0284, 28.9858]], widthKm: 0.35, boost: 21 },
      { id: 'sc-2', label: 'Acil transfer şeridi', path: [[41.0104, 28.9812], [41.0188, 28.9726]], widthKm: 0.18, boost: 16 },
    ],
  },
];

const HAZARD_META = {
  debris: { label: 'Enkaz', weight: 58, blockFactor: 1.0, color: '#f97316' },
  collapse: { label: 'Yapı hasarı', weight: 48, blockFactor: 0.9, color: '#ef4444' },
  flood: { label: 'Su baskını', weight: 64, blockFactor: 1.0, color: '#38bdf8' },
  bridge: { label: 'Köprü riski', weight: 70, blockFactor: 1.0, color: '#f59e0b' },
  fire: { label: 'Yangın / duman', weight: 60, blockFactor: 0.95, color: '#f43f5e' },
  landslide: { label: 'Heyelan', weight: 66, blockFactor: 1.0, color: '#84cc16' },
  gas: { label: 'Gaz riski', weight: 38, blockFactor: 0.5, color: '#c084fc' },
};

function getScenarioById(id) {
  return SCENARIOS.find((scenario) => scenario.id === id);
}

function getSiteById(scenario, siteId) {
  return scenario.sites.find((site) => site.id === siteId);
}

function summarizeScenario(scenario) {
  const countsByType = scenario.hazards.reduce((acc, hazard) => {
    acc[hazard.type] = (acc[hazard.type] || 0) + 1;
    return acc;
  }, {});

  const criticalCount = scenario.hazards.filter((hazard) => hazard.severity >= 0.85).length;
  const blockedSegments = scenario.hazards.filter((hazard) => HAZARD_META[hazard.type]?.blockFactor >= 0.9).length;
  const avgSeverity =
    scenario.hazards.reduce((total, hazard) => total + hazard.severity, 0) / scenario.hazards.length;

  return {
    id: scenario.id,
    name: scenario.name,
    city: scenario.city,
    center: scenario.center,
    mission: scenario.mission,
    weather: scenario.weather,
    stats: {
      hazardCount: scenario.hazards.length,
      blockedSegments,
      criticalCount,
      averageSeverity: Number(avgSeverity.toFixed(2)),
      readinessScore: Math.max(46, Math.round(100 - avgSeverity * 34 - criticalCount * 4)),
      countsByType,
    },
  };
}

module.exports = {
  SCENARIOS,
  HAZARD_META,
  getScenarioById,
  getSiteById,
  summarizeScenario,
};
