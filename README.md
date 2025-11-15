# UniMap

**Unified Mapping Library - One API for All Map Providers**

[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](https://github.com/RRJena/UniMap)
[![License](https://img.shields.io/badge/license-GPL--3.0-green.svg)](LICENSE)

UniMap provides a single, consistent API for working with 10+ map providers. Switch between Google Maps, Mapbox, Bing Maps, OpenStreetMap, and more without changing your application code.

## Features

- 🗺️ **10+ Map Providers** - Google, Mapbox, Bing, OSM, Azure, Here, TomTom, Yandex, CARTO, MapmyIndia
- 🔄 **Provider Agnostic** - Switch providers with a single line change
- 📦 **Zero Dependencies** - Standalone library with minimal footprint
- 🎯 **Consistent API** - Same methods across all providers
- ⚡ **Lightweight** - Lazy loading of provider-specific code
- 🔧 **TypeScript Ready** - Full type definitions included
- 🌐 **Browser Compatible** - Works in all modern browsers
- 🚀 **Production Ready** - Battle-tested in real applications
- 🎨 **Custom HTML Element** - Use maps without writing JavaScript
- 🔐 **Secure API Key Handling** - Multiple secure methods for API keys

## Installation

### NPM

```bash
npm install unimap
```

### CDN

**JavaScript API Only:**
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/unimap@latest/build/unimap.mini.js"></script>
```

**Custom Element Only:**
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/unimap@latest/build/unimap-element.mini.js"></script>
```

**Complete (Recommended - Both Features):**
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/unimap@latest/build/unimap-complete.mini.js"></script>
```

## Quick Start

### JavaScript API

```javascript
import { UniMap } from 'unimap';

const map = new UniMap({
  provider: 'google',
  apiKey: 'YOUR_API_KEY',
  containerId: 'map',
  options: {
    center: { lat: 40.7128, lng: -74.0060 },
    zoom: 12
  }
});

await map.init();

// Add marker
map.addMarker({
  lat: 40.7128,
  lng: -74.0060,
  title: 'New York City'
});
```

### Custom HTML Element (No JavaScript Required!)

**Production (Secure):**
```html
<unimap-map 
  provider="google" 
  config-endpoint="/api/map-config"
  center="40.7128,-74.0060"
  zoom="12"
  width="100%"
  height="500px">
  <unimap-marker lat="40.7128" lng="-74.0060" title="New York City"></unimap-marker>
</unimap-map>

<!-- Use complete bundle for both JS API and Custom Element -->
<script type="module" src="./build/unimap-complete.mini.js"></script>
```

**Development (Local):**
```html
<unimap-map 
  provider="google" 
  api-key="YOUR_API_KEY"
  center="40.7128,-74.0060"
  zoom="12"
  width="100%"
  height="500px">
</unimap-map>
```

**Note:** Custom element names must contain a hyphen per Web Components specification. Use `<unimap-map>` instead of `<unimap>`.

## Supported Providers

| Provider | API Key | Geocoding | Routing | Status |
|----------|---------|-----------|---------|--------|
| Google Maps | Required | ✅ | ✅ | Stable |
| Mapbox | Required | ✅ | ✅ | Stable |
| Bing Maps | Required | ✅ | ✅ | Stable |
| OpenStreetMap | Free | ✅ | ✅ | Stable |
| Azure Maps | Required | ✅ | ✅ | Stable |
| HERE Maps | Required | ✅ | ✅ | Stable |
| TomTom | Required | ✅ | ✅ | Stable |
| Yandex Maps | Required | ✅ | ✅ | Stable |
| CARTO | Required | ✅ | ✅ | Stable |
| MapmyIndia | Required | ✅ | ✅ | Stable |

## API Reference

### Core Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `init()` | Initialize map | - | `Promise<void>` |
| `destroy()` | Clean up | - | `void` |
| `setCenter(coords)` | Set center | `{ lat, lng }` | `void` |
| `getCenter()` | Get center | - | `{ lat, lng }` |
| `setZoom(level)` | Set zoom | `number` | `void` |
| `getZoom()` | Get zoom | - | `number` |
| `panTo(coords)` | Pan to location | `{ lat, lng }` | `void` |
| `fitBounds(bounds)` | Fit bounds | `{ southwest, northeast }` | `void` |

### Marker Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `addMarker(options)` | Add marker | `{ lat, lng, title, label, icon, color }` | `string` |
| `addCustomMarker(options)` | Add custom HTML marker | `{ lat, lng, html, iconUrl, iconSize, className, title }` | `string` |
| `addCustomMarkers(markersArray)` | Add multiple custom markers | `array of marker options` | `array<string>` |
| `onMarkerClick(markerId, callback, options)` | Add click handler | `string, function, {popupHtml, toastMessage}` | `string` |
| `removeMarker(id)` | Remove marker | `string` | `boolean` |
| `updateMarker(id, options)` | Update marker | `string, object` | `boolean` |

### Drawing Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `drawRoute(coords, options)` | Draw route | `array, object` | `string` |
| `drawPolygon(coords, options)` | Draw polygon | `array, object` | `string` |
| `drawCircle(center, radius, options)` | Draw circle | `object, number, object` | `string` |
| `drawRectangle(bounds, options)` | Draw rectangle | `object, object` | `string` |
| `drawPolyline(coords, options)` | Draw polyline | `array, object` | `string` |
| `removeLayer(id)` | Remove layer | `string` | `boolean` |

### Geocoding & Routing

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `geocode(address)` | Geocode address | `string` | `Promise<object>` |
| `reverseGeocode(lat, lng)` | Reverse geocode | `number, number` | `Promise<object>` |
| `getDirections(origin, destination, options)` | Get directions | `object, object, object` | `Promise<object>` |

### Advanced Features

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `enableTrafficLayer()` | Enable traffic layer | - | `void` |
| `disableTrafficLayer()` | Disable traffic layer | - | `void` |
| `addHeatMap(points, options)` | Add heat map | `array, object` | `string` |
| `trackUserLocation(callback, options)` | Track user location | `function, object` | `void` |
| `getUserLocation()` | Get user location | - | `Promise<object>` |
| `enable3D(enable)` | Enable 3D view | `boolean` | `void` |
| `indoorMaps(enable)` | Enable indoor maps | `boolean` | `void` |
| `applyMapStyle(style)` | Apply custom style | `array` | `void` |
| `on(event, callback)` | Add event listener | `string, function` | `void` |
| `off(event, callback)` | Remove event listener | `string, function` | `void` |

## Custom HTML Element

### Basic Usage

```html
<unimap-map 
  provider="google" 
  config-endpoint="/api/map-config"
  center="40.7128,-74.0060"
  zoom="12"
  width="100%"
  height="500px">
</unimap-map>
```

**Note:** Custom element names must contain a hyphen per Web Components specification. Use `<unimap-map>`.

### Attributes

#### Required
- `provider` - Map provider: `google`, `mapbox`, `bing`, `osm`, `azure`, `here`, `tomtom`, `yandex`, `carto`, `mapmyindia`

#### API Key (Choose One)
- `config-endpoint` - **Recommended for production** - URL endpoint that returns API key
- `api-key` - API key directly (⚠️ **Development only**)

#### Map Configuration
- `center` - Center coordinates: `"lat,lng"` (e.g., `"40.7128,-74.0060"`)
- `zoom` - Zoom level: `"12"`
- `width` - Map width: `"100%"` or `"500px"`
- `height` - Map height: `"500px"`
- `map-id` - Map ID (required for Google Maps Advanced Markers)
- `map-type` - Map type: `roadmap`, `satellite`, `hybrid`, `terrain`

#### Controls (Boolean)
- `disable-default-ui` - Disable default UI
- `zoom-control` - Show zoom control
- `map-type-control` - Show map type control
- `scale-control` - Show scale control
- `street-view-control` - Show street view control
- `rotate-control` - Show rotate control
- `fullscreen-control` - Show fullscreen control

#### Features (Boolean)
- `enable-3d` - Enable 3D view
- `enable-traffic` - Enable traffic layer
- `enable-indoor` - Enable indoor maps

### Child Elements

#### `<unimap-marker>`
Add a marker to the map.

```html
<unimap-marker lat="40.7128" lng="-74.0060" title="New York"></unimap-marker>

<!-- Custom HTML marker -->
<unimap-marker lat="40.7128" lng="-74.0060">
  <div style="background: red; color: white; padding: 8px; border-radius: 50%;">📍</div>
</unimap-marker>
```

**Attributes:** `lat`, `lng`, `title`, `label`, `icon`, `color`, `icon-url`, `icon-size`, `class-name`

#### `<unimap-route>`
Draw a route/path.

```html
<unimap-route 
  coords="40.7128,-74.0060;40.7589,-73.9851;40.7489,-73.9680"
  stroke-color="#FF0000"
  stroke-weight="5">
</unimap-route>
```

**Attributes:** `coords` (format: `"lat1,lng1;lat2,lng2;..."`), `stroke-color`, `stroke-weight`, `stroke-opacity`

#### `<unimap-polygon>`
Draw a polygon.

```html
<unimap-polygon 
  coords="40.7128,-74.0060;40.7200,-74.0100;40.7150,-74.0200"
  stroke-color="#00FF00"
  fill-color="#00FF00"
  fill-opacity="0.3">
</unimap-polygon>
```

**Attributes:** `coords`, `stroke-color`, `stroke-weight`, `stroke-opacity`, `fill-color`, `fill-opacity`

#### `<unimap-circle>`
Draw a circle.

```html
<unimap-circle 
  center="40.7128,-74.0060"
  radius="1000"
  stroke-color="#0000FF"
  fill-color="#0000FF"
  fill-opacity="0.2">
</unimap-circle>
```

**Attributes:** `center`, `radius` (meters), `stroke-color`, `stroke-weight`, `stroke-opacity`, `fill-color`, `fill-opacity`

#### `<unimap-rectangle>`
Draw a rectangle.

```html
<unimap-rectangle 
  bounds="40.7000,-74.0300;40.7300,-73.9800"
  stroke-color="#FF00FF"
  fill-color="#FF00FF"
  fill-opacity="0.2">
</unimap-rectangle>
```

**Attributes:** `bounds` (format: `"southwest_lat,southwest_lng;northeast_lat,northeast_lng"`), `stroke-color`, `stroke-weight`, `stroke-opacity`, `fill-color`, `fill-opacity`

#### `<unimap-polyline>`
Draw a polyline (same attributes as `<unimap-route>`).

### Complete Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>UniMap Example</title>
</head>
<body>
  <h1>My Map</h1>
  
  <unimap-map 
    id="my-map"
    provider="google" 
    config-endpoint="/api/map-config"
    center="40.7128,-74.0060"
    zoom="12"
    width="100%"
    height="600px"
    map-type="roadmap"
    zoom-control="true"
    enable-traffic="true">
    
    <!-- Markers -->
    <unimap-marker lat="40.7128" lng="-74.0060" title="New York City"></unimap-marker>
    <unimap-marker lat="40.7589" lng="-73.9851" title="Times Square" color="red"></unimap-marker>
    
    <!-- Custom HTML Marker -->
    <unimap-marker lat="40.7489" lng="-73.9680">
      <div style="background: #ff0000; color: white; padding: 8px; border-radius: 50%;">🎯</div>
    </unimap-marker>
    
    <!-- Route -->
    <unimap-route 
      coords="40.7128,-74.0060;40.7589,-73.9851;40.7489,-73.9680"
      stroke-color="#FF0000"
      stroke-weight="5">
    </unimap-route>
    
    <!-- Circle -->
    <unimap-circle 
      center="40.7128,-74.0060"
      radius="1000"
      stroke-color="#0000FF"
      fill-color="#0000FF"
      fill-opacity="0.2">
    </unimap-circle>
  </unimap-map>
  
  <script type="module" src="./build/unimap-complete.mini.js"></script>
</body>
</html>
```

### Programmatic Access

```javascript
// Get the custom element
const mapElement = document.querySelector('unimap-map');

// Get the UniMap instance
const unimap = mapElement.getUniMap();

// Use UniMap methods
unimap.setZoom(15);
unimap.addMarker({ lat: 40.7128, lng: -74.0060, title: 'New Marker' });

// Set API key programmatically
mapElement.setApiKey('YOUR_API_KEY');

// Set config endpoint programmatically
mapElement.setConfigEndpoint('/api/map-config');
```

### Events

```javascript
// Map initialized
document.addEventListener('unimap:initialized', (event) => {
  console.log('Map initialized:', event.detail.unimap);
});

// Map error
document.addEventListener('unimap:error', (event) => {
  console.error('Map error:', event.detail.error);
});
```

**Important:** Custom element names must contain a hyphen per Web Components specification. Use `<unimap-map>` instead of `<unimap>`.

## Secure API Key Handling

### Method 1: Config Endpoint (Recommended for Production)

```html
<unimap-map config-endpoint="/api/map-config" provider="google"></unimap-map>
```

**Backend Endpoint Example (Node.js/Express):**
```javascript
app.get('/api/map-config', (req, res) => {
  const provider = req.query.provider || 'google';
  const apiKeys = {
    google: process.env.GOOGLE_MAPS_API_KEY,
    mapbox: process.env.MAPBOX_API_KEY
  };
  res.json({ apiKey: apiKeys[provider] || apiKeys.google });
});
```

**Response Format:**
```json
{
  "apiKey": "AIzaSyC..."
}
```

### Method 2: Global Config Function

```javascript
window.UniMapConfig = function(provider) {
  return { apiKey: 'YOUR_API_KEY' }; // Injected server-side
};
```

### Method 3: Development Only (Localhost)

```html
<unimap-map api-key="YOUR_API_KEY" provider="google"></unimap-map>
```

⚠️ **Warning:** Only use `api-key` attribute for local development. Console warnings appear in production.

### Priority Order

1. `config-endpoint` (most secure)
2. Global config function
3. `api-key` attribute (development fallback)
4. Provider-specific data attributes

## Examples

### Basic Map

```javascript
const map = new UniMap({
  provider: 'google',
  apiKey: 'YOUR_API_KEY',
  containerId: 'map',
  options: {
    center: { lat: 40.7128, lng: -74.0060 },
    zoom: 12
  }
});

await map.init();
```

### Add Markers

```javascript
// Regular marker
map.addMarker({
  lat: 40.7128,
  lng: -74.0060,
  title: 'New York City'
});

// Custom HTML marker
map.addCustomMarker({
  lat: 40.7128,
  lng: -74.0060,
  html: '<div style="background: red; color: white; padding: 8px;">📍</div>'
});
```

### Draw Route

```javascript
map.drawRoute([
  { lat: 40.7128, lng: -74.0060 },
  { lat: 40.7589, lng: -73.9851 }
], {
  strokeColor: '#FF0000',
  strokeWeight: 5
});
```

### Geocoding

```javascript
const result = await map.geocode('New York, NY');
console.log(result.formattedAddress);

const reverse = await map.reverseGeocode(40.7128, -74.0060);
console.log(reverse.address);
```

### Get Directions

```javascript
const directions = await map.getDirections(
  { lat: 40.7128, lng: -74.0060 },
  { lat: 40.7589, lng: -73.9851 }
);
console.log(directions);
```

### Switch Providers

```javascript
// Just change the provider!
const map = new UniMap({
  provider: 'mapbox',  // or 'bing', 'osm', 'azure', etc.
  apiKey: 'YOUR_API_KEY',
  containerId: 'map',
  options: { /* same options */ }
});
```

## Browser Support

- Chrome/Edge 67+
- Firefox 63+
- Safari 10.1+
- Opera 54+

## Build Options

UniMap provides three build options:

1. **`unimap.mini.js`** (121 KB) - JavaScript API only
2. **`unimap-element.mini.js`** (134 KB) - Custom HTML Element only
3. **`unimap-complete.mini.js`** (134 KB) - **Recommended** - Both features in one file

The complete bundle is recommended as it includes both JavaScript API and Custom Element features with minimal size overhead.

## Version History

### Version 2.3.0 (Current)

#### ✨ New Features
- **Unified Build** - New `unimap-complete.mini.js` bundle combining both JS API and Custom Element features
- **Custom HTML Element** - Use maps without writing JavaScript using `<unimap-map>` element
- **Secure API Key Handling** - Multiple secure methods for API key management:
  - Config endpoint (production recommended)
  - Global config function (SSR support)
  - Attribute-based (development only)
- **Child Elements Support** - Declarative markers, routes, shapes via HTML:
  - `<unimap-marker>` - Add markers
  - `<unimap-route>` - Draw routes
  - `<unimap-polygon>` - Draw polygons
  - `<unimap-circle>` - Draw circles
  - `<unimap-rectangle>` - Draw rectangles
  - `<unimap-polyline>` - Draw polylines

#### 🐛 Bug Fixes
- **Critical Fix** - Added initialization checks to prevent errors when calling methods before `init()`
- Fixed OSM adapter destroy method null reference errors
- Fixed race conditions in custom element initialization
- Improved error handling and cleanup on destroy
- Fixed linter errors and code quality issues

#### 🔧 Improvements
- Added initialization lock to prevent concurrent initializations
- Improved error messages and user feedback
- Better input validation for all public methods
- Consistent timing for async operations
- Production-ready code with proper error handling
- Enhanced destroy method with null checks
- Better handling of uninitialized instances

#### 📝 Documentation
- Updated README with complete bundle information
- Added version badges and changelog
- Improved examples and usage documentation
- Added security best practices

### Previous Versions

- **Version 2.2.0** - Enhanced adapter support, improved geocoding
- **Version 2.1.0** - Added new providers (CARTO, MapmyIndia)
- **Version 2.0.0** - Major refactor, improved API consistency
- **Version 1.x** - Initial releases

## License

This project is under:

**GNU General Public License v3.0** - see [LICENSE](LICENSE) file for details

You may choose to use this software under either license, depending on your project requirements.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

- **Issues:** [GitHub Issues](https://github.com/RRJena/UniMap/issues)
- **Documentation:** [Full API Docs](https://github.com/RRJena/UniMap/wiki)
- **Wiki:** [GitHub Wiki](https://github.com/RRJena/UniMap/wiki)
- **LinkedIn:** [Rakesh Ranjan Jena](https://www.linkedin.com/in/rakesh-ranjan-jena)
- **Author Blog:** [rrjprince.com](https://rrjprince.com)
- **Website:** [rakeshranjanjena.com](https://rakeshranjanjena.com)

## Security Considerations

### XSS Prevention

UniMap uses intentional `innerHTML` assignments for custom HTML markers and popups. Always validate and sanitize user-provided HTML content before passing it to:

- `addCustomMarker({ html: ... })`
- `onMarkerClick(..., { popupHtml: ... })`
- `addMarker({ title: ... })` (in some adapters)

**Recommendations:**

- Use a trusted HTML sanitization library (e.g., [DOMPurify](https://github.com/cure53/DOMPurify)) for user-generated content
- Validate `iconUrl` values come from trusted sources
- Implement Content Security Policy (CSP) headers to mitigate XSS risks
- Never use unsanitized user input directly in HTML properties

### URL Injection Prevention

All user-provided coordinates and addresses are properly encoded using `encodeURIComponent()` before being used in API URLs. This prevents URL injection attacks.

### API Key Security

- API keys are never logged or exposed in error messages
- Store API keys securely (environment variables, secure config files)
- Never commit API keys to version control
- Use API key restrictions in provider dashboards (domain/IP restrictions)

### Input Validation

All adapters validate:

- Coordinates are numeric and within valid ranges (-90 to 90 for latitude, -180 to 180 for longitude)
- Addresses are non-empty strings
- Required parameters are present before API calls

---

**Made with ❤️ by Rakesh Ranjan Jena**

**UniMap** - One API for All Map Providers 🗺️
