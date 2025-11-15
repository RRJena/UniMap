/**
 * UniMap OpenAI Plugin Server
 * 
 * A simple Express server that wraps UniMap functionality for OpenAI plugin integration.
 * 
 * Usage:
 * 1. Install dependencies: npm install express
 * 2. Update .well-known/ai-plugin.json with your domain
 * 3. Update .well-known/openapi.yaml with your API URL
 * 4. Deploy this server (Vercel, Netlify, Render, etc.)
 * 5. Install plugin in ChatGPT with your domain
 * 
 * For development:
 * node examples/openai-plugin-server.js
 * 
 * For production:
 * Deploy to Vercel/Netlify/Render with proper HTTPS
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

// Cleanup old map entries to prevent memory leaks
const MAP_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const MAP_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function cleanupOldMaps() {
  const now = Date.now();
  for (const [mapId, mapData] of maps.entries()) {
    if (mapData.createdAt && (now - mapData.createdAt) > MAP_MAX_AGE) {
      maps.delete(mapId);
    }
  }
}

// Run cleanup periodically
setInterval(cleanupOldMaps, MAP_CLEANUP_INTERVAL);

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

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for HTML attributes
 */
function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate and sanitize HTML attribute value
 * @param {string} value - Value to sanitize
 * @param {string} type - Type of attribute ('text', 'url', 'number')
 * @returns {string} - Sanitized value
 */
function sanitizeAttribute(value, type = 'text') {
  if (!value || typeof value !== 'string') return '';
  
  if (type === 'url') {
    // Basic URL validation - remove script:, javascript:, data:, etc.
    const unsafe = /^(javascript|data|vbscript|file|about):/i;
    if (unsafe.test(value.trim())) {
      return '';
    }
  }
  
  // Remove potentially dangerous characters
  return escapeHtml(value).replace(/[<>'"]/g, '');
}

// Helper: Generate UniMap embed code
function generateUniMapEmbedCode(config) {
  const { location, provider = 'google', zoom = 12, width = '100%', height = '500px', apiKey, markers = [], routes = [] } = config;
  
  // Sanitize all inputs
  const safeProvider = sanitizeAttribute(provider, 'text');
  const safeLocation = isValidCoordinates(location) 
    ? location.trim() // Coordinates are numeric, safe to use
    : sanitizeAttribute(location, 'text'); // Addresses need sanitization
  const safeApiKey = apiKey ? sanitizeAttribute(apiKey, 'text') : '';
  const safeWidth = sanitizeAttribute(String(width), 'text');
  const safeHeight = sanitizeAttribute(String(height), 'text');
  const safeZoom = Number.isInteger(zoom) && zoom >= 1 && zoom <= 20 ? zoom : 12;

  let embedCode = `<unimap-map 
  provider="${safeProvider}" 
  ${safeApiKey ? `api-key="${safeApiKey}"` : ''}
  center="${safeLocation}" 
  zoom="${safeZoom}"
  width="${safeWidth}"
  height="${safeHeight}">\n`;

  // Add markers
  markers.forEach(marker => {
    // For markers, we need coordinates, not addresses
    if (isValidCoordinates(marker.location)) {
      const [lat, lng] = marker.location.trim().split(',');
      const safeLat = sanitizeAttribute(lat.trim(), 'number');
      const safeLng = sanitizeAttribute(lng.trim(), 'number');
      const safeTitle = sanitizeAttribute(marker.title || '', 'text');
      const safeLabel = marker.label ? sanitizeAttribute(marker.label, 'text') : '';
      
      embedCode += `  <unimap-marker lat="${safeLat}" lng="${safeLng}" title="${safeTitle}"${safeLabel ? ` label="${safeLabel}"` : ''}></unimap-marker>\n`;
    } else {
      // For addresses, we'd need to geocode first or use a different approach
      // For now, skip markers with addresses (they should be geocoded first via API)
      console.warn(`Marker location "${marker.location}" is not in coordinate format. Coordinates required for lat/lng attributes.`);
    }
  });

  // Add routes
  routes.forEach(route => {
    const safeLocations = route.locations
      .filter(loc => isValidCoordinates(loc))
      .map(loc => sanitizeAttribute(loc.trim(), 'text'))
      .join(';');
    
    if (safeLocations) {
      const safeStrokeColor = sanitizeAttribute(route.strokeColor || '#007bff', 'text');
      const safeStrokeWeight = Number.isInteger(route.strokeWeight) && route.strokeWeight > 0 ? route.strokeWeight : 3;
      
      embedCode += `  <unimap-route coords="${safeLocations}" stroke-color="${safeStrokeColor}" stroke-weight="${safeStrokeWeight}"></unimap-route>\n`;
    }
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

    maps.set(mapId, { 
      location, 
      provider, 
      zoom, 
      markers: [], 
      routes: [],
      createdAt: Date.now()
    });

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

    // In a real implementation, you'd call the actual geocoding service
    // For now, return a placeholder response
    // You would use: const result = await unimap.geocode(address);
    
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

    // Placeholder - implement actual reverse geocoding
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

    // Placeholder - implement actual directions API
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

    maps.set(mapId, { 
      location, 
      provider, 
      zoom, 
      markers, 
      routes, 
      shapes,
      createdAt: Date.now()
    });

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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'UniMap OpenAI Plugin' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 UniMap OpenAI Plugin server running on port ${PORT}`);
  console.log(`📍 Plugin manifest: http://localhost:${PORT}/.well-known/ai-plugin.json`);
  console.log(`📋 OpenAPI spec: http://localhost:${PORT}/.well-known/openapi.yaml`);
  console.log(`\n💡 Update ai-plugin.json and openapi.yaml with your production domain`);
  console.log(`💡 For production, deploy to Vercel/Netlify/Render with HTTPS enabled`);
});

