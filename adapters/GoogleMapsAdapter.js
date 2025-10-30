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

      // Map ID is required for Advanced Marker Element (custom HTML markers)
      // Generate a default map ID if not provided, or use user-provided one
      const mapId = this.options.mapId || 'unimap-default';
      
      const mapOptions = {
        center: this.options.center || { lat: 0, lng: 0 },
        zoom: this.options.zoom || 10,
        mapTypeId: this.options.mapTypeId || 'roadmap',
        disableDefaultUI: this.options.disableDefaultUI || false,
        zoomControl: this.options.zoomControl !== false,
        mapTypeControl: this.options.mapTypeControl !== false,
        scaleControl: this.options.scaleControl !== false,
        streetViewControl: this.options.streetViewControl !== false,
        rotateControl: this.options.rotateControl !== false,
        fullscreenControl: this.options.fullscreenControl !== false
      };
      
      // Add mapId for Advanced Marker support (available in newer Google Maps API)
      // Note: When mapId is present, styles must be controlled via Cloud Console, not here
      if (mapId) {
        mapOptions.mapId = mapId;
        // Don't set styles when mapId is present - Google Maps will warn and ignore it
      } else if (this.options.styles && Array.isArray(this.options.styles) && this.options.styles.length > 0) {
        // Only set styles if no mapId is provided (styles controlled via Cloud Console when mapId exists)
        mapOptions.styles = this.options.styles;
      }

      this.map = new google.maps.Map(mapElement, mapOptions);

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
        return resolve();
      }
      
      const script = document.createElement('script');
      // Include 'marker' library so google.maps.marker.AdvancedMarkerElement is available
      // Use loading=async parameter for best-practice loading (recommended by Google)
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places,visualization,geometry,marker&loading=async&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      window.initGoogleMaps = () => {
        resolve();
      };
      
      script.onerror = (error) => {
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
      // Google Maps API key validated successfully
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

  addCustomMarker(options) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    if (!options || typeof options.lat !== 'number' || typeof options.lng !== 'number') {
      throw new Error('addCustomMarker requires options with numeric lat and lng properties');
    }

    const markerId = this._generateId();

    // Support custom HTML content (requires 'marker' library and valid Map ID)
    if (options.html) {
      const Advanced = google.maps.marker && google.maps.marker.AdvancedMarkerElement;
      if (Advanced) {
        try {
          const htmlMarker = new Advanced({
            map: this.map,
            position: { lat: options.lat, lng: options.lng },
            content: this._createMarkerElement(options.html, options.className)
          });
          this.markers.set(markerId, htmlMarker);
          return markerId;
        } catch (error) {
          // Fallback if Advanced Marker fails (e.g., no valid Map ID)
          console.warn('AdvancedMarkerElement failed, falling back to standard Marker:', error.message);
          const fallback = new google.maps.Marker({
            position: { lat: options.lat, lng: options.lng },
            map: this.map,
            title: options.title || 'Custom marker'
          });
          this.markers.set(markerId, fallback);
          return markerId;
        }
      }
      // Fallback: use a normal Marker if AdvancedMarkerElement is unavailable
      console.warn('google.maps.marker.AdvancedMarkerElement unavailable. Falling back to standard Marker.');
      const fallback = new google.maps.Marker({
        position: { lat: options.lat, lng: options.lng },
        map: this.map,
        title: options.title || 'Custom marker'
      });
      this.markers.set(markerId, fallback);
      return markerId;
    }

    // Support custom icon
    const markerOptions = {
      position: { lat: options.lat, lng: options.lng },
      map: this.map,
      title: options.title || '',
      label: options.label || '',
      draggable: options.draggable || false,
      clickable: options.clickable !== false
    };

    if (options.iconUrl || options.icon) {
      markerOptions.icon = options.icon || {
        url: options.iconUrl,
        scaledSize: options.iconSize ? new google.maps.Size(options.iconSize.width || 32, options.iconSize.height || 32) : null,
        anchor: options.iconAnchor ? new google.maps.Point(options.iconAnchor.x || 16, options.iconAnchor.y || 16) : null
      };
    }

    const marker = new google.maps.Marker(markerOptions);
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

    // Check if this is an AdvancedMarkerElement
    const isAdvancedMarker = google.maps.marker && google.maps.marker.AdvancedMarkerElement && marker instanceof google.maps.marker.AdvancedMarkerElement;

    const clickHandler = (event) => {
      // Extract position - AdvancedMarkerElement uses different event structure
      let lat, lng;
      if (isAdvancedMarker) {
        // AdvancedMarkerElement: event has latLng property or use marker.position
        if (event.latLng) {
          lat = event.latLng.lat();
          lng = event.latLng.lng();
        } else if (marker.position) {
          lat = typeof marker.position.lat === 'function' ? marker.position.lat() : marker.position.lat;
          lng = typeof marker.position.lng === 'function' ? marker.position.lng() : marker.position.lng;
        }
      } else if (event.latLng) {
        // Standard Marker
        lat = event.latLng.lat();
        lng = event.latLng.lng();
      } else if (marker.position && typeof marker.getPosition === 'function') {
        // Fallback: use marker's current position
        const pos = marker.getPosition();
        lat = pos.lat();
        lng = pos.lng();
      }

      // Call the callback
      if (callback && (lat !== undefined && lng !== undefined)) {
        callback({ lat, lng, markerId, event });
      }

      // Show popup if HTML content provided
      if (options.popupHtml) {
        const infoWindow = new google.maps.InfoWindow({
          content: options.popupHtml
        });
        
        // For AdvancedMarkerElement, we need to provide a position
        if (isAdvancedMarker && marker.position) {
          const pos = typeof marker.position.lat === 'function' 
            ? { lat: marker.position.lat(), lng: marker.position.lng() }
            : marker.position;
          infoWindow.setPosition(pos);
          infoWindow.open(this.map);
        } else {
          infoWindow.open(this.map, marker);
        }
      }

      // Show toast notification
      if (options.toast || options.toastMessage) {
        this._showToast(options.toastMessage || 'Marker clicked', options.toastDuration || 3000);
      }
    };

    // Store click handler for cleanup
    if (!this.markerClickHandlers) {
      this.markerClickHandlers = new Map();
    }
    this.markerClickHandlers.set(markerId, clickHandler);

    // AdvancedMarkerElement uses 'gmp-click' event, standard Marker uses 'click'
    // However, some versions use 'click' for both, so we'll try both
    try {
      if (isAdvancedMarker && marker.addListener) {
        // Try gmp-click first for AdvancedMarkerElement
        marker.addListener('gmp-click', clickHandler);
      } else {
        marker.addListener('click', clickHandler);
      }
          } catch {
      // Fallback to 'click' if 'gmp-click' doesn't work
      marker.addListener('click', clickHandler);
    }
    
    return markerId;
  }

  _createMarkerElement(html, className) {
    const div = document.createElement('div');
    // eslint-disable-next-line no-restricted-syntax
    div.innerHTML = html;
    if (className) {
      div.className = className;
    }
    div.style.cursor = 'pointer';
    return div;
  }

  _showToast(message, duration = 3000) {
    // Create toast element if it doesn't exist
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

    // Fade in
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);

    // Remove after duration
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);

    return toast;
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
    if (!marker) {
      return false;
    }

    // Check if this is an AdvancedMarkerElement (custom HTML marker)
    const isAdvancedMarker = google.maps.marker && google.maps.marker.AdvancedMarkerElement && marker instanceof google.maps.marker.AdvancedMarkerElement;
    
    if (isAdvancedMarker) {
      // Handle AdvancedMarkerElement (used for custom HTML markers)
      // AdvancedMarkerElement uses 'position' property with LatLng or LatLngLiteral
      if (options.position) {
        const lat = typeof options.position.lat === 'number' ? options.position.lat : parseFloat(options.position.lat);
        const lng = typeof options.position.lng === 'number' ? options.position.lng : parseFloat(options.position.lng);
        
        if (typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)) {
          // AdvancedMarkerElement accepts LatLngLiteral object {lat, lng} or LatLng instance
          try {
            marker.position = new google.maps.LatLng(lat, lng);
          } catch {
            // Fallback to LatLngLiteral if LatLng constructor fails
            marker.position = { lat: lat, lng: lng };
          }
        } else {
          console.error('Invalid position for AdvancedMarkerElement:', options.position);
          return false;
        }
      }
      // AdvancedMarkerElement doesn't support title/label/icon updates directly
      // Those are part of the HTML content, which would require recreating the marker
      if (options.title !== undefined || options.label !== undefined || options.icon !== undefined) {
        console.warn('AdvancedMarkerElement: title, label, and icon updates require recreating the marker with new HTML content.');
      }
      return true;
    } else {
      // Handle standard google.maps.Marker
      if (options.position) {
        const lat = typeof options.position.lat === 'number' ? options.position.lat : parseFloat(options.position.lat);
        const lng = typeof options.position.lng === 'number' ? options.position.lng : parseFloat(options.position.lng);
        
        if (typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)) {
          if (typeof marker.setPosition === 'function') {
            marker.setPosition({ lat: lat, lng: lng });
          } else if (marker.position !== undefined) {
            // Fallback: marker might be AdvancedMarkerElement or another type that uses position property
            // Try to set position directly
            try {
              marker.position = new google.maps.LatLng(lat, lng);
            } catch {
              marker.position = { lat: lat, lng: lng };
            }
          } else {
            console.warn('Marker does not support setPosition method and has no position property');
            return false;
          }
        } else {
          console.error('Invalid position for marker update:', options.position);
          return false;
        }
      }
      if (options.title !== undefined && typeof marker.setTitle === 'function') {
        marker.setTitle(options.title);
      }
      if (options.label !== undefined && typeof marker.setLabel === 'function') {
        marker.setLabel(options.label);
      }
      if (options.icon !== undefined && typeof marker.setIcon === 'function') {
        marker.setIcon(options.icon);
      }
      if (options.draggable !== undefined && typeof marker.setDraggable === 'function') {
        marker.setDraggable(options.draggable);
      }
      return true;
    }
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
      return Promise.reject(new Error('Invalid coordinates'));
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
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }

    this.map = null;
    this.trafficLayer = null;
  }
}
  