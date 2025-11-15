/**
 * UniMap Complete - Unified Entry Point
 * This file combines both JavaScript API and Custom HTML Element features
 * 
 * Usage:
 * 
 * JavaScript API:
 * import { UniMap } from './unimap-complete.js';
 * const map = new UniMap({ provider: 'google', apiKey: '...', containerId: 'map' });
 * 
 * Custom HTML Element:
 * <unimap-map provider="google" api-key="..." center="40.7128,-74.0060" zoom="12"></unimap-map>
 * <script type="module" src="./build/unimap-complete.mini.js"></script>
 * 
 * Both features are available in a single import!
 */

// Import UniMap (JavaScript API)
import { UniMap } from './unimap.js';

// Import the custom element (registers automatically and makes UniMapElement available)
import './utils/unimap-element.js';
import { UniMapElement } from './utils/unimap-element.js';

// Export both for module usage
export { UniMap, UniMapElement };

// Make UniMap available globally for non-module usage
if (typeof window !== 'undefined') {
  window.UniMap = UniMap;
  window.UniMapElement = UniMapElement;
}

