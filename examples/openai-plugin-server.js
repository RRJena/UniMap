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
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

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
app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.sendFile(join(__dirname, '..', '.well-known', 'ai-plugin.json'));
});

// Serve OpenAPI spec
app.get('/.well-known/openapi.yaml', (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.sendFile(join(__dirname, '..', '.well-known', 'openapi.yaml'));
});

// In-memory store for maps (use database in production)
const maps = new Map();

// Helper: Generate unique ID
function generateId(prefix = 'map') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: Generate UniMap embed code
function generateUniMapEmbedCode(config) {
  const { location, provider = 'google', zoom = 12, width = '100%', height = '500px', apiKey, markers = [], routes = [] } = config;
  
  // Parse location (could be "lat,lng" or address)
  const center = location.includes(',') && /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location.trim())
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
    const markerLoc = marker.location.includes(',') && /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(marker.location.trim())
      ? marker.location.trim()
      : marker.location;
    embedCode += `  <unimap-marker lat="${markerLoc.split(',')[0]}" lng="${markerLoc.split(',')[1]}" title="${marker.title || ''}" ${marker.label ? `label="${marker.label}"` : ''}></unimap-marker>\n`;
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

