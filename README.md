# UniMap

**Unified Mapping Library - One API for All Map Providers**

[![npm version](https://img.shields.io/npm/v/unimap.svg)](https://www.npmjs.com/package/unimap)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

UniMap provides a single, consistent API for working with 10+ map providers. Switch between Google Maps, Mapbox, Bing Maps, OpenStreetMap, and more without changing your application code.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Supported Providers](#supported-providers)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Changelog](#changelog)
- [License](#license)

---

## Features

- 🗺️ **10+ Map Providers** - Google, Mapbox, Bing, OSM, Azure, Here, TomTom, Yandex, CARTO, MapmyIndia
- 🔄 **Provider Agnostic** - Switch providers with a single line change
- 📦 **Zero Dependencies** - Standalone library with minimal footprint (~120KB minified)
- 🎯 **Consistent API** - Same methods across all providers
- ⚡ **Lightweight** - Lazy loading of provider-specific code
- 🔧 **TypeScript Ready** - Full type definitions included
- 🌐 **Browser Compatible** - Works in all modern browsers
- 🚀 **Production Ready** - Battle-tested in real applications

---

## Installation

### NPM

```bash
npm install unimap
```

### Basic Usage

```javascript
import { UniMap } from 'unimap';

const map = new UniMap({
  provider: 'google',
  apiKey: 'YOUR_API_KEY',
  containerId: 'map',
  options: {
    center: { lat: 40.7128, lng: -74.0060 },
    zoom: 12,
    mapId: 'YOUR_MAP_ID' // Optional: Required for Advanced Markers (custom HTML markers)
  }
});

await map.init();
```

### HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
  <title>UniMap Example</title>
</head>
<body>
  <div id="map" style="width: 100%; height: 500px;"></div>
  
  <script type="module">
    import { UniMap } from './node_modules/unimap/build/unimap.mini.js';
    
    const map = new UniMap({
      provider: 'google',
      apiKey: 'YOUR_API_KEY',
      containerId: 'map',
      options: { center: { lat: 40.7128, lng: -74.0060 }, zoom: 12 }
    });
    
    await map.init();
  </script>
</body>
</html>
```

---

## Supported Providers

| Provider | API Key | Geocoding | Routing | Status |
|----------|---------|-----------|---------|--------|
| Google Maps | Required | ✅ | ✅ | Stable |
| Mapbox | Required | ✅ | ✅ | Stable |
| Bing Maps | Required | ✅ | ✅ | Stable |
| OpenStreetMap | Free | ✅ | ✅ | Stable |
| Azure Maps | Required | ✅ | ✅ | Stable |
| Here Maps | Required | ✅ | ✅ | Stable |
| TomTom | Required | ✅ | ✅ | Stable |
| Yandex Maps | Required | ✅ | ✅ | Stable |
| CARTO | Required | ✅ | ✅ | Stable |
| MapmyIndia | Required | ✅ | ✅ | Stable |

---

## Quick Start

### Basic Example

```javascript
import { UniMap } from 'unimap';

// Initialize map
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

// Draw route
map.drawRoute([
  { lat: 40.7128, lng: -74.0060 },
  { lat: 40.7589, lng: -73.9851 }
], {
  strokeColor: '#FF0000',
  strokeWeight: 5
});

// Geocode
const result = await map.geocode('New York, NY');
console.log(result.formattedAddress);

// Get directions
const directions = await map.getDirections(
  { lat: 40.7128, lng: -74.0060 },
  { lat: 40.7589, lng: -73.9851 }
);
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

---

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
| `addCustomMarker(options)` | Add custom marker with HTML/icon | `{ lat, lng, html, iconUrl, iconSize, className, title }` | `string` |
| `addCustomMarkers(markersArray)` | Add multiple custom markers | `array of marker options` | `array<string>` |
| `onMarkerClick(markerId, callback, options)` | Add click handler with popup/toast | `string, function, {popupHtml, toastMessage, toastDuration}` | `string` |
| `removeMarker(id)` | Remove marker | `string` | `boolean` |
| `updateMarker(id, options)` | Update marker | `string, object` | `boolean` |

### Drawing Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `drawRoute(coords, options)` | Draw route | `array, object` | `string` |
| `drawPolygon(coords, options)` | Draw polygon | `array, object` | `string` |
| `drawCircle(center, radius, options)` | Draw circle | `object, number, object` | `string` |
| `drawRectangle(bounds, options)` | Draw rectangle | `object, object` | `string` |
| `removeLayer(id)` | Remove layer | `string` | `boolean` |

### Geocoding & Routing

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `geocode(address)` | Convert address to coordinates | `string` | `Promise<object>` |
| `reverseGeocode(lat, lng)` | Convert coordinates to address | `number, number` | `Promise<object>` |
| `getDirections(origin, dest, options)` | Get route | `object, object, object` | `Promise<object>` |

### Other Methods

```javascript
// User location
const location = await map.getUserLocation();

// Heatmap
map.addHeatMap(points, options);

// Event listeners
map.on('click', (event) => console.log(event));
map.off('click', callback);

// 3D view (if supported)
map.enable3D(true);

// Map style
map.applyMapStyle('dark');
```

---

## Examples

### Adding Markers

```javascript
// Basic marker
const markerId = map.addMarker({
  lat: 40.7128,
  lng: -74.0060,
  title: 'New York City',
  label: 'NYC',
  draggable: true
});

// Note for Google Maps:
// 1. To use custom HTML markers (addCustomMarker with html option), provide a valid Map ID:
//    options: { mapId: 'YOUR_MAP_ID', center: {...}, zoom: 12 }
//    Create a Map ID in Google Cloud Console > Maps > Map Styles
// 2. When using mapId, map styles are controlled via Cloud Console (not via options.styles)
// 3. google.maps.Marker is deprecated but still supported - AdvancedMarkerElement is used for custom HTML markers

// Custom marker with HTML
// ⚠️ SECURITY NOTE: Only use HTML from trusted sources to prevent XSS attacks
const customMarkerId = map.addCustomMarker({
  lat: 40.7128,
  lng: -74.0060,
  html: '<div style="background: red; color: white; padding: 5px; border-radius: 3px;">📍 NYC</div>',
  className: 'custom-marker'
});

// Custom marker with icon URL
const iconMarkerId = map.addCustomMarker({
  lat: 40.7128,
  lng: -74.0060,
  iconUrl: 'https://example.com/icon.png',
  iconSize: { width: 32, height: 32 },
  title: 'Custom Icon Marker'
});

// Add multiple custom markers
const markerIds = map.addCustomMarkers([
  { lat: 40.7128, lng: -74.0060, html: '<div>Marker 1</div>' },
  { lat: 40.7589, lng: -73.9851, html: '<div>Marker 2</div>' },
  { lat: 40.7489, lng: -73.9680, iconUrl: 'icon.png', title: 'Marker 3' }
]);

// Add click handler with custom popup and toast
map.onMarkerClick(markerId, (data) => {
  console.log('Marker clicked at:', data.lat, data.lng);
}, {
  popupHtml: '<div><h3>Location Details</h3><p>Custom HTML content</p></div>',
  toastMessage: 'Marker clicked!',
  toastDuration: 2000
});

// Update marker position
const updated = map.updateMarker(markerId, {
  position: { lat: 40.7580, lng: -73.9855 },
  title: 'Updated Marker Title'
});
if (updated) {
  console.log('Marker updated successfully');
} else {
  console.error('Failed to update marker');
}
```

### Drawing Routes

```javascript
// Draw a route with coordinates
const routeId = map.drawRoute([
  { lat: 40.7128, lng: -74.0060 },
  { lat: 40.7589, lng: -73.9851 },
  { lat: 40.7489, lng: -73.9680 }
], {
  strokeColor: '#FF0000',
  strokeWeight: 5,
  strokeOpacity: 0.8
});

// Remove route
map.removeLayer(routeId);
```

### Drawing Shapes

```javascript
// Draw a polygon
const polygonId = map.drawPolygon([
  { lat: 40.7128, lng: -74.0060 },
  { lat: 40.7589, lng: -73.9851 },
  { lat: 40.7489, lng: -73.9680 },
  { lat: 40.7128, lng: -74.0060 }
], {
  fillColor: '#FF0000',
  fillOpacity: 0.35,
  strokeColor: '#FF0000',
  strokeWeight: 2
});

// Draw a circle
const circleId = map.drawCircle(
  { lat: 40.7128, lng: -74.0060 },
  1000, // radius in meters
  {
    fillColor: '#00FF00',
    fillOpacity: 0.3,
    strokeColor: '#00FF00',
    strokeWeight: 3
  }
);

// Draw a rectangle
const rectId = map.drawRectangle({
  southwest: { lat: 40.7000, lng: -74.0300 },
  northeast: { lat: 40.7200, lng: -74.0100 }
}, {
  fillColor: '#0000FF',
  fillOpacity: 0.2,
  strokeColor: '#0000FF',
  strokeWeight: 2
});
```

### Geocoding

```javascript
// Geocode an address
try {
  const result = await map.geocode('1600 Pennsylvania Avenue NW, Washington, DC');
  console.log('Coordinates:', result.lat, result.lng);
  console.log('Formatted Address:', result.formattedAddress);
  
  // Add a marker at the geocoded location
  map.addMarker({
    lat: result.lat,
    lng: result.lng,
    title: result.formattedAddress
  });
} catch (error) {
  console.error('Geocoding failed:', error.message);
}

// Reverse geocode (coordinates to address)
try {
  const result = await map.reverseGeocode(40.7128, -74.0060);
  console.log('Address:', result.formattedAddress);
  console.log('Components:', result.components);
} catch (error) {
  console.error('Reverse geocoding failed:', error.message);
}
```

### Routing & Directions

```javascript
// Get directions between two points
try {
  const result = await map.getDirections(
    { lat: 40.7128, lng: -74.0060 }, // Origin
    { lat: 40.7589, lng: -73.9851 }, // Destination
    { travelMode: 'driving' }
  );
  
  console.log('Route ID:', result.routeId);
  console.log('Duration:', result.duration, 'seconds');
  console.log('Distance:', result.distance, 'meters');
  
  // The route is automatically drawn on the map
} catch (error) {
  console.error('Directions failed:', error.message);
}
```

### User Location

```javascript
// Get user's current location
try {
  const location = await map.getUserLocation();
  console.log('User location:', location.lat, location.lng);
  console.log('Accuracy:', location.accuracy, 'meters');
  
  // Center map on user location
  map.setCenter({ lat: location.lat, lng: location.lng });
  map.setZoom(15);
  
  // Add marker at user location
  map.addMarker({
    lat: location.lat,
    lng: location.lng,
    title: 'Your Location',
    label: '📍'
  });
} catch (error) {
  console.error('Location error:', error.message);
}

// Track user location (watch for changes)
const watchId = map.trackUserLocation((location) => {
  console.log('Location updated:', location.lat, location.lng);
  map.setCenter({ lat: location.lat, lng: location.lng });
}, {
  enableHighAccuracy: true,
  timeout: 10000
});
```

### Event Handling

```javascript
// Map click event
map.on('click', (event) => {
  console.log('Clicked at:', event.lat, event.lng);
  
  // Add marker on click
  map.addMarker({
    lat: event.lat,
    lng: event.lng,
    title: 'Clicked Location'
  });
});

// Zoom change event
map.on('zoom_changed', () => {
  console.log('Current zoom level:', map.getZoom());
});

// Remove event listener
const clickHandler = (event) => {
  console.log('Map clicked');
};
map.on('click', clickHandler);
map.off('click', clickHandler);
```

### Map Navigation

```javascript
// Set map center
map.setCenter({ lat: 40.7128, lng: -74.0060 });

// Get current center
const center = map.getCenter();
console.log('Map center:', center.lat, center.lng);

// Zoom controls
map.setZoom(15);
map.zoomIn();
map.zoomOut();
console.log('Current zoom:', map.getZoom());

// Pan to location
map.panTo({ lat: 40.7589, lng: -73.9851 });

// Fit bounds (show all markers/shapes)
map.fitBounds({
  southwest: { lat: 40.7000, lng: -74.0300 },
  northeast: { lat: 40.7300, lng: -74.0000 }
});

// Get current view bounds
const bounds = map.getBounds();
console.log('View bounds:', bounds);
```

### Advanced Features

```javascript
// Add heatmap
const heatmapPoints = [
  { lat: 40.7128, lng: -74.0060, weight: 1 },
  { lat: 40.7200, lng: -74.0100, weight: 2 },
  { lat: 40.7150, lng: -74.0050, weight: 1.5 }
];
const heatmapId = map.addHeatMap(heatmapPoints, {
  radius: 25,
  blur: 15,
  maxZoom: 18
});

// Add custom tile layer
const tileLayerId = map.addTileLayer('https://{s}.tile.example.com/{z}/{x}/{y}.png', {
  opacity: 0.8
});

// Enable traffic layer
map.enableTrafficLayer();

// Apply map style
map.applyMapStyle('dark'); // or 'light', 'satellite', etc.

// Enable 3D view (if supported)
map.enable3D(true);

// Get map container element
const container = map.getContainer();

// Clean up and destroy map
map.destroy();
```

---

## Changelog

### [2.2.11] - 2025-01-26

**▶️ Major Features:**
- ✨ **Custom Marker Support** - Added `addCustomMarker()` and `addCustomMarkers()` methods to all adapters
- 🎯 **Enhanced Marker Interaction** - Added `onMarkerClick()` method with popups and toast notifications
- 🛡️ **Comprehensive Error Handling** - Robust validation and error handling across all adapters
- ⚡ **Google Maps Improvements** - Map ID support, Advanced Marker Element, optimized loading

**Fixed:**
- **`updateMarker()` Position Validation** - Comprehensive validation and error handling across all 10 adapters:
  - ✅ GoogleMapsAdapter: Proper handling of AdvancedMarkerElement vs standard Marker
  - ✅ MapboxAdapter, BingMapsAdapter, AzureMapsAdapter, HereMapsAdapter
  - ✅ TomTomAdapter, YandexMapsAdapter, OSMAdapter, CartoAdapter, MapmyIndiaAdapter
  - All adapters validate coordinates (numeric, finite) before updating
  - All adapters provide clear error messages and handle edge cases gracefully
  - Try-catch blocks around all position update operations
- **Google Maps Advanced Marker Issues**:
  - Fixed "Map ID not found" warnings with proper Map ID support
  - Fixed `setPosition is not a function` error for AdvancedMarkerElement
  - Added `loading=async` parameter for best-practice script loading
  - Fixed styles conflict when Map ID is present (styles via Cloud Console)
- Resolved CodeQL alert "DOM text reinterpreted as HTML" across adapters:
  - Replaced unsafe `innerHTML` usage with safe DOM node removal when clearing containers
  - Escaped/sanitized popup and info window content (e.g., Azure Maps `HtmlMarker`, MapmyIndia `InfoWindow`)
- Stabilized CI for CodeQL and Node setup:
  - Committed lockfile to enable `actions/setup-node` caching
  - Aligned with GitHub's Default CodeQL setup to avoid SARIF processing conflicts
- Removed unused variables in adapter methods:
  - Cleaned up unused `circleId` variables in `drawCircle` implementations (Azure, TomTom, Yandex adapters)
- Improved error handling consistency:
  - Fixed Mapbox `reverseGeocode` to return `Promise.reject(new Error(...))` instead of string
  - Added HTTP status code validation in TomTom `geocode` and `reverseGeocode` methods
  - Standardized error messages across all adapters with HTTP status and response body details
- Fixed MapmyIndia adapter:
  - Improved SDK loading with callback-based initialization and better error messages
  - Fixed coordinate validation issues in `addMarker`
  - Replaced unsafe `innerHTML` with safe DOM manipulation in `destroy()` method
- Fixed Yandex Maps adapter:
  - Corrected `polylines` and `polygons` initialization (using Map instead of arrays)
  - Implemented REST API fallbacks for geocoding and reverse geocoding
  - Switched directions to use `ymaps.multiRouter.MultiRoute` for better reliability
- Fixed Mapbox adapter:
  - Improved coordinate validation and normalization in `addMarker` and `updateMarker`
  - Fixed "Style is not done loading" errors by implementing `executeWhenReady` pattern
  - Properly sets global `mapboxgl.accessToken` during initialization
- Fixed TomTom adapter:
  - Implemented `executeWhenReady` pattern to defer layer/source additions until map loads
  - Fixed polygon geometry to properly close GeoJSON polygon rings

**Added:**
- Custom marker functionality across all adapters (Google Maps, Mapbox, OSM, Bing, Azure, Here, TomTom, Yandex, Carto, MapmyIndia):
  - `addCustomMarker(options)` - Add markers with custom HTML content or icon URLs
  - `addCustomMarkers(markersArray)` - Batch add multiple custom markers
  - `onMarkerClick(markerId, callback, options)` - Add click handlers with custom popups and toast notifications
  - Support for custom HTML markers, icon URLs, icon sizing, and styling
  - Built-in toast notification system for marker interactions
- Enhanced marker interaction:
  - Custom popup HTML content on marker click
  - Toast notifications with configurable duration
  - Click event callbacks with location data
- ESLint configuration with security-focused rules:
  - Flat config (`eslint.config.js`) for ESLint v9+ compatibility
  - Security plugin to detect unsafe patterns (blocks `innerHTML` assignments)
  - Proper globals configuration for browser APIs and map SDKs (including `setInterval`, `clearInterval`)
  - Linting scripts: `npm run lint` and `npm run lint:fix`
- Improved error messages for API failures:
  - Better HTTP status code handling with detailed error messages
  - CORS error detection and helpful troubleshooting messages (MapmyIndia)
  - API key validation error messages (Yandex Maps 403 errors)
  - Network timeout handling with descriptive messages
- Consistent error handling patterns:
  - All adapters use `if (!marker) return false;` pattern for early returns
  - Try-catch blocks around all position update operations
  - Consistent error message format: "Failed to update marker position/geometry/data..."
  - Function existence checks before calling SDK methods (where applicable)
- Code optimization:
  - Removed unused variables and dead code
  - Consistent coordinate validation patterns
  - Improved code maintainability and readability

**Changed:**
- Consolidated documentation into a single README.md
- Updated repository, homepage, wiki, and issues links to RRJena/UniMap
- Personalized credits: "Made with ❤️ by Rakesh Ranjan Jena"
- Updated package metadata: author, repository, bugs, homepage
- Included LICENSE.md in published files
- Removed test HTML files (example-mapmyindia.html, test-mapmyindia-quick.html, test-google-maps.html, test.html)
- Optimized code patterns for better consistency and maintainability

**Provider Notes:**
- **Bing Maps**:
  - Service capabilities are limited and parts of the platform are deprecated by Microsoft. Some features (reliable geocoding/reverse geocoding and routing between specific waypoints) can intermittently fail.
  - We added REST API fallbacks for geocoding and reverse geocoding, but you may still encounter messages such as:
    - "We cannot find directions between one or more waypoints" for certain coordinates
    - Geocoding/Reverse geocoding failures for specific inputs
  - **Recommendation**: Prefer `Azure Maps` for production workloads. UniMap provides a first-class `AzureMapsAdapter` with more reliable geocoding, reverse geocoding, routing, and layers.
- **Google Maps**:
  - Custom HTML markers (via `addCustomMarker` with `html` option) require a valid Map ID
  - Create a Map ID in Google Cloud Console > Maps > Map Styles
  - When using `mapId`, map styles must be controlled via Cloud Console (not via `options.styles`)
  - `google.maps.Marker` is deprecated but still supported; `AdvancedMarkerElement` is used for custom HTML markers
- **MapmyIndia**:
  - CORS limitations may prevent REST API calls from localhost or certain origins
  - Some features (custom tile layers, traffic layer, indoor maps, 3D view) require Premium API access
  - Uses `{lng, lat}` coordinate format (longitude first) internally
- **Yandex Maps**:
  - Geocoding and reverse geocoding now use REST API fallback when JavaScript API fails
  - API key permissions may be required for geocoding services (403 errors indicate permission issues)
  - Uses `[lat, lng]` coordinate order (latitude first) in geometry operations
- **Mapbox**:
  - Custom markers with HTML content don't support title/label updates directly
  - Title and label updates require recreating the marker with new HTML content
- **All Adapters**:
  - All adapters now have consistent `updateMarker()` behavior with validation
  - Invalid coordinates are rejected with clear error messages
  - Missing markers return `false` instead of throwing errors

**Security Improvements:**
- **URL Injection Prevention**: All coordinates and addresses are now properly encoded using `encodeURIComponent()` before being used in API URLs
- **Input Validation**: Enhanced validation for coordinates, addresses, and required parameters across all adapters
- **Error Handling**: Consistent error messages that don't expose sensitive information (API keys, internal details)
- **XSS Mitigation**: Added security comments and documentation warnings for custom HTML usage
- **Code Quality**: ESLint security rules configured to detect unsafe patterns

**Published:**
- Released to npm as `unimap@2.2.11`

### [2.2.7] - 2024-12-19

**Fixed:**
- Critical geocoding, reverse geocoding, and directions API fixes for Bing Maps
- Updated MapmyIndiaAdapter to use Mappls v3 SDK
- Improved error handling with timeout protection (30 seconds)
- Fixed coordinate handling for MapmyIndia

**Changed:**
- MapmyIndia now uses `mappls` namespace (v3 API)
- Optimized build process with esbuild
- Minified build size: ~120KB

### [2.2.6] - Previous

- Bing Maps Directions API implementation fixes

---

## License

This project is dual-licensed under both:

- **MIT License** - see [LICENSE.md](https://github.com/RRJena/UniMap/blob/dev/LICENSE.md) file for details
- **GNU General Public License v3.0** - see [LICENSE](https://github.com/RRJena/UniMap/blob/dev/LICENSE) file for details

You may choose to use this software under either license, depending on your project requirements.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/RRJena/UniMap/issues)
- **Documentation**: [Full API Docs](https://github.com/RRJena/UniMap/#readme)
- **Wiki**: [GitHub Wiki](https://github.com/RRJena/UniMap/#readme)
- **LinkedIn**: [Rakesh Ranjan Jena](https://www.linkedin.com/in/rrjprince/)
- **Author Blog**: [rrjprince.com](http://www.rrjprince.com/)
- **Website**: [rakeshranjanjena.com](https://www.rakeshranjanjena.com)

---

## Security Considerations

### XSS Prevention

UniMap uses intentional `innerHTML` assignments for custom HTML markers and popups. **Always validate and sanitize user-provided HTML content** before passing it to:

- `addCustomMarker({ html: ... })`
- `onMarkerClick(..., { popupHtml: ... })`
- `addMarker({ title: ... })` (in some adapters)

**Recommendations:**
- Use a trusted HTML sanitization library (e.g., DOMPurify) for user-generated content
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
