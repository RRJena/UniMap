import { SUPPORTED_PROVIDERS } from './utils/constants.js';
import { throwIfMissing } from './utils/common.js';

import { GoogleMapsAdapter } from './adapters/GoogleMapsAdapter.js';
import { MapboxAdapter } from './adapters/MapboxAdapter.js';
import { OSMAdapter } from './adapters/OSMAdapter.js';
// Add other adapters here...

export class MyMapLib {
  constructor({ provider, apiKey, containerId, options = {} }) {
    if (!provider) throwIfMissing('provider');
    if (!containerId) throwIfMissing('containerId');

    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    this.provider = provider;
    this.apiKey = apiKey;
    this.containerId = containerId;
    this.options = options;
    this.adapter = null;
  }

  async init() {
    switch (this.provider) {
      case 'google':
        this.adapter = new GoogleMapsAdapter(this.apiKey, this.containerId, this.options);
        break;
      case 'mapbox':
        this.adapter = new MapboxAdapter(this.apiKey, this.containerId, this.options);
        break;
      case 'osm':
        this.adapter = new OSMAdapter(this.containerId, this.options);
        break;
      // Add cases for other providers...
      default:
        throw new Error('Adapter not implemented for this provider');
    }
    await this.adapter.init();
  }

  addMarker(options) {
    return this.adapter.addMarker(options);
  }

  removeMarker(markerId) {
    return this.adapter.removeMarker(markerId);
  }

  setCenter(coords) {
    return this.adapter.setCenter(coords);
  }

  getCenter() {
    return this.adapter.getCenter();
  }

  zoomIn() {
    return this.adapter.zoomIn();
  }

  zoomOut() {
    return this.adapter.zoomOut();
  }

  panTo(coords) {
    return this.adapter.panTo(coords);
  }

  geocode(address) {
    return this.adapter.geocode(address);
  }

  reverseGeocode(lat, lng) {
    return this.adapter.reverseGeocode(lat, lng);
  }

  drawRoute(coords) {
    return this.adapter.drawRoute(coords);
  }

  drawPolygon(coords) {
    return this.adapter.drawPolygon(coords);
  }

  enableTrafficLayer() {
    return this.adapter.enableTrafficLayer();
  }

  disableTrafficLayer() {
    return this.adapter.disableTrafficLayer();
  }

  addHeatMap(points) {
    return this.adapter.addHeatMap(points);
  }

  trackUserLocation(callback) {
    return this.adapter.trackUserLocation(callback);
  }

  indoorMaps(enable) {
    return this.adapter.indoorMaps(enable);
  }

  applyMapStyle(style) {
    return this.adapter.applyMapStyle(style);
  }

  destroy() {
    return this.adapter.destroy();
  }
}

