const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const cache = { earthquakes: { data: null, lastFetch: null }, weather: {} };
const CACHE_TTL_MS = 5 * 60 * 1000;

app.get('/api/earthquakes', async (req, res) => {
    try {
        const now = Date.now();
        if (cache.earthquakes.data && (now - cache.earthquakes.lastFetch < CACHE_TTL_MS)) {
            return res.json(cache.earthquakes.data);
        }
        const response = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson');
        cache.earthquakes.data = response.data;
        cache.earthquakes.lastFetch = now;
        res.json(response.data);
    } catch (error) { res.status(500).json({ error: "Failed to fetch earthquake data" }); }
});

app.get('/api/weather', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });

    const cacheKey = `${lat},${lon}`;
    const now = Date.now();
    if (cache.weather[cacheKey] && (now - cache.weather[cacheKey].lastFetch < CACHE_TTL_MS)) {
        return res.json(cache.weather[cacheKey].data);
    }
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`;
        const response = await axios.get(url);
        cache.weather[cacheKey] = { data: response.data.current, lastFetch: now };
        res.json(response.data.current);
    } catch (error) { res.status(500).json({ error: "Failed to fetch weather data" }); }
});

app.post('/api/risk', (req, res) => {
    const { features, weather, sensitivity } = req.body;
    if (!features || !Array.isArray(features)) return res.status(400).json({ error: "Invalid features array" });

    const frequency = features.length;
    let totalMagnitude = 0;
    features.forEach(quake => totalMagnitude += quake.properties.mag || 0);

    const averageMagnitude = frequency > 0 ? totalMagnitude / frequency : 0;
    const sensMultipliers = { 'low': 0.8, 'medium': 1.0, 'high': 1.2 };
    const multiplier = sensMultipliers[sensitivity] || 1.0;

    let baseScore = (frequency * 0.8) + (averageMagnitude * 2.5);
    let windImpact = 0;
    if (weather && weather.wind_speed_10m) {
        if (weather.wind_speed_10m > 15) windImpact = 5; 
        if (weather.wind_speed_10m > 25) windImpact = 10;
    }

    let riskScore = (baseScore + windImpact) * multiplier;
    riskScore = Math.min(riskScore, 100);

    let recentQuakesCount = features.filter(q => {
        const diffHours = Math.abs(new Date() - new Date(q.properties.time)) / 36e5;
        return diffHours < 48;
    }).length;

    let predictedScore = riskScore + (recentQuakesCount * 0.5 * multiplier);
    predictedScore = Math.min(predictedScore, 100);

    let riskLevel = 'Low'; let color = 'green';
    if (riskScore >= 65) { riskLevel = 'High'; color = 'red'; } 
    else if (riskScore > 35) { riskLevel = 'Medium'; color = 'yellow'; }

    res.json({
        score: riskScore.toFixed(1),
        predicted_48h: predictedScore.toFixed(1),
        level: riskLevel, color, frequency,
        averageMagnitude: averageMagnitude.toFixed(2),
        triggerAlert: (riskLevel === 'High' && predictedScore >= 70)
    });
});

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

app.post('/api/route', async (req, res) => {
    const { start, end, features, isOperationMode } = req.body;
    if (!start || !end) return res.status(400).json({ error: "Start and End points required" });
    
    const pointDist = haversineDistance(start, end);
    let padding = 0.05; 
    if (pointDist > 50) padding = 0.5; 
    if (pointDist > 500) padding = 1.0; 

    let minLat = Math.min(start[0], end[0]) - padding;
    let maxLat = Math.max(start[0], end[0]) + padding;
    let minLon = Math.min(start[1], end[1]) - padding;
    let maxLon = Math.max(start[1], end[1]) + padding;
    
    const GRID_W = 30;
    const GRID_H = 30;
    const latStep = (maxLat - minLat) / GRID_H;
    const lonStep = (maxLon - minLon) / GRID_W;

    const allCoords = [];
    for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
            allCoords.push({ x, y, lat: minLat + (y * latStep) + (latStep/2), lon: minLon + (x * lonStep) + (lonStep/2) });
        }
    }

    let elevations = [];
    try {
        for(let i = 0; i < allCoords.length; i += 90) {
            const chunk = allCoords.slice(i, i + 90);
            const lats = chunk.map(c => c.lat.toFixed(4)).join(',');
            const lons = chunk.map(c => c.lon.toFixed(4)).join(',');
            const elevRes = await axios.get(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`);
            elevations = elevations.concat(elevRes.data.elevation || Array(chunk.length).fill(10));
        }
    } catch (e) {
        elevations = Array(allCoords.length).fill(10);
    }

    const grid = [];
    let floodCount = 0;
    let debrisCount = 0;
    let coordIdx = 0;

    for (let y = 0; y < GRID_H; y++) {
        let row = [];
        for (let x = 0; x < GRID_W; x++) {
            const cellLat = allCoords[coordIdx].lat;
            const cellLon = allCoords[coordIdx].lon;
            const elev = elevations[coordIdx];
            coordIdx++;

            let rand = Math.abs(Math.sin(cellLat * 12.9898 + cellLon * 78.233)) * 43758.5453;
            rand = rand - Math.floor(rand);

            let cumulativeRisk = 0;
            let hasDebris = false;
            let hasFlood = false;
            let isSea = (elev <= 0.5);

            if (features) {
                features.forEach(q => {
                    const qLat = q.geometry.coordinates[1];
                    const qLon = q.geometry.coordinates[0];
                    const dist = haversineDistance([cellLat, cellLon], [qLat, qLon]);
                    if (dist < 100) { 
                        cumulativeRisk += Math.pow(Math.max(q.properties.mag, 2), 2) / Math.max(dist, 1);
                        if (dist < 20 && rand > 0.4) hasDebris = true;
                    }
                });
            }

            if (!hasDebris && rand > 0.95) hasFlood = true;
            if (!hasFlood && rand > 0.88 && rand <= 0.95) hasDebris = true;

            if (isSea) cumulativeRisk += 10000;
            if (hasDebris && !isSea) { cumulativeRisk += 80; debrisCount++; } // Increased debris risk for huge ETA penalties
            if (hasFlood && !isSea) { cumulativeRisk += 100; floodCount++; } 

            row.push({
                x, y,
                lat: cellLat, lon: cellLon,
                risk: Math.min(cumulativeRisk, 10000),
                anomaly: isSea ? null : (hasFlood ? 'Flood' : (hasDebris ? 'Debris' : null))
            });
        }
        grid.push(row);
    }

    const toGrid = (pt) => {
        let x = Math.floor((pt[1] - minLon) / lonStep);
        let y = Math.floor((pt[0] - minLat) / latStep);
        x = Math.max(0, Math.min(x, GRID_W - 1));
        y = Math.max(0, Math.min(y, GRID_H - 1));
        return {x, y};
    };

    const startNode = toGrid(start);
    const endNode = toGrid(end);

    const getNeighbors = (node) => {
        const dirs = [[0,1], [1,0], [0,-1], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
        const res = [];
        for (let d of dirs) {
            const nx = node.x + d[0];
            const ny = node.y + d[1];
            if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) res.push(grid[ny][nx]);
        }
        return res;
    };

    const runAStar = (mode, primaryPathKeys = new Set()) => {
        const frontier = new PriorityQueue();
        frontier.put(grid[startNode.y][startNode.x], 0);
        const came_from = new Map();
        const cost_so_far = new Map();
        const startKey = `${startNode.x},${startNode.y}`;
        
        came_from.set(startKey, null);
        cost_so_far.set(startKey, 0);

        while (!frontier.isEmpty()) {
            const current = frontier.get();
            if (current.x === endNode.x && current.y === endNode.y) break;
            const currKey = `${current.x},${current.y}`;
            
            for (let next of getNeighbors(current)) {
                const nextKey = `${next.x},${next.y}`;
                let moveCost = haversineDistance([current.lat, current.lon], [next.lat, next.lon]);
                
                if (next.risk >= 9000) moveCost += 10000;

                if (mode === 'safest' && next.risk < 9000) moveCost += (next.risk * 4.0);
                
                if (mode === 'alternative' && next.risk < 9000) {
                     moveCost += (next.risk * 4.0);
                     if (primaryPathKeys.has(nextKey)) moveCost += 150; 
                }

                const new_cost = cost_so_far.get(currKey) + moveCost;
                if (!cost_so_far.has(nextKey) || new_cost < cost_so_far.get(nextKey)) {
                    cost_so_far.set(nextKey, new_cost);
                    const priority = new_cost + haversineDistance([next.lat, next.lon], [grid[endNode.y][endNode.x].lat, grid[endNode.y][endNode.x].lon]);
                    frontier.put(next, priority);
                    came_from.set(nextKey, current);
                }
            }
        }

        let curr = grid[endNode.y][endNode.x];
        const path = [];
        let totalRisk = 0; let totalDistance = 0;
        const usedKeys = new Set();
        
        while (curr) {
            path.push([curr.lat, curr.lon]);
            usedKeys.add(`${curr.x},${curr.y}`);
            if (curr.risk < 9000) totalRisk += curr.risk; 
            const prev = came_from.get(`${curr.x},${curr.y}`);
            if (prev) totalDistance += haversineDistance([curr.lat, curr.lon], [prev.lat, prev.lon]);
            curr = prev;
        }

        path.reverse();
        if (path.length > 0) { path[0] = start; path[path.length - 1] = end; }
        
        // V9: ETA CALCULATION ALGORITHM
        // Default speed 60 km/h on clear roads.
        // Drops exponentially based on path risk density (debris, floods).
        let avgRiskPerKm = totalDistance > 0 ? (totalRisk / totalDistance) : 0;
        let speedLimit = 60 - (avgRiskPerKm * 1.8);
        if (speedLimit < 3) speedLimit = 3; // Absolute minimum crawl speed (3 km/h over heavy rubble)
        
        let etaMinutes = totalDistance > 0 ? (totalDistance / speedLimit) * 60 : 0;

        return { 
            path, 
            score: totalRisk.toFixed(1), 
            distance: totalDistance.toFixed(1), 
            eta: Math.ceil(etaMinutes),
            usedKeys 
        };
    };

    const shortest = runAStar('shortest');
    const safest = runAStar('safest');
    
    let safestAlt = null;
    if (isOperationMode) {
        safestAlt = runAStar('alternative', safest.usedKeys);
    }

    const dangerousCells = [];
    grid.forEach(row => { row.forEach(cell => {
         if (cell.anomaly || (cell.risk > 15 && cell.risk < 9000)) dangerousCells.push(cell);
    });});

    res.json({
        shortest, safest, safestAlt, dangerousCells,
        cellDimensions: { lat: latStep, lon: lonStep },
        satelliteReport: { sectorsScanned: GRID_W * GRID_H, debrisFound: debrisCount, floodedAreas: floodCount }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
