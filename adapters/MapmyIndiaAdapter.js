import { BaseAdapter } from './BaseAdapter.js';

export class MapmyIndiaAdapter extends BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    super(apiKey, containerId, options);
    this.eventListeners = new Map();
    this.clusterLayer = null;
    this.markers = new Map();
    this.polylines = new Map();
    this.polygons = new Map();
    this.heatmaps = new Map();
    this.layers = new Map();
  }

  async init() {
    await this.loadMapmyIndiaScript();

    const el = this.getContainer();
    if (!el) throw new Error(`Container element with ID '${this.containerId}' not found.`);

    const lat = typeof this.options.center?.lat === 'number' ? this.options.center.lat : 28.638698;
    const lng = typeof this.options.center?.lng === 'number' ? this.options.center.lng : 77.276045;

    // NOTE: Namespace is `mappls` (lowercase)
    this.map = new mappls.Map(this.containerId, {
      center: { lng, lat }, // Lng first
      zoom: this.options.zoom ?? 10
    });
  }

  loadMapmyIndiaScript() {
    return new Promise((resolve, reject) => {
      if (window.mappls && window.mappls.Map) {
        return resolve();
      }

      // Check if script is already loading
      const existingScript = document.querySelector('script[src*="mappls.com"]');
      if (existingScript) {
        // Wait for existing script to load
        const checkInterval = setInterval(() => {
          if (window.mappls && window.mappls.Map) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        const timeout = setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Timeout waiting for Mappls SDK to load'));
        }, 30000);
        
        existingScript.addEventListener('load', () => {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          if (window.mappls && window.mappls.Map) {
            resolve();
          } else {
            reject(new Error('Mappls SDK script loaded but Map class not available'));
          }
        });
        
        existingScript.addEventListener('error', () => {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          reject(new Error('Failed to load existing Mappls SDK script'));
        });
        
        return;
      }

      const script = document.createElement('script');
      // Official v3 loader
      script.src = `https://apis.mappls.com/advancedmaps/api/${this.apiKey}/map_sdk?v=3.0&layer=vector`;
      script.async = true;
      script.defer = true;
      
      const timeout = setTimeout(() => {
        reject(new Error('Timeout loading Mappls SDK (30s). Please check your API key and network connection.'));
      }, 30000);
      
      script.onload = () => {
        // Wait a bit for SDK to initialize
        let attempts = 0;
        const checkReady = setInterval(() => {
          attempts++;
          if (window.mappls && window.mappls.Map) {
            clearTimeout(timeout);
            clearInterval(checkReady);
            resolve();
          } else if (attempts > 50) { // 5 seconds max
            clearTimeout(timeout);
            clearInterval(checkReady);
            reject(new Error('Mappls SDK script loaded but Map class not available after 5 seconds'));
          }
        }, 100);
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load Mappls SDK. Please check: 1) API key is valid, 2) Network connection, 3) CORS settings, 4) Script URL: ${script.src}`));
      };
      
      document.head.appendChild(script);
    });
  }

  addMarker(options) {
    const id = this._generateId();
    const marker = new mappls.Marker({
      map: this.map,
      position: { lng: options.lng, lat: options.lat },
      popupOptions: !!options.title,
      popupHtml: options.title || undefined
    });

    // You can still wire events explicitly:
    if (options.onClick) {
      marker.addListener('click', options.onClick);
    }

    this.markers.set(id, marker);
    return id;
  }

  removeMarker(markerId) {
    const marker = this.markers.get(markerId);
    if (!marker) return false;
    // Correct removal helper:
    mappls.remove({ map: this.map, layer: marker });
    this.markers.delete(markerId);
    return true;
  }

  updateMarker(markerId, options) {
    const marker = this.markers.get(markerId);
    if (!marker) return false;
    if (options.position) {
      marker.setPosition({ lng: options.position.lng, lat: options.position.lat });
    }
    if (options.title !== undefined) {
      // Re-openable popup content
      marker.set('popupHtml', options.title);
    }
    return true;
  }

  setCenter({ lat, lng }) {
    if (this._validateCoordinates(lat, lng)) this.map.setCenter({ lng, lat });
  }

  getCenter() {
    const c = this.map.getCenter(); // returns {lng, lat}
    return { lat: c.lat, lng: c.lng };
  }

  setZoom(level) { this.map.setZoom(level); }
  getZoom() { return this.map.getZoom(); }
  zoomIn() { this.map.setZoom(this.map.getZoom() + 1); }
  zoomOut() { this.map.setZoom(this.map.getZoom() - 1); }

  panTo({ lat, lng }) {
    if (this._validateCoordinates(lat, lng)) this.map.panTo({ lng, lat });
  }

  fitBounds(bounds) {
    // Accepts [sw, ne] as LngLatLike; Mappls follows Mapbox fitBounds
    const sw = { lng: bounds.southwest.lng, lat: bounds.southwest.lat };
    const ne = { lng: bounds.northeast.lng, lat: bounds.northeast.lat };
    this.map.fitBounds([sw, ne]);
  }

  async geocode(address) {
    const url = `https://apis.mapmyindia.com/advancedmaps/v1/${this.apiKey}/geo_code?addr=${encodeURIComponent(address)}`;
    const res = await fetch(url);
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) throw new Error('No results found');
    return { lat: parseFloat(r.lat), lng: parseFloat(r.lon), formattedAddress: r.formatted_address };
  }

  async reverseGeocode(lat, lng) {
    if (!this._validateCoordinates(lat, lng)) throw new Error('Invalid coordinates');
    const url = `https://apis.mapmyindia.com/advancedmaps/v1/${this.apiKey}/rev_geocode?lat=${lat}&lng=${lng}`;
    const res = await fetch(url);
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) throw new Error('No results found');
    return { formattedAddress: r.formatted_address, components: r };
  }

  drawRoute(coords, options = {}) {
    const id = this._generateId();
    const line = new mappls.Polyline({
      map: this.map,
      path: coords.map(c => ({ lng: c.lng, lat: c.lat })),
      strokeColor: options.strokeColor ?? '#FF0000',
      strokeWeight: options.strokeWeight ?? 3,
      strokeOpacity: options.strokeOpacity ?? 1
    });
    this.polylines.set(id, line);
    return id;
  }

  async getDirections(origin, destination, options = {}) {
    // route_adv supports polyline/overview geometry
    const url =
      `https://apis.mapmyindia.com/advancedmaps/v1/${this.apiKey}` +
      `/route_adv/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
      `?geometries=polyline&overview=full`;

    const res = await fetch(url);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error('No route found');
    const coords = this._decodePolyline(route.geometry);
    const routeId = this.drawRoute(coords, options);
    return { routeId, duration: route.duration || 0, distance: route.distance || 0 };
  }

  _decodePolyline(encoded) {
    const pts = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;
      pts.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
    }
    return pts;
  }

  drawPolygon(coords, options = {}) {
    const id = this._generateId();
    const poly = new mappls.Polygon({
      map: this.map,
      path: coords.map(c => ({ lng: c.lng, lat: c.lat })),
      strokeColor: options.strokeColor ?? '#FF0000',
      strokeWeight: options.strokeWeight ?? 2,
      strokeOpacity: options.strokeOpacity ?? 0.8,
      fillColor: options.fillColor ?? '#FF0000',
      fillOpacity: options.fillOpacity ?? 0.35
    });
    this.polygons.set(id, poly);
    return id;
  }

  drawPolyline(coords, options = {}) {
    return this.drawRoute(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    const id = this._generateId();
    const circle = new mappls.Circle({
      map: this.map,
      center: { lng: center.lng, lat: center.lat },
      radius,
      strokeColor: options.strokeColor ?? '#FF0000',
      strokeWeight: options.strokeWeight ?? 2,
      strokeOpacity: options.strokeOpacity ?? 0.8,
      fillColor: options.fillColor ?? '#FF0000',
      fillOpacity: options.fillOpacity ?? 0.35
    });
    this.polygons.set(id, circle);
    return id;
  }

  drawRectangle(bounds, options = {}) {
    const id = this._generateId();
    const path = [
      { lng: bounds.southwest.lng, lat: bounds.southwest.lat },
      { lng: bounds.northeast.lng, lat: bounds.southwest.lat },
      { lng: bounds.northeast.lng, lat: bounds.northeast.lat },
      { lng: bounds.southwest.lng, lat: bounds.northeast.lat },
      { lng: bounds.southwest.lng, lat: bounds.southwest.lat }
    ];
    const rect = new mappls.Polygon({
      map: this.map,
      path,
      strokeColor: options.strokeColor ?? '#FF0000',
      strokeWeight: options.strokeWeight ?? 2,
      strokeOpacity: options.strokeOpacity ?? 0.8,
      fillColor: options.fillColor ?? '#FF0000',
      fillOpacity: options.fillOpacity ?? 0.35
    });
    this.polygons.set(id, rect);
    return id;
  }

  enableTrafficLayer() {
    // Traffic and styles depend on plan; out of scope to toggle here.
    console.info('Traffic layer availability depends on plan.');
  }
  disableTrafficLayer() {}

  addHeatMap(points, options = {}) {
    // Real Heat Map overlay (SDK supports it)
    // points: [{lng, lat, weight?}]
    const id = this._generateId();
    const heat = new mappls.HeatMap({
      map: this.map,
      data: points.map(p => ({ lng: p.lng, lat: p.lat, weight: p.weight ?? 1 })),
      radius: options.radius ?? 25,
      blur: options.blur ?? 15,
      maxZoom: options.maxZoom ?? 18
    });
    this.heatmaps.set(id, heat);
    return id;
  }

  addTileLayer() {
    console.info('Custom tile sources require appropriate plan; use Raster Source or style APIs if enabled.');
    return null;
  }

  removeLayer(layerId) {
    const layer = this.layers.get(layerId) || this.polylines.get(layerId) || this.polygons.get(layerId);
    if (!layer) return false;
    mappls.remove({ map: this.map, layer });
    this.layers.delete(layerId);
    this.polylines.delete(layerId);
    this.polygons.delete(layerId);
    return true;
  }

  trackUserLocation(callback, options = {}) {
    if (!navigator.geolocation) return null;
    return navigator.geolocation.watchPosition(
      pos => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      err => console.error('Geolocation error:', err),
      { enableHighAccuracy: !!options.enableHighAccuracy, timeout: options.timeout ?? 5000, maximumAge: options.maximumAge ?? 0 }
    );
  }

  getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        reject,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  indoorMaps() { console.info('Indoor maps depend on plan/features.'); }
  applyMapStyle() { console.info('Custom styles require style APIs / plan.'); }
  enable3D() { console.info('3D view depends on product tier.'); }

  on(event, callback) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event).push(callback);
  }
  off(event, callback) {
    const list = this.eventListeners.get(event);
    if (!list) return;
    const i = list.indexOf(callback);
    if (i > -1) list.splice(i, 1);
  }

  getBounds() {
    const b = this.map.getBounds(); // LngLatBounds
    // Mappls/Mapbox: use .lat / .lng properties (not .lat())
    const sw = b.getSouthWest(), ne = b.getNorthEast();
    return { southwest: { lat: sw.lat, lng: sw.lng }, northeast: { lat: ne.lat, lng: ne.lng } };
  }

  destroy() {
    // Remove overlays with the official helper
    for (const m of this.markers.values()) mappls.remove({ map: this.map, layer: m });
    for (const l of this.polylines.values()) mappls.remove({ map: this.map, layer: l });
    for (const p of this.polygons.values()) mappls.remove({ map: this.map, layer: p });
    for (const h of this.heatmaps.values()) mappls.remove({ map: this.map, layer: h });

    this.markers.clear(); this.polylines.clear(); this.polygons.clear(); this.heatmaps.clear(); this.layers.clear();

    if (this.map) {
      const el = this.getContainer();
      if (el) {
        while (el.firstChild) {
          el.removeChild(el.firstChild);
        }
      }
      this.map = null;
    }
  }
}