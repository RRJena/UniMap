# UniMap

**Unified Mapping Library - One API for All Map Providers**

[![npm version](https://img.shields.io/npm/v/unimap.svg)](https://www.npmjs.com/package/unimap)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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
- 📦 **Zero Dependencies** - Standalone library with minimal footprint (85KB gzipped)
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
    zoom: 12
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
| `addMarker(options)` | Add marker | `{ lat, lng, title, label }` | `string` |
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
const markerId = map.addMarker({
  lat: 40.7128,
  lng: -74.0060,
  title: 'New York City',
  label: 'NYC',
  draggable: true
});
```

### Geocoding

```javascript
try {
  const result = await map.geocode('1600 Pennsylvania Avenue NW, Washington, DC');
  console.log('Coordinates:', result.lat, result.lng);
} catch (error) {
  console.error('Geocoding failed:', error);
}
```

### Routing

```javascript
try {
  const result = await map.getDirections(
    { lat: 40.7128, lng: -74.0060 },
    { lat: 40.7589, lng: -73.9851 },
    { travelMode: 'driving' }
  );
  console.log('Duration:', result.duration);
  console.log('Distance:', result.distance);
} catch (error) {
  console.error('Routing failed:', error);
}
```

### Event Handling

```javascript
map.on('click', (event) => {
  console.log('Clicked at:', event.lat, event.lng);
});

map.on('zoom_changed', () => {
  console.log('Zoom:', map.getZoom());
});
```

---

## Changelog

### [2.2.7] - 2024-12-19

**Fixed:**
- Critical geocoding, reverse geocoding, and directions API fixes for Bing Maps
- Updated MapmyIndiaAdapter to use Mappls v3 SDK
- Improved error handling with timeout protection (30 seconds)
- Fixed coordinate handling for MapmyIndia

**Changed:**
- MapmyIndia now uses `mappls` namespace (v3 API)
- Optimized build process with esbuild
- Minified build size: 85KB

### [2.2.6] - Previous

- Bing Maps Directions API implementation fixes

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/unimap/unimap/issues)
- **Documentation**: [Full API Docs](https://github.com/unimap/unimap/wiki)
- **Email**: support@unimap.dev

---

**Made with ❤️ by the UniMap Team**
