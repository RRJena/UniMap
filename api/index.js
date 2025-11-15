/**
 * UniMap OpenAI Plugin - Vercel Serverless Function
 * This is the main entry point for Vercel deployment
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Rate limiter for static files
const staticFileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// CORS headers for OpenAI
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve plugin manifest
app.get('/.well-known/ai-plugin.json', staticFileLimiter, (req, res) => {
  res.sendFile(join(__dirname, '..', '.well-known', 'ai-plugin.json'));
});

// Serve OpenAPI spec
app.get('/.well-known/openapi.yaml', staticFileLimiter, (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.sendFile(join(__dirname, '..', '.well-known', 'openapi.yaml'));
});

// In-memory store for maps (use database in production)
const maps = new Map();

// Helper: Generate unique ID
function generateId(prefix = 'map') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a string is valid coordinates format "lat,lng"
 * Uses safe regex pattern to avoid ReDoS vulnerability
 * @param {string} str - String to check
 * @returns {boolean} - True if valid coordinates
 */
function isValidCoordinates(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  // Safe regex: match two numbers with optional decimals, separated by comma
  // Pattern: -?[0-9]+(?:\.[0-9]+)?,-?[0-9]+(?:\.[0-9]+)?
  const coordPattern = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/;
  return coordPattern.test(trimmed);
}

// Helper: Generate UniMap embed code
function generateUniMapEmbedCode(config) {
  const { location, provider = 'google', zoom = 12, width = '100%', height = '500px', apiKey, markers = [], routes = [] } = config;
  
  // Parse location (could be "lat,lng" or address)
  const center = isValidCoordinates(location)
    ? location.trim()
    : location;

  let embedCode = `<unimap-map 
  provider="${provider}" 
  ${apiKey ? `api-key="${apiKey}"` : ''}
  center="${center}" 
  zoom="${zoom}"
  width="${width}"
  height="${height}">\n`;

  // Add markers
  markers.forEach(marker => {
    // For markers, we need coordinates, not addresses
    // If location is an address, use the location as-is (custom element will geocode it)
    if (isValidCoordinates(marker.location)) {
      const [lat, lng] = marker.location.trim().split(',');
      embedCode += `  <unimap-marker lat="${lat.trim()}" lng="${lng.trim()}" title="${marker.title || ''}" ${marker.label ? `label="${marker.label}"` : ''}></unimap-marker>\n`;
    } else {
      // For addresses, we'd need to geocode first or use a different approach
      // For now, skip markers with addresses (they should be geocoded first via API)
      // Alternatively, could add address attribute support if custom element supports it
      console.warn(`Marker location "${marker.location}" is not in coordinate format. Coordinates required for lat/lng attributes.`);
    }
  });

  // Add routes
  routes.forEach(route => {
    embedCode += `  <unimap-route coords="${route.locations.join(';')}" stroke-color="${route.strokeColor || '#007bff'}" stroke-weight="${route.strokeWeight || 3}"></unimap-route>\n`;
  });

  embedCode += `</unimap-map>
<script type="module" src="https://unpkg.com/unimap@latest/build/unimap-complete.mini.js"></script>`;

  return embedCode;
}

// API: Create Map
app.post('/api/map/create', async (req, res) => {
  try {
    const { location, provider = 'google', zoom = 12, width = '100%', height = '500px', apiKey } = req.body;

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const mapId = generateId();
    const embedCode = generateUniMapEmbedCode({
      location,
      provider,
      zoom,
      width,
      height,
      apiKey,
      markers: [],
      routes: []
    });

    maps.set(mapId, { location, provider, zoom, markers: [], routes: [] });

    res.json({
      success: true,
      mapId,
      embedCode,
      config: { location, provider, zoom, width, height },
      instructions: 'Copy the embedCode HTML into your webpage to display the interactive map. Make sure to include the UniMap script tag.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Add Marker
app.post('/api/map/add-marker', async (req, res) => {
  try {
    const { mapId, location, title, label, iconUrl } = req.body;

    if (!mapId || !location) {
      return res.status(400).json({ error: 'mapId and location are required' });
    }

    const map = maps.get(mapId);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    const markerId = generateId('marker');
    map.markers.push({ id: markerId, location, title, label, iconUrl });

    const updatedEmbedCode = generateUniMapEmbedCode({
      location: map.location,
      provider: map.provider,
      zoom: map.zoom,
      markers: map.markers,
      routes: map.routes
    });

    res.json({
      success: true,
      markerId,
      updatedEmbedCode,
      message: `Marker added at ${location}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Add Route
app.post('/api/map/add-route', async (req, res) => {
  try {
    const { mapId, locations, strokeColor = '#007bff', strokeWeight = 3 } = req.body;

    if (!mapId || !locations || !Array.isArray(locations) || locations.length < 2) {
      return res.status(400).json({ error: 'mapId and at least 2 locations are required' });
    }

    const map = maps.get(mapId);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    const routeId = generateId('route');
    map.routes.push({ id: routeId, locations, strokeColor, strokeWeight });

    const updatedEmbedCode = generateUniMapEmbedCode({
      location: map.location,
      provider: map.provider,
      zoom: map.zoom,
      markers: map.markers,
      routes: map.routes
    });

    res.json({
      success: true,
      routeId,
      updatedEmbedCode,
      message: `Route added between ${locations.length} points`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Geocode
app.post('/api/map/geocode', async (req, res) => {
  try {
    const { address, provider = 'google' } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'address is required' });
    }

    res.json({
      success: true,
      address,
      message: 'Geocoding service would be called here. For production, implement actual geocoding using UniMap or a geocoding API.',
      note: 'You need to implement actual geocoding by calling the UniMap geocode function or a third-party geocoding API.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Reverse Geocode
app.post('/api/map/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng, provider = 'google' } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    res.json({
      success: true,
      lat,
      lng,
      message: 'Reverse geocoding service would be called here. Implement using UniMap or a reverse geocoding API.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get Directions
app.post('/api/map/directions', async (req, res) => {
  try {
    const { origin, destination, provider = 'google', travelMode = 'driving' } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }

    res.json({
      success: true,
      origin,
      destination,
      message: 'Directions service would be called here. Implement using UniMap getDirections() or a directions API.',
      note: 'Return actual distance, duration, and steps, then generate embed code with route drawn.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Create Map with Features
app.post('/api/map/create-with-features', async (req, res) => {
  try {
    const { location, provider = 'google', zoom = 12, markers = [], routes = [], shapes = {} } = req.body;

    if (!location) {
      return res.status(400).json({ error: 'location is required' });
    }

    const mapId = generateId();
    const embedCode = generateUniMapEmbedCode({
      location,
      provider,
      zoom,
      markers,
      routes,
      shapes
    });

    maps.set(mapId, { location, provider, zoom, markers, routes, shapes });

    res.json({
      success: true,
      mapId,
      embedCode,
      instructions: 'Copy the embedCode HTML into your webpage. The map includes all specified markers, routes, and shapes.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'UniMap OpenAI Plugin' });
});

// Export for Vercel serverless
export default app;

