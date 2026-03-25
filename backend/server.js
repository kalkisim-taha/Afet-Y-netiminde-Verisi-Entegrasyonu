const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { SCENARIOS, HAZARD_META, getScenarioById, getSiteById, summarizeScenario } = require('./data/scenarios');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

class PriorityQueue {
  constructor() { this.elements = []; }
  isEmpty() { return this.elements.length === 0; }
  put(item, priority) {
    this.elements.push({item, priority});
    this.elements.sort((a,b) => a.priority - b.priority);
  }
  get() { return this.elements.shift().item; }
}

const haversineDistance = (p1, p2) => {
    const R = 6371; 
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLon = (p2[1] - p1[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const averagePoint = (points) => {
  const total = points.reduce(
    (acc, point) => {
      acc.lat += point[0];
      acc.lon += point[1];
      return acc;
    },
    { lat: 0, lon: 0 }
  );

  return [total.lat / points.length, total.lon / points.length];
};

function projectToPlane(origin, point) {
  const latScale = 111;
  const lonScale = 111 * Math.cos((origin[0] * Math.PI) / 180);

  return {
    x: (point[1] - origin[1]) * lonScale,
    y: (point[0] - origin[0]) * latScale,
  };
}

function distanceToSegmentKm(point, segmentStart, segmentEnd) {
  const origin = averagePoint([point, segmentStart, segmentEnd]);
  const p = projectToPlane(origin, point);
  const a = projectToPlane(origin, segmentStart);
  const b = projectToPlane(origin, segmentEnd);
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const ab2 = abx * abx + aby * aby;

  if (ab2 === 0) {
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  }

  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ratio = clamp((apx * abx + apy * aby) / ab2, 0, 1);
  const closestX = a.x + abx * ratio;
  const closestY = a.y + aby * ratio;

  return Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2);
}

function getBoundsForRoute(scenario, start, end) {
  const points = [start, end, ...scenario.hazards.map((hazard) => hazard.center)];
  const minLat = Math.min(...points.map((point) => point[0])) - 0.01;
  const maxLat = Math.max(...points.map((point) => point[0])) + 0.01;
  const minLon = Math.min(...points.map((point) => point[1])) - 0.01;
  const maxLon = Math.max(...points.map((point) => point[1])) + 0.01;

  return { minLat, maxLat, minLon, maxLon };
}

function scoreCell(cellPoint, scenario) {
  let risk = 0;
  let blocked = false;
  let drivers = [];

  scenario.hazards.forEach((hazard) => {
    const meta = HAZARD_META[hazard.type];
    const distanceKm = haversineDistance(cellPoint, hazard.center);
    const spreadKm = hazard.radiusKm * 1.9;

    if (distanceKm > spreadKm) {
      return;
    }

    const ratio = 1 - distanceKm / spreadKm;
    const impact = meta.weight * hazard.severity * ratio;

    risk += impact;
    if (impact > 8) {
      drivers.push({
        type: hazard.type,
        label: hazard.label,
        impact: Number(impact.toFixed(1)),
        color: meta.color,
      });
    }

    if (distanceKm < hazard.radiusKm * meta.blockFactor * 0.55 && hazard.severity > 0.76) {
      blocked = true;
    }
  });

  scenario.safeCorridors.forEach((corridor) => {
    const laneDistance = distanceToSegmentKm(cellPoint, corridor.path[0], corridor.path[1]);
    if (laneDistance < corridor.widthKm) {
      const relief = corridor.boost * (1 - laneDistance / corridor.widthKm);
      risk -= relief;
      drivers.push({
        type: 'safe-corridor',
        label: corridor.label,
        impact: Number((-relief).toFixed(1)),
        color: '#10b981',
      });
    }
  });

  const weatherPenalty =
    clamp((scenario.weather.windKmh - 10) * 0.6, 0, 12) +
    clamp((scenario.weather.humidity - 45) * 0.18, 0, 8);

  risk += weatherPenalty;
  const normalized = clamp(risk, 0, 100);

  return {
    risk: normalized,
    blocked,
    topDrivers: drivers
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 3),
  };
}

function buildGrid(scenario, start, end) {
  const { minLat, maxLat, minLon, maxLon } = getBoundsForRoute(scenario, start, end);
  const width = 34;
  const height = 34;
  const latStep = (maxLat - minLat) / height;
  const lonStep = (maxLon - minLon) / width;
  const grid = [];

  for (let y = 0; y < height; y += 1) {
    const row = [];
    for (let x = 0; x < width; x += 1) {
      const point = [minLat + y * latStep + latStep / 2, minLon + x * lonStep + lonStep / 2];
      const score = scoreCell(point, scenario);

      row.push({
        x,
        y,
        lat: point[0],
        lon: point[1],
        risk: score.risk,
        blocked: score.blocked,
        topDrivers: score.topDrivers,
      });
    }
    grid.push(row);
  }

  return { grid, width, height, latStep, lonStep, minLat, minLon };
}

function toGridCell(point, layout) {
  let x = Math.floor((point[1] - layout.minLon) / layout.lonStep);
  let y = Math.floor((point[0] - layout.minLat) / layout.latStep);
  x = clamp(x, 0, layout.width - 1);
  y = clamp(y, 0, layout.height - 1);
  return { x, y };
}

function getNeighbors(node, layout) {
  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  return directions
    .map(([dx, dy]) => ({ x: node.x + dx, y: node.y + dy }))
    .filter((candidate) => candidate.x >= 0 && candidate.x < layout.width && candidate.y >= 0 && candidate.y < layout.height)
    .map((candidate) => layout.grid[candidate.y][candidate.x]);
}

function reconstructPath(cameFrom, endNode, start, end) {
  let current = endNode;
  let key = `${current.x},${current.y}`;
  const path = [];
  let totalRisk = 0;
  let totalDistance = 0;
  let blockedNearby = 0;
  const usedKeys = new Set();
  const driverMap = new Map();

  while (current) {
    path.push([current.lat, current.lon]);
    usedKeys.add(key);
    totalRisk += current.risk;
    if (current.blocked) {
      blockedNearby += 1;
    }
    current.topDrivers.forEach((driver) => {
      if (driver.type === 'safe-corridor') {
        return;
      }
      driverMap.set(driver.type, (driverMap.get(driver.type) || 0) + Math.abs(driver.impact));
    });

    const previous = cameFrom.get(key);
    if (previous) {
      totalDistance += haversineDistance([current.lat, current.lon], [previous.lat, previous.lon]);
      key = `${previous.x},${previous.y}`;
    }
    current = previous || null;
  }

  path.reverse();
  if (path.length) {
    path[0] = start;
    path[path.length - 1] = end;
  }

  const driverSummary = [...driverMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, impact]) => `${HAZARD_META[type]?.label || type} etkisi ${impact.toFixed(0)}`);

  const avgRisk = totalDistance > 0 ? totalRisk / Math.max(path.length, 1) : totalRisk;
  const speedKmh = clamp(48 - avgRisk * 0.35, 10, 52);
  const etaMinutes = totalDistance > 0 ? Math.ceil((totalDistance / speedKmh) * 60) : 0;

  return {
    path,
    riskScore: Number(avgRisk.toFixed(1)),
    distanceKm: Number(totalDistance.toFixed(1)),
    etaMinutes,
    blockedNearby,
    driverSummary,
    usedKeys,
  };
}

