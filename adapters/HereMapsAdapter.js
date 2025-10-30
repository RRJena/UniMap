import { BaseAdapter } from './BaseAdapter.js';

export class HereMapsAdapter extends BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    super(apiKey, containerId, options);
    this.eventListeners = new Map();
    this.platform = null;
  }

  async init() {
    await this.loadHereMapsScript();

    const mapElement = this.getContainer();
    if (!mapElement) {
      throw new Error(`Container element with ID '${this.containerId}' not found.`);
    }

    this.platform = new H.service.Platform({
      apikey: this.apiKey
    });

    const defaultLayers = this.platform.createDefaultLayers();

    this.map = new H.Map(mapElement,
      defaultLayers.vector.normal.map,
      {
        center: { lat: this.options.center?.lat || 0, lng: this.options.center?.lng || 0 },
        zoom: this.options.zoom || 10
      }
    );

    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));
    this.ui = H.ui.UI.createDefault(this.map, defaultLayers);

    this.behavior = behavior;
  }

  loadHereMapsScript() {
    return new Promise((resolve, reject) => {
      if (window.H && window.H.service) {
        return resolve();
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';
      document.head.appendChild(link);

      const script1 = document.createElement('script');
      script1.src = 'https://js.api.here.com/v3/3.1/mapsjs-core.js';
      
      script1.onload = () => {
        const script2 = document.createElement('script');
        script2.src = 'https://js.api.here.com/v3/3.1/mapsjs-service.js';
        
        script2.onload = () => {
          const script3 = document.createElement('script');
          script3.src = 'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js';
          
          script3.onload = () => {
            const script4 = document.createElement('script');
            script4.src = 'https://js.api.here.com/v3/3.1/mapsjs-ui.js';
            
            script4.onload = resolve;
            script4.onerror = reject;
            document.head.appendChild(script4);
          };
          
          script3.onerror = reject;
          document.head.appendChild(script3);
        };
        
        script2.onerror = reject;
        document.head.appendChild(script2);
      };
      
      script1.onerror = reject;
      document.head.appendChild(script1);
    });
  }

  addMarker(options) {
    const markerId = this._generateId();
    const marker = new H.map.Marker({ lat: options.lat, lng: options.lng });
    if (options.title) marker.setData(options.title);
    this.map.addObject(marker);
    this.markers.set(markerId, marker);
    return markerId;
  }

  addCustomMarker(options) {
    if (!options || typeof options.lat !== 'number' || typeof options.lng !== 'number') {
      throw new Error('addCustomMarker requires options with numeric lat and lng properties');
    }

    const markerId = this._generateId();
    
    let marker;
    if (options.html) {
      // Custom HTML marker using DOMIcon
      const el = document.createElement('div');
      // eslint-disable-next-line no-restricted-syntax
      el.innerHTML = options.html;
      el.style.cursor = 'pointer';
      
      const icon = new H.map.DomIcon(el);
      marker = new H.map.DomMarker({ lat: options.lat, lng: options.lng }, { icon });
    } else if (options.iconUrl) {
      // Custom icon
      const icon = new H.map.Icon(options.iconUrl, {
        size: options.iconSize ? { w: options.iconSize.width || 32, h: options.iconSize.height || 32 } : { w: 32, h: 32 }
      });
      marker = new H.map.Marker({ lat: options.lat, lng: options.lng }, { icon });
    } else {
      marker = new H.map.Marker({ lat: options.lat, lng: options.lng });
    }
    
    if (options.title) {
      marker.setData(options.title);
    }

    this.map.addObject(marker);
    this.markers.set(markerId, marker);
    return markerId;
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

    const clickHandler = (e) => {
      const position = marker.getGeometry();
      const data = { lat: position.lat, lng: position.lng, markerId, event: e };
      
      if (callback) {
        callback(data);
      }

      if (options.popupHtml) {
        const bubble = new H.ui.InfoBubble(position, {
          content: options.popupHtml
        });
        this.ui.addBubble(bubble);
      }

      if (options.toast || options.toastMessage) {
        this._showToast(options.toastMessage || 'Marker clicked', options.toastDuration || 3000);
      }
    };

    if (!this.markerClickHandlers) {
      this.markerClickHandlers = new Map();
    }
    this.markerClickHandlers.set(markerId, clickHandler);

    marker.addEventListener('tap', clickHandler);
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
      if (this.markerClickHandlers) {
        marker.removeEventListener('tap', this.markerClickHandlers.get(markerId));
        this.markerClickHandlers.delete(markerId);
      }
      this.map.removeObject(marker);
      this.markers.delete(markerId);
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
        console.error('Invalid position for HERE Maps marker update:', options.position);
        return false;
      }
      
      try {
        marker.setGeometry({ lat: lat, lng: lng });
      } catch (error) {
        console.error('Failed to update marker position:', error.message);
        return false;
      }
    }
    
    if (options.title !== undefined) {
      try {
        marker.setData(options.title);
      } catch (error) {
        console.error('Failed to update marker data:', error.message);
      }
    }
    
    return true;
  }

  setCenter(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.setCenter({ lat: coords.lat, lng: coords.lng });
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
    this.map.setZoom(this.map.getZoom() + 1);
  }

  zoomOut() {
    this.map.setZoom(this.map.getZoom() - 1);
  }

  panTo(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.setCenter({ lat: coords.lat, lng: coords.lng }, true);
    }
  }

  fitBounds(bounds) {
    const boundsObj = new H.geo.Rect(
      bounds.southwest.lat, bounds.southwest.lng,
      bounds.northeast.lat, bounds.northeast.lng
    );
    this.map.getViewModel().setLookAtData({ bounds: boundsObj });
  }

  async geocode(address) {
    const service = this.platform.getSearchService();
    return new Promise((resolve, reject) => {
      service.geocode({ q: address }, (result) => {
        if (result.items && result.items.length > 0) {
          const item = result.items[0];
          resolve({
            lat: item.position.lat,
            lng: item.position.lng,
            formattedAddress: item.address.label
          });
        } else {
          reject(new Error('No results found'));
        }
      }, (error) => {
        reject(new Error(`Geocoding failed: ${error}`));
      });
    });
  }

  async reverseGeocode(lat, lng) {
    if (!this._validateCoordinates(lat, lng)) {
      return Promise.reject(new Error('Invalid coordinates'));
    }

    const service = this.platform.getSearchService();
    return new Promise((resolve, reject) => {
      service.reverseGeocode({ at: `${lat},${lng}` }, (result) => {
        if (result.items && result.items.length > 0) {
          resolve({
            formattedAddress: result.items[0].address.label,
            components: result.items[0].address
          });
        } else {
          reject(new Error('No results found'));
        }
      }, (error) => {
        reject(new Error(`Reverse geocoding failed: ${error}`));
      });
    });
  }

  drawRoute(coords, options = {}) {
    const routeId = this._generateId();
    const lineString = new H.geo.LineString();
    coords.forEach(coord => lineString.pushPoint(new H.geo.Point(coord.lat, coord.lng)));
    
    const polyline = new H.map.Polyline(lineString, {
      style: {
        strokeColor: options.strokeColor || '#FF0000',
        lineWidth: options.strokeWeight || 3
      }
    });
    
    this.map.addObject(polyline);
    this.polylines.set(routeId, polyline);
    return routeId;
  }

  async getDirections(origin, destination, options = {}) {
    return new Promise((resolve, reject) => {
      const router = this.platform.getRoutingService();
      const routingParameters = {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        transportMode: options.travelMode || 'car',
        return: 'polyline,summary'
      };

      router.calculateRoute(routingParameters, (result) => {
        if (result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          
          const routeId = this.drawRoute([], options);
          
          resolve({
            routeId,
            duration: route.summary.duration,
            distance: route.summary.length
          });
        } else {
          reject(new Error('No route found'));
        }
      }, (error) => {
        reject(new Error(`Directions failed: ${error.message}`));
      });
    });
  }

  drawPolygon(coords, options = {}) {
    const polygonId = this._generateId();
    const ring = new H.geo.LineString();
    coords.forEach(coord => ring.pushPoint(new H.geo.Point(coord.lat, coord.lng)));
    
    const polygon = new H.map.Polygon(new H.geo.Polygon(ring), {
      style: {
        fillColor: options.fillColor || '#FF0000',
        strokeColor: options.strokeColor || '#FF0000',
        lineWidth: options.strokeWeight || 2
      }
    });
    
    this.map.addObject(polygon);
    this.polygons.set(polygonId, polygon);
    return polygonId;
  }

  drawPolyline(coords, options = {}) {
    return this.drawRoute(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    const circleId = this._generateId();
    const circle = new H.map.Circle(center, radius, {
      style: {
        fillColor: options.fillColor || '#FF0000',
        strokeColor: options.strokeColor || '#FF0000',
        lineWidth: options.strokeWeight || 2
      }
    });
    
    this.map.addObject(circle);
    this.polygons.set(circleId, circle);
    return circleId;
  }

  drawRectangle(bounds, options = {}) {
    const rectId = this._generateId();
    const rect = new H.map.Rect(
      new H.geo.Rect(
        bounds.southwest.lat, bounds.southwest.lng,
        bounds.northeast.lat, bounds.northeast.lng
      ),
      {
        style: {
          fillColor: options.fillColor || '#FF0000',
          strokeColor: options.strokeColor || '#FF0000',
          lineWidth: options.strokeWeight || 2
        }
      }
    );
    
    this.map.addObject(rect);
    this.polygons.set(rectId, rect);
    return rectId;
  }

  enableTrafficLayer() {
    const defaultLayers = this.platform.createDefaultLayers();
    const trafficLayer = defaultLayers.vector.normal.traffic;
    if (!this.map.getLayer(trafficLayer)) {
      this.map.addLayer(trafficLayer);
      this.trafficLayer = trafficLayer;
    }
  }

  disableTrafficLayer() {
    if (this.trafficLayer) {
      this.map.removeLayer(this.trafficLayer);
      this.trafficLayer = null;
    }
  }

  addHeatMap(points, options = {}) {
    console.info('Heatmaps not directly supported in HERE Maps');
    return null;
  }

  addTileLayer(url, options = {}) {
    const layerId = this._generateId();
    const layer = new H.map.layer.TileLayer(url);
    this.map.addLayer(layer);
    this.layers.set(layerId, layer);
    return layerId;
  }

  removeLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      this.map.removeLayer(layer);
      this.layers.delete(layerId);
      return true;
    }
    return false;
  }

  trackUserLocation(callback, options = {}) {
    if (navigator.geolocation) {
      return navigator.geolocation.watchPosition(
        (position) => callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }),
        (error) => console.error('Geolocation error:', error),
        { enableHighAccuracy: options.enableHighAccuracy || false, timeout: options.timeout || 5000, maximumAge: options.maximumAge || 0 }
      );
    }
    return null;
  }

  getUserLocation() {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          }),
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  }

  indoorMaps(enable) {
    console.info('Indoor maps support varies by location in HERE Maps');
  }

  applyMapStyle(style) {
    console.info('Use platform.createDefaultLayers() to change map style');
  }

  enable3D(enable) {
    if (enable) {
      this.map.getViewModel().setTilt(45);
    } else {
      this.map.getViewModel().setTilt(0);
    }
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }
  }

  getBounds() {
    const bounds = this.map.getBounds();
    return {
      southwest: { lat: bounds.a.lat, lng: bounds.a.lng },
      northeast: { lat: bounds.b.lat, lng: bounds.b.lng }
    };
  }

  destroy() {
    this.markers.forEach(marker => this.map.removeObject(marker));
    this.polylines.forEach(polyline => this.map.removeObject(polyline));
    this.polygons.forEach(polygon => this.map.removeObject(polygon));
    this.markers.clear();
    this.polylines.clear();
    this.polygons.clear();
    this.layers.clear();
    
    const container = this.getContainer();
    if (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
    
    this.map = null;
    this.platform = null;
  }
}
