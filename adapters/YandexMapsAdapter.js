import { BaseAdapter } from './BaseAdapter.js';

export class YandexMapsAdapter extends BaseAdapter {
  constructor(apiKey, containerId, options = {}) {
    super(apiKey, containerId, options);
    this.eventListeners = new Map();
    this.placemarks = [];
  }

  async init() {
    await this.loadYandexMapsScript();

    const mapElement = this.getContainer();
    if (!mapElement) {
      throw new Error(`Container element with ID '${this.containerId}' not found.`);
    }

    this.map = new ymaps.Map(this.containerId, {
      center: [this.options.center?.lat || 0, this.options.center?.lng || 0],
      zoom: this.options.zoom || 10
    });
  }

  loadYandexMapsScript() {
    return new Promise((resolve, reject) => {
      if (window.ymaps && window.ymaps.Map) {
        return ymaps.ready(resolve);
      }

      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${this.apiKey}&lang=en_US`;
      script.async = true;
      script.onload = () => ymaps.ready(resolve);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  addMarker(options) {
    const markerId = this._generateId();
    
    const placemark = new ymaps.Placemark(
      [options.lat, options.lng],
      {
        balloonContent: options.title || '',
        iconCaption: options.label || ''
      },
      {
        preset: 'islands#redDotIcon',
        draggable: options.draggable || false
      }
    );

    this.map.geoObjects.add(placemark);
    this.placemarks.push(placemark);
    this.markers.set(markerId, placemark);
    
    return markerId;
  }

  addCustomMarker(options) {
    if (!options || typeof options.lat !== 'number' || typeof options.lng !== 'number') {
      throw new Error('addCustomMarker requires options with numeric lat and lng properties');
    }

    const markerId = this._generateId();
    
    let placemark;
    if (options.html) {
      // Custom HTML marker using iconContent
      placemark = new ymaps.Placemark(
        [options.lat, options.lng],
        {
          balloonContent: options.title || '',
          iconContent: options.html
        },
        {
          preset: 'islands#blackStretchyIcon',
          draggable: options.draggable || false
        }
      );
    } else if (options.iconUrl) {
      // Custom icon
      placemark = new ymaps.Placemark(
        [options.lat, options.lng],
        {
          balloonContent: options.title || '',
          iconCaption: options.label || ''
        },
        {
          iconLayout: 'default#image',
          iconImageHref: options.iconUrl,
          iconImageSize: options.iconSize ? [options.iconSize.width || 32, options.iconSize.height || 32] : [32, 32],
          iconImageOffset: options.iconAnchor ? [-options.iconAnchor.x || -16, -options.iconAnchor.y || -16] : [-16, -16],
          draggable: options.draggable || false
        }
      );
    } else {
      placemark = new ymaps.Placemark(
        [options.lat, options.lng],
        {
          balloonContent: options.title || '',
          iconCaption: options.label || ''
        },
        {
          preset: 'islands#redDotIcon',
          draggable: options.draggable || false
        }
      );
    }

    this.map.geoObjects.add(placemark);
    if (!this.placemarks) {
      this.placemarks = [];
    }
    this.placemarks.push(placemark);
    this.markers.set(markerId, placemark);
    
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
      const coords = marker.geometry.getCoordinates();
      const data = { lat: coords[0], lng: coords[1], markerId, event: e };
      
      if (callback) {
        callback(data);
      }

      if (options.popupHtml) {
        marker.balloon.open(coords, {
          contentBody: options.popupHtml
        });
      }

      if (options.toast || options.toastMessage) {
        this._showToast(options.toastMessage || 'Marker clicked', options.toastDuration || 3000);
      }
    };

    if (!this.markerClickHandlers) {
      this.markerClickHandlers = new Map();
    }
    this.markerClickHandlers.set(markerId, clickHandler);

    marker.events.add('click', clickHandler);
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
      this.map.geoObjects.remove(marker);
      this.markers.delete(markerId);
      if (this.markerClickHandlers) {
        marker.events.remove('click', this.markerClickHandlers.get(markerId));
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
        console.error('Invalid position for Yandex Maps marker update:', options.position);
        return false;
      }
      
      try {
        // Yandex Maps uses [lat, lng] coordinate order
        marker.geometry.setCoordinates([lat, lng]);
      } catch (error) {
        console.error('Failed to update marker position:', error.message);
        return false;
      }
    }
    
    if (options.title !== undefined) {
      try {
        marker.properties.set('balloonContent', options.title);
      } catch (error) {
        console.error('Failed to update marker properties:', error.message);
      }
    }
    
    return true;
  }

  setCenter(coords) {
    if (this._validateCoordinates(coords.lat, coords.lng)) {
      this.map.setCenter([coords.lat, coords.lng]);
    }
  }

  getCenter() {
    const center = this.map.getCenter();
    return { lat: center[0], lng: center[1] };
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
      this.map.panTo([coords.lat, coords.lng]);
    }
  }

  fitBounds(bounds) {
    this.map.setBounds([
      [bounds.southwest.lat, bounds.southwest.lng],
      [bounds.northeast.lat, bounds.northeast.lng]
    ]);
  }

  async geocode(address) {
    if (!address || typeof address !== 'string' || address.trim() === '') {
      return Promise.reject(new Error('Address must be a non-empty string'));
    }

    // Try JavaScript API first, fallback to REST API
    try {
      if (window.ymaps && window.ymaps.geocode) {
        const res = await ymaps.geocode(address.trim(), { results: 1 });
        const firstGeoObject = res.geoObjects.get(0);
        if (firstGeoObject) {
          const coords = firstGeoObject.geometry.getCoordinates();
          return {
            lat: coords[0],
            lng: coords[1],
            formattedAddress: firstGeoObject.getAddressLine()
          };
        }
      }
    } catch {
      // Fall through to REST API
    }

    // Fallback to REST API
    try {
      const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${this.apiKey}&geocode=${encodeURIComponent(address.trim())}&format=json&results=1`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 403) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`HTTP 403 Forbidden - API key may be invalid or missing geocoding permissions. ${errorText ? `Details: ${errorText}` : 'Please check your Yandex Maps API key configuration.'}`);
        }
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const data = await response.json();
      const geoObjects = data?.response?.GeoObjectCollection?.featureMember;
      
