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

| Provider | API Key Required | Geocoding | Routing | 3D View | Status |
|----------|-----------------|-----------|---------|---------|---------|
| Google Maps | ✅ | ✅ | ✅ | ✅ | ✅ Stable |
| Mapbox | ✅ | ✅ | ✅ | ✅ | ✅ Stable |
| Bing Maps | ✅ | ✅ | ✅ | Partial | ✅ Stable |
| OpenStreetMap | ❌ | ✅ | ✅ | ❌ | ✅ Stable |
| Azure Maps | ✅ | ✅ | ✅ | ✅ | ✅ Stable |
| Here Maps | ✅ | ✅ | ✅ | ✅ | ✅ Stable |
| TomTom | ✅ | ✅ | ✅ | ✅ | ✅ Stable |
| Yandex Maps | ✅ | ✅ | ✅ | Partial | ✅ Stable |
| Carto | ✅ | ✅ | ✅ | ❌ | ✅ Stable |

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
- `BingMapsAdapter.js` - Bing Maps implementation (recently updated with proper Directions API usage)
- `OSMAdapter.js` - OpenStreetMap implementation
- `AzureMapsAdapter.js` - Azure Maps implementation
- `HereMapsAdapter.js` - Here Maps implementation
- `TomTomAdapter.js` - TomTom implementation
- `YandexMapsAdapter.js` - Yandex Maps implementation
- `CartoAdapter.js` - Carto implementation

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
- API keys for map providers (optional for OpenStreetMap)

### Quick Start

1. **Clone or download the repository**
2. **Set up configuration** (see Configuration section below)
3. **Start a local server** (see Development Server section below)
4. **Open the example** in your browser

### Configuration

Before running the application, you need to set up your API keys:

1. **Create `config.js`**: Copy `config.example.js` to `config.js` in the root directory:
   ```bash
   cp config.example.js config.js
   ```

2. **Add API Keys**: Open `config.js` and replace the placeholder values with your actual API keys:
   ```javascript
   window.UNIMAP_CONFIG = {
     google: {
       apiKey: 'your_actual_google_maps_api_key'
     },
     mapbox: {
       apiKey: 'your_actual_mapbox_api_key'
     },
     bing: {
       apiKey: 'your_actual_bing_maps_api_key'
     },
     azure: {
       apiKey: 'your_actual_azure_maps_api_key'
     },
     here: {
       apiKey: 'your_actual_here_maps_api_key'
     },
     tomtom: {
       apiKey: 'your_actual_tomtom_api_key'
     },
     yandex: {
       apiKey: 'your_actual_yandex_maps_api_key'
     },
     carto: {
       apiKey: 'your_actual_carto_api_key'
     }
   };
   ```

3. **Get API Keys** from your chosen providers:
   - [Google Maps](https://developers.google.com/maps/documentation/javascript/get-api-key)
   - [Mapbox](https://account.mapbox.com/access-tokens/)
   - [Bing Maps](https://www.microsoft.com/en-us/maps/create-a-bing-maps-key)
   - [Azure Maps](https://docs.microsoft.com/en-us/azure/azure-maps/how-to-manage-account-keys)
   - [Here Maps](https://developer.here.com/documentation/authentication/dev_guide/topics/api-key-credentials.html)
   - [TomTom](https://developer.tomtom.com/user/me/apps)
   - [Yandex Maps](https://yandex.com/dev/maps/jsapi/doc/2.1/quick-start/tutorial.html)
   - [Carto](https://carto.com/developers/)

4. **Important**: Never commit `config.js` to version control as it contains sensitive API keys.

### Development Server

Since UniMap uses ES6 modules, you need to serve the files through an HTTP server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000

# Using Node.js serve package
npx serve .
```

### Running Examples

#### Main Example (`example/index.html`)

The main example demonstrates all UniMap features with a comprehensive interface:

1. **Start your development server** (see above)
2. **Open in browser**: `http://localhost:8000/example/index.html`
3. **Features available**:
   - Switch between different map providers
   - Add markers, polylines, and polygons
   - Test geocoding and reverse geocoding
   - Draw routes and shapes
   - Test user location features

#### Google Maps Example (`example/googleMap.html`)

A focused example for Google Maps:

1. **Open**: `http://localhost:8000/example/googleMap.html`
2. **Enter your Google Maps API key** in the provided input field
3. **Test Google Maps features** including markers, geocoding, and routing

#### Testing Google Maps API Key (`test-google-maps.html`)

A dedicated tool to test and validate your Google Maps API key:

1. **Open**: `http://localhost:8000/test-google-maps.html`
2. **Enter your Google Maps API key** in the input field
3. **Click "Test API Key"** to validate your key and check for common errors:
   - Invalid key format
   - Disabled APIs
   - Billing issues
   - Quota exceeded
4. **Click "Load Map"** to see a basic map display if the key is valid

### Using Different Providers

Switch providers easily in your code:

```javascript
// Google Maps (requires API key)
provider: 'google'

// Mapbox (requires API key)
provider: 'mapbox'

// Bing Maps (requires API key)
provider: 'bing'

// OpenStreetMap (no API key needed)
provider: 'osm'

// Azure Maps (requires API key)
provider: 'azure'

// Here Maps (requires API key)
provider: 'here'

// TomTom (requires API key)
provider: 'tomtom'

// Yandex Maps (requires API key)
provider: 'yandex'

// Carto (requires API key)
provider: 'carto'
```

### Direct File Opening

**Note**: Due to CORS restrictions with ES6 modules, you cannot simply open HTML files directly in the browser. You must use an HTTP server.

If you try to open files directly, you'll see errors like:
```
Access to script at 'file:///...' from origin 'null' has been blocked by CORS policy
```

### Troubleshooting

#### Common Issues

1. **CORS Errors**: Make sure you're using an HTTP server, not opening files directly
2. **API Key Errors**: Verify your API keys are correct and have the necessary APIs enabled
3. **Map Not Loading**: Check browser console for error messages
4. **Module Import Errors**: Ensure you're using a modern browser that supports ES6 modules

#### Browser Console

Always check the browser console (F12) for error messages when troubleshooting issues.

### Development Workflow

1. **Make changes** to your code
2. **Refresh the browser** to see changes
3. **Check console** for any errors
4. **Test different providers** to ensure compatibility

---

## Recent Updates

### Latest Improvements

- **Bing Maps Directions API Fix**: Fixed the `getDirections` method in BingMapsAdapter to properly use the DirectionsManager API instead of the incorrect static method call
- **Enhanced Geocoding**: Updated Bing Maps geocoding and reverse geocoding to use the modern SearchManager API
- **New Providers**: Added support for Azure Maps, Here Maps, TomTom, Yandex Maps, and Carto
- **Improved Error Handling**: Enhanced error handling across all adapters with better error messages and validation
- **Configuration System**: Streamlined configuration with `config.example.js` template for easy setup

### Breaking Changes

None in this version. All changes are backward compatible.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/unimap.git

# Navigate to directory
cd unimap

# Set up configuration
cp config.example.js config.js
# Edit config.js with your API keys

# Start development server
python3 -m http.server 8000
# or
npx http-server

# Open example in browser
# http://localhost:8000/example/index.html
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
