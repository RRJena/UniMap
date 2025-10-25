import { BaseAdapter } from './BaseAdapter.js';

export class MapboxAdapter extends BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    super(apiKey, containerId, options);
    this.eventListeners = new Map();
    this.sources = new Map();
    this.layers = new Map();
  }

  async init() {
    await this.loadMapboxScript();

    const mapElement = this.getContainer();
    if (!mapElement) {
      throw new Error(`Container element with ID '${this.containerId}' not found.`);
    }

    // Validate center coordinates
    const centerLat = typeof this.options.center?.lat === 'number' ? this.options.center.lat : 0;
    const centerLng = typeof this.options.center?.lng === 'number' ? this.options.center.lng : 0;

    this.map = new mapboxgl.Map({
      container: this.containerId,
      style: this.options.style || 'mapbox://styles/mapbox/streets-v11',
      center: [centerLng, centerLat],
      zoom: this.options.zoom || 10,
      accessToken: this.apiKey
    });

    await new Promise((resolve) => {
      this.map.on('load', resolve);
    });
  }

  loadMapboxScript() {
    return new Promise((resolve, reject) => {
      if (window.mapboxgl) {
        return resolve();
      }

      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  addMarker(options) {
    const markerId = this._generateId();
    
    const el = document.createElement('div');
    el.className = 'mapbox-marker';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.backgroundColor = options.color || '#FF0000';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid white';
    el.style.cursor = 'pointer';
    
    if (options.label) {
      el.setAttribute('title', options.label);
    }

    const marker = new mapboxgl.Marker(el)
      .setLngLat([options.lng, options.lat])
      .addTo(this.map);

    this.markers.set(markerId, marker);
    return markerId;
  }

  removeMarker(markerId) {
    const marker = this.markers.get(markerId);
    if (marker) {
      marker.remove();
      this.markers.delete(markerId);
      return true;
    }
    return false;
  }

  updateMarker(markerId, options) {
    const marker = this.markers.get(markerId);
    if (marker) {
      if (options.position) {
        marker.setLngLat([options.position.lng, options.position.lat]);
      }
      return true;
    }
    return false;
  }

  setCenter(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.setCenter([coords.lng, coords.lat]);
    }
  }

  getCenter() {
    const center = this.map.getCenter();
    return {
      lat: center.lat,
      lng: center.lng
    };
  }

  setZoom(level) {
    this.map.setZoom(level);
  }

  getZoom() {
    return this.map.getZoom();
  }

  zoomIn() {
    this.map.zoomIn();
  }

  zoomOut() {
    this.map.zoomOut();
  }

  panTo(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.panTo([coords.lng, coords.lat]);
    }
  }

  fitBounds(bounds) {
    const mapboxBounds = [
      [bounds.southwest.lng, bounds.southwest.lat],
      [bounds.northeast.lng, bounds.northeast.lat]
    ];
    this.map.fitBounds(mapboxBounds);
  }

  async geocode(address) {
    const query = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${this.apiKey}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return {
        lat,
        lng,
        formattedAddress: data.features[0].place_name
      };
    } else {
      throw new Error('No results found');
    }
  }

  async reverseGeocode(lat, lng) {
    if (!this._validateCoordinates(lat, lng)) {
      return Promise.reject('Invalid coordinates');
    }

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.apiKey}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      return {
        formattedAddress: data.features[0].place_name,
        components: data.features[0].context || []
      };
    } else {
      throw new Error('No results found');
    }
  }

  drawRoute(coords, options = {}) {
    const routeId = this._generateId();
    const sourceId = `route-source-${routeId}`;
    const layerId = `route-layer-${routeId}`;

    const coordinates = coords.map(coord => [coord.lng, coord.lat]);

    this.map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      }
    });

    this.map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': options.strokeColor || '#FF0000',
        'line-width': options.strokeWeight || 3,
        'line-opacity': options.strokeOpacity || 1.0
      }
    });

    this.sources.set(sourceId, sourceId);
    this.polylines.set(routeId, { sourceId, layerId });
    return routeId;
  }

  async getDirections(origin, destination, options = {}) {
    const profile = options.travelMode || 'driving';
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?access_token=${this.apiKey}&geometries=geojson`
    );
    
    if (!response.ok) {
      throw new Error(`Directions failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const routeId = this.drawRoute(route.geometry.coordinates.map(coord => ({ lng: coord[0], lat: coord[1] })), options);
      return { routeId, duration: route.duration, distance: route.distance };
    } else {
      throw new Error('No route found');
    }
  }

  drawPolygon(coords, options = {}) {
    const polygonId = this._generateId();
    const sourceId = `polygon-source-${polygonId}`;
    const layerId = `polygon-layer-${polygonId}`;

    const coordinates = coords.map(coord => [coord.lng, coord.lat]);

    this.map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
        }
      }
    });

    this.map.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': options.fillColor || '#FF0000',
        'fill-opacity': options.fillOpacity || 0.35
      }
    });

    this.map.addLayer({
      id: `${layerId}-outline`,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': options.strokeColor || '#FF0000',
        'line-width': options.strokeWeight || 2,
        'line-opacity': options.strokeOpacity || 0.8
      }
    });

    this.sources.set(sourceId, sourceId);
    this.polygons.set(polygonId, { sourceId, layerId });
    return polygonId;
  }

  drawPolyline(coords, options = {}) {
    return this.drawRoute(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    const points = 64;
    const coords = [];
    
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const lat = center.lat + (radius / 111320) * Math.cos(angle);
      const lng = center.lng + (radius / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
      coords.push({ lat, lng });
    }
    
    return this.drawPolygon(coords, options);
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
    console.info('Traffic layer not available in Mapbox. Consider using Mapbox Traffic API.');
  }

  disableTrafficLayer() {
  }

  addHeatMap(points, options = {}) {
    const heatmapId = this._generateId();
    const sourceId = `heatmap-source-${heatmapId}`;
    const layerId = `heatmap-layer-${heatmapId}`;

    const features = points.map(point => ({
      type: 'Feature',
      properties: { weight: point.weight || 1 },
      geometry: {
        type: 'Point',
        coordinates: [point.lng, point.lat]
      }
    }));

    this.map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: features
      }
    });

    this.map.addLayer({
      id: layerId,
      type: 'heatmap',
      source: sourceId,
      paint: {
        'heatmap-weight': ['get', 'weight'],
        'heatmap-intensity': options.intensity || 1,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 255, 0)',
          0.5, 'rgba(0, 0, 255, 1)',
          1, 'rgba(255, 0, 0, 1)'
        ],
        'heatmap-radius': options.radius || 20,
        'heatmap-opacity': options.opacity || 0.6
      }
    });

    this.sources.set(sourceId, sourceId);
    this.heatmaps.set(heatmapId, { sourceId, layerId });
    return heatmapId;
  }

  addTileLayer(url, options = {}) {
    const layerId = this._generateId();
    
    this.map.addSource(layerId, {
      type: 'raster',
      tiles: [url],
      tileSize: options.tileSize || 256
    });

    this.map.addLayer({
      id: layerId,
      type: 'raster',
      source: layerId,
      paint: {
        'raster-opacity': options.opacity || 1.0
      }
    });

    this.sources.set(layerId, layerId);
    this.layers.set(layerId, layerId);
    return layerId;
  }

  removeLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      if (this.map.getLayer(layer)) {
        this.map.removeLayer(layer);
      }
      if (this.map.getSource(layer)) {
        this.map.removeSource(layer);
      }
      this.layers.delete(layerId);
      return true;
    }
    return false;
  }

  trackUserLocation(callback, options = {}) {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          callback(coords);
        },
        (error) => console.error('Geolocation error:', error),
        {
          enableHighAccuracy: options.enableHighAccuracy || false,
          timeout: options.timeout || 5000,
          maximumAge: options.maximumAge || 0
        }
      );
      return watchId;
    } else {
      console.error('Geolocation is not supported by this browser.');
      return null;
    }
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
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        reject(new Error('Geolocation is not supported by this browser.'));
      }
    });
  }

  indoorMaps(enable) {
    console.info('Indoor maps not available in Mapbox.');
  }

  applyMapStyle(style) {
    if (typeof style === 'string') {
      this.map.setStyle(style);
    } else if (typeof style === 'object') {
      Object.keys(style).forEach(key => {
        this.map.setPaintProperty(key, style[key]);
      });
    }
  }

  enable3D(enable) {
    if (enable) {
      this.map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.6
        }
      });
    } else {
      if (this.map.getLayer('3d-buildings')) {
        this.map.removeLayer('3d-buildings');
      }
    }
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
    
    this.map.on(event, callback);
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        this.map.off(event, callback);
      }
    }
  }

  getBounds() {
    const bounds = this.map.getBounds();
    return {
      southwest: {
        lat: bounds.getSouthWest().lat,
        lng: bounds.getSouthWest().lng
      },
      northeast: {
        lat: bounds.getNorthEast().lat,
        lng: bounds.getNorthEast().lng
      }
    };
  }

  destroy() {
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach(callback => {
        this.map.off(event, callback);
      });
    });
    this.eventListeners.clear();

    this.sources.forEach((sourceId, key) => {
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }
    });

    this.markers.clear();
    this.polylines.clear();
    this.polygons.clear();
    this.heatmaps.clear();
    this.layers.clear();
    this.sources.clear();

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
