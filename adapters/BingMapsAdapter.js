import { BaseAdapter } from './BaseAdapter.js';

export class BingMapsAdapter extends BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    super(apiKey, containerId, options);
    this.eventListeners = new Map();
    this.entities = new Map();
  }

  async init() {
    await this.loadBingMapsScript();

    const mapElement = this.getContainer();
    if (!mapElement) {
      throw new Error(`Container element with ID '${this.containerId}' not found.`);
    }

    this.map = new Microsoft.Maps.Map(mapElement, {
      credentials: this.apiKey,
      center: new Microsoft.Maps.Location(
        this.options.center?.lat || 0,
        this.options.center?.lng || 0
      ),
      zoom: this.options.zoom || 10,
      mapTypeId: this.options.mapTypeId || Microsoft.Maps.MapTypeId.road,
      showMapTypeSelector: this.options.showMapTypeSelector !== false,
      showZoomButton: this.options.showZoomButton !== false,
      showScalebar: this.options.showScalebar !== false,
      showBreadcrumb: this.options.showBreadcrumb !== false,
      enableCORS: this.options.enableCORS !== false,
      enableHighDpi: this.options.enableHighDpi !== false,
      enableInertia: this.options.enableInertia !== false,
      ...this.options
    });
  }

  loadBingMapsScript() {
    return new Promise((resolve, reject) => {
      if (window.Microsoft && window.Microsoft.Maps) {
        return resolve();
      }

      const script = document.createElement('script');
      script.src = `https://www.bing.com/api/maps/mapcontrol?key=${this.apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;

      document.head.appendChild(script);
    });
  }

  addMarker(options) {
    const markerId = this._generateId();
    
    const location = new Microsoft.Maps.Location(options.lat, options.lng);
    const pushpin = new Microsoft.Maps.Pushpin(location, {
      title: options.title || '',
      text: options.label || '',
      icon: options.icon || null,
      color: options.color || Microsoft.Maps.PushpinColor.red,
      draggable: options.draggable || false
    });

    this.map.entities.push(pushpin);
    this.markers.set(markerId, pushpin);
    
    return markerId;
  }

  removeMarker(markerId) {
    const marker = this.markers.get(markerId);
    if (marker) {
      this.map.entities.remove(marker);
      this.markers.delete(markerId);
      return true;
    }
    return false;
  }

  updateMarker(markerId, options) {
    const marker = this.markers.get(markerId);
    if (marker) {
      if (options.position) {
        marker.setLocation(new Microsoft.Maps.Location(options.position.lat, options.position.lng));
      }
      if (options.title !== undefined) marker.setTitle(options.title);
      if (options.text !== undefined) marker.setText(options.text);
      if (options.color !== undefined) marker.setColor(options.color);
      return true;
    }
    return false;
  }

  setCenter(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.setView({
        center: new Microsoft.Maps.Location(coords.lat, coords.lng)
      });
    }
  }

  getCenter() {
    const center = this.map.getCenter();
    return {
      lat: center.latitude,
      lng: center.longitude
    };
  }

  setZoom(level) {
    this.map.setView({ zoom: level });
  }

  getZoom() {
    return this.map.getZoom();
  }

  zoomIn() {
    this.map.setView({ zoom: this.map.getZoom() + 1 });
  }

  zoomOut() {
    this.map.setView({ zoom: this.map.getZoom() - 1 });
  }

  panTo(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.panTo(new Microsoft.Maps.Location(coords.lat, coords.lng));
    }
  }

  fitBounds(bounds) {
    const locations = [
      new Microsoft.Maps.Location(bounds.southwest.lat, bounds.southwest.lng),
      new Microsoft.Maps.Location(bounds.northeast.lat, bounds.northeast.lng)
    ];
    
    const viewBox = Microsoft.Maps.LocationRect.fromLocations(locations);
    this.map.setView({ bounds: viewBox });
  }

  async geocode(address) {
    return new Promise((resolve, reject) => {
      Microsoft.Maps.geocode({
        query: address,
        callback: (results, userData) => {
          if (results && results.length > 0) {
            const location = results[0].location;
            resolve({
              lat: location.latitude,
              lng: location.longitude,
              formattedAddress: results[0].address.formattedAddress
            });
          } else {
            reject('No results found');
          }
        },
        errorCallback: (error) => {
          reject(`Geocoding failed: ${error}`);
        }
      });
    });
  }

  async reverseGeocode(lat, lng) {
    if (!this._validateCoordinates(lat, lng)) {
      return Promise.reject('Invalid coordinates');
    }

    return new Promise((resolve, reject) => {
      const location = new Microsoft.Maps.Location(lat, lng);
      
      Microsoft.Maps.reverseGeocode({
        location: location,
        callback: (results, userData) => {
          if (results && results.length > 0) {
            resolve({
              formattedAddress: results[0].address.formattedAddress,
              components: results[0].address
            });
          } else {
            reject('No results found');
          }
        },
        errorCallback: (error) => {
          reject(`Reverse geocoding failed: ${error}`);
        }
      });
    });
  }

  drawRoute(coords, options = {}) {
    const routeId = this._generateId();
    
    const locations = coords.map(coord => 
      new Microsoft.Maps.Location(coord.lat, coord.lng)
    );

    const polyline = new Microsoft.Maps.Polyline(locations, {
      strokeColor: options.strokeColor || '#FF0000',
      strokeThickness: options.strokeWeight || 3,
      strokeDashArray: options.strokeDashArray || '1'
    });

    this.map.entities.push(polyline);
    this.polylines.set(routeId, polyline);
    
    return routeId;
  }

  async getDirections(origin, destination, options = {}) {
    return new Promise((resolve, reject) => {
      const waypoints = [origin, destination];
      
      Microsoft.Maps.directions.DirectionsManager.getDirections({
        waypoints: waypoints,
        routeMode: options.travelMode || Microsoft.Maps.Directions.RouteMode.driving,
        routeOptimization: options.optimizeWaypoints ? 
          Microsoft.Maps.Directions.RouteOptimization.shortestTime : 
          Microsoft.Maps.Directions.RouteOptimization.shortestDistance,
        callback: (results, userData) => {
          if (results && results.length > 0) {
            const route = results[0];
            const routeId = this.drawRoute(
              route.routePath.map(point => ({ lat: point.latitude, lng: point.longitude })),
              options
            );
            resolve({ 
              routeId, 
              duration: route.duration, 
              distance: route.distance 
            });
          } else {
            reject('No route found');
          }
        },
        errorCallback: (error) => {
          reject(`Directions failed: ${error}`);
        }
      });
    });
  }

  drawPolygon(coords, options = {}) {
    const polygonId = this._generateId();
    
    const locations = coords.map(coord => 
      new Microsoft.Maps.Location(coord.lat, coord.lng)
    );

    const polygon = new Microsoft.Maps.Polygon(locations, {
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35,
      strokeColor: options.strokeColor || '#FF0000',
      strokeThickness: options.strokeWeight || 2
    });

    this.map.entities.push(polygon);
    this.polygons.set(polygonId, polygon);
    
    return polygonId;
  }

  drawPolyline(coords, options = {}) {
    return this.drawRoute(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    const circleId = this._generateId();
    
    const location = new Microsoft.Maps.Location(center.lat, center.lng);
    const circle = new Microsoft.Maps.Circle(location, radius, {
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35,
      strokeColor: options.strokeColor || '#FF0000',
      strokeThickness: options.strokeWeight || 2
    });

    this.map.entities.push(circle);
    this.polygons.set(circleId, circle);
    
    return circleId;
  }

  drawRectangle(bounds, options = {}) {
    const rectangleId = this._generateId();
    
    const locations = [
      new Microsoft.Maps.Location(bounds.southwest.lat, bounds.southwest.lng),
      new Microsoft.Maps.Location(bounds.northeast.lat, bounds.northeast.lng)
    ];
    
    const rectangle = new Microsoft.Maps.Rectangle(
      Microsoft.Maps.LocationRect.fromLocations(locations),
      {
        fillColor: options.fillColor || '#FF0000',
        fillOpacity: options.fillOpacity || 0.35,
        strokeColor: options.strokeColor || '#FF0000',
        strokeThickness: options.strokeWeight || 2
      }
    );

    this.map.entities.push(rectangle);
    this.polygons.set(rectangleId, rectangle);
    
    return rectangleId;
  }

  enableTrafficLayer() {
    if (!this.trafficLayer) {
      this.trafficLayer = new Microsoft.Maps.Traffic.TrafficManager(this.map);
    }
    this.trafficLayer.show();
  }

  disableTrafficLayer() {
    if (this.trafficLayer) {
      this.trafficLayer.hide();
    }
  }

  addHeatMap(points, options = {}) {
    const heatmapId = this._generateId();
    
    const locations = points.map(point => 
      new Microsoft.Maps.Location(point.lat, point.lng)
    );

    const heatmap = new Microsoft.Maps.HeatMapLayer(locations, {
      intensity: options.intensity || 1,
      radius: options.radius || 20,
      opacity: options.opacity || 0.6
    });

    this.map.layers.insert(heatmap);
    this.heatmaps.set(heatmapId, heatmap);
    
    return heatmapId;
  }

  addTileLayer(url, options = {}) {
    const layerId = this._generateId();
    
    const tileLayer = new Microsoft.Maps.TileLayer({
      uriConstructor: url,
      opacity: options.opacity || 1.0
    });

    this.map.layers.insert(tileLayer);
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
    console.info('Indoor maps support is limited in Bing Maps.');
  }

  applyMapStyle(style) {
    if (typeof style === 'string') {
      this.map.setMapStyle(style);
    } else if (typeof style === 'object') {
      this.map.setOptions(style);
    }
  }

  enable3D(enable) {
    if (enable) {
      this.map.setView({ pitch: 45 });
    } else {
      this.map.setView({ pitch: 0 });
    }
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
    
    Microsoft.Maps.Events.addHandler(this.map, event, callback);
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        Microsoft.Maps.Events.removeHandler(callback);
      }
    }
  }

  getBounds() {
    const bounds = this.map.getBounds();
    if (bounds) {
      return {
        southwest: {
          lat: bounds.getSouthwest().latitude,
          lng: bounds.getSouthwest().longitude
        },
        northeast: {
          lat: bounds.getNortheast().latitude,
          lng: bounds.getNortheast().longitude
        }
      };
    }
    return null;
  }

  destroy() {
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach(callback => {
        Microsoft.Maps.Events.removeHandler(callback);
      });
    });
    this.eventListeners.clear();

    this.map.entities.clear();

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
