export class GoogleMapsAdapter {
    constructor(apiKey, containerId, options) {
      this.apiKey = apiKey;
      this.containerId = containerId;
      this.options = options;
      this.map = null;
    }
  
    async init() {
      await this.loadGoogleMapsScript();
      this.map = new google.maps.Map(document.getElementById(this.containerId), {
        center: this.options.center || { lat: 0, lng: 0 },
        zoom: this.options.zoom || 10,
        styles: this.options.styles || []
      });
    }
  
    loadGoogleMapsScript() {
      return new Promise((resolve, reject) => {
        if (window.google) return resolve();
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places`;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  
    addMarker({ lat, lng, label }) {
      return new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        label: label
      });
    }
  
    removeMarker(marker) {
      marker.setMap(null);
    }
  
    setCenter({ lat, lng }) {
      this.map.setCenter({ lat, lng });
    }
  
    getCenter() {
      const center = this.map.getCenter();
      return { lat: center.lat(), lng: center.lng() };
    }
  
    zoomIn() {
      this.map.setZoom(this.map.getZoom() + 1);
    }
  
    zoomOut() {
      this.map.setZoom(this.map.getZoom() - 1);
    }
  
    panTo({ lat, lng }) {
      this.map.panTo({ lat, lng });
    }
  
    geocode(address) {
      const geocoder = new google.maps.Geocoder();
      return new Promise((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK') resolve(results[0].geometry.location);
          else reject(status);
        });
      });
    }
  
    reverseGeocode(lat, lng) {
      const geocoder = new google.maps.Geocoder();
      return new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK') resolve(results[0].formatted_address);
          else reject(status);
        });
      });
    }
  
    drawRoute(coords) {
      const path = coords.map(coord => ({ lat: coord.lat, lng: coord.lng }));
      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
      });
      polyline.setMap(this.map);
    }
  
    drawPolygon(coords) {
      const polygon = new google.maps.Polygon({
        paths: coords.map(coord => ({ lat: coord.lat, lng: coord.lng })),
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35
      });
      polygon.setMap(this.map);
    }
  
    enableTrafficLayer() {
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
  
    addHeatMap(points) {
      const heatmapData = points.map(point => new google.maps.LatLng(point.lat, point.lng));
      const heatmap = new google.maps.visualization.HeatmapLayer({
        data: heatmapData
      });
      heatmap.setMap(this.map);
    }
  
    trackUserLocation(callback) {
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
          (position) => {
            callback({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => console.error(error)
        );
      } else {
        console.error('Geolocation not supported');
      }
    }
  
    indoorMaps(enable) {
      // Google maps supports indoor by default, no toggle needed
      console.info('Google Indoor maps are automatic');
    }
  
    applyMapStyle(style) {
      this.map.setOptions({ styles: style });
    }
  
    destroy() {
      document.getElementById(this.containerId).innerHTML = '';
    }
  }
  