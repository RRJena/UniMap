# UniMap

**Unified Mapping Library for Multiple Providers**

---

## What is UniMap?

UniMap is a JavaScript library that provides a single, consistent API for working with multiple map providers. Switch between Google Maps, Mapbox, Bing Maps, OpenStreetMap, and more without changing your application code.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Supported Providers](#supported-providers)
- [Advantages](#advantages)
- [Usage Examples](#usage-examples)
- [Module Documentation](#module-documentation)
- [Contributing](#contributing)

---

## Installation

### NPM

```bash
npm install unimap
```

### Manual Download

1. Download the latest release
2. Extract the files to your project
3. Include the library in your HTML:

```html
<script type="module">
  import { UniMap } from './unimap.js';
</script>
```

### CDN

```html
<script type="module">
  import { UniMap } from 'https://unpkg.com/unimap@latest/unimap.js';
</script>
```

---

## Quick Start

### Basic Example

```javascript
import { UniMap } from './unimap.js';

// Initialize a map
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

// Add a marker
map.addMarker({
  lat: 40.7128,
  lng: -74.0060,
  title: 'New York City'
});
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
  
  <script type="module" src="./your-app.js"></script>
</body>
</html>
```

---

## Documentation

### API Reference

#### Core Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `init()` | Initialize the map | - | Promise |
| `destroy()` | Clean up and destroy the map | - | void |
| `setCenter(coords)` | Set map center | `{ lat, lng }` | void |
| `getCenter()` | Get current center | - | `{ lat, lng }` |
| `setZoom(level)` | Set zoom level | `number` | void |
| `getZoom()` | Get current zoom | - | `number` |

#### Marker Management

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `addMarker(options)` | Add a marker | `{ lat, lng, title, label }` | `string` |
| `removeMarker(id)` | Remove marker | `string` | `boolean` |
| `updateMarker(id, options)` | Update marker | `string, object` | `boolean` |

#### Drawing Tools

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `drawRoute(coords, options)` | Draw a route | `array, object` | `string` |
| `drawPolygon(coords, options)` | Draw a polygon | `array, object` | `string` |
| `drawCircle(center, radius, options)` | Draw a circle | `{ lat, lng }, number, object` | `string` |
| `drawRectangle(bounds, options)` | Draw a rectangle | `object, object` | `string` |

#### Geocoding & Routing

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `geocode(address)` | Convert address to coordinates | `string` | `Promise<object>` |
| `reverseGeocode(lat, lng)` | Convert coordinates to address | `number, number` | `Promise<object>` |
| `getDirections(origin, destination, options)` | Get route directions | `object, object, object` | `Promise<object>` |

#### Event Handling

```javascript
// Add event listener
map.on('click', (event) => {
  console.log('Map clicked at:', event.latLng);
});

// Remove event listener
map.off('click', callback);

// Available events
map.on('zoom_changed', callback);
map.on('center_changed', callback);
map.on('bounds_changed', callback);
```

---

## Supported Providers

| Provider | API Key Required | Geocoding | Routing | 3D View |
|----------|-----------------|-----------|---------|---------|
| Google Maps | ✅ | ✅ | ✅ | ✅ |
| Mapbox | ✅ | ✅ | ✅ | ✅ |
| Bing Maps | ✅ | ✅ | ✅ | Partial |
| OpenStreetMap | ❌ | ✅ | ✅ | ❌ |

---

## Advantages

### 1. **Provider Agnostic**
Use the same API regardless of the underlying map provider. No need to learn multiple APIs.

### 2. **Easy Switching**
Switch providers with a single line change:

```javascript
// Switch from Google Maps to Mapbox
const map = new UniMap({
  provider: 'mapbox',  // Just change this
  apiKey: 'your-key',
  containerId: 'map',
  options: { /* same options */ }
});
```

### 3. **Cost Optimization**
Switch to free providers when appropriate to reduce costs. Use OpenStreetMap for development and Google Maps for production.

### 4. **Future-Proof**
Add new providers without changing your application code. Just update the adapter.

### 5. **Consistent API**
One API to learn for all mapping operations, reducing the learning curve.

### 6. **Type Safety**
Full TypeScript support with comprehensive type definitions.

### 7. **Modular Architecture**
Clean separation of concerns using the adapter pattern.

### 8. **Performance**
Lazy loading of provider-specific code reduces bundle size.

### 9. **Maintainability**
Single codebase to maintain instead of multiple provider-specific implementations.

### 10. **Testing**
Easier to test with a consistent interface across providers.

---

## Usage Examples

### Add Markers

```javascript
const markerId = map.addMarker({
  lat: 40.7128,
  lng: -74.0060,
  title: 'New York City',
  label: 'NYC',
  draggable: true
});
```

### Draw Routes

```javascript
const routeId = map.drawRoute([
  { lat: 40.7128, lng: -74.0060 },
  { lat: 40.7589, lng: -73.9851 }
], {
  strokeColor: '#FF0000',
  strokeWeight: 5,
  strokeOpacity: 0.8
});
```

### Geocoding

```javascript
try {
  const result = await map.geocode('1600 Pennsylvania Avenue NW, Washington, DC');
  console.log('Coordinates:', result.lat, result.lng);
  console.log('Address:', result.formattedAddress);
} catch (error) {
  console.error('Geocoding failed:', error);
}
```

### Reverse Geocoding

```javascript
try {
  const result = await map.reverseGeocode(38.8977, -77.0365);
  console.log('Address:', result.formattedAddress);
} catch (error) {
  console.error('Reverse geocoding failed:', error);
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
  console.log('Route duration:', result.duration);
  console.log('Route distance:', result.distance);
} catch (error) {
  console.error('Routing failed:', error);
}
```

### User Location

```javascript
try {
  const location = await map.getUserLocation();
  console.log('User location:', location);
  
  map.setCenter(location);
  map.setZoom(15);
  
  map.addMarker({
    lat: location.lat,
    lng: location.lng,
    title: 'Your Location'
  });
} catch (error) {
  console.error('Failed to get user location:', error);
}
```

### Heatmap

```javascript
const heatmapId = map.addHeatMap([
  { lat: 40.7128, lng: -74.0060, weight: 1 },
  { lat: 40.7589, lng: -73.9851, weight: 2 },
  { lat: 40.7489, lng: -73.9680, weight: 3 }
], {
  radius: 20,
  opacity: 0.6
});
```

---

## Module Documentation

### Core Module: `unimap.js`

Main entry point for the library. Exports the `UniMap` class.

**Exports:**
- `UniMap` - Main class for creating map instances

### Adapters: `adapters/`

Provider-specific implementations.

**Files:**
- `BaseAdapter.js` - Abstract base class for all adapters
- `GoogleMapsAdapter.js` - Google Maps implementation
- `MapboxAdapter.js` - Mapbox implementation
- `BingMapsAdapter.js` - Bing Maps implementation
- `OSMAdapter.js` - OpenStreetMap implementation

### Utilities: `utils/`

Helper functions and constants.

**Files:**
- `constants.js` - Constants including supported providers
- `common.js` - Common utility functions

---

## Running This Code

### Prerequisites

- Modern web browser (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)
- HTTP server (for local development)

### Development Server

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

### Open in Browser

```
http://localhost:8000/example/index.html
```

### With API Keys

1. Get API keys from your chosen provider:
   - [Google Maps](https://developers.google.com/maps/documentation/javascript/get-api-key)
   - [Mapbox](https://account.mapbox.com/access-tokens/)
   - [Bing Maps](https://www.microsoft.com/en-us/maps/create-a-bing-maps-key)

2. Update the API key in your HTML:

```html
<script type="module">
  const map = new UniMap({
    provider: 'google',
    apiKey: 'YOUR_API_KEY_HERE',
    containerId: 'map',
    options: {
      center: { lat: 40.7128, lng: -74.0060 },
      zoom: 12
    }
  });
  
  await map.init();
</script>
```

### Testing Different Providers

Switch providers easily:

```javascript
// Google Maps
provider: 'google'

// Mapbox
provider: 'mapbox'

// Bing Maps
provider: 'bing'

// OpenStreetMap (no API key needed)
provider: 'osm'
```

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/unimap.git

# Navigate to directory
cd unimap

# Open example
open example/index.html
```

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: [Full API Reference](https://github.com/yourusername/unimap/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/unimap/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/unimap/discussions)

---

**Made with ❤️ for the mapping community**
