import { BaseAdapter } from './BaseAdapter.js';

export class CartoAdapter extends BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    super(apiKey, containerId, options);
    this.eventListeners = new Map();
    this.tileLayers = new Map();
    this.currentBaseLayer = null;
  }

  async init() {
    await this.loadLeafletScript();

    const mapElement = this.getContainer();
    if (!mapElement) {
      throw new Error(`Container element with ID '${this.containerId}' not found.`);
    }

    this.map = L.map(this.containerId, {
      center: [this.options.center?.lat || 0, this.options.center?.lng || 0],
      zoom: this.options.zoom || 10,
      zoomControl: this.options.zoomControl !== false,
      attributionControl: this.options.attributionControl !== false,
      ...this.options
    });

    // Carto basemap
    this.currentBaseLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }
    );
    this.currentBaseLayer.addTo(this.map);
  }

  loadLeafletScript() {
    return new Promise((resolve, reject) => {
      if (window.L) {
        return resolve();
      }

      const link = document.createElement('link');
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  addMarker(options) {
    const markerId = this._generateId();
    
    const marker = L.marker([options.lat, options.lng], {
      title: options.title || '',
      draggable: options.draggable || false
    });

    if (options.title) {
      marker.bindPopup(options.title);
    }

    if (options.label) {
      marker.bindTooltip(options.label);
    }

    marker.addTo(this.map);
    this.markers.set(markerId, marker);
    
    return markerId;
  }

  removeMarker(markerId) {
    const marker = this.markers.get(markerId);
    if (marker) {
      this.map.removeLayer(marker);
      this.markers.delete(markerId);
      return true;
    }
    return false;
  }

  updateMarker(markerId, options) {
    const marker = this.markers.get(markerId);
    if (marker) {
      if (options.position) {
        marker.setLatLng([options.position.lat, options.position.lng]);
      }
      if (options.title !== undefined) {
        if (options.title) marker.bindPopup(options.title);
        else marker.unbindPopup();
      }
      return true;
    }
    return false;
  }

  setCenter(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.setView([coords.lat, coords.lng]);
    }
  }

  getCenter() {
    const center = this.map.getCenter();
    return { lat: center.lat, lng: center.lng };
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
      this.map.panTo([coords.lat, coords.lng]);
    }
  }

  fitBounds(bounds) {
    this.map.fitBounds([[bounds.southwest.lat, bounds.southwest.lng], 
                        [bounds.northeast.lat, bounds.northeast.lng]]);
  }

  async geocode(address) {
    // Carto doesn't have built-in geocoding, use OSM Nominatim
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          formattedAddress: data[0].display_name
        };
      }
      throw new Error('No results found');
    } catch (error) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  async reverseGeocode(lat, lng) {
    if (!this._validateCoordinates(lat, lng)) {
      return Promise.reject(new Error('Invalid coordinates'));
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.display_name) {
        return {
          formattedAddress: data.display_name,
          components: data.address || {}
        };
      }
      throw new Error('No results found');
    } catch (error) {
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  drawRoute(coords, options = {}) {
    const routeId = this._generateId();
    
    const polyline = L.polyline(
      coords.map(c => [c.lat, c.lng]),
      {
        color: options.strokeColor || '#FF0000',
        weight: options.strokeWeight || 3,
        opacity: options.strokeOpacity || 1
      }
    );

    polyline.addTo(this.map);
    this.polylines.set(routeId, polyline);
    
    return routeId;
  }

  async getDirections(origin, destination, options = {}) {
    // Use OSRM for routing
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routePath = route.geometry.coordinates.map(coord => ({
          lng: coord[0],
          lat: coord[1]
        }));
        
        const routeId = this.drawRoute(
          routePath,
          options
        );
        
        return {
          routeId,
          duration: route.duration,
          distance: route.distance
        };
      }
      throw new Error('No route found');
    } catch (error) {
      throw new Error(`Directions failed: ${error.message}`);
    }
  }

  drawPolygon(coords, options = {}) {
    const polygonId = this._generateId();
    
    const polygon = L.polygon(
      coords.map(c => [c.lat, c.lng]),
      {
        color: options.strokeColor || '#FF0000',
        weight: options.strokeWeight || 2,
        opacity: options.strokeOpacity || 0.8,
        fillColor: options.fillColor || '#FF0000',
        fillOpacity: options.fillOpacity || 0.35
      }
    );

    polygon.addTo(this.map);
    this.polygons.set(polygonId, polygon);
    
    return polygonId;
  }

  drawPolyline(coords, options = {}) {
    return this.drawRoute(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    const circleId = this._generateId();
    
    const circle = L.circle(
      [center.lat, center.lng],
      {
        radius: radius,
        color: options.strokeColor || '#FF0000',
        weight: options.strokeWeight || 2,
        opacity: options.strokeOpacity || 0.8,
        fillColor: options.fillColor || '#FF0000',
        fillOpacity: options.fillOpacity || 0.35
      }
    );

    circle.addTo(this.map);
    this.polygons.set(circleId, circle);
    
    return circleId;
  }

  drawRectangle(bounds, options = {}) {
    const rectangleId = this._generateId();
    
    const rectangle = L.rectangle(
      [[bounds.southwest.lat, bounds.southwest.lng],
       [bounds.northeast.lat, bounds.northeast.lng]],
      {
        color: options.strokeColor || '#FF0000',
        weight: options.strokeWeight || 2,
        opacity: options.strokeOpacity || 0.8,
        fillColor: options.fillColor || '#FF0000',
        fillOpacity: options.fillOpacity || 0.35
      }
    );

    rectangle.addTo(this.map);
    this.polygons.set(rectangleId, rectangle);
    
    return rectangleId;
  }

  enableTrafficLayer() {
    console.info('Traffic layer not available in Carto');
  }

  disableTrafficLayer() {
    // No-op
  }

  addHeatMap(points, options = {}) {
    // Simplified heatmap using circles
    const heatmapId = this._generateId();
    const group = L.layerGroup();
    
    points.forEach(point => {
      const circle = L.circle(
        [point.lat, point.lng],
        {
          radius: options.radius || 20,
          opacity: options.opacity || 0.6,
          fillOpacity: options.opacity || 0.6,
          color: 'transparent',
          fillColor: point.color || '#FF0000'
        }
      );
      group.addLayer(circle);
    });
    
    group.addTo(this.map);
    this.heatmaps.set(heatmapId, group);
    
    return heatmapId;
  }

  addTileLayer(url, options = {}) {
    const layerId = this._generateId();
    
    const tileLayer = L.tileLayer(url, {
      attribution: options.attribution || '',
      opacity: options.opacity || 1,
      maxZoom: options.maxZoom || 19,
      ...options
    });

    tileLayer.addTo(this.map);
    this.tileLayers.set(layerId, tileLayer);
    
    return layerId;
  }

  removeLayer(layerId) {
    const layer = this.layers.get(layerId) || this.tileLayers.get(layerId);
    if (layer) {
      this.map.removeLayer(layer);
      this.layers.delete(layerId);
      this.tileLayers.delete(layerId);
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
    console.info('Indoor maps not available in Carto');
  }

  applyMapStyle(style) {
    // Change base layer
    if (typeof style === 'string') {
      const styles = {
        'dark': 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        'light': 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        'voyager': 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        'positron': 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      };
      
      const tileUrl = styles[style] || styles['light'];
      
      if (this.currentBaseLayer) {
        this.map.removeLayer(this.currentBaseLayer);
      }
      
      this.currentBaseLayer = L.tileLayer(tileUrl, {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      });
      
      this.currentBaseLayer.addTo(this.map);
    }
  }

  enable3D(enable) {
    console.info('3D view not available in Carto');
  }

  on(event, callback) {
    this.map.on(event, callback);
  }

  off(event, callback) {
    this.map.off(event, callback);
  }

  getBounds() {
    const bounds = this.map.getBounds();
    return {
      southwest: { lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng },
      northeast: { lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng }
    };
  }

  destroy() {
    this.map.eachLayer(layer => this.map.removeLayer(layer));
    this.markers.clear();
    this.polylines.clear();
    this.polygons.clear();
    this.heatmaps.clear();
    this.layers.clear();
    this.tileLayers.clear();
    this.currentBaseLayer = null;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