      if (geoObjects && geoObjects.length > 0) {
        const geoObject = geoObjects[0].GeoObject;
        const pos = geoObject.Point.pos.split(' ');
        return {
          lat: parseFloat(pos[1]),
          lng: parseFloat(pos[0]),
          formattedAddress: geoObject.metaDataProperty?.GeocoderMetaData?.text || geoObject.name || address
        };
      }
      
      throw new Error('No results found');
    } catch (error) {
      const message = error && error.message ? error.message : 'Unknown geocoding error';
      throw new Error(`Geocoding failed: ${message}`);
    }
  }

  async reverseGeocode(lat, lng) {
    if (!this._validateCoordinates(lat, lng)) {
      return Promise.reject(new Error('Invalid coordinates'));
    }

    // Try JavaScript API first, fallback to REST API
    try {
      if (window.ymaps && window.ymaps.geocode) {
        const res = await ymaps.geocode([lat, lng], { results: 1 });
        const firstGeoObject = res.geoObjects.get(0);
        if (firstGeoObject) {
          return {
            formattedAddress: firstGeoObject.getAddressLine(),
            components: {}
          };
        }
      }
    } catch {
      // Fall through to REST API
    }

    // Fallback to REST API
    try {
      const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${this.apiKey}&geocode=${lng},${lat}&format=json&results=1`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 403) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`HTTP 403 Forbidden - API key may be invalid or missing geocoding permissions. ${errorText ? `Details: ${errorText}` : 'Please check your Yandex Maps API key configuration.'}`);
        }
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const data = await response.json();
      const geoObjects = data?.response?.GeoObjectCollection?.featureMember;
      
      if (geoObjects && geoObjects.length > 0) {
        const geoObject = geoObjects[0].GeoObject;
        return {
          formattedAddress: geoObject.metaDataProperty?.GeocoderMetaData?.text || geoObject.name || `${lat},${lng}`,
          components: {}
        };
      }
      
      throw new Error('No results found');
    } catch (error) {
      const message = error && error.message ? error.message : 'Unknown reverse geocoding error';
      throw new Error(`Reverse geocoding failed: ${message}`);
    }
  }

  drawRoute(coords, options = {}) {
    const routeId = this._generateId();
    
    const polyline = new ymaps.Polyline(
      coords.map(c => [c.lat, c.lng]),
      {},
      {
        strokeColor: options.strokeColor || '#FF0000',
        strokeWidth: options.strokeWeight || 3,
        strokeOpacity: options.strokeOpacity || 1
      }
    );

    this.map.geoObjects.add(polyline);
    this.polylines.set(routeId, polyline);
    
    return routeId;
  }

  async getDirections(origin, destination, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this._validateCoordinates(origin.lat, origin.lng) ||
        !this._validateCoordinates(destination.lat, destination.lng)) {
        return reject(new Error('Invalid origin or destination coordinates'));
      }

      try {
        const multiRoute = new ymaps.multiRouter.MultiRoute({
          referencePoints: [
            [origin.lat, origin.lng],
            [destination.lat, destination.lng]
          ],
          params: {
            routingMode: options.travelMode === 'walking' ? 'pedestrian' : 'auto'
          }
        }, {
          boundsAutoApply: true
        });

        multiRoute.model.events.add('requestsuccess', () => {
          const routes = multiRoute.getRoutes();
          if (routes && routes.getLength() > 0) {
            const route = routes.get(0);
            const coordinates = [];
            
            route.getPaths().each((path) => {
              path.getSegments().each((segment) => {
                const coords = segment.getCoordinates();
                coords.forEach(coord => coordinates.push({ lat: coord[0], lng: coord[1] }));
              });
            });

            if (coordinates.length > 0) {
              const routeId = this.drawRoute(coordinates, options);
              resolve({
                routeId,
                duration: route.properties.get('duration').value || 0,
                distance: route.properties.get('distance').value || 0
              });
            } else {
              reject(new Error('No route path found'));
            }
          } else {
            reject(new Error('No routes found'));
          }
        });

        multiRoute.model.events.add('requesterror', (event) => {
          const error = event.get('error');
          const message = error && error.message ? error.message : 'Unknown routing error';
          reject(new Error(`Directions failed: ${message}`));
        });

        this.map.geoObjects.add(multiRoute);
      } catch (error) {
        reject(new Error(`Directions failed: ${error.message || 'Unknown error'}`));
      }
    });
  }

  drawPolygon(coords, options = {}) {
    const polygonId = this._generateId();
    
    const polygon = new ymaps.Polygon(
      [coords.map(c => [c.lat, c.lng])],
      {},
      {
        fillColor: options.fillColor || '#FF0000',
        strokeColor: options.strokeColor || '#FF0000',
        strokeWidth: options.strokeWeight || 2,
        fillOpacity: options.fillOpacity || 0.35,
        strokeOpacity: options.strokeOpacity || 0.8
      }
    );

    this.map.geoObjects.add(polygon);
    this.polygons.set(polygonId, polygon);
    
    return polygonId;
  }

  drawPolyline(coords, options = {}) {
    return this.drawRoute(coords, options);
  }

  drawCircle(center, radius, options = {}) {
    // Yandex doesn't have built-in circle, use polygon approximation
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
    this.map.layers.add(new ymaps.LayerGroup([
      new ymaps.layer.TrafficLayer({
        realtime: true
      })
    ]));
  }

  disableTrafficLayer() {
    this.map.layers.each((layer) => {
      if (layer instanceof ymaps.layer.TrafficLayer) {
        this.map.layers.remove(layer);
      }
    });
  }

  addHeatMap(points, options = {}) {
    // Simplified heatmap using circles
    const heatmapId = this._generateId();
    const objectManager = new ymaps.ObjectManager({
      clusterize: false,
      gridSize: 32
    });

    const features = points.map(point => ({
      type: 'Feature',
      id: this._generateId(),
      geometry: {
        type: 'Point',
        coordinates: [point.lat, point.lng]
      },
      properties: {
        hintContent: point.title || ''
      }
    }));

    objectManager.add(features);
    this.map.geoObjects.add(objectManager);
    this.heatmaps.set(heatmapId, objectManager);
    
    return heatmapId;
  }

  addTileLayer(url, options = {}) {
    const layerId = this._generateId();
    const layer = new ymaps.Layer(url);
    this.map.layers.add(layer);
    this.layers.set(layerId, layer);
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
      return navigator.geolocation.watchPosition(
        (position) => {
          callback({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
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
    console.info('Indoor maps support varies by location in Yandex Maps');
  }

  applyMapStyle(style) {
    if (typeof style === 'string') {
      // Yandex map types: 'yandex#map', 'yandex#satellite', 'yandex#hybrid'
      const type = style === 'satellite' ? 'yandex#satellite' : 
                   style === 'hybrid' ? 'yandex#hybrid' : 'yandex#map';
      this.map.setType(type);
    }
  }

  enable3D(enable) {
    if (enable) {
      this.map.behaviors.enable('altShiftDragRotate');
    } else {
      this.map.behaviors.disable('altShiftDragRotate');
    }
  }

  on(event, callback) {
    this.map.events.add(event, callback);
  }

  off(event, callback) {
    this.map.events.remove(event, callback);
  }

  getBounds() {
    const bounds = this.map.getBounds();
    return {
      southwest: { lat: bounds[0][0], lng: bounds[0][1] },
      northeast: { lat: bounds[1][0], lng: bounds[1][1] }
    };
  }

  destroy() {
    if (this.map) {
      this.map.geoObjects.removeAll();
      this.map.destroy();
    }
    this.markers.clear();
    this.polylines.clear();
    this.polygons.clear();
    this.heatmaps.clear();
    this.layers.clear();
    this.placemarks = [];
    this.map = null;
  }
}