function buildDirectRoute(start, end, scenario) {
  const points = [];
  const samples = 24;
  let totalDistance = 0;
  let totalRisk = 0;
  let blockedNearby = 0;
  const driverMap = new Map();
  let previous = null;

  for (let step = 0; step <= samples; step += 1) {
    const ratio = step / samples;
    const point = [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio,
    ];

    const score = scoreCell(point, scenario);
    points.push(point);
    totalRisk += score.risk;

    if (score.blocked) {
      blockedNearby += 1;
    }

    score.topDrivers.forEach((driver) => {
      if (driver.type === 'safe-corridor') {
        return;
      }
      driverMap.set(driver.type, (driverMap.get(driver.type) || 0) + Math.abs(driver.impact));
    });

    if (previous) {
      totalDistance += haversineDistance(previous, point);
    }
    previous = point;
  }

  const avgRisk = totalRisk / Math.max(points.length, 1);
  const speedKmh = clamp(46 - avgRisk * 0.28, 8, 48);
  const driverSummary = [...driverMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, impact]) => `${HAZARD_META[type]?.label || type} etkisi ${impact.toFixed(0)}`);

  return {
    path: points,
    riskScore: Number(avgRisk.toFixed(1)),
    distanceKm: Number(totalDistance.toFixed(1)),
    etaMinutes: Math.ceil((totalDistance / speedKmh) * 60),
    blockedNearby,
    driverSummary,
    usedKeys: new Set(),
  };
}

function serializeRoute(route) {
  if (!route) {
    return null;
  }

  return {
    path: route.path,
    riskScore: route.riskScore,
    distanceKm: route.distanceKm,
    etaMinutes: route.etaMinutes,
    blockedNearby: route.blockedNearby,
    driverSummary: route.driverSummary,
  };
}

