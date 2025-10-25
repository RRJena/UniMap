# UniMap Examples

This directory contains example files demonstrating the UniMap library usage.

## Files

### test-all-providers.html
A comprehensive interactive test page that allows you to test all 10 supported map providers.

**Features:**
- Switch between all supported providers
- Test all API methods interactively
- Real-time status logging
- Beautiful modern UI

**Usage:**
1. Start a local server (e.g., `python -m http.server 8000`)
2. Open `http://localhost:8000/examples/test-all-providers.html`
3. Enter your API key for the provider you want to test
4. Click "Initialize Map"
5. Test all features using the buttons

### basic-usage.html
A simple example demonstrating basic map usage with multiple providers.

## Requirements

- A valid API key for the provider you want to use
- A local web server (files must be served over HTTP/HTTPS, not file://)
- Modern browser with ES6 module support

## Supported Providers

All examples support these providers:
- Google Maps
- Mapbox
- Bing Maps
- OpenStreetMap (OSM)
- Azure Maps
- HERE Maps
- TomTom
- Yandex Maps
- CARTO

