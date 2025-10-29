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

    // Validate center coordinates
    const centerLat = typeof this.options.center?.lat === 'number' ? this.options.center.lat : 0;
    const centerLng = typeof this.options.center?.lng === 'number' ? this.options.center.lng : 0;

    this.map = new Microsoft.Maps.Map(mapElement, {
      credentials: this.apiKey,
      center: new Microsoft.Maps.Location(centerLat, centerLng),
      zoom: this.options.zoom || 10,
      mapTypeId: this.options.mapTypeId || Microsoft.Maps.MapTypeId.road,
      showMapTypeSelector: this.options.showMapTypeSelector !== false,
      showZoomButton: this.options.showZoomButton !== false,
      showScalebar: this.options.showScalebar !== false,
      showBreadcrumb: this.options.showBreadcrumb !== false,
      enableCORS: this.options.enableCORS !== false,
      enableHighDpi: this.options.enableHighDpi !== false,
      enableInertia: this.options.enableInertia !== false
    });
  }

  loadBingMapsScript() {
    return new Promise((resolve, reject) => {
      if (window.Microsoft && window.Microsoft.Maps && window.Microsoft.Maps.Location) {
        return resolve();
      }

      // Wait for the callback to fire
      const callbackName = 'bingMapsLoadCallback';
      window[callbackName] = () => {
        if (window.Microsoft && window.Microsoft.Maps && window.Microsoft.Maps.Location) {
          resolve();
        } else {
          reject(new Error('Bing Maps failed to load properly'));
        }
        delete window[callbackName];
      };

      const script = document.createElement('script');
      script.src = `https://www.bing.com/api/maps/mapcontrol?key=${this.apiKey}&callback=${callbackName}`;
      script.async = true;
      script.onerror = () => {
        delete window[callbackName];
        reject(new Error('Failed to load Bing Maps script'));
      };

      document.head.appendChild(script);
    });
  }

  addMarker(options) {
    const markerId = this._generateId();
    
    const location = new Microsoft.Maps.Location(options.lat, options.lng);
    
    const pushpinOptions = {
      title: options.title || '',
      text: options.label || '',
      draggable: options.draggable || false
    };
    
    if (options.icon) {
      pushpinOptions.icon = options.icon;
    }
    
    if (options.color !== undefined) {
      pushpinOptions.color = options.color;
    } else if (Microsoft.Maps.PushpinColor && Microsoft.Maps.PushpinColor.red) {
      pushpinOptions.color = Microsoft.Maps.PushpinColor.red;
    }
    
    const pushpin = new Microsoft.Maps.Pushpin(location, pushpinOptions);
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
    if (!address || typeof address !== 'string') {
      return Promise.reject(new Error('Address must be a non-empty string'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Geocoding request timeout'));
      }, 30000);

      try {
        // Load the Search module if not already loaded
        Microsoft.Maps.loadModule('Microsoft.Maps.Search', () => {
          try {
            // Create SearchManager instance
            const searchManager = new Microsoft.Maps.Search.SearchManager(this.map);
            
            const geocodeRequest = {
              where: address,
              callback: (geocodeResult) => {
                clearTimeout(timeout);
                try {
                  if (geocodeResult && geocodeResult.results && geocodeResult.results.length > 0) {
                    const location = geocodeResult.results[0].location;
                    resolve({
                      lat: location.latitude,
                      lng: location.longitude,
                      formattedAddress: geocodeResult.results[0].address.formattedAddress
                    });
                  } else {
                    reject(new Error('No results found'));
                  }
                } catch (err) {
                  reject(new Error(`Geocoding callback error: ${err.message}`));
                }
              },
              errorCallback: (error) => {
                clearTimeout(timeout);
                const errorMsg = error && error.message ? error.message : 
                               (typeof error === 'string' ? error : JSON.stringify(error));
                reject(new Error(`Geocoding failed: ${errorMsg}`));
              }
            };
            
            searchManager.geocode(geocodeRequest);
          } catch (err) {
            clearTimeout(timeout);
            reject(new Error(`Geocoding setup error: ${err.message}`));
          }
        }, (errorCallback) => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load Bing Maps Search module: ${errorCallback}`));
        });
      } catch (err) {
        clearTimeout(timeout);
        reject(new Error(`Geocoding initialization error: ${err.message}`));
      }
    });
  }

  async reverseGeocode(lat, lng) {
    if (!this._validateCoordinates(lat, lng)) {
      return Promise.reject(new Error('Invalid coordinates'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Reverse geocoding request timeout'));
      }, 30000);

      try {
        // Load the Search module if not already loaded
        Microsoft.Maps.loadModule('Microsoft.Maps.Search', () => {
          try {
            // Create SearchManager instance
            const searchManager = new Microsoft.Maps.Search.SearchManager(this.map);
            
            const location = new Microsoft.Maps.Location(lat, lng);
            
            const reverseGeocodeRequest = {
              location: location,
              callback: (reverseGeocodeResult) => {
                clearTimeout(timeout);
                try {
                  if (reverseGeocodeResult && reverseGeocodeResult.address) {
                    resolve({
                      formattedAddress: reverseGeocodeResult.address.formattedAddress,
                      components: reverseGeocodeResult.address
                    });
                  } else {
                    reject(new Error('No results found'));
                  }
                } catch (err) {
                  reject(new Error(`Reverse geocoding callback error: ${err.message}`));
                }
              },
              errorCallback: (error) => {
                clearTimeout(timeout);
                const errorMsg = error && error.message ? error.message : 
                               (typeof error === 'string' ? error : JSON.stringify(error));
                reject(new Error(`Reverse geocoding failed: ${errorMsg}`));
              }
            };
            
            searchManager.reverseGeocode(reverseGeocodeRequest);
          } catch (err) {
            clearTimeout(timeout);
            reject(new Error(`Reverse geocoding setup error: ${err.message}`));
          }
        }, (errorCallback) => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load Bing Maps Search module: ${errorCallback}`));
        });
      } catch (err) {
        clearTimeout(timeout);
        reject(new Error(`Reverse geocoding initialization error: ${err.message}`));
      }
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
    // Validate inputs
    if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
      return Promise.reject(new Error('Origin must be an object with numeric lat and lng properties'));
    }
    
    if (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
      return Promise.reject(new Error('Destination must be an object with numeric lat and lng properties'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Directions request timeout'));
      }, 30000); // 30 second timeout

      try {
        // Load the Directions module if not already loaded
        Microsoft.Maps.loadModule('Microsoft.Maps.Directions', () => {
          try {
            // Create a new DirectionsManager instance (CORRECT: must be instantiated, not called statically)
            const directionsManager = new Microsoft.Maps.Directions.DirectionsManager(this.map);
            
            // Validate DirectionsManager was created successfully
            if (!directionsManager) {
              clearTimeout(timeout);
              reject(new Error('Failed to create DirectionsManager instance'));
              return;
            }
            
            // Set route options
            directionsManager.setRequestOptions({
              routeMode: options.travelMode || Microsoft.Maps.Directions.RouteMode.driving,
              routeOptimization: options.optimizeWaypoints ? 
                Microsoft.Maps.Directions.RouteOptimization.shortestTime : 
                Microsoft.Maps.Directions.RouteOptimization.shortestDistance
            });

            // Add waypoints
            const startWaypoint = new Microsoft.Maps.Directions.Waypoint({
              location: new Microsoft.Maps.Location(origin.lat, origin.lng),
              address: origin.address || ''
            });
            
            const endWaypoint = new Microsoft.Maps.Directions.Waypoint({
              location: new Microsoft.Maps.Location(destination.lat, destination.lng),
              address: destination.address || ''
            });

            directionsManager.addWaypoint(startWaypoint);
            directionsManager.addWaypoint(endWaypoint);

            // Set event handlers
            Microsoft.Maps.Events.addHandler(directionsManager, 'directionsUpdated', (e) => {
              clearTimeout(timeout);
              try {
                if (e && e.route && e.route.length > 0) {
                  const route = e.route[0];
                  if (route && route.routePath && route.routePath.length > 0) {
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
                    reject(new Error('No route found: route path is empty'));
                  }
                } else {
                  reject(new Error('No route found'));
                }
              } catch (err) {
                reject(new Error(`Directions callback error: ${err.message}`));
              }
            });

            Microsoft.Maps.Events.addHandler(directionsManager, 'directionsError', (e) => {
              clearTimeout(timeout);
              const errorMsg = e && e.message ? e.message : 'Unknown error';
              reject(new Error(`Directions failed: ${errorMsg}`));
            });

            // CORRECT: Call calculateDirections() on the instantiated DirectionsManager
            directionsManager.calculateDirections();
          } catch (error) {
            clearTimeout(timeout);
            reject(new Error(`Directions setup failed: ${error.message || error}`));
          }
        }, (errorCallback) => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load Bing Maps Directions module: ${errorCallback}`));
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error(`Directions failed: ${error.message || error}`));
      }
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
    // Bing Maps doesn't have a built-in Circle, approximate with a polygon
    const circleId = this._generateId();
    
    const numPoints = 64;
    const points = [];
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const lat = center.lat + (radius / 111320) * Math.cos(angle);
      const lng = center.lng + (radius / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
      points.push(new Microsoft.Maps.Location(lat, lng));
    }
    
    const polygon = new Microsoft.Maps.Polygon(points, {
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35,
      strokeColor: options.strokeColor || '#FF0000',
      strokeThickness: options.strokeWeight || 2
    });

    this.map.entities.push(polygon);
    this.polygons.set(circleId, polygon);
    
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
    // Bing Maps doesn't have a built-in HeatMapLayer, use colored circles
    const heatmapId = this._generateId();
    const group = [];
    
    points.forEach(point => {
      const location = new Microsoft.Maps.Location(point.lat, point.lng);
      const pushpin = new Microsoft.Maps.Pushpin(location, {
        color: point.color || '#FF0000',
        opacity: options.opacity || 0.6
      });
      this.map.entities.push(pushpin);
      group.push(pushpin);
    });

    this.heatmaps.set(heatmapId, group);
    
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
    
    const listener = Microsoft.Maps.Events.addHandler(this.map, event, callback);
    this.eventListeners.get(event).push({ callback, listener });
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.findIndex(item => item.callback === callback);
      if (index > -1) {
        const { listener } = listeners[index];
        Microsoft.Maps.Events.removeHandler(listener);
        listeners.splice(index, 1);
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
      listeners.forEach(({ listener }) => {
        Microsoft.Maps.Events.removeHandler(listener);
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
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }

    this.map = null;
    this.trafficLayer = null;
  }
}
