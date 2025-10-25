import { BaseAdapter } from './BaseAdapter.js';

export class GoogleMapsAdapter extends BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    super(apiKey, containerId, options);
    this.trafficLayer = null;
    this.eventListeners = new Map();
  }

  async init() {
    try {
      await this.loadGoogleMapsScript();
      await this.validateApiKey();

      const mapElement = this.getContainer();
      if (!mapElement) {
        throw new Error(`Container element with ID '${this.containerId}' not found.`);
      }

      this.map = new google.maps.Map(mapElement, {
        center: this.options.center || { lat: 0, lng: 0 },
        zoom: this.options.zoom || 10,
        styles: this.options.styles || [],
        mapTypeId: this.options.mapTypeId || 'roadmap',
        disableDefaultUI: this.options.disableDefaultUI || false,
        zoomControl: this.options.zoomControl !== false,
        mapTypeControl: this.options.mapTypeControl !== false,
        scaleControl: this.options.scaleControl !== false,
        streetViewControl: this.options.streetViewControl !== false,
        rotateControl: this.options.rotateControl !== false,
        fullscreenControl: this.options.fullscreenControl !== false
      });

      await new Promise((resolve) => {
        google.maps.event.addListenerOnce(this.map, 'idle', resolve);
      });

    } catch (error) {
      console.error('Google Maps initialization error:', error);
      throw new Error(`Failed to initialize Google Maps: ${error.message}`);
    }
  }

  loadGoogleMapsScript() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded');
        return resolve();
      }

      console.log('Loading Google Maps script...');
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places,visualization,geometry&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      window.initGoogleMaps = () => {
        console.log('Google Maps script loaded successfully');
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps script:', error);
        reject(new Error('Failed to load Google Maps script'));
      };
      
      setTimeout(() => {
        if (!window.google || !window.google.maps) {
          reject(new Error('Google Maps script loading timeout'));
        }
      }, 10000);

      document.head.appendChild(script);
    });
  }

  async validateApiKey() {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('Google Maps API key is required');
    }

    try {
      const testGeocoder = new google.maps.Geocoder();
      await new Promise((resolve, reject) => {
        testGeocoder.geocode({ address: 'New York' }, (results, status) => {
          if (status === 'OK') {
            resolve();
          } else if (status === 'REQUEST_DENIED') {
            reject(new Error('API key is invalid or restricted'));
          } else if (status === 'OVER_QUERY_LIMIT') {
            reject(new Error('API key has exceeded quota'));
          } else {
            reject(new Error(`API key validation failed: ${status}`));
          }
        });
      });
      console.log('Google Maps API key validated successfully');
    } catch (error) {
      throw new Error(`API key validation failed: ${error.message}`);
    }
  }

  addMarker(options) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    const markerId = this._generateId();
    const marker = new google.maps.Marker({
      position: { lat: options.lat, lng: options.lng },
      map: this.map,
      title: options.title || '',
      label: options.label || '',
      icon: options.icon || null,
      draggable: options.draggable || false,
      clickable: options.clickable !== false
    });

    this.markers.set(markerId, marker);
    return markerId;
  }

  removeMarker(markerId) {
    const marker = this.markers.get(markerId);
    if (marker) {
      marker.setMap(null);
      this.markers.delete(markerId);
      return true;
    }
    return false;
  }

  updateMarker(markerId, options) {
    const marker = this.markers.get(markerId);
    if (marker) {
      if (options.position) {
        marker.setPosition({ lat: options.position.lat, lng: options.position.lng });
      }
      if (options.title !== undefined) marker.setTitle(options.title);
      if (options.label !== undefined) marker.setLabel(options.label);
      if (options.icon !== undefined) marker.setIcon(options.icon);
      if (options.draggable !== undefined) marker.setDraggable(options.draggable);
      return true;
    }
    return false;
  }

  setCenter(coords) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.setCenter({ lat: coords.lat, lng: coords.lng });
    }
  }

  getCenter() {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    const center = this.map.getCenter();
    return {
      lat: center.lat(),
      lng: center.lng()
    };
  }

  setZoom(level) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    this.map.setZoom(level);
  }

  getZoom() {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    return this.map.getZoom();
  }

  zoomIn() {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    this.map.setZoom(this.map.getZoom() + 1);
  }

  zoomOut() {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    this.map.setZoom(this.map.getZoom() - 1);
  }

  panTo(coords) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.panTo({ lat: coords.lat, lng: coords.lng });
    }
  }

  fitBounds(bounds) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    const googleBounds = new google.maps.LatLngBounds(
      { lat: bounds.southwest.lat, lng: bounds.southwest.lng },
      { lat: bounds.northeast.lat, lng: bounds.northeast.lng }
    );
    this.map.fitBounds(googleBounds);
  }

  geocode(address) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK') {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng(),
            formattedAddress: results[0].formatted_address
          });
        } else {
          reject(`Geocode failed: ${status}`);
        }
      });
    });
  }

  reverseGeocode(lat, lng) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    if (!this._validateCoordinates(lat, lng)) {
      return Promise.reject('Invalid coordinates');
    }

    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK') {
          resolve({
            formattedAddress: results[0].formatted_address,
            components: results[0].address_components
          });
        } else {
          reject(`Reverse geocode failed: ${status}`);
        }
      });
    });
  }

  drawRoute(coords, options = {}) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    const path = coords.map(coord => ({ lat: coord.lat, lng: coord.lng }));
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: options.strokeColor || '#FF0000',
      strokeOpacity: options.strokeOpacity || 1.0,
      strokeWeight: options.strokeWeight || 2
    });
    
    const polylineId = this._generateId();
    polyline.setMap(this.map);
    this.polylines.set(polylineId, polyline);
    
    return polylineId;
  }

  getDirections(origin, destination, options = {}) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: this.map,
      suppressMarkers: options.suppressMarkers || false
    });

    return new Promise((resolve, reject) => {
      directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: options.travelMode || google.maps.TravelMode.DRIVING,
        waypoints: options.waypoints || [],
        optimizeWaypoints: options.optimizeWaypoints || false
      }, (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          resolve(result);
        } else {
          reject(`Directions failed: ${status}`);
        }
      });
    });
  }

  drawPolygon(coords, options = {}) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    const polygon = new google.maps.Polygon({
      paths: coords.map(coord => ({ lat: coord.lat, lng: coord.lng })),
      strokeColor: options.strokeColor || '#FF0000',
      strokeOpacity: options.strokeOpacity || 0.8,
      strokeWeight: options.strokeWeight || 2,
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35
    });
    
    const polygonId = this._generateId();
    polygon.setMap(this.map);
    this.polygons.set(polygonId, polygon);
    
    return polygonId;
  }

  drawPolyline(coords, options = {}) {
    return this.drawRoute(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    const circle = new google.maps.Circle({
      center: { lat: center.lat, lng: center.lng },
      radius: radius,
      strokeColor: options.strokeColor || '#FF0000',
      strokeOpacity: options.strokeOpacity || 0.8,
      strokeWeight: options.strokeWeight || 2,
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35
    });
    
    const circleId = this._generateId();
    circle.setMap(this.map);
    this.polygons.set(circleId, circle);
    
    return circleId;
  }

  drawRectangle(bounds, options = {}) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    const rectangle = new google.maps.Rectangle({
      bounds: {
        south: bounds.southwest.lat,
        west: bounds.southwest.lng,
        north: bounds.northeast.lat,
        east: bounds.northeast.lng
      },
      strokeColor: options.strokeColor || '#FF0000',
      strokeOpacity: options.strokeOpacity || 0.8,
      strokeWeight: options.strokeWeight || 2,
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35
    });
    
    const rectangleId = this._generateId();
    rectangle.setMap(this.map);
    this.polygons.set(rectangleId, rectangle);
    
    return rectangleId;
  }

  enableTrafficLayer() {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    if (!this.trafficLayer) {
      this.trafficLayer = new google.maps.TrafficLayer();
    }
    this.trafficLayer.setMap(this.map);
  }

  disableTrafficLayer() {
    if (this.trafficLayer) {
      this.trafficLayer.setMap(null);
    }
  }

  addHeatMap(points, options = {}) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    const heatmapData = points.map(point => new google.maps.LatLng(point.lat, point.lng));
    this.heatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      radius: options.radius || 20,
      opacity: options.opacity || 0.6
    });
    
    const heatmapId = this._generateId();
    this.heatmap.setMap(this.map);
    this.heatmaps.set(heatmapId, this.heatmap);
    
    return heatmapId;
  }

  addTileLayer(url, options = {}) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    const tileLayer = new google.maps.ImageMapType({
      getTileUrl: function(coord, zoom) {
        return url
          .replace('{x}', coord.x)
          .replace('{y}', coord.y)
          .replace('{z}', zoom);
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: options.opacity || 1.0
    });
    
    const layerId = this._generateId();
    this.layers.set(layerId, tileLayer);
    
    return layerId;
  }

  removeLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      if (layer.setMap) {
        layer.setMap(null);
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
    console.info('Indoor maps are enabled by default in Google Maps.');
  }

  applyMapStyle(style) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    this.map.setOptions({ styles: style });
  }

  enable3D(enable) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    if (enable) {
      this.map.setTilt(45);
    } else {
      this.map.setTilt(0);
    }
  }

  on(event, callback) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    const listener = this.map.addListener(event, callback);
    this.eventListeners.get(event).push({ callback, listener });
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.findIndex(item => item.callback === callback);
      if (index > -1) {
        const { listener } = listeners[index];
        google.maps.event.removeListener(listener);
        listeners.splice(index, 1);
      }
    }
  }

  getBounds() {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    const bounds = this.map.getBounds();
    if (bounds) {
      return {
        southwest: {
          lat: bounds.getSouthWest().lat(),
          lng: bounds.getSouthWest().lng()
        },
        northeast: {
          lat: bounds.getNorthEast().lat(),
          lng: bounds.getNorthEast().lng()
        }
      };
    }
    return null;
  }

  destroy() {
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach(({ listener }) => {
        google.maps.event.removeListener(listener);
      });
    });
    this.eventListeners.clear();

    this.markers.forEach(marker => marker.setMap(null));
    this.polylines.forEach(polyline => polyline.setMap(null));
    this.polygons.forEach(polygon => polygon.setMap(null));
    this.heatmaps.forEach(heatmap => heatmap.setMap(null));
    this.layers.forEach(layer => {
      if (layer.setMap) layer.setMap(null);
    });

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
    this.trafficLayer = null;
  }
}
  