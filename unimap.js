// Version: 2.2.11 - Custom Markers & Enhanced Features
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

  addMarker(options) {
    return this.adapter.addMarker(options);
  }

  addCustomMarker(options) {
    return this.adapter.addCustomMarker(options);
  }

  addCustomMarkers(markersArray) {
    return this.adapter.addCustomMarkers(markersArray);
  }

  onMarkerClick(markerId, callback, options = {}) {
    return this.adapter.onMarkerClick(markerId, callback, options);
  }

  removeMarker(markerId) {
    return this.adapter.removeMarker(markerId);
  }

  updateMarker(markerId, options) {
    return this.adapter.updateMarker(markerId, options);
  }

  setCenter(coords) {
    return this.adapter.setCenter(coords);
  }

  getCenter() {
    return this.adapter.getCenter();
  }

  setZoom(level) {
    return this.adapter.setZoom(level);
  }

  getZoom() {
    return this.adapter.getZoom();
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

  fitBounds(bounds) {
    return this.adapter.fitBounds(bounds);
  }

  geocode(address) {
    return this.adapter.geocode(address);
  }

  reverseGeocode(lat, lng) {
    return this.adapter.reverseGeocode(lat, lng);
  }

  drawRoute(coords, options = {}) {
    return this.adapter.drawRoute(coords, options);
  }

  getDirections(origin, destination, options = {}) {
    return this.adapter.getDirections(origin, destination, options);
  }

  drawPolygon(coords, options = {}) {
    return this.adapter.drawPolygon(coords, options);
  }

  drawPolyline(coords, options = {}) {
    return this.adapter.drawPolyline(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    return this.adapter.drawCircle(center, radius, options);
  }

  drawRectangle(bounds, options = {}) {
    return this.adapter.drawRectangle(bounds, options);
  }

  enableTrafficLayer() {
    return this.adapter.enableTrafficLayer();
  }

  disableTrafficLayer() {
    return this.adapter.disableTrafficLayer();
  }

  addHeatMap(points, options = {}) {
    return this.adapter.addHeatMap(points, options);
  }

  addTileLayer(url, options = {}) {
    return this.adapter.addTileLayer(url, options);
  }

  removeLayer(layerId) {
    return this.adapter.removeLayer(layerId);
  }

  trackUserLocation(callback, options = {}) {
    return this.adapter.trackUserLocation(callback, options);
  }

  getUserLocation() {
    return this.adapter.getUserLocation();
  }

  indoorMaps(enable) {
    return this.adapter.indoorMaps(enable);
  }

  applyMapStyle(style) {
    return this.adapter.applyMapStyle(style);
  }

  enable3D(enable) {
    return this.adapter.enable3D(enable);
  }

  on(event, callback) {
    return this.adapter.on(event, callback);
  }

  off(event, callback) {
    return this.adapter.off(event, callback);
  }

  getBounds() {
    return this.adapter.getBounds();
  }

  getContainer() {
    return this.adapter.getContainer();
  }

  destroy() {
    return this.adapter.destroy();
  }
}

if (typeof window !== 'undefined') {
  window.UniMap = UniMap;
}
  