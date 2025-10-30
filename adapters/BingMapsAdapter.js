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

  addCustomMarker(options) {
    if (!options || typeof options.lat !== 'number' || typeof options.lng !== 'number') {
      throw new Error('addCustomMarker requires options with numeric lat and lng properties');
    }

    const markerId = this._generateId();
    const location = new Microsoft.Maps.Location(options.lat, options.lng);

    if (options.html) {
      const overlay = new Microsoft.Maps.CustomOverlay({
        htmlContent: options.html,
        position: location
      });
      this.map.layers.insert(overlay);
      this.markers.set(markerId, overlay);
      return markerId;
    }

    const pushpinOptions = {
      title: options.title || '',
      text: options.label || '',
      draggable: options.draggable || false
    };

    if (options.iconUrl) {
      pushpinOptions.icon = options.iconUrl;
    } else if (options.color) {
      pushpinOptions.color = options.color;
    }

    const pushpin = new Microsoft.Maps.Pushpin(location, pushpinOptions);
    this.map.entities.push(pushpin);
    this.markers.set(markerId, pushpin);
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

    Microsoft.Maps.Events.addHandler(marker, 'click', (e) => {
      const location = marker.getLocation ? marker.getLocation() : marker.position;
      const data = { lat: location.latitude, lng: location.longitude, markerId, event: e };

      if (callback) {
        callback(data);
      }

      if (options.popupHtml) {
        const infobox = new Microsoft.Maps.Infobox(location, {
          description: options.popupHtml,
          visible: true
        });
        this.map.entities.push(infobox);
      }

      if (options.toast || options.toastMessage) {
        this._showToast(options.toastMessage || 'Marker clicked', options.toastDuration || 3000);
      }
    });

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
      if (marker instanceof Microsoft.Maps.CustomOverlay) {
        this.map.layers.remove(marker);
      } else {
        this.map.entities.remove(marker);
      }
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
        console.error('Invalid position for Bing Maps marker update:', options.position);
        return false;
      }
      
      try {
        marker.setLocation(new Microsoft.Maps.Location(lat, lng));
      } catch (error) {
        console.error('Failed to update marker position:', error.message);
        return false;
      }
    }
    
    if (options.title !== undefined && typeof marker.setTitle === 'function') {
      marker.setTitle(options.title);
    }
    if (options.text !== undefined && typeof marker.setText === 'function') {
      marker.setText(options.text);
    }
    if (options.color !== undefined && typeof marker.setColor === 'function') {
      marker.setColor(options.color);
    }
    
    return true;
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
        Microsoft.Maps.loadModule('Microsoft.Maps.Search', () => {
          try {
            const searchManager = new Microsoft.Maps.Search.SearchManager(this.map);
            const request = {
              where: address.trim(),
              callback: (result) => {
                clearTimeout(timeout);
                if (result && result.results && result.results.length > 0) {
                  const best = result.results[0];
                  resolve({
                    lat: best.location.latitude,
                    lng: best.location.longitude,
                    formattedAddress: best.address?.formattedAddress || best.name || address
                  });
                } else {
                  reject(new Error('No results found'));
                }
              },
              errorCallback: async (err) => {
                clearTimeout(timeout);
                const message = (err && err.message) ? err.message : (err ? JSON.stringify(err) : 'Unknown geocoding error');
                // Fallback to REST geocoding if client API fails
                try {
                  const rest = await this._bingRestGeocode(address);
                  if (rest) {
                    resolve(rest);
                    return;
                  }
                } catch {
                  // ignore, will fall through
                }
                reject(new Error(`Geocoding failed: ${message}`));
              }
            };
            searchManager.geocode(request);
          } catch (err) {
            clearTimeout(timeout);
            reject(new Error(`Geocoding setup error: ${err.message}`));
          }
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
        Microsoft.Maps.loadModule('Microsoft.Maps.Search', () => {
          try {
            const searchManager = new Microsoft.Maps.Search.SearchManager(this.map);
            const location = new Microsoft.Maps.Location(lat, lng);
            const request = {
              location,
              callback: (result) => {
                clearTimeout(timeout);
                if (result && result.address) {
                  resolve({
                    formattedAddress: result.address.formattedAddress,
                    components: result.address
                  });
                } else {
                  reject(new Error('No results found'));
                }
              },
              errorCallback: async (err) => {
                clearTimeout(timeout);
                const message = (err && err.message) ? err.message : (err ? JSON.stringify(err) : 'Unknown reverse geocoding error');
                // Fallback to REST reverse geocoding
                try {
                  const rest = await this._bingRestReverseGeocode(lat, lng);
                  if (rest) {
                    resolve(rest);
                    return;
                  }
                } catch {
                  // ignore
                }
                reject(new Error(`Reverse geocoding failed: ${message}`));
              }
            };
            searchManager.reverseGeocode(request);
          } catch (err) {
            clearTimeout(timeout);
            reject(new Error(`Reverse geocoding setup error: ${err.message}`));
          }
        });
      } catch (err) {
        clearTimeout(timeout);
        reject(new Error(`Reverse geocoding initialization error: ${err.message}`));
      }
    });
  }

  async _bingRestGeocode(address) {
    try {
      const url = `https://dev.virtualearth.net/REST/v1/Locations?q=${encodeURIComponent(address)}&maxResults=1&key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const resourceSets = data && data.resourceSets;
      if (resourceSets && resourceSets.length > 0 && resourceSets[0].resources && resourceSets[0].resources.length > 0) {
        const r = resourceSets[0].resources[0];
        const coords = r.point && r.point.coordinates;
        if (coords && coords.length >= 2) {
          return {
            lat: coords[0],
            lng: coords[1],
            formattedAddress: r.address && (r.address.formattedAddress || r.name) || address
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async _bingRestReverseGeocode(lat, lng) {
    try {
      const url = `https://dev.virtualearth.net/REST/v1/Locations/${lat},${lng}?key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const resourceSets = data && data.resourceSets;
      if (resourceSets && resourceSets.length > 0 && resourceSets[0].resources && resourceSets[0].resources.length > 0) {
        const r = resourceSets[0].resources[0];
        return {
          formattedAddress: (r.address && r.address.formattedAddress) || r.name || `${lat},${lng}`,
          components: r.address || {}
        };
      }
      return null;
    } catch {
      return null;
    }
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
