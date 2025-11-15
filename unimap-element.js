/**
 * UniMap Custom Element Entry Point
 * This file imports both UniMap and the custom element
 * Use this when you want to use the <unimap> custom HTML element
 */

// Import UniMap (this will make it available globally)
import './unimap.js';

// Import the custom element (this registers it automatically)
import './utils/unimap-element.js';

// Export for module usage
export { UniMap } from './unimap.js';
export { UniMapElement } from './utils/unimap-element.js';

