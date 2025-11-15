import { BaseAdapter } from './BaseAdapter.js';

export class OSMAdapter extends BaseAdapter {
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

    this.currentBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    });
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
      draggable: options.draggable || false,
      clickable: options.clickable !== false
    });

    if (options.label) {
      marker.bindTooltip(options.label);
    }

    if (options.icon) {
      marker.setIcon(L.icon(options.icon));
    }

    marker.addTo(this.map);
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
      // Custom HTML marker
      const el = document.createElement('div');
      // eslint-disable-next-line no-restricted-syntax
      el.innerHTML = options.html;
      el.style.cursor = 'pointer';
      
      const icon = L.divIcon({
        html: options.html,
        className: options.className || 'custom-marker',
        iconSize: options.iconSize ? [options.iconSize.width || 32, options.iconSize.height || 32] : [32, 32]
      });
      marker = L.marker([options.lat, options.lng], { icon });
    } else if (options.iconUrl) {
      // Custom icon
      const icon = L.icon({
        iconUrl: options.iconUrl,
        iconSize: options.iconSize ? [options.iconSize.width || 32, options.iconSize.height || 32] : [32, 32],
        iconAnchor: options.iconAnchor ? [options.iconAnchor.x || 16, options.iconAnchor.y || 16] : [16, 16]
      });
      marker = L.marker([options.lat, options.lng], { icon, title: options.title || '' });
    } else {
      marker = L.marker([options.lat, options.lng], {
        title: options.title || '',
        draggable: options.draggable || false
      });
    }

    if (options.title && !options.html) {
      marker.bindPopup(options.title);
    }

    marker.addTo(this.map);
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
      const data = { lat: e.latlng.lat, lng: e.latlng.lng, markerId, event: e };
      
      if (callback) {
        callback(data);
      }

      // Show popup if HTML content provided
      if (options.popupHtml) {
        marker.bindPopup(options.popupHtml).openPopup();
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

    marker.on('click', clickHandler);
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
      this.map.removeLayer(marker);
      this.markers.delete(markerId);
      if (this.markerClickHandlers) {
        marker.off('click', this.markerClickHandlers.get(markerId));
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
        console.error('Invalid position for OSM marker update:', options.position);
               return false;
      }
      
      try {
        marker.setLatLng([lat, lng]);
      } catch (error) {
        console.error('Failed to update marker position:', error.message);
        return false;
      }
    }
    
    if (options.title !== undefined) {
      marker.options.title = options.title;
    }
    
    if (options.label !== undefined) {
      try {
        if (options.label) {
          marker.bindTooltip(options.label);
        } else {
          // Remove tooltip if label is empty/null
          marker.unbindTooltip();
        }
      } catch (error) {
        console.error('Failed to update marker tooltip:', error.message);
      }
    }
    
    return true;
  }

  setCenter(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.setView([coords.lat, coords.lng]);
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
      this.map.panTo([coords.lat, coords.lng]);
    }
  }

  fitBounds(bounds) {
    const leafletBounds = L.latLngBounds([
      [bounds.southwest.lat, bounds.southwest.lng],
      [bounds.northeast.lat, bounds.northeast.lng]
    ]);
    this.map.fitBounds(leafletBounds);
  }

  async geocode(address) {
    const query = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        formattedAddress: data[0].display_name
      };
    } else {
      throw new Error('No results found');
    }
  }

  async reverseGeocode(lat, lng) {
    if (!this._validateCoordinates(lat, lng)) {
      return Promise.reject(new Error('Invalid coordinates'));
    }

    // Encode coordinates to prevent URL injection
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json`
    );
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data && data.display_name) {
      return {
        formattedAddress: data.display_name,
        components: data.address || {}
      };
    } else {
      throw new Error('No results found');
    }
  }

  drawRoute(coords, options = {}) {
    const routeId = this._generateId();
    
    const latlngs = coords.map(coord => [coord.lat, coord.lng]);
    const polyline = L.polyline(latlngs, {
      color: options.strokeColor || '#FF0000',
      weight: options.strokeWeight || 3,
      opacity: options.strokeOpacity || 1.0,
      dashArray: options.strokeDashArray || null
    });

    polyline.addTo(this.map);
    this.polylines.set(routeId, polyline);
    
    return routeId;
  }

  async getDirections(origin, destination, options = {}) {
    const profile = options.travelMode || 'driving';
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`
    );
    
    if (!response.ok) {
      throw new Error(`Directions failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map(coord => ({ lng: coord[0], lat: coord[1] }));
      const routeId = this.drawRoute(coordinates, options);
      return { 
        routeId, 
        duration: route.duration, 
        distance: route.distance 
      };
    } else {
      throw new Error('No route found');
    }
  }

  drawPolygon(coords, options = {}) {
    const polygonId = this._generateId();
    
    const latlngs = coords.map(coord => [coord.lat, coord.lng]);
    const polygon = L.polygon(latlngs, {
      color: options.strokeColor || '#FF0000',
      weight: options.strokeWeight || 2,
      opacity: options.strokeOpacity || 0.8,
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35
    });

    polygon.addTo(this.map);
    this.polygons.set(polygonId, polygon);
    
    return polygonId;
  }

  drawPolyline(coords, options = {}) {
    return this.drawRoute(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    const circleId = this._generateId();
    
    const circle = L.circle([center.lat, center.lng], {
      radius: radius,
      color: options.strokeColor || '#FF0000',
      weight: options.strokeWeight || 2,
      opacity: options.strokeOpacity || 0.8,
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35
    });

    circle.addTo(this.map);
    this.polygons.set(circleId, circle);
    
    return circleId;
  }

  drawRectangle(bounds, options = {}) {
    const rectangleId = this._generateId();
    
    const leafletBounds = L.latLngBounds([
      [bounds.southwest.lat, bounds.southwest.lng],
      [bounds.northeast.lat, bounds.northeast.lng]
    ]);
    
    const rectangle = L.rectangle(leafletBounds, {
      color: options.strokeColor || '#FF0000',
      weight: options.strokeWeight || 2,
      opacity: options.strokeOpacity || 0.8,
      fillColor: options.fillColor || '#FF0000',
      fillOpacity: options.fillOpacity || 0.35
    });

    rectangle.addTo(this.map);
    this.polygons.set(rectangleId, rectangle);
    
    return rectangleId;
  }

  enableTrafficLayer() {
    console.info('Traffic layer not available in OpenStreetMap. Consider using external traffic data sources.');
  }

  disableTrafficLayer() {
  }

  addHeatMap(points, options = {}) {
    const heatmapId = this._generateId();
    
    const heatmapData = points.map(point => ({
      lat: point.lat,
      lng: point.lng,
      value: point.weight || 1
    }));

    const heatmap = L.layerGroup();
    
    heatmapData.forEach(point => {
      const radius = options.radius || 20;
      const opacity = options.opacity || 0.6;
      const intensity = point.value / Math.max(...heatmapData.map(p => p.value));
      
      const circle = L.circle([point.lat, point.lng], {
        radius: radius,
        color: 'transparent',
        fillColor: this._getHeatmapColor(intensity),
        fillOpacity: opacity * intensity,
        weight: 0
      });
      
      heatmap.addLayer(circle);
    });

    heatmap.addTo(this.map);
    this.heatmaps.set(heatmapId, heatmap);
    
    return heatmapId;
  }

  _getHeatmapColor(intensity) {
    if (intensity < 0.5) {
      return `rgb(0, 0, ${Math.floor(255 * (1 - intensity * 2))})`;
    } else {
      return `rgb(${Math.floor(255 * (intensity - 0.5) * 2)}, 0, 0)`;
    }
  }

  addTileLayer(url, options = {}) {
    const layerId = this._generateId();
    
    const tileLayer = L.tileLayer(url, {
      attribution: options.attribution || '',
      opacity: options.opacity || 1.0,
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
    console.info('Indoor maps not available in OpenStreetMap.');
  }

  applyMapStyle(style) {
    if (typeof style === 'string') {
      // Remove the current base layer if it exists
      if (this.currentBaseLayer && this.map.hasLayer(this.currentBaseLayer)) {
        this.map.removeLayer(this.currentBaseLayer);
      }
      
      // Create and add the new base layer
      this.currentBaseLayer = L.tileLayer(style, {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      });
      this.currentBaseLayer.addTo(this.map);
    } else if (typeof style === 'object') {
      // Apply individual map options that Leaflet supports
      if (style.minZoom !== undefined) {
        this.map.setMinZoom(style.minZoom);
      }
      if (style.maxZoom !== undefined) {
        this.map.setMaxZoom(style.maxZoom);
      }
      if (style.zoomSnap !== undefined) {
        this.map.options.zoomSnap = style.zoomSnap;
      }
      if (style.zoomDelta !== undefined) {
        this.map.options.zoomDelta = style.zoomDelta;
      }
      if (style.wheelPxPerZoomLevel !== undefined) {
        this.map.options.wheelPxPerZoomLevel = style.wheelPxPerZoomLevel;
      }
      if (style.dragging !== undefined) {
        if (style.dragging) {
          this.map.dragging.enable();
        } else {
          this.map.dragging.disable();
        }
      }
      if (style.touchZoom !== undefined) {
        if (style.touchZoom) {
          this.map.touchZoom.enable();
        } else {
          this.map.touchZoom.disable();
        }
      }
      if (style.doubleClickZoom !== undefined) {
        if (style.doubleClickZoom) {
          this.map.doubleClickZoom.enable();
        } else {
          this.map.doubleClickZoom.disable();
        }
      }
      if (style.scrollWheelZoom !== undefined) {
        if (style.scrollWheelZoom) {
          this.map.scrollWheelZoom.enable();
        } else {
          this.map.scrollWheelZoom.disable();
        }
      }
      if (style.boxZoom !== undefined) {
        if (style.boxZoom) {
          this.map.boxZoom.enable();
        } else {
          this.map.boxZoom.disable();
        }
      }
      if (style.keyboard !== undefined) {
        if (style.keyboard) {
          this.map.keyboard.enable();
        } else {
          this.map.keyboard.disable();
        }
      }
      if (style.zoomControl !== undefined) {
        if (style.zoomControl) {
          this.map.addControl(L.control.zoom());
        } else {
          this.map.removeControl(this.map.zoomControl);
        }
      }
      if (style.attributionControl !== undefined) {
        if (style.attributionControl) {
          this.map.addControl(L.control.attribution());
        } else {
          this.map.removeControl(this.map.attributionControl);
        }
      }
    }
  }

  enable3D(enable) {
    console.info('3D view not available in Leaflet/OpenStreetMap.');
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
    if (bounds) {
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
    return null;
  }

  destroy() {
    // Clear event listeners if map exists
    if (this.map) {
      this.eventListeners.forEach((listeners, event) => {
        listeners.forEach(callback => {
          try {
            this.map.off(event, callback);
          } catch {
            // Ignore errors if map is already destroyed
          }
        });
      });
      
      // Remove all layers
      try {
        this.map.eachLayer(layer => {
          this.map.removeLayer(layer);
        });
      } catch {
        // Ignore errors if map is already destroyed
      }
    }
    
    this.eventListeners.clear();

    this.markers.clear();
    this.polylines.clear();
    this.polygons.clear();
    this.heatmaps.clear();
    this.layers.clear();
    this.tileLayers.clear();
    this.currentBaseLayer = null;

    if (this.map) {
      try {
        this.map.remove();
      } catch {
        // Ignore errors if map is already removed
      }
      this.map = null;
    }
  }
}
