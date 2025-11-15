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

// Note: .well-known routes are handled by separate serverless functions
// (api/well-known/ai-plugin.json.js and api/well-known/openapi.yaml.js)
// as configured in vercel.json. The Express app here handles /api/* routes only.

// In-memory store for maps (use database in production)
const maps = new Map();

// Cleanup configuration
const MAP_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours - max age since creation
const MAP_MAX_IDLE = 60 * 60 * 1000; // 1 hour - max idle time since last access
const CLEANUP_ON_REQUEST_PROBABILITY = 0.1; // 10% chance to run cleanup on each request

/**
 * Cleanup old map entries to prevent memory leaks
 * Removes entries that are either:
 * 1. Older than MAP_MAX_AGE since creation, OR
 * 2. Haven't been accessed for MAP_MAX_IDLE time
 */
function cleanupOldMaps() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [mapId, mapData] of maps.entries()) {
    const age = mapData.createdAt ? (now - mapData.createdAt) : Infinity;
    const idleTime = mapData.lastAccessed ? (now - mapData.lastAccessed) : Infinity;
    
    // Remove if too old OR hasn't been accessed recently
    if (age > MAP_MAX_AGE || idleTime > MAP_MAX_IDLE) {
      maps.delete(mapId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[Cleanup] Removed ${cleanedCount} old map entries. ${maps.size} remaining.`);
  }
  
  return cleanedCount;
}

/**
 * Opportunistic cleanup: runs with a probability on each request
 * This ensures cleanup happens in serverless environments where setInterval may not work
 */
function opportunisticCleanup() {
  // Run cleanup with a probability to avoid performance impact on every request
  if (Math.random() < CLEANUP_ON_REQUEST_PROBABILITY) {
    cleanupOldMaps();
  }
}

// Run cleanup periodically as a backup (though this may not work in serverless)
// In serverless, opportunistic cleanup handles most cases
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldMaps, 60 * 60 * 1000); // 1 hour
}

// Helper: Generate unique ID
function generateId(prefix = 'map') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
 * @param {string} type - Type of attribute ('text', 'url', 'number', 'coordinate')
 * @returns {string} - Sanitized value safe for HTML attributes
 */
function sanitizeAttribute(value, type = 'text') {
  if (value === null || value === undefined) return '';
  
  // Convert to string for processing
  const str = String(value).trim();
  if (!str) return '';
  
  if (type === 'number') {
    // For numbers, validate it's actually a number and escape
    const num = parseFloat(str);
    if (isNaN(num) || !isFinite(num)) return '';
    // Escape the string representation to prevent injection
    return escapeHtml(String(num));
  }
  
  if (type === 'coordinate') {
    // For coordinates, validate format first
    if (!isValidCoordinates(str)) return '';
    // Even validated coordinates must be escaped for HTML attributes
    return escapeHtml(str);
  }
  
  if (type === 'url') {
    // Basic URL validation - remove script:, javascript:, data:, etc.
    const unsafe = /^(javascript|data|vbscript|file|about):/i;
    if (unsafe.test(str)) {
      return '';
    }
    // Escape URL for HTML attribute context
    return escapeHtml(str);
  }
  
  // Default: escape all HTML special characters for attribute context
  // This prevents XSS by escaping quotes, angle brackets, etc.
  return escapeHtml(str);
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
  
  // Sanitize all inputs - ALWAYS escape user input, even if validated
  const safeProvider = sanitizeAttribute(provider, 'text');
  const safeLocation = isValidCoordinates(location) 
    ? sanitizeAttribute(location, 'coordinate') // Even validated coordinates must be escaped
    : sanitizeAttribute(location, 'text'); // Addresses need sanitization
  const safeApiKey = apiKey ? sanitizeAttribute(apiKey, 'text') : '';
  const safeWidth = sanitizeAttribute(String(width), 'text');
  const safeHeight = sanitizeAttribute(String(height), 'text');
  // Zoom is numeric, but we still need to ensure it's safe and escaped
  const zoomValue = Number.isInteger(zoom) && zoom >= 1 && zoom <= 20 ? zoom : 12;
  const safeZoom = sanitizeAttribute(String(zoomValue), 'number');

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
      // Validate and escape each coordinate component
      const latNum = parseFloat(lat.trim());
      const lngNum = parseFloat(lng.trim());
      if (isNaN(latNum) || isNaN(lngNum) || !isFinite(latNum) || !isFinite(lngNum)) {
        // Invalid coordinates, skip this marker
        return;
      }
      const safeLat = sanitizeAttribute(String(latNum), 'number');
      const safeLng = sanitizeAttribute(String(lngNum), 'number');
      const safeTitle = sanitizeAttribute(marker.title || '', 'text');
      const safeLabel = marker.label ? sanitizeAttribute(marker.label, 'text') : '';
      
      embedCode += `  <unimap-marker lat="${safeLat}" lng="${safeLng}" title="${safeTitle}"${safeLabel ? ` label="${safeLabel}"` : ''}></unimap-marker>\n`;
    } else {
      // For addresses, we'd need to geocode first or use a different approach
      // For now, skip markers with addresses (they should be geocoded first via API)
      // Escape the location in the warning message to prevent XSS in logs
      const safeLocation = escapeHtml(String(marker.location || ''));
      console.warn(`Marker location "${safeLocation}" is not in coordinate format. Coordinates required for lat/lng attributes.`);
    }
  });

  // Add routes
  routes.forEach(route => {
    if (!route.locations || !Array.isArray(route.locations)) {
      return;
    }
    
    // Filter valid coordinates and escape each one
    const safeLocations = route.locations
      .filter(loc => isValidCoordinates(loc))
      .map(loc => sanitizeAttribute(loc.trim(), 'coordinate'))
      .join(';');
    
    if (safeLocations) {
      const safeStrokeColor = sanitizeAttribute(route.strokeColor || '#007bff', 'text');
      // Validate and escape stroke weight
      const strokeWeight = Number.isInteger(route.strokeWeight) && route.strokeWeight > 0 
        ? route.strokeWeight 
        : 3;
      const safeStrokeWeight = sanitizeAttribute(String(strokeWeight), 'number');
      
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
    opportunisticCleanup(); // Cleanup old entries on request
    
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

    const now = Date.now();
    maps.set(mapId, { 
      location, 
      provider, 
      zoom, 
      markers: [], 
      routes: [],
      createdAt: now,
      lastAccessed: now
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
    opportunisticCleanup(); // Cleanup old entries on request
    
    const { mapId, location, title, label, iconUrl } = req.body;

    if (!mapId || !location) {
      return res.status(400).json({ error: 'mapId and location are required' });
    }

    const map = maps.get(mapId);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    // Update last accessed time
    map.lastAccessed = Date.now();

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
    opportunisticCleanup(); // Cleanup old entries on request
    
    const { mapId, locations, strokeColor = '#007bff', strokeWeight = 3 } = req.body;

    if (!mapId || !locations || !Array.isArray(locations) || locations.length < 2) {
      return res.status(400).json({ error: 'mapId and at least 2 locations are required' });
    }

    const map = maps.get(mapId);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    // Update last accessed time
    map.lastAccessed = Date.now();

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
    opportunisticCleanup(); // Cleanup old entries on request
    
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

    const now = Date.now();
    maps.set(mapId, { 
      location, 
      provider, 
      zoom, 
      markers, 
      routes, 
      shapes,
      createdAt: now,
      lastAccessed: now
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
app.get('/api/health', (req, res) => {
  opportunisticCleanup(); // Cleanup old entries on health check
  res.json({ 
    status: 'ok', 
    service: 'UniMap OpenAI Plugin',
    mapsInMemory: maps.size
  });
});

// Export handler for Vercel serverless functions
// Vercel expects a function with (req, res) signature, not an Express app instance
// Express apps are callable, so we wrap it in a handler function
export default function handler(req, res) {
  // Express apps handle (req, res, next) signature
  // We call the app as a handler, which will route the request through Express middleware
  return app(req, res);
}
