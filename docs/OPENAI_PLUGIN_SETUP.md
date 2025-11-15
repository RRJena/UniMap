# OpenAI Plugin Setup Guide for UniMap

This guide explains how to set up UniMap as an OpenAI plugin so ChatGPT can create and display maps directly.

## 📋 Prerequisites

1. A domain with HTTPS (required by OpenAI)
2. Node.js 14+ installed
3. A web server to host the plugin files

## 🚀 Quick Start (3 Steps)

### Step 1: Host the Plugin Files

You need to host these files on your domain:

1. `.well-known/ai-plugin.json` - Plugin manifest
2. `.well-known/openapi.yaml` - API specification
3. A simple API server (we'll provide example below)

**Important**: OpenAI requires these files to be:
- Served over HTTPS
- Accessible at `https://your-domain.com/.well-known/ai-plugin.json`
- The OpenAPI spec should be accessible from the URL in `ai-plugin.json`

### Step 2: Create API Server

Since UniMap is a client-side library, you need a server-side wrapper API. Here's a minimal example:

**Option A: Simple Node.js/Express Server**

```javascript
// server.js
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Serve plugin manifest
app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.sendFile(join(__dirname, '.well-known', 'ai-plugin.json'));
});

// Serve OpenAPI spec
app.get('/.well-known/openapi.yaml', (req, res) => {
  res.sendFile(join(__dirname, '.well-known', 'openapi.yaml'));
});

// API endpoints
app.post('/api/map/create', async (req, res) => {
  const { location, provider = 'google', zoom = 12, width = '100%', height = '500px', apiKey } = req.body;
  
  // Generate embed code using UniMap
  const embedCode = generateUniMapEmbedCode({
    location,
    provider,
    zoom,
    width,
    height,
    apiKey
  });

  res.json({
    success: true,
    mapId: generateId(),
    embedCode,
    config: { location, provider, zoom, width, height },
    instructions: 'Copy the embedCode to use this map in your HTML page. Include <script src="https://unpkg.com/unimap@latest/build/unimap-complete.mini.js"></script> in your HTML.'
  });
});

app.post('/api/map/add-marker', async (req, res) => {
  // Implementation for adding markers
  res.json({ success: true, markerId: generateId() });
});

// Helper function to generate UniMap embed code
function generateUniMapEmbedCode(config) {
  return `
<unimap-map 
  provider="${config.provider}" 
  ${config.apiKey ? `api-key="${config.apiKey}"` : ''}
  center="${config.location}" 
  zoom="${config.zoom}"
  width="${config.width}"
  height="${config.height}">
</unimap-map>
<script type="module" src="https://unpkg.com/unimap@latest/build/unimap-complete.mini.js"></script>
  `.trim();
}

function generateId() {
  return `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`UniMap OpenAI Plugin server running on port ${PORT}`);
});
```

**Option B: Serverless Function (Vercel/Netlify)**

```javascript
// api/map/create.js (Vercel serverless)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location, provider = 'google', zoom = 12 } = req.body;
  
  const embedCode = generateUniMapEmbedCode({
    location,
    provider,
    zoom
  });

  return res.json({
    success: true,
    mapId: generateId(),
    embedCode,
    instructions: 'Use the embedCode in your HTML.'
  });
}
```

### Step 3: Update Plugin Configuration

1. Edit `.well-known/ai-plugin.json`:
   - Replace `https://your-domain.com` with your actual domain
   - Update `contact_email` with your email
   - Update `logo_url` if you have one

2. Edit `.well-known/openapi.yaml`:
   - Replace `https://your-domain.com/api` with your actual API URL

3. Deploy your server and ensure:
   - HTTPS is enabled
   - Files are accessible at the correct paths

## 🔧 Installation in ChatGPT

1. Open ChatGPT (ChatGPT Plus required)
2. Go to Settings → Beta Features → Plugins
3. Click "Plugin Store"
4. Click "Develop your own plugin"
5. Enter your domain URL (e.g., `https://your-domain.com`)
6. ChatGPT will fetch `ai-plugin.json` and validate it
7. If valid, your plugin appears in the plugin list

## 📝 Testing Your Plugin

Once installed, test with prompts like:

- "Create a map of New York City"
- "Show me a map with markers at Paris and London"
- "Get directions from San Francisco to Los Angeles"
- "Create a map of Tokyo with a route from Shibuya to Shinjuku"

## 🎯 Features Available

Your plugin enables ChatGPT to:

1. **Create Maps**: Generate interactive maps for any location
2. **Add Markers**: Place markers at specific locations
3. **Draw Routes**: Show routes between multiple points
4. **Geocode**: Convert addresses to coordinates
5. **Reverse Geocode**: Convert coordinates to addresses
6. **Get Directions**: Find routes with turn-by-turn directions
7. **Complex Maps**: Create maps with multiple features at once

## 🌐 Recommended Hosting Options

### Easy Options (Free/Cheap):

1. **Vercel** (Free tier)
   - Deploy serverless functions
   - Automatic HTTPS
   - Easy deployment from GitHub

2. **Netlify** (Free tier)
   - Similar to Vercel
   - Good for static + serverless

3. **Render** (Free tier)
   - Easy Node.js hosting
   - Automatic HTTPS

4. **Railway** (Free tier)
   - Simple deployment
   - Good for Node.js apps

### Quick Setup with Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# That's it! You get a HTTPS URL automatically
```

## 📚 API Implementation Examples

### Full Implementation Example

You can find a complete server implementation in `examples/openai-plugin-server.js` (create this file with full implementation of all endpoints).

## 🔒 Security Considerations

1. **API Keys**: Consider requiring API keys for production
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Input Validation**: Validate all inputs
4. **CORS**: Configure CORS properly if needed

## 🐛 Troubleshooting

**Issue**: "Plugin manifest not found"
- Ensure `.well-known/ai-plugin.json` is accessible
- Check HTTPS is enabled
- Verify file path is correct

**Issue**: "OpenAPI spec not valid"
- Validate your `openapi.yaml` using https://editor.swagger.io/
- Check all required fields are present

**Issue**: "Plugin not appearing"
- Ensure you're using ChatGPT Plus
- Check browser console for errors
- Verify domain allows CORS if needed

## 📖 Next Steps

1. Implement all API endpoints
2. Add error handling
3. Add logging for debugging
4. Test thoroughly with ChatGPT
5. Submit to OpenAI Plugin Store (when available)

## 🎉 Success!

Once set up, ChatGPT users can ask:
- "Show me a map of Paris with the Eiffel Tower marked"
- "Create a route from my hotel to the airport"
- "Map all coffee shops in downtown Seattle"

And ChatGPT will use UniMap to generate the appropriate maps!

