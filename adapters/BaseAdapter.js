/**
 * Base Adapter Class - Defines the common interface for all map providers
 * All map provider adapters must extend this class and implement all methods
 */
export class BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    this.apiKey = apiKey;
    this.containerId = containerId;
    this.options = options;
    this.map = null;
    this.markers = new Map();
    this.polylines = new Map();
    this.polygons = new Map();
    this.heatmaps = new Map();
    this.layers = new Map();
  }

  async init() {
    throw new Error('init() method must be implemented by the adapter');
  }

  addMarker(options) {
    throw new Error('addMarker() method must be implemented by the adapter');
  }

  removeMarker(markerId) {
    throw new Error('removeMarker() method must be implemented by the adapter');
  }

  updateMarker(markerId, options) {
    throw new Error('updateMarker() method must be implemented by the adapter');
  }

  setCenter(coords) {
    throw new Error('setCenter() method must be implemented by the adapter');
  }

  getCenter() {
    throw new Error('getCenter() method must be implemented by the adapter');
  }

  setZoom(level) {
    throw new Error('setZoom() method must be implemented by the adapter');
  }

  getZoom() {
    throw new Error('getZoom() method must be implemented by the adapter');
  }

  zoomIn() {
    throw new Error('zoomIn() method must be implemented by the adapter');
  }

  zoomOut() {
    throw new Error('zoomOut() method must be implemented by the adapter');
  }

  panTo(coords) {
    throw new Error('panTo() method must be implemented by the adapter');
  }

  fitBounds(bounds) {
    throw new Error('fitBounds() method must be implemented by the adapter');
  }

  geocode(address) {
    throw new Error('geocode() method must be implemented by the adapter');
  }

  reverseGeocode(lat, lng) {
    throw new Error('reverseGeocode() method must be implemented by the adapter');
  }

  drawRoute(coords, options = {}) {
    throw new Error('drawRoute() method must be implemented by the adapter');
  }

  getDirections(origin, destination, options = {}) {
    throw new Error('getDirections() method must be implemented by the adapter');
  }

  drawPolygon(coords, options = {}) {
    throw new Error('drawPolygon() method must be implemented by the adapter');
  }

  drawPolyline(coords, options = {}) {
    throw new Error('drawPolyline() method must be implemented by the adapter');
  }

  drawCircle(center, radius, options = {}) {
    throw new Error('drawCircle() method must be implemented by the adapter');
  }

  drawRectangle(bounds, options = {}) {
    throw new Error('drawRectangle() method must be implemented by the adapter');
  }

  enableTrafficLayer() {
    throw new Error('enableTrafficLayer() method must be implemented by the adapter');
  }

  disableTrafficLayer() {
    throw new Error('disableTrafficLayer() method must be implemented by the adapter');
  }

  addHeatMap(points, options = {}) {
    throw new Error('addHeatMap() method must be implemented by the adapter');
  }

  addTileLayer(url, options = {}) {
    throw new Error('addTileLayer() method must be implemented by the adapter');
  }

  removeLayer(layerId) {
    throw new Error('removeLayer() method must be implemented by the adapter');
  }

  trackUserLocation(callback, options = {}) {
    throw new Error('trackUserLocation() method must be implemented by the adapter');
  }

  getUserLocation() {
    throw new Error('getUserLocation() method must be implemented by the adapter');
  }

  indoorMaps(enable) {
    throw new Error('indoorMaps() method must be implemented by the adapter');
  }

  applyMapStyle(style) {
    throw new Error('applyMapStyle() method must be implemented by the adapter');
  }

  enable3D(enable) {
    throw new Error('enable3D() method must be implemented by the adapter');
  }

  on(event, callback) {
    throw new Error('on() method must be implemented by the adapter');
  }

  off(event, callback) {
    throw new Error('off() method must be implemented by the adapter');
  }

  getBounds() {
    throw new Error('getBounds() method must be implemented by the adapter');
  }

  getContainer() {
    return document.getElementById(this.containerId);
  }

  destroy() {
    throw new Error('destroy() method must be implemented by the adapter');
  }

  _validateCoordinates(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  _generateId() {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
