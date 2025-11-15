// Version: 2.3.0 - Custom HTML Element & Secure API Key Support
import { SUPPORTED_PROVIDERS } from './utils/constants.js';
import { throwIfMissing } from './utils/common.js';

import { GoogleMapsAdapter } from './adapters/GoogleMapsAdapter.js';
import { MapboxAdapter } from './adapters/MapboxAdapter.js';
import { BingMapsAdapter } from './adapters/BingMapsAdapter.js';
import { OSMAdapter } from './adapters/OSMAdapter.js';
import { AzureMapsAdapter } from './adapters/AzureMapsAdapter.js';
import { HereMapsAdapter } from './adapters/HereMapsAdapter.js';
import { TomTomAdapter } from './adapters/TomTomAdapter.js';
import { YandexMapsAdapter } from './adapters/YandexMapsAdapter.js';
import { CartoAdapter } from './adapters/CartoAdapter.js';
import { MapmyIndiaAdapter } from './adapters/MapmyIndiaAdapter.js';

export class UniMap {
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
      case 'bing':
        this.adapter = new BingMapsAdapter(this.apiKey, this.containerId, this.options);
        break;
      case 'osm':
        this.adapter = new OSMAdapter(this.apiKey, this.containerId, this.options);
        break;
      case 'azure':
        this.adapter = new AzureMapsAdapter(this.apiKey, this.containerId, this.options);
        break;
      case 'here':
        this.adapter = new HereMapsAdapter(this.apiKey, this.containerId, this.options);
        break;
      case 'tomtom':
        this.adapter = new TomTomAdapter(this.apiKey, this.containerId, this.options);
        break;
      case 'yandex':
        this.adapter = new YandexMapsAdapter(this.apiKey, this.containerId, this.options);
        break;
      case 'carto':
        this.adapter = new CartoAdapter(this.apiKey, this.containerId, this.options);
        break;
      case 'mapmyindia':
        this.adapter = new MapmyIndiaAdapter(this.apiKey, this.containerId, this.options);
        break;
      default:
        throw new Error('Adapter not implemented for this provider');
    }
    await this.adapter.init();
  }

  _ensureInitialized() {
    if (!this.adapter) {
      throw new Error('Map not initialized. Call init() first.');
    }
  }

  addMarker(options) {
    this._ensureInitialized();
    return this.adapter.addMarker(options);
  }

  addCustomMarker(options) {
    this._ensureInitialized();
    return this.adapter.addCustomMarker(options);
  }

  addCustomMarkers(markersArray) {
    this._ensureInitialized();
    return this.adapter.addCustomMarkers(markersArray);
  }

  onMarkerClick(markerId, callback, options = {}) {
    this._ensureInitialized();
    return this.adapter.onMarkerClick(markerId, callback, options);
  }

  removeMarker(markerId) {
    this._ensureInitialized();
    return this.adapter.removeMarker(markerId);
  }

  updateMarker(markerId, options) {
    this._ensureInitialized();
    return this.adapter.updateMarker(markerId, options);
  }

  setCenter(coords) {
    this._ensureInitialized();
    return this.adapter.setCenter(coords);
  }

  getCenter() {
    this._ensureInitialized();
    return this.adapter.getCenter();
  }

  setZoom(level) {
    this._ensureInitialized();
    return this.adapter.setZoom(level);
  }

  getZoom() {
    this._ensureInitialized();
    return this.adapter.getZoom();
  }

  zoomIn() {
    this._ensureInitialized();
    return this.adapter.zoomIn();
  }

  zoomOut() {
    this._ensureInitialized();
    return this.adapter.zoomOut();
  }

  panTo(coords) {
    this._ensureInitialized();
    return this.adapter.panTo(coords);
  }

  fitBounds(bounds) {
    this._ensureInitialized();
    return this.adapter.fitBounds(bounds);
  }

  geocode(address) {
    this._ensureInitialized();
    return this.adapter.geocode(address);
  }

  reverseGeocode(lat, lng) {
    this._ensureInitialized();
    return this.adapter.reverseGeocode(lat, lng);
  }

  drawRoute(coords, options = {}) {
    this._ensureInitialized();
    return this.adapter.drawRoute(coords, options);
  }

  getDirections(origin, destination, options = {}) {
    this._ensureInitialized();
    return this.adapter.getDirections(origin, destination, options);
  }

  drawPolygon(coords, options = {}) {
    this._ensureInitialized();
    return this.adapter.drawPolygon(coords, options);
  }

  drawPolyline(coords, options = {}) {
    this._ensureInitialized();
    return this.adapter.drawPolyline(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    this._ensureInitialized();
    return this.adapter.drawCircle(center, radius, options);
  }

  drawRectangle(bounds, options = {}) {
    this._ensureInitialized();
    return this.adapter.drawRectangle(bounds, options);
  }

  enableTrafficLayer() {
    this._ensureInitialized();
    return this.adapter.enableTrafficLayer();
  }

  disableTrafficLayer() {
    this._ensureInitialized();
    return this.adapter.disableTrafficLayer();
  }

  addHeatMap(points, options = {}) {
    this._ensureInitialized();
    return this.adapter.addHeatMap(points, options);
  }

  addTileLayer(url, options = {}) {
    this._ensureInitialized();
    return this.adapter.addTileLayer(url, options);
  }

  removeLayer(layerId) {
    this._ensureInitialized();
    return this.adapter.removeLayer(layerId);
  }

  trackUserLocation(callback, options = {}) {
    this._ensureInitialized();
    return this.adapter.trackUserLocation(callback, options);
  }

  getUserLocation() {
    this._ensureInitialized();
    return this.adapter.getUserLocation();
  }

  indoorMaps(enable) {
    this._ensureInitialized();
    return this.adapter.indoorMaps(enable);
  }

  applyMapStyle(style) {
    this._ensureInitialized();
    return this.adapter.applyMapStyle(style);
  }

  enable3D(enable) {
    this._ensureInitialized();
    return this.adapter.enable3D(enable);
  }

  on(event, callback) {
    this._ensureInitialized();
    return this.adapter.on(event, callback);
  }

  off(event, callback) {
    this._ensureInitialized();
    return this.adapter.off(event, callback);
  }

  getBounds() {
    this._ensureInitialized();
    return this.adapter.getBounds();
  }

  getContainer() {
    if (!this.adapter) {
      // Return container element if available, even if not initialized
      const container = document.getElementById(this.containerId);
      return container || null;
    }
    return this.adapter.getContainer();
  }

  destroy() {
    if (!this.adapter) {
      return;
    }
    this.adapter.destroy();
    this.adapter = null;
  }
}

if (typeof window !== 'undefined') {
  window.UniMap = UniMap;
}
  