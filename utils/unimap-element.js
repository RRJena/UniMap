/**
 * UniMap Custom HTML Element
 * Allows using UniMap without writing any JavaScript code
 * 
 * Usage:
 * <unimap-map 
 *   provider="google" 
 *   api-key="YOUR_API_KEY"
 *   center="40.7128,-74.0060"
 *   zoom="12"
 *   width="100%"
 *   height="500px">
 *   <unimap-marker lat="40.7128" lng="-74.0060" title="New York"></unimap-marker>
 * </unimap-map>
 */

/* eslint-env browser */
/* global HTMLElement, CustomEvent, URL, MutationObserver, Node */

import { UniMap } from '../unimap.js';
import { SUPPORTED_PROVIDERS } from './constants.js';

/**
 * Parses a coordinate string "lat,lng" into {lat, lng} object
 * @param {string} coordString - Coordinate string in format "lat,lng"
 * @returns {Object|null} - Parsed coordinates or null
 */
function parseCoordinates(coordString) {
  if (!coordString) return null;
  const parts = coordString.split(',').map(s => s.trim());
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

/**
 * Parses a JSON string or returns the value as-is
 * @param {string} value - Value to parse
 * @returns {*} - Parsed value
 */
function parseAttributeValue(value) {
  if (!value) return null;
  // Try to parse as JSON
  try {
    return JSON.parse(value);
  } catch {
    // If not JSON, return as string
    return value;
  }
}

/**
 * Converts kebab-case to camelCase
 * @param {string} str - Kebab-case string
 * @returns {string} - CamelCase string
 */
function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}


/**
 * UniMap Custom Element
 */
export class UniMapElement extends HTMLElement {
  constructor() {
    super();
    this.unimapInstance = null;
    this.initialized = false;
    this.observer = null;
    this._initializing = false; // Flag to prevent concurrent initializations
  }

  /**
   * Observed attributes - these trigger attributeChangedCallback
   */
  static get observedAttributes() {
    return [
      'provider',
      'api-key',
      'config-endpoint',
      'center',
      'zoom',
      'width',
      'height',
      'map-id',
      'map-type',
      'disable-default-ui',
      'zoom-control',
      'map-type-control',
      'scale-control',
      'street-view-control',
      'rotate-control',
      'fullscreen-control',
      'styles',
      'enable-3d',
      'enable-traffic',
      'enable-indoor'
    ];
  }

  /**
   * Called when element is inserted into DOM
   */
  connectedCallback() {
    // Set default styles if not already set
    if (!this.style.width) {
      this.style.width = this.getAttribute('width') || '100%';
    }
    if (!this.style.height) {
      this.style.height = this.getAttribute('height') || '500px';
    }
    if (!this.style.display) {
      this.style.display = 'block';
    }

    // Generate unique ID if not provided
    if (!this.id) {
      this.id = `unimap-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    // Check if we have required attributes before initializing
    const provider = this.getAttribute('provider');
    if (provider) {
      // Only initialize if we have API key (or provider doesn't require it)
      const hasApiKey = this.getAttribute('api-key') || 
                       this.getAttribute('config-endpoint') ||
                       (typeof window !== 'undefined' && window.UniMapConfig);
      
      if (!this.requiresApiKey(provider) || hasApiKey) {
        // Initialize the map
        this.initMap();
      }
      // Otherwise wait for API key to be set via attribute or setApiKey()
    }

    // Observe child elements for changes
    this.observeChildren();
  }

  /**
   * Called when element is removed from DOM
   */
  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.unimapInstance) {
      this.unimapInstance.destroy();
    }
  }

  /**
   * Called when observed attributes change
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    // Update styles for width/height
    if (name === 'width') {
      this.style.width = newValue || '100%';
    }
    if (name === 'height') {
      this.style.height = newValue || '500px';
    }

    // Handle critical attributes (provider, api-key, config-endpoint)
    if (['provider', 'api-key', 'config-endpoint'].includes(name)) {
      // If map is already initialized, reinitialize with new values
      if (this.initialized) {
        this.initMap();
      } else {
        // If not initialized yet, check if we can initialize now
        const provider = this.getAttribute('provider');
        if (provider) {
          const hasApiKey = this.getAttribute('api-key') || 
                           this.getAttribute('config-endpoint') ||
                           (typeof window !== 'undefined' && window.UniMapConfig);
          
          if (!this.requiresApiKey(provider) || hasApiKey) {
            // We have all required attributes, initialize now
            this.initMap();
          }
        }
      }
    } else if (this.initialized && this.unimapInstance) {
      // Update map options for other attributes
      this.updateMapOptions(name, newValue);
    }
  }

  /**
   * Fetch API key securely from server endpoint
   * @param {string} endpoint - Config endpoint URL
   * @param {string} provider - Map provider name
   * @returns {Promise<string|null>} - API key or null
   */
  async fetchApiKeyFromEndpoint(endpoint, provider) {
    try {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set('provider', provider);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin' // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
      }

      const config = await response.json();
      
      // Support different response formats
      if (config.apiKey) return config.apiKey;
      if (config.api_key) return config.api_key;
      if (config[provider]) return config[provider];
      if (config[`${provider}ApiKey`]) return config[`${provider}ApiKey`];
      if (config[`${provider}_api_key`]) return config[`${provider}_api_key`];
      
      return null;
    } catch (error) {
      console.error('UniMap: Error fetching API key from endpoint:', error);
      return null;
    }
  }

  /**
   * Check if running in development/local environment
   * @returns {boolean} - True if in development
   */
  isDevelopment() {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname === '0.0.0.0' ||
           hostname.startsWith('192.168.') ||
           hostname.startsWith('10.') ||
           hostname.endsWith('.local');
  }

  /**
   * Get API key using secure methods (endpoint, global config, or attribute)
   * Priority order:
   * 1. config-endpoint (most secure - for production)
   * 2. Global config function (secure - for SSR)
   * 3. api-key attribute (development only - fallback)
   * 4. Provider-specific data attributes (development only - fallback)
   * 
   * @param {string} provider - Map provider name
   * @returns {Promise<string|undefined>} - API key
   */
  async getApiKey(provider) {
    const isDev = this.isDevelopment();

    // Priority 1: Fetch from config endpoint (MOST SECURE - Production recommended)
    const configEndpoint = this.getAttribute('config-endpoint');
    if (configEndpoint) {
      const apiKey = await this.fetchApiKeyFromEndpoint(configEndpoint, provider);
      if (apiKey) {
        if (isDev) {
          console.log('UniMap: Using secure config-endpoint method (recommended for production)');
        }
        return apiKey;
      }
      console.warn('UniMap: Config endpoint did not return API key, falling back to other methods');
    }

    // Priority 2: Use global config function (SECURE - For server-side rendering)
    if (typeof window !== 'undefined' && window.UniMapConfig) {
      const config = typeof window.UniMapConfig === 'function' 
        ? await window.UniMapConfig(provider)
        : window.UniMapConfig;
      
      if (config && config.apiKey) {
        if (isDev) {
          console.log('UniMap: Using global config function method');
        }
        return config.apiKey;
      }
      if (config && config[provider]) {
        if (isDev) {
          console.log('UniMap: Using global config function method');
        }
        return config[provider];
      }
    }

    // Priority 3: Use api-key attribute (DEVELOPMENT ONLY - Fallback for local development)
    const apiKeyAttr = this.getAttribute('api-key');
    if (apiKeyAttr) {
      if (isDev) {
        console.log('UniMap: Using api-key attribute (development mode - OK for localhost)');
      } else {
        console.warn('UniMap: ⚠️ Using api-key attribute in production is not secure!');
        console.warn('UniMap: Consider using config-endpoint="/api/map-config" instead.');
      }
      return apiKeyAttr;
    }

    // Priority 4: Check for provider-specific data attributes (DEVELOPMENT ONLY - Fallback)
    const providerKeyAttr = this.getAttribute(`data-${provider}-api-key`);
    if (providerKeyAttr) {
      if (isDev) {
        console.log('UniMap: Using provider-specific data attribute (development mode)');
      } else {
        console.warn('UniMap: ⚠️ Using data attribute for API key in production is not secure!');
      }
      return providerKeyAttr;
    }

    return undefined;
  }

  /**
   * Check if provider requires API key
   * @param {string} provider - Provider name
   * @returns {boolean} - True if API key is required
   */
  requiresApiKey(provider) {
    // OSM (OpenStreetMap) doesn't require an API key
    return provider !== 'osm';
  }

  /**
   * Initialize the UniMap instance
   */
  async initMap() {
    // Prevent multiple simultaneous initializations
    if (this._initializing) {
      return;
    }
    
    this._initializing = true;
    
    try {
      // Get required attributes
      const provider = this.getAttribute('provider');

      if (!provider) {
        const error = new Error('Provider attribute is required');
        this.dispatchEvent(new CustomEvent('unimap:error', {
          detail: { error },
          bubbles: true
        }));
        this._initializing = false;
        return;
      }

      if (!SUPPORTED_PROVIDERS.includes(provider)) {
        const error = new Error(`Unsupported provider: ${provider}`);
        this.dispatchEvent(new CustomEvent('unimap:error', {
          detail: { error },
          bubbles: true
        }));
        this._initializing = false;
        return;
      }

      // Get API key securely
      const apiKey = await this.getApiKey(provider);

      // Check if API key is required and missing
      if (this.requiresApiKey(provider)) {
        if (!apiKey || apiKey.trim() === '') {
          const errorMsg = `API key is required for ${provider} provider. Please provide an API key using api-key attribute, config-endpoint, or window.UniMapConfig.`;
          const error = new Error(errorMsg);
          this.dispatchEvent(new CustomEvent('unimap:error', {
            detail: { error },
            bubbles: true
          }));
          this._initializing = false;
          return;
        }
      }

      // Build options from attributes
      const options = this.buildOptionsFromAttributes();

      // Destroy existing instance if any (only if it was fully initialized)
      if (this.unimapInstance && this.initialized) {
        try {
          this.unimapInstance.destroy();
        } catch {
          // Silently handle destroy errors
        }
        this.unimapInstance = null;
        this.initialized = false;
      } else if (this.unimapInstance && !this.initialized) {
        // If instance exists but wasn't initialized, just clear the reference
        this.unimapInstance = null;
      }

      // Create new UniMap instance
      this.unimapInstance = new UniMap({
        provider,
        apiKey: apiKey || undefined,
        containerId: this.id,
        options
      });

      // Initialize the map
      await this.unimapInstance.init();
      this.initialized = true;

      // Process child elements
      this.processChildElements();

      // Dispatch custom event
      this.dispatchEvent(new CustomEvent('unimap:initialized', {
        detail: { unimap: this.unimapInstance },
        bubbles: true
      }));
    } catch (error) {
      this.initialized = false;
      this.unimapInstance = null;
      // Only log errors that aren't user-facing (like missing API key)
      if (!error.message || !error.message.includes('API key is required')) {
        console.error('UniMap: Initialization error:', error);
      }
      this.dispatchEvent(new CustomEvent('unimap:error', {
        detail: { error },
        bubbles: true
      }));
    } finally {
      this._initializing = false;
    }
  }

  /**
   * Build options object from element attributes
   */
  buildOptionsFromAttributes() {
    const options = {};

    // Parse center coordinates
    const centerAttr = this.getAttribute('center');
    if (centerAttr) {
      const center = parseCoordinates(centerAttr);
      if (center) {
        options.center = center;
      }
    }

    // Parse zoom
    const zoomAttr = this.getAttribute('zoom');
    if (zoomAttr) {
      const zoom = parseInt(zoomAttr, 10);
      if (!isNaN(zoom)) {
        options.zoom = zoom;
      }
    }

    // Parse map ID
    const mapId = this.getAttribute('map-id');
    if (mapId) {
      options.mapId = mapId;
    }

    // Parse map type
    const mapType = this.getAttribute('map-type');
    if (mapType) {
      options.mapTypeId = mapType;
    }

    // Parse boolean options
    const booleanOptions = {
      'disable-default-ui': 'disableDefaultUI',
      'zoom-control': 'zoomControl',
      'map-type-control': 'mapTypeControl',
      'scale-control': 'scaleControl',
      'street-view-control': 'streetViewControl',
      'rotate-control': 'rotateControl',
      'fullscreen-control': 'fullscreenControl'
    };

    for (const [attr, option] of Object.entries(booleanOptions)) {
      const value = this.getAttribute(attr);
      if (value !== null) {
        options[option] = value !== 'false' && value !== '0';
      }
    }

    // Parse styles (JSON)
    const stylesAttr = this.getAttribute('styles');
    if (stylesAttr) {
      try {
        options.styles = JSON.parse(stylesAttr);
      } catch {
        console.warn('UniMap: Invalid styles JSON:', stylesAttr);
      }
    }

    // Parse all data-* attributes as options
    Array.from(this.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        const optionName = kebabToCamel(attr.name.substring(5));
        const value = parseAttributeValue(attr.value);
        options[optionName] = value;
      }
    });

    return options;
  }

  /**
   * Update map options when attributes change
   */
  updateMapOptions(attributeName, newValue) {
    if (!this.unimapInstance) return;

    try {
      switch (attributeName) {
        case 'center': {
          const center = parseCoordinates(newValue);
          if (center) {
            this.unimapInstance.setCenter(center);
          }
          break;
        }
        case 'zoom': {
          const zoom = parseInt(newValue, 10);
          if (!isNaN(zoom)) {
            this.unimapInstance.setZoom(zoom);
          }
          break;
        }
        case 'enable-traffic':
          if (newValue !== 'false' && newValue !== '0') {
            this.unimapInstance.enableTrafficLayer();
          } else {
            this.unimapInstance.disableTrafficLayer();
          }
          break;
        case 'enable-3d':
          if (newValue !== 'false' && newValue !== '0') {
            this.unimapInstance.enable3D(true);
          } else {
            this.unimapInstance.enable3D(false);
          }
          break;
        case 'enable-indoor':
          if (newValue !== 'false' && newValue !== '0') {
            this.unimapInstance.indoorMaps(true);
          } else {
            this.unimapInstance.indoorMaps(false);
          }
          break;
      }
    } catch (error) {
      console.error(`UniMap: Error updating ${attributeName}:`, error);
    }
  }

  /**
   * Process child elements (markers, routes, etc.)
   */
  processChildElements() {
    if (!this.unimapInstance || !this.initialized) return;

    // Process markers
    const markers = this.querySelectorAll('unimap-marker');
    markers.forEach(markerEl => {
      this.processMarkerElement(markerEl);
    });

    // Process routes
    const routes = this.querySelectorAll('unimap-route');
    routes.forEach(routeEl => {
      this.processRouteElement(routeEl);
    });

    // Process polygons
    const polygons = this.querySelectorAll('unimap-polygon');
    polygons.forEach(polygonEl => {
      this.processPolygonElement(polygonEl);
    });

    // Process polylines
    const polylines = this.querySelectorAll('unimap-polyline');
    polylines.forEach(polylineEl => {
      this.processPolylineElement(polylineEl);
    });

    // Process circles
    const circles = this.querySelectorAll('unimap-circle');
    circles.forEach(circleEl => {
      this.processCircleElement(circleEl);
    });

    // Process rectangles
    const rectangles = this.querySelectorAll('unimap-rectangle');
    rectangles.forEach(rectangleEl => {
      this.processRectangleElement(rectangleEl);
    });
  }

  /**
   * Process a marker element
   */
  processMarkerElement(element) {
    const lat = parseFloat(element.getAttribute('lat'));
    const lng = parseFloat(element.getAttribute('lng'));

    if (isNaN(lat) || isNaN(lng)) {
      console.warn('UniMap: Marker missing valid lat/lng attributes');
      return;
    }

    const options = {
      lat,
      lng,
      title: element.getAttribute('title') || undefined,
      label: element.getAttribute('label') || undefined,
      icon: element.getAttribute('icon') || undefined,
      color: element.getAttribute('color') || undefined
    };

    // Check if it's a custom marker
    const html = element.innerHTML.trim();
    const iconUrl = element.getAttribute('icon-url');
    const iconSize = element.getAttribute('icon-size');

    if (html || iconUrl) {
      // Custom marker
      const customOptions = {
        lat,
        lng,
        html: html || undefined,
        iconUrl: iconUrl || undefined,
        iconSize: iconSize ? parseCoordinates(iconSize) : undefined,
        className: element.getAttribute('class-name') || undefined,
        title: options.title
      };
      this.unimapInstance.addCustomMarker(customOptions);
    } else {
      // Regular marker
      this.unimapInstance.addMarker(options);
    }

    // Handle click events
    const clickHandler = element.getAttribute('on-click');
    if (clickHandler) {
      // Store marker ID for click handler (simplified - would need to track IDs)
      // This is a basic implementation
    }
  }

  /**
   * Process a route element
   */
  processRouteElement(element) {
    const coordsAttr = element.getAttribute('coords');
    if (!coordsAttr) {
      console.warn('UniMap: Route missing coords attribute');
      return;
    }

    // Parse coordinates: "lat1,lng1;lat2,lng2;..."
    const coords = coordsAttr.split(';').map(coord => {
      return parseCoordinates(coord.trim());
    }).filter(coord => coord !== null);

    if (coords.length < 2) {
      console.warn('UniMap: Route needs at least 2 coordinates');
      return;
    }

    const options = {};
    const strokeColor = element.getAttribute('stroke-color');
    const strokeWeight = element.getAttribute('stroke-weight');
    const strokeOpacity = element.getAttribute('stroke-opacity');

    if (strokeColor) options.strokeColor = strokeColor;
    if (strokeWeight) options.strokeWeight = parseInt(strokeWeight, 10);
    if (strokeOpacity) options.strokeOpacity = parseFloat(strokeOpacity);

    this.unimapInstance.drawRoute(coords, options);
  }

  /**
   * Process a polygon element
   */
  processPolygonElement(element) {
    const coordsAttr = element.getAttribute('coords');
    if (!coordsAttr) {
      console.warn('UniMap: Polygon missing coords attribute');
      return;
    }

    const coords = coordsAttr.split(';').map(coord => {
      return parseCoordinates(coord.trim());
    }).filter(coord => coord !== null);

    if (coords.length < 3) {
      console.warn('UniMap: Polygon needs at least 3 coordinates');
      return;
    }

    const options = this.parseDrawingOptions(element);
    this.unimapInstance.drawPolygon(coords, options);
  }

  /**
   * Process a polyline element
   */
  processPolylineElement(element) {
    const coordsAttr = element.getAttribute('coords');
    if (!coordsAttr) {
      console.warn('UniMap: Polyline missing coords attribute');
      return;
    }

    const coords = coordsAttr.split(';').map(coord => {
      return parseCoordinates(coord.trim());
    }).filter(coord => coord !== null);

    if (coords.length < 2) {
      console.warn('UniMap: Polyline needs at least 2 coordinates');
      return;
    }

    const options = this.parseDrawingOptions(element);
    this.unimapInstance.drawPolyline(coords, options);
  }

  /**
   * Process a circle element
   */
  processCircleElement(element) {
    const centerAttr = element.getAttribute('center');
    const radiusAttr = element.getAttribute('radius');

    if (!centerAttr || !radiusAttr) {
      console.warn('UniMap: Circle missing center or radius attribute');
      return;
    }

    const center = parseCoordinates(centerAttr);
    const radius = parseFloat(radiusAttr);

    if (!center || isNaN(radius)) {
      console.warn('UniMap: Circle has invalid center or radius');
      return;
    }

    const options = this.parseDrawingOptions(element);
    this.unimapInstance.drawCircle(center, radius, options);
  }

  /**
   * Process a rectangle element
   */
  processRectangleElement(element) {
    const boundsAttr = element.getAttribute('bounds');
    if (!boundsAttr) {
      console.warn('UniMap: Rectangle missing bounds attribute');
      return;
    }

    // Parse bounds: "southwest_lat,southwest_lng;northeast_lat,northeast_lng"
    const parts = boundsAttr.split(';');
    if (parts.length !== 2) {
      console.warn('UniMap: Rectangle bounds must have 2 coordinates');
      return;
    }

    const southwest = parseCoordinates(parts[0]);
    const northeast = parseCoordinates(parts[1]);

    if (!southwest || !northeast) {
      console.warn('UniMap: Rectangle has invalid bounds');
      return;
    }

    const options = this.parseDrawingOptions(element);
    this.unimapInstance.drawRectangle({ southwest, northeast }, options);
  }

  /**
   * Parse drawing options from element attributes
   */
  parseDrawingOptions(element) {
    const options = {};

    const strokeColor = element.getAttribute('stroke-color');
    const strokeWeight = element.getAttribute('stroke-weight');
    const strokeOpacity = element.getAttribute('stroke-opacity');
    const fillColor = element.getAttribute('fill-color');
    const fillOpacity = element.getAttribute('fill-opacity');

    if (strokeColor) options.strokeColor = strokeColor;
    if (strokeWeight) options.strokeWeight = parseInt(strokeWeight, 10);
    if (strokeOpacity) options.strokeOpacity = parseFloat(strokeOpacity);
    if (fillColor) options.fillColor = fillColor;
    if (fillOpacity) options.fillOpacity = parseFloat(fillOpacity);

    return options;
  }

  /**
   * Observe child elements for changes
   */
  observeChildren() {
    if (!window.MutationObserver) return;

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && this.initialized) {
          // Process newly added elements
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const tagName = node.tagName?.toLowerCase();
              if (tagName?.startsWith('unimap-')) {
                // Small delay to ensure element is fully added to DOM
                setTimeout(() => {
                  this.processChildElement(node);
                }, 10);
              }
            }
          });
        }
      });
    });

    this.observer.observe(this, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Process a single child element based on its tag name
   */
  processChildElement(element) {
    const tagName = element.tagName?.toLowerCase();
    switch (tagName) {
      case 'unimap-marker':
        this.processMarkerElement(element);
        break;
      case 'unimap-route':
        this.processRouteElement(element);
        break;
      case 'unimap-polygon':
        this.processPolygonElement(element);
        break;
      case 'unimap-polyline':
        this.processPolylineElement(element);
        break;
      case 'unimap-circle':
        this.processCircleElement(element);
        break;
      case 'unimap-rectangle':
        this.processRectangleElement(element);
        break;
    }
  }

  /**
   * Get the UniMap instance (for programmatic access)
   */
  getUniMap() {
    return this.unimapInstance;
  }

  /**
   * Set API key programmatically (for secure key injection)
   * @param {string} apiKey - API key to set
   * @param {boolean} reinit - Whether to reinitialize the map
   */
  setApiKey(apiKey, reinit = true) {
    if (!apiKey || apiKey.trim() === '') {
      return;
    }
    
    this.setAttribute('api-key', apiKey);
    // If reinit is requested, trigger initialization
    // Use setTimeout to ensure attribute is set first and avoid race conditions
    if (reinit) {
      setTimeout(() => {
        const provider = this.getAttribute('provider');
        if (provider) {
          // Check if we can initialize (either no API key required, or we have one)
          if (!this.requiresApiKey(provider) || (apiKey && apiKey.trim() !== '')) {
            this.initMap();
          }
        }
      }, 10);
    }
  }

  /**
   * Set config endpoint programmatically
   * @param {string} endpoint - Config endpoint URL
   * @param {boolean} reinit - Whether to reinitialize the map
   */
  setConfigEndpoint(endpoint, reinit = true) {
    if (!endpoint || endpoint.trim() === '') {
      return;
    }
    
    this.setAttribute('config-endpoint', endpoint);
    // If reinit is requested, trigger initialization
    // Use setTimeout to ensure attribute is set first and avoid race conditions
    if (reinit) {
      setTimeout(() => {
        const provider = this.getAttribute('provider');
        if (provider) {
          // Config endpoint means we'll fetch API key, so we can initialize
          this.initMap();
        }
      }, 10);
    }
  }
}

// Register the custom element
// Note: Custom element names MUST contain a hyphen per Web Components specification
// Using 'unimap-map' as the element name (required by spec)
if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('unimap-map')) {
    window.customElements.define('unimap-map', UniMapElement);
  }
}

// Also register child elements as custom elements (for better HTML validation)
class UniMapMarkerElement extends HTMLElement {
  static get observedAttributes() {
    return ['lat', 'lng', 'title', 'label', 'icon', 'color', 'icon-url', 'icon-size', 'class-name'];
  }
}

class UniMapRouteElement extends HTMLElement {
  static get observedAttributes() {
    return ['coords', 'stroke-color', 'stroke-weight', 'stroke-opacity'];
  }
}

class UniMapPolygonElement extends HTMLElement {
  static get observedAttributes() {
    return ['coords', 'stroke-color', 'stroke-weight', 'stroke-opacity', 'fill-color', 'fill-opacity'];
  }
}

class UniMapPolylineElement extends HTMLElement {
  static get observedAttributes() {
    return ['coords', 'stroke-color', 'stroke-weight', 'stroke-opacity'];
  }
}

class UniMapCircleElement extends HTMLElement {
  static get observedAttributes() {
    return ['center', 'radius', 'stroke-color', 'stroke-weight', 'stroke-opacity', 'fill-color', 'fill-opacity'];
  }
}

class UniMapRectangleElement extends HTMLElement {
  static get observedAttributes() {
    return ['bounds', 'stroke-color', 'stroke-weight', 'stroke-opacity', 'fill-color', 'fill-opacity'];
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!window.customElements.get('unimap-marker')) {
    window.customElements.define('unimap-marker', UniMapMarkerElement);
  }
  if (!window.customElements.get('unimap-route')) {
    window.customElements.define('unimap-route', UniMapRouteElement);
  }
  if (!window.customElements.get('unimap-polygon')) {
    window.customElements.define('unimap-polygon', UniMapPolygonElement);
  }
  if (!window.customElements.get('unimap-polyline')) {
    window.customElements.define('unimap-polyline', UniMapPolylineElement);
  }
  if (!window.customElements.get('unimap-circle')) {
    window.customElements.define('unimap-circle', UniMapCircleElement);
  }
  if (!window.customElements.get('unimap-rectangle')) {
    window.customElements.define('unimap-rectangle', UniMapRectangleElement);
  }
}

