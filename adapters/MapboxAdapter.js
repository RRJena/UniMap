import { BaseAdapter } from './BaseAdapter.js';

export class MapboxAdapter extends BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    super(apiKey, containerId, options);
    this.eventListeners = new Map();
    this.sources = new Map();
    this.layers = new Map();
    this._isLoaded = false;
  }

  async init() {
    await this.loadMapboxScript();

    const mapElement = this.getContainer();
    if (!mapElement) {
      throw new Error(`Container element with ID '${this.containerId}' not found.`);
    }

    // Validate and set access token for Mapbox GL JS
    if (!this.apiKey || typeof this.apiKey !== 'string') {
      throw new Error('Mapbox access token is required');
    }
    mapboxgl.accessToken = this.apiKey;

    // Validate center coordinates
    const centerLat = typeof this.options.center?.lat === 'number' ? this.options.center.lat : 0;
    const centerLng = typeof this.options.center?.lng === 'number' ? this.options.center.lng : 0;

    this.map = new mapboxgl.Map({
      container: this.containerId,
      style: this.options.style || 'mapbox://styles/mapbox/streets-v11',
      center: [centerLng, centerLat],
      zoom: this.options.zoom || 10
    });

    await new Promise((resolve) => {
      this.map.on('load', () => {
        this._isLoaded = true;
        resolve();
      });
    });
  }

  isReady() {
    if (!this.map) return false;
    if (typeof this.map.isStyleLoaded === 'function') {
      return this.map.isStyleLoaded();
    }
    return this._isLoaded;
  }

  executeWhenReady(callback) {
    if (this.isReady()) {
      callback();
    } else {
      this.map.once('load', callback);
    }
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
    if (!options || typeof options.lat !== 'number' || typeof options.lng !== 'number') {
      throw new Error('addMarker requires options with numeric lat and lng properties');
    }

    // Validate coordinates are valid numbers
    if (!isFinite(options.lat) || !isFinite(options.lng)) {
      throw new Error('addMarker requires valid numeric coordinates (lat and lng must be finite numbers)');
    }

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

    // Mapbox expects [lng, lat] array format
    try {
      const marker = new mapboxgl.Marker(el)
        .setLngLat([options.lng, options.lat])
        .addTo(this.map);

      this.markers.set(markerId, marker);
      return markerId;
    } catch (error) {
      throw new Error(`Failed to add marker: ${error.message || 'Invalid coordinates format. Mapbox expects [lng, lat] array.'}`);
    }
  }

  addCustomMarker(options) {
    if (!options || typeof options.lat !== 'number' || typeof options.lng !== 'number') {
      throw new Error('addCustomMarker requires options with numeric lat and lng properties');
    }

    const markerId = this._generateId();
    
    // Support custom HTML content
    const el = document.createElement('div');
    if (options.html) {
      // eslint-disable-next-line no-restricted-syntax
      el.innerHTML = options.html;
    } else {
      el.className = options.className || 'mapbox-marker';
      if (options.iconUrl) {
        // Note: iconUrl is used directly in CSS - ensure it's from a trusted source to prevent XSS
        el.style.backgroundImage = `url(${options.iconUrl})`;
        el.style.backgroundSize = 'cover';
        el.style.width = (options.iconSize?.width || 32) + 'px';
        el.style.height = (options.iconSize?.height || 32) + 'px';
      } else {
        el.style.width = (options.iconSize?.width || 20) + 'px';
        el.style.height = (options.iconSize?.height || 20) + 'px';
        el.style.backgroundColor = options.color || '#FF0000';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
      }
    }
    
    el.style.cursor = 'pointer';
    if (options.title) {
      el.setAttribute('title', options.title);
    }

    try {
      const marker = new mapboxgl.Marker(el)
        .setLngLat([options.lng, options.lat])
        .addTo(this.map);

      this.markers.set(markerId, marker);
      return markerId;
    } catch (error) {
      throw new Error(`Failed to add custom marker: ${error.message}`);
    }
  }

  addCustomMarkers(markersArray) {
    if (!Array.isArray(markersArray)) {
      throw new Error('addCustomMarkers requires an array of marker options');
    }
    return markersArray.map(markerOptions => this.addCustomMarker(markerOptions));
  }

  onMarkerClick(markerId, callback, options = {}) {
    const marker = this.markers.get(markerId);
    if (!marker) {
      throw new Error(`Marker with id ${markerId} not found`);
    }

    const clickHandler = () => {
      const lngLat = marker.getLngLat();
      const data = { lat: lngLat.lat, lng: lngLat.lng, markerId };

      if (callback) {
        callback(data);
      }

      // Show popup if HTML content provided
      if (options.popupHtml) {
        new mapboxgl.Popup({ offset: 25 })
          .setLngLat([lngLat.lng, lngLat.lat])
          .setHTML(options.popupHtml)
          .addTo(this.map);
      }

      // Show toast notification
      if (options.toast || options.toastMessage) {
        this._showToast(options.toastMessage || 'Marker clicked', options.toastDuration || 3000);
      }
    };

    if (!this.markerClickHandlers) {
      this.markerClickHandlers = new Map();
    }
    this.markerClickHandlers.set(markerId, clickHandler);

    marker.getElement().addEventListener('click', clickHandler);
    return markerId;
  }

  _showToast(message, duration = 3000) {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(this.toastContainer);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: #333;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      margin-bottom: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: auto;
    `;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);

    setTimeout(() => { toast.style.opacity = '1'; }, 10);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);

    return toast;
  }

  removeMarker(markerId) {
    const marker = this.markers.get(markerId);
    if (marker) {
      marker.remove();
      this.markers.delete(markerId);
      if (this.markerClickHandlers) {
        this.markerClickHandlers.delete(markerId);
      }
      return true;
    }
    return false;
  }

  updateMarker(markerId, options) {
    const marker = this.markers.get(markerId);
    if (!marker) {
      return false;
    }

    if (options.position) {
      const lat = typeof options.position.lat === 'number' ? options.position.lat : parseFloat(options.position.lat);
      const lng = typeof options.position.lng === 'number' ? options.position.lng : parseFloat(options.position.lng);
      
      if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) {
        console.error('Invalid position for Mapbox marker update:', options.position);
        return false;
      }
      
      try {
        marker.setLngLat([lng, lat]);
      } catch (error) {
        console.error('Failed to update marker position:', error.message);
        return false;
      }
    }
    
    if (options.title !== undefined || options.label !== undefined) {
      // Mapbox markers don't directly support title/label updates - these are part of HTML content
      console.warn('Mapbox custom markers: title and label updates require recreating the marker with new HTML content.');
    }
    
    return true;
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
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      throw new Error('panTo requires coords with numeric lat and lng properties');
    }
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
      const text = await response.text().catch(() => '');
      throw new Error(`Geocoding failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
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
      return Promise.reject(new Error('Invalid coordinates'));
    }

    // Encode coordinates in URL path to prevent injection (already validated, but encoding is safer)
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(lng)},${encodeURIComponent(lat)}.json?access_token=${this.apiKey}&limit=1`
    );
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Reverse geocoding failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
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

    this.executeWhenReady(() => {
      if (!this.map.getSource(sourceId)) {
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
      }
      if (!this.map.getLayer(layerId)) {
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
      const text = await response.text().catch(() => '');
      throw new Error(`Directions failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
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

    this.executeWhenReady(() => {
      if (!this.map.getSource(sourceId)) {
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
      }

      if (!this.map.getLayer(layerId)) {
        this.map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': options.fillColor || '#FF0000',
            'fill-opacity': options.fillOpacity || 0.35
          }
        });
      }

      const outlineId = `${layerId}-outline`;
      if (!this.map.getLayer(outlineId)) {
        this.map.addLayer({
          id: outlineId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': options.strokeColor || '#FF0000',
            'line-width': options.strokeWeight || 2,
            'line-opacity': options.strokeOpacity || 0.8
          }
        });
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

    this.executeWhenReady(() => {
      if (!this.map.getSource(sourceId)) {
        this.map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: features
          }
        });
      }
      if (!this.map.getLayer(layerId)) {
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
      }
    });

    this.sources.set(sourceId, sourceId);
    this.heatmaps.set(heatmapId, { sourceId, layerId });
    return heatmapId;
  }

  addTileLayer(url, options = {}) {
    const layerId = this._generateId();
    
    this.executeWhenReady(() => {
      if (!this.map.getSource(layerId)) {
        this.map.addSource(layerId, {
          type: 'raster',
          tiles: [url],
          tileSize: options.tileSize || 256
        });
      }
      if (!this.map.getLayer(layerId)) {
        this.map.addLayer({
          id: layerId,
          type: 'raster',
          source: layerId,
          paint: {
            'raster-opacity': options.opacity || 1.0
          }
        });
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
