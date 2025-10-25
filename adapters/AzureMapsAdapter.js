import { BaseAdapter } from './BaseAdapter.js';

export class AzureMapsAdapter extends BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    super(apiKey, containerId, options);
    this.eventListeners = new Map();
  }

  async init() {
    await this.loadAzureMapsScript();

    const mapElement = this.getContainer();
    if (!mapElement) {
      throw new Error(`Container element with ID '${this.containerId}' not found.`);
    }

    // Validate center coordinates
    const centerLat = typeof this.options.center?.lat === 'number' ? this.options.center.lat : 0;
    const centerLng = typeof this.options.center?.lng === 'number' ? this.options.center.lng : 0;

    this.map = new atlas.Map(mapElement, {
      authOptions: {
        authType: 'subscriptionKey',
        subscriptionKey: this.apiKey
      },
      center: [centerLng, centerLat],
      zoom: this.options.zoom || 10,
      view: this.options.view || 'Auto'
    });
  }

  loadAzureMapsScript() {
    return new Promise((resolve, reject) => {
      if (window.atlas && window.atlas.Map) {
        return resolve();
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://atlas.microsoft.com/sdk/css/atlas.min.css?api-version=2';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://atlas.microsoft.com/sdk/js/atlas.min.js?api-version=2';
      script.onload = resolve;
      script.onerror = reject;

      document.head.appendChild(script);
    });
  }

  addMarker(options) {
    const markerId = this._generateId();
    
    const marker = new atlas.HtmlMarker({
      position: [options.lng, options.lat],
      htmlContent: `<div style="color: ${options.color || 'red'}; font-weight: bold;">${options.label || options.title || ''}</div>`,
      popup: options.title ? new atlas.Popup({ content: options.title }) : null
    });

    this.map.markers.add(marker);
    this.markers.set(markerId, marker);
    
    return markerId;
  }

  removeMarker(markerId) {
    const marker = this.markers.get(markerId);
    if (marker) {
      this.map.markers.remove(marker);
      this.markers.delete(markerId);
      return true;
    }
    return false;
  }

  updateMarker(markerId, options) {
    const marker = this.markers.get(markerId);
    if (marker) {
      if (options.position) {
        marker.setOptions({ position: [options.position.lng, options.position.lat] });
      }
      if (options.title !== undefined) {
        marker.setPopup(new atlas.Popup({ content: options.title }));
      }
      return true;
    }
    return false;
  }

  setCenter(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.setCamera({ center: [coords.lng, coords.lat] });
    }
  }

  getCenter() {
    const center = this.map.getCamera().center;
    return { lat: center[1], lng: center[0] };
  }

  setZoom(level) {
    this.map.setCamera({ zoom: level });
  }

  getZoom() {
    return this.map.getCamera().zoom;
  }

  zoomIn() {
    const zoom = this.map.getCamera().zoom;
    this.map.setCamera({ zoom: zoom + 1 });
  }

  zoomOut() {
    const zoom = this.map.getCamera().zoom;
    this.map.setCamera({ zoom: zoom - 1 });
  }

  panTo(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.setCamera({ center: [coords.lng, coords.lat], type: 'fly' });
    }
  }

  fitBounds(bounds) {
    this.map.setCamera({
      bounds: [[bounds.southwest.lng, bounds.southwest.lat], [bounds.northeast.lng, bounds.northeast.lat]],
      padding: 50
    });
  }

  async geocode(address) {
    const url = `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${this.apiKey}&query=${encodeURIComponent(address)}&limit=1`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: result.position.lat,
          lng: result.position.lon,
          formattedAddress: result.address.freeformAddress
        };
      } else {
        throw new Error('No results found');
      }
    } catch (error) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  async reverseGeocode(lat, lng) {
    if (!this._validateCoordinates(lat, lng)) {
      return Promise.reject(new Error('Invalid coordinates'));
    }

    const url = `https://atlas.microsoft.com/search/address/reverse/json?api-version=1.0&subscription-key=${this.apiKey}&query=${lat},${lng}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.addresses && data.addresses.length > 0) {
        const address = data.addresses[0].address;
        return {
          formattedAddress: address.freeformAddress,
          components: address
        };
      } else {
        throw new Error('No results found');
      }
    } catch (error) {
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  drawRoute(coords, options = {}) {
    const routeId = this._generateId();
    
    const lineString = new atlas.data.LineString(
      coords.map(coord => [coord.lng, coord.lat])
    );

    const dataSource = new atlas.source.DataSource();
    this.map.sources.add(dataSource);

    const feature = new atlas.data.Feature(lineString);
    dataSource.add(feature);

    const lineLayer = new atlas.layer.LineLayer(dataSource, null, {
      strokeColor: options.strokeColor || '#FF0000',
      strokeWidth: options.strokeWeight || 3
    });

    this.map.layers.add(lineLayer);
    this.polylines.set(routeId, { dataSource, layer: lineLayer });
    
    return routeId;
  }

  async getDirections(origin, destination, options = {}) {
    const url = `https://atlas.microsoft.com/route/directions/json?api-version=1.0&subscription-key=${this.apiKey}&query=${origin.lat},${origin.lng}:${destination.lat},${destination.lng}&routeType=${options.travelMode || 'fastest'}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routePath = route.legs[0].points.map(point => ({
          lat: point.latitude,
          lng: point.longitude
        }));
        
        const routeId = this.drawRoute(routePath, options);
        
        return {
          routeId,
          duration: route.summary.travelTimeInSeconds,
          distance: route.summary.lengthInMeters
        };
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      throw new Error(`Directions failed: ${error.message}`);
    }
  }

  drawPolygon(coords, options = {}) {
    const polygonId = this._generateId();
    
    const polygon = new atlas.data.Polygon([
      coords.map(coord => [coord.lng, coord.lat])
    ]);

    const dataSource = new atlas.source.DataSource();
    this.map.sources.add(dataSource);

    const feature = new atlas.data.Feature(polygon);
    dataSource.add(feature);

    const polygonLayer = new atlas.layer.PolygonLayer(dataSource, null, {
      fillColor: options.fillColor || '#FF0000',
      strokeColor: options.strokeColor || '#FF0000',
      strokeWidth: options.strokeWeight || 2
    });

    this.map.layers.add(polygonLayer);
    this.polygons.set(polygonId, { dataSource, layer: polygonLayer });
    
    return polygonId;
  }

  drawPolyline(coords, options = {}) {
    return this.drawRoute(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    // Approximate circle as a polygon
    const circleId = this._generateId();
    const points = [];
    
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * 2 * Math.PI;
      const pointLat = center.lat + (radius / 111320) * Math.cos(angle);
      const pointLng = center.lng + (radius / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
      points.push({ lat: pointLat, lng: pointLng });
    }
    
    return this.drawPolygon(points, options);
  }

  drawRectangle(bounds, options = {}) {
    const coords = [
      { lat: bounds.southwest.lat, lng: bounds.southwest.lng },
      { lat: bounds.southwest.lat, lng: bounds.northeast.lng },
      { lat: bounds.northeast.lat, lng: bounds.northeast.lng },
      { lat: bounds.northeast.lat, lng: bounds.southwest.lng }
    ];
    
    return this.drawPolygon(coords, options);
  }

  enableTrafficLayer() {
    const trafficLayer = new atlas.layer.TileLayer({
      tileUrl: `https://atlas.microsoft.com/traffic/incident/tiles/json?subscription-key=${this.apiKey}&api-version=1.0&style=s3`
    });
    this.map.layers.add(trafficLayer);
    this.trafficLayer = trafficLayer;
  }

  disableTrafficLayer() {
    if (this.trafficLayer) {
      this.map.layers.remove(this.trafficLayer);
      this.trafficLayer = null;
    }
  }

  addHeatMap(points, options = {}) {
    const heatmapId = this._generateId();
    const features = points.map(point => new atlas.data.Feature(
      new atlas.data.Point([point.lng, point.lat]),
      { weight: point.weight || 1 }
    ));

    const dataSource = new atlas.source.DataSource();
    this.map.sources.add(dataSource);

    dataSource.add(features);

    const heatMapLayer = new atlas.layer.HeatMapLayer(dataSource, null, {
      radius: options.radius || 20,
      intensity: options.intensity || 1,
      opacity: options.opacity || 0.6
    });

    this.map.layers.add(heatMapLayer);
    this.heatmaps.set(heatmapId, { dataSource, layer: heatMapLayer });
    
    return heatmapId;
  }

  addTileLayer(url, options = {}) {
    const layerId = this._generateId();
    const tileLayer = new atlas.layer.TileLayer({
      tileUrl: url
    });

    this.map.layers.add(tileLayer);
    this.layers.set(layerId, tileLayer);
    
    return layerId;
  }

  removeLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      this.map.layers.remove(layer);
      this.layers.delete(layerId);
      return true;
    }
    return false;
  }

  trackUserLocation(callback, options = {}) {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          callback({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => console.error('Geolocation error:', error),
        {
          enableHighAccuracy: options.enableHighAccuracy || false,
          timeout: options.timeout || 5000,
          maximumAge: options.maximumAge || 0
        }
      );
      return watchId;
    }
    return null;
  }

  getUserLocation() {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  }

  indoorMaps(enable) {
    console.info('Indoor maps support is available in Azure Maps for selected locations');
  }

  applyMapStyle(style) {
    // Azure Maps uses different styling approach
    if (typeof style === 'string') {
      // Set map style
      console.info('Use map options to change style in Azure Maps');
    }
  }

  enable3D(enable) {
    if (enable) {
      this.map.setCamera({ pitch: 45 });
    } else {
      this.map.setCamera({ pitch: 0 });
    }
  }

  on(event, callback) {
    this.map.events.add(event, callback);
  }

  off(event, callback) {
    this.map.events.remove(event, callback);
  }

  getBounds() {
    const bounds = this.map.getCamera().bounds;
    return {
      southwest: { lat: bounds[0][1], lng: bounds[0][0] },
      northeast: { lat: bounds[1][1], lng: bounds[1][0] }
    };
  }

  destroy() {
    this.markers.forEach(marker => this.map.markers.remove(marker));
    this.polylines.forEach(({ dataSource, layer }) => {
      this.map.layers.remove(layer);
      this.map.sources.remove(dataSource);
    });
    this.polygons.forEach(({ dataSource, layer }) => {
      this.map.layers.remove(layer);
      this.map.sources.remove(dataSource);
    });
    this.heatmaps.forEach(({ dataSource, layer }) => {
      this.map.layers.remove(layer);
      this.map.sources.remove(dataSource);
    });
    this.layers.forEach(layer => this.map.layers.remove(layer));
    
    this.markers.clear();
    this.polylines.clear();
    this.polygons.clear();
    this.heatmaps.clear();
    this.layers.clear();
    
    const container = this.getContainer();
    if (container) {
      container.innerHTML = '';
    }
    this.map = null;
  }
}