function runAStar(mode, layout, start, end, primaryPathKeys = new Set()) {
  const startNode = toGridCell(start, layout);
  const endNode = toGridCell(end, layout);
  const frontier = new PriorityQueue();
  const cameFrom = new Map();
  const costSoFar = new Map();
  const startKey = `${startNode.x},${startNode.y}`;
  const startCell = layout.grid[startNode.y][startNode.x];

  frontier.put(startCell, 0);
  cameFrom.set(startKey, null);
  costSoFar.set(startKey, 0);

  while (!frontier.isEmpty()) {
    const current = frontier.get();
    const currentKey = `${current.x},${current.y}`;

    if (current.x === endNode.x && current.y === endNode.y) {
      break;
    }

    getNeighbors(current, layout).forEach((next) => {
      const nextKey = `${next.x},${next.y}`;
      let stepCost = haversineDistance([current.lat, current.lon], [next.lat, next.lon]);

      if (mode === 'shortest') {
        if (next.blocked) {
          stepCost += 48;
        }
        stepCost += next.risk * 0.06;
      }
      if (mode === 'balanced') {
        if (next.blocked) {
          stepCost += 190;
        }
        stepCost += next.risk * 0.7;
      }
      if (mode === 'safest') {
        if (next.blocked) {
          stepCost += 420;
        }
        stepCost += next.risk * 1.24;
        if (next.risk > 42) {
          stepCost += 24;
        }
      }
      if (mode === 'alternative') {
        if (next.blocked) {
          stepCost += 360;
        }
        stepCost += next.risk * 1.02;
        if (primaryPathKeys.has(nextKey)) {
          stepCost += 42;
        }
      }

      const newCost = costSoFar.get(currentKey) + stepCost;
      if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)) {
        costSoFar.set(nextKey, newCost);
        const heuristic = haversineDistance(
          [next.lat, next.lon],
          [layout.grid[endNode.y][endNode.x].lat, layout.grid[endNode.y][endNode.x].lon]
        );
        frontier.put(next, newCost + heuristic);
        cameFrom.set(nextKey, current);
      }
    });
  }

  return reconstructPath(cameFrom, layout.grid[endNode.y][endNode.x], start, end);
}

function buildResponseScenario(scenario) {
  const summary = summarizeScenario(scenario);

  return {
    ...summary,
    sites: scenario.sites,
    hazards: scenario.hazards.map((hazard) => ({
      ...hazard,
      color: HAZARD_META[hazard.type]?.color,
      typeLabel: HAZARD_META[hazard.type]?.label,
    })),
    safeCorridors: scenario.safeCorridors,
    defaultRoute: scenario.defaultRoute,
  };
}

app.get('/api/scenarios', (req, res) => {
  res.json(SCENARIOS.map((scenario) => buildResponseScenario(scenario)));
});

app.get('/api/scenarios/:id', (req, res) => {
  const scenario = getScenarioById(req.params.id);
  if (!scenario) {
    return res.status(404).json({ error: 'Scenario not found' });
  }

  return res.json(buildResponseScenario(scenario));
});

app.post('/api/route', (req, res) => {
  const { scenarioId, start, end, includeContingency = true } = req.body;
  const scenario = getScenarioById(scenarioId);

  if (!scenario) {
    return res.status(404).json({ error: 'Scenario not found' });
  }

  let startPoint = start;
  let endPoint = end;

  if (!startPoint || !endPoint) {
    const defaultStart = getSiteById(scenario, scenario.defaultRoute.startSiteId);
    const defaultEnd = getSiteById(scenario, scenario.defaultRoute.endSiteId);
    startPoint = defaultStart.coords;
    endPoint = defaultEnd.coords;
  }

  const layout = buildGrid(scenario, startPoint, endPoint);
  const shortest = buildDirectRoute(startPoint, endPoint, scenario);
  const balanced = runAStar('balanced', layout, startPoint, endPoint);
  const safest = runAStar('safest', layout, startPoint, endPoint);
  const contingency = includeContingency ? runAStar('alternative', layout, startPoint, endPoint, safest.usedKeys) : null;

  const riskReductionScore = Math.max(0, shortest.riskScore - safest.riskScore);
  const riskReductionPercent =
    shortest.riskScore > 0 ? (riskReductionScore / shortest.riskScore) * 100 : 0;
  const dangerousCells = layout.grid
    .flat()
    .filter((cell) => cell.blocked || cell.risk >= 32)
    .map((cell) => ({
      lat: cell.lat,
      lon: cell.lon,
      risk: Number(cell.risk.toFixed(1)),
      blocked: cell.blocked,
      topDriver: cell.topDrivers[0] || null,
    }));

  return res.json({
    scenario: buildResponseScenario(scenario),
    routes: {
      shortest: serializeRoute(shortest),
      balanced: serializeRoute(balanced),
      safest: serializeRoute(safest),
      contingency: serializeRoute(contingency),
    },
    analysis: {
      recommendedMode: 'safest',
      riskReduction: Number(riskReductionScore.toFixed(1)),
      riskReductionPercent: Number(riskReductionPercent.toFixed(1)),
      avoidedBlockedCells: Math.max(0, shortest.blockedNearby - safest.blockedNearby),
      etaBufferMinutes: Math.max(0, safest.etaMinutes - shortest.etaMinutes),
      scanSummary: {
        sectorsScanned: layout.width * layout.height,
        aiFindings: scenario.hazards.length,
        confidence: scenario.mission.confidence,
      },
      brief: safest.driverSummary,
    },
    dangerousCells,
    cellDimensions: { lat: layout.latStep, lon: layout.lonStep },
  });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
