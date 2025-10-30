import { BaseAdapter } from './BaseAdapter.js';

export class MapmyIndiaAdapter extends BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    super(apiKey, containerId, options);
    this.eventListeners = new Map();
    this.clusterLayer = null;
    this.callbackName = `initMapmyIndia_${Date.now()}`;
  }

  async init() {
    await this.loadMapmyIndiaScript();

    const mapElement = this.getContainer();
    if (!mapElement) {
      throw new Error(`Container element with ID '${this.containerId}' not found.`);
    }

    // Validate center coordinates
    const centerLat = typeof this.options.center?.lat === 'number' ? this.options.center.lat : 28.638698;
    const centerLng = typeof this.options.center?.lng === 'number' ? this.options.center.lng : 77.276045;

    // Use mappls.Map instead of MapmyIndia.Map (v3 SDK)
    // Mappls uses {lng, lat} format (longitude FIRST)
    this.map = new mappls.Map(this.containerId, {
      center: {lng: centerLng, lat: centerLat},
      zoom: this.options.zoom || 10
    });
  }

  loadMapmyIndiaScript() {
    return new Promise((resolve, reject) => {
      if (window.mappls && window.mappls.Map) {
        return resolve();
      }

      // Create global callback function
      window[this.callbackName] = () => {
        if (window.mappls && window.mappls.Map) {
          delete window[this.callbackName];
          resolve();
        } else {
          delete window[this.callbackName];
          reject(new Error('Mappls SDK failed to load properly'));
        }
      };

      const script = document.createElement('script');
      script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${this.apiKey}&callback=${this.callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        delete window[this.callbackName];
        reject(new Error('Failed to load Mappls SDK'));
      };
      
      document.head.appendChild(script);
    });
  }

  addMarker(options) {
    const markerId = this._generateId();
    
    // Mappls uses {lng, lat} format (longitude FIRST)
    const marker = new mappls.Marker({
      map: this.map,
      position: {lng: options.lng, lat: options.lat}
    });

    if (options.title) {
      const infoWindow = new mappls.InfoWindow({
        content: options.title
      });
      marker.addListener('click', () => {
        infoWindow.open(this.map, marker);
      });
    }

    this.markers.set(markerId, marker);
    
    return markerId;
  }

  addCustomMarker(options) {
    if (!options || typeof options.lat !== 'number' || typeof options.lng !== 'number') {
      throw new Error('addCustomMarker requires options with numeric lat and lng properties');
    }

    const markerId = this._generateId();
    
    // Mappls uses {lng, lat} format (longitude FIRST)
    const markerOptions = {
      map: this.map,
      position: {lng: options.lng, lat: options.lat}
    };

    if (options.iconUrl) {
      markerOptions.iconUrl = options.iconUrl;
    }
    if (options.html) {
      markerOptions.htmlContent = options.html;
    }

    const marker = new mappls.Marker(markerOptions);

    if (options.title) {
      const infoWindow = new mappls.InfoWindow({
        content: options.title
      });
      marker.addListener('click', () => {
        infoWindow.open(this.map, marker);
      });
    }

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

    const clickHandler = () => {
      const position = marker.getPosition();
      const data = { lat: position.lat, lng: position.lng, markerId };

      if (callback) {
        callback(data);
      }

      if (options.popupHtml) {
        const infoWindow = new mappls.InfoWindow({
          content: options.popupHtml
        });
        infoWindow.open(this.map, marker);
      }

      if (options.toast || options.toastMessage) {
        this._showToast(options.toastMessage || 'Marker clicked', options.toastDuration || 3000);
      }
    };

    if (!this.markerClickHandlers) {
      this.markerClickHandlers = new Map();
    }
    this.markerClickHandlers.set(markerId, clickHandler);

    marker.addListener('click', clickHandler);
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
      pointer-events:auto;
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
      marker.setMap(null);
      this.markers.delete(markerId);
      if (this.markerClickHandlers) {
        marker.removeListener('click', this.markerClickHandlers.get(markerId));
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
      
      if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng) || !this._validateCoordinates(lat, lng)) {
        console.error('Invalid position for MapmyIndia marker update:', options.position);
        return false;
      }
      
      try {
        // MapmyIndia uses {lng, lat} format (longitude FIRST)
        marker.setPosition({ lng: lng, lat: lat });
      } catch (error) {
        console.error('Failed to update marker position:', error.message);
        return false;
      }
    }
    
    if (options.title !== undefined) {
      try {
        marker.setTitle(options.title);
      } catch (error) {
        console.error('Failed to update marker title:', error.message);
      }
    }
    
    return true;
  }

  setCenter(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.setCenter({lng: coords.lng, lat: coords.lat});
    }
  }

  getCenter() {
    const center = this.map.getCenter();
    // Mappls returns {lng, lat} format
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
      this.map.panTo({lng: coords.lng, lat: coords.lat});
    }
  }

  fitBounds(bounds) {
    const sw = {lng: bounds.southwest.lng, lat: bounds.southwest.lat};
    const ne = {lng: bounds.northeast.lng, lat: bounds.northeast.lat};
    this.map.fitBounds([sw, ne]);
  }

  async geocode(address) {
    const url = `https://apis.mapmyindia.com/advancedmaps/v1/${this.apiKey}/geo_code?addr=${encodeURIComponent(address)}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formattedAddress: result.formatted_address
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

    // Encode coordinates to prevent URL injection
    const url = `https://apis.mapmyindia.com/advancedmaps/v1/${this.apiKey}/rev_geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          formattedAddress: result.formatted_address,
          components: result
        };
      }
      throw new Error('No results found');
    } catch (error) {
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  drawRoute(coords, options = {}) {
    const routeId = this._generateId();
    
    // Mappls uses {lng, lat} format (longitude FIRST)
    const polyline = new mappls.Polyline({
      map: this.map,
      path: coords.map(c => ({lng: c.lng, lat: c.lat})),
      strokeColor: options.strokeColor || '#FF0000',
      strokeWeight: options.strokeWeight || 3,
      strokeOpacity: options.strokeOpacity || 1
    });

    this.polylines.set(routeId, polyline);
    
    return routeId;
  }

  async getDirections(origin, destination, options = {}) {
    // Encode coordinates to prevent URL injection
    const originStr = `${encodeURIComponent(origin.lng)},${encodeURIComponent(origin.lat)}`;
    const destStr = `${encodeURIComponent(destination.lng)},${encodeURIComponent(destination.lat)}`;
    const url = `https://apis.mapmyindia.com/advancedmaps/v1/${this.apiKey}/route_adv/driving/${originStr};${destStr}?geometries=polyline&overview=full`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Decode polyline to get coordinates
        const coords = this._decodePolyline(route.geometry);
        
        const routeId = this.drawRoute(coords, options);
        
        return {
          routeId,
          duration: route.duration || 0,
          distance: route.distance || 0
        };
      }
      throw new Error('No route found');
    } catch (error) {
      throw new Error(`Directions failed: ${error.message}`);
    }
  }

  _decodePolyline(encoded) {
    const points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
    }

    return points;
  }

  drawPolygon(coords, options = {}) {
    const polygonId = this._generateId();
    
    // Mappls uses {lng, lat} format (longitude FIRST)
    const polygon = new mappls.Polygon({
      map: this.map,
      path: coords.map(c => ({lng: c.lng, lat: c.lat})),
      strokeColor: options.strokeColor || '#FF0000',
      strokeWeight: options.strokeWeight || 2,
      strokeOpacity: options.strokeOpacity || 0.8,
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35
    });

    this.polygons.set(polygonId, polygon);
    
    return polygonId;
  }

  drawPolyline(coords, options = {}) {
    return this.drawRoute(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    const circleId = this._generateId();
    
    // Mappls uses {lng, lat} format (longitude FIRST)
    const circle = new mappls.Circle({
      map: this.map,
      center: {lng: center.lng, lat: center.lat},
      radius: radius,
      strokeColor: options.strokeColor || '#FF0000',
      strokeWeight: options.strokeWeight || 2,
      strokeOpacity: options.strokeOpacity || 0.8,
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35
    });

    this.polygons.set(circleId, circle);
    
    return circleId;
  }

  drawRectangle(bounds, options = {}) {
    const rectangleId = this._generateId();
    
    // Mappls doesn't have a direct Rectangle, approximate with Polygon
    const coords = [
      {lng: bounds.southwest.lng, lat: bounds.southwest.lat},
      {lng: bounds.northeast.lng, lat: bounds.southwest.lat},
      {lng: bounds.northeast.lng, lat: bounds.northeast.lat},
      {lng: bounds.southwest.lng, lat: bounds.northeast.lat},
      {lng: bounds.southwest.lng, lat: bounds.southwest.lat}
    ];
    
    const rect = new mappls.Polygon({
      map: this.map,
      path: coords,
      strokeColor: options.strokeColor || '#FF0000',
      strokeWeight: options.strokeWeight || 2,
      strokeOpacity: options.strokeOpacity || 0.8,
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35
    });

    this.polygons.set(rectangleId, rect);
    
    return rectangleId;
  }

  enableTrafficLayer() {
    // MapmyIndia doesn't have a separate traffic layer in the free API
    console.info('Traffic layer requires MapmyIndia Premium API');
  }

  disableTrafficLayer() {
    // No-op
  }

  addHeatMap(points, options = {}) {
    // MapmyIndia/Mappls doesn't have MarkerClusterer in the SDK
    // Use simple markers instead
    const heatmapId = this._generateId();
    const markerList = [];

    points.forEach(point => {
      const marker = new mappls.Marker({
        map: this.map,
        position: {lng: point.lng, lat: point.lat}
      });
      markerList.push(marker);
    });

    this.heatmaps.set(heatmapId, markerList);
    
    return heatmapId;
  }

  addTileLayer(url, options = {}) {
    // MapmyIndia doesn't support custom tile layers in the free API
    console.info('Custom tile layers require MapmyIndia Premium API');
    return null;
  }

  removeLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.setMap(null);
      this.layers.delete(layerId);
      return true;
    }
    return false;
  }

  trackUserLocation(callback, options = {}) {
    if (navigator.geolocation) {
      return navigator.geolocation.watchPosition(
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
    console.info('Indoor maps not available in MapmyIndia free API');
  }

  applyMapStyle(style) {
    // MapmyIndia doesn't support custom styles in the free API
    console.info('Custom map styles require MapmyIndia Premium API');
  }

  enable3D(enable) {
    // 3D view not available in MapmyIndia
    console.info('3D view not available in MapmyIndia');
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
      southwest: { lat: bounds.getSouthWest().lat(), lng: bounds.getSouthWest().lng() },
      northeast: { lat: bounds.getNorthEast().lat(), lng: bounds.getNorthEast().lng() }
    };
  }

  destroy() {
    this.markers.forEach(marker => marker.setMap(null));
    this.polylines.forEach(polyline => polyline.setMap(null));
    this.polygons.forEach(polygon => polygon.setMap(null));
    this.heatmaps.forEach(cluster => cluster.clearMarkers());
    this.layers.forEach(layer => {
      if (layer.setMap) layer.setMap(null);
    });
    
    this.markers.clear();
    this.polylines.clear();
    this.polygons.clear();
    this.heatmaps.clear();
    this.layers.clear();
    
    if (this.map) {
      // MapmyIndia doesn't have a destroy method, just clear
      const container = this.getContainer();
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
      this.map = null;
    }
  }
}