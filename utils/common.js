export function validateCoordinates(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }
  
  export function throwIfMissing(paramName) {
    throw new Error(`Missing required parameter: ${paramName}`);
  }
  