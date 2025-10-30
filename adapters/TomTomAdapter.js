import { BaseAdapter } from './BaseAdapter.js';

export class TomTomAdapter extends BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    super(apiKey, containerId, options);
    this.eventListeners = new Map();
    this._isLoaded = false;
  }

  async init() {
    await this.loadTomTomScript();

    const mapElement = this.getContainer();
    if (!mapElement) {
      throw new Error(`Container element with ID '${this.containerId}' not found.`);
    }

    // Validate center coordinates
    const centerLat = typeof this.options.center?.lat === 'number' ? this.options.center.lat : 0;
    const centerLng = typeof this.options.center?.lng === 'number' ? this.options.center.lng : 0;

    this.map = tt.map({
      key: this.apiKey,
      container: this.containerId,
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
    return !!this._isLoaded;
  }

  executeWhenReady(callback) {
    if (this.isReady()) {
      callback();
    } else {
      this.map.once('load', callback);
    }
  }

  loadTomTomScript() {
    return new Promise((resolve, reject) => {
      if (window.tt && window.tt.map) {
        return resolve();
      }

      const link = document.createElement('link');
      link.href = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.23.0/maps/maps.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.23.0/maps/maps-web.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  addMarker(options) {
    const markerId = this._generateId();
    
    const marker = new tt.Marker().setLngLat([options.lng, options.lat]);
    
    if (options.title) {
      const popup = new tt.Popup().setText(options.title);
      marker.setPopup(popup);
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
      
      marker = new tt.Marker({ element: el }).setLngLat([options.lng, options.lat]);
    } else if (options.iconUrl) {
      // Custom icon
      const el = document.createElement('div');
      el.style.width = (options.iconSize?.width || 32) + 'px';
      el.style.height = (options.iconSize?.height || 32) + 'px';
      // Note: iconUrl is used directly in CSS - ensure it's from a trusted source to prevent XSS
      el.style.backgroundImage = `url(${options.iconUrl})`;
      el.style.backgroundSize = 'cover';
      el.style.cursor = 'pointer';
      
      marker = new tt.Marker({ element: el }).setLngLat([options.lng, options.lat]);
    } else {
      marker = new tt.Marker().setLngLat([options.lng, options.lat]);
    }
    
    if (options.title) {
      const popup = new tt.Popup().setText(options.title);
      marker.setPopup(popup);
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

    const clickHandler = () => {
      const lngLat = marker.getLngLat();
      const data = { lat: lngLat.lat, lng: lngLat.lng, markerId };

      if (callback) {
        callback(data);
      }

      if (options.popupHtml) {
        new tt.Popup({ offset: [0, -25] })
          .setLngLat([lngLat.lng, lngLat.lat])
          .setHTML(options.popupHtml)
          .addTo(this.map);
      }

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
 restriction   `;
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
        marker.getElement().removeEventListener('click', this.markerClickHandlers.get(markerId));
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
        console.error('Invalid position for TomTom marker update:', options.position);
        return false;
      }
      
      try {
        marker.setLngLat([lng, lat]);
      } catch (error) {
        console.error('Failed to update marker position:', error.message);
        return false;
      }
    }
    
    if (options.title !== undefined) {
      try {
        if (options.title) {
          const popup = new tt.Popup().setText(options.title);
          marker.setPopup(popup);
        } else {
          marker.setPopup(null);
        }
      } catch (error) {
        console.error('Failed to update marker popup:', error.message);
      }
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
      this.map.panTo([coords.lng, coords.lat]);
    }
  }

  fitBounds(bounds) {
    this.map.fitBounds(
      new tt.LngLatBounds(
        [bounds.southwest.lng, bounds.southwest.lat],
        [bounds.northeast.lng, bounds.northeast.lat]
      )
    );
  }

  async geocode(address) {
    const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(address)}.json?key=${this.apiKey}&limit=1`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Geocoding failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: result.position.lat,
          lng: result.position.lon,
          formattedAddress: result.address.freeformAddress
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

    const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Reverse geocoding failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
      }
      
      const data = await response.json();
      
      if (data.addresses && data.addresses.length > 0) {
        return {
          formattedAddress: data.addresses[0].address.freeformAddress,
          components: data.addresses[0].address
        };
      }
      throw new Error('No results found');
    } catch (error) {
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  drawRoute(coords, options = {}) {
    const routeId = this._generateId();
    
    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords.map(c => [c.lng, c.lat])
      }
    };
    this.executeWhenReady(() => {
      this.map.addLayer({
        id: routeId,
        type: 'line',
        source: {
          type: 'geojson',
          data: geojson
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': options.strokeColor || '#FF0000',
          'line-width': options.strokeWeight || 3
        }
      });
    });
    
    this.polylines.set(routeId, geojson);
    return routeId;
  }

  async getDirections(origin, destination, options = {}) {
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json?key=${this.apiKey}&routeType=${options.travelMode || 'fastest'}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routePath = route.legs[0].points.map(point => ({
          lat: point.latitude,
          lng: point.longitude
        }));
        
        const routeId = this.drawRoute(routePath, options);
        
        return {
          routeId,
          duration: route.summary.travelTimeInSeconds,
          distance: route.summary.lengthInMeters
        };
      }
      throw new Error('No route found');
    } catch (error) {
      throw new Error(`Directions failed: ${error.message}`);
    }
  }

  drawPolygon(coords, options = {}) {
    const polygonId = this._generateId();
    
    const ring = coords.map(c => [c.lng, c.lat]);
    if (ring.length > 0) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
    }

    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ring]
      }
    };
    this.executeWhenReady(() => {
      this.map.addLayer({
        id: polygonId,
        type: 'fill',
        source: {
          type: 'geojson',
          data: geojson
        },
        paint: {
          'fill-color': options.fillColor || '#FF0000',
          'fill-opacity': options.fillOpacity || 0.35
        }
      });

      this.map.addLayer({
        id: polygonId + '-outline',
        type: 'line',
        source: {
          type: 'geojson',
          data: geojson
        },
        paint: {
          'line-color': options.strokeColor || '#FF0000',
          'line-width': options.strokeWeight || 2
        }
      });
    });
    
    this.polygons.set(polygonId, geojson);
    return polygonId;
  }

  drawPolyline(coords, options = {}) {
    return this.drawRoute(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    // Approximate circle as a polygon
    const points = [];
    
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * 2 * Math.PI;
      const pointLat = center.lat + (radius / 111320) * Math.cos(angle);
      const pointLng = center.lng + (radius / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
      points.push({ lat: pointLat, lng: pointLng });
    }
    
    return this.drawPolygon(points, options);
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
    const trafficLayer = {
      id: 'traffic-layer',
      type: 'raster',
      source: {
        type: 'raster',
        tiles: [
          `https://api.tomtom.com/map/1/tile/basic/traffic/{z}/{x}/{y}.png?key=${this.apiKey}`
        ],
        tileSize: 256
      },
      minzoom: 0,
      maxzoom: 22
    };
    
    this.map.addLayer(trafficLayer);
    this.trafficLayer = trafficLayer;
  }

  disableTrafficLayer() {
    if (this.trafficLayer) {
      this.map.removeLayer(this.trafficLayer.id);
      this.trafficLayer = null;
    }
  }

  addHeatMap(points, options = {}) {
    const heatmapId = this._generateId();
    
    const geojson = {
      type: 'FeatureCollection',
      features: points.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat]
        }
      }))
    };
    this.executeWhenReady(() => {
      if (!this.map.getSource(heatmapId)) {
        this.map.addSource(heatmapId, {
          type: 'geojson',
          data: geojson
        });
      }
      if (!this.map.getLayer(heatmapId)) {
        this.map.addLayer({
          id: heatmapId,
          type: 'heatmap',
          source: heatmapId,
          maxzoom: 15,
          paint: {
            'heatmap-weight': options.weight || 1,
            'heatmap-intensity': options.intensity || 1,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, 'rgb(103,169,207)',
              0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)',
              0.8, 'rgb(239,138,98)',
              1, 'rgb(178,24,43)'
            ],
            'heatmap-radius': options.radius || 20,
            'heatmap-opacity': options.opacity || 0.6
          }
        });
      }
    });
    
    this.heatmaps.set(heatmapId, geojson);
    return heatmapId;
  }

  addTileLayer(url, options = {}) {
    const layerId = this._generateId();
    
    const tileLayer = {
      id: layerId,
      type: 'raster',
      source: {
        type: 'raster',
        tiles: [url],
        tileSize: options.tileSize || 256
      },
      minzoom: options.minzoom || 0,
      maxzoom: options.maxzoom || 22
    };
    this.executeWhenReady(() => {
      this.map.addLayer(tileLayer);
    });
    this.layers.set(layerId, tileLayer);
    
    return layerId;
  }

  removeLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      this.map.removeLayer(layerId);
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
    console.info('Indoor maps not available in TomTom');
  }

  applyMapStyle(style) {
    if (typeof style === 'string') {
      this.map.setStyle(`mapbox://styles/mapbox/${style}`);
    }
  }

  enable3D(enable) {
    if (enable) {
      this.map.easeTo({ pitch: 45 });
    } else {
      this.map.easeTo({ pitch: 0 });
    }
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
      southwest: { lat: bounds.getSouth().lat, lng: bounds.getWest().lng },
      northeast: { lat: bounds.getNorth().lat, lng: bounds.getEast().lng }
    };
  }

  destroy() {
    this.map.remove();
    this.markers.clear();
    this.polylines.clear();
    this.polygons.clear();
    this.heatmaps.clear();
    this.layers.clear();
    this.map = null;
  }
}
