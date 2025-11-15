/**
 * Serve ai-plugin.json for OpenAI Plugin
 * Rate limiting handled by Express app in api/index.js
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple in-memory rate limiting (100 requests per 15 minutes per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100;
const MAX_MAP_SIZE = 10000; // Maximum entries to prevent unbounded growth
const CLEANUP_THRESHOLD = 0.8; // Clean up when map reaches 80% of max size
const CLEANUP_EVERY_N_REQUESTS = 50; // Run full cleanup every N requests (deterministic)

// Request counter for deterministic cleanup
let requestCount = 0;

function getRateLimitKey(req) {
  return req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || 'unknown';
}

/**
 * Clean up expired entries from the rate limit map
 * @param {boolean} forceFullCleanup - If true, clean all expired entries. If false, clean until under threshold.
 * @returns {number} Number of entries removed
 */
function cleanupRateLimitMap(forceFullCleanup = false) {
  const now = Date.now();
  let removed = 0;
  const targetSize = forceFullCleanup ? 0 : Math.floor(MAX_MAP_SIZE * CLEANUP_THRESHOLD);
  
  // Collect keys to delete (avoid modifying map during iteration)
  const keysToDelete = [];
  
  for (const [key, record] of rateLimitMap.entries()) {
    // Remove entries older than the rate limit window
    if (now - record.firstRequest > RATE_LIMIT_WINDOW) {
      keysToDelete.push(key);
      removed++;
    }
    
    // If not forcing full cleanup and we've cleaned enough, stop
    if (!forceFullCleanup && rateLimitMap.size - keysToDelete.length <= targetSize) {
      break;
    }
  }
  
  // Delete expired entries
  for (const key of keysToDelete) {
    rateLimitMap.delete(key);
  }
  
  // If map is still too large after cleaning expired entries, remove oldest entries
  if (rateLimitMap.size > MAX_MAP_SIZE) {
    const entries = Array.from(rateLimitMap.entries())
      .sort((a, b) => a[1].firstRequest - b[1].firstRequest);
    
    const toRemove = rateLimitMap.size - MAX_MAP_SIZE;
    for (let i = 0; i < toRemove; i++) {
      rateLimitMap.delete(entries[i][0]);
      removed++;
    }
  }
  
  return removed;
}

function checkRateLimit(req) {
  const key = getRateLimitKey(req);
  const now = Date.now();
  
  // Increment request counter for deterministic cleanup
  requestCount++;
  
  // Always clean up expired entry for current key first
  const currentRecord = rateLimitMap.get(key);
  if (currentRecord && now - currentRecord.firstRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.delete(key);
  }
  
  // Deterministic cleanup: run full cleanup every N requests OR when map exceeds threshold
  // This ensures cleanup happens reliably in serverless environments
  const shouldRunFullCleanup = 
    requestCount % CLEANUP_EVERY_N_REQUESTS === 0 || 
    rateLimitMap.size > MAX_MAP_SIZE * CLEANUP_THRESHOLD;
  
  if (shouldRunFullCleanup && rateLimitMap.size > 0) {
    cleanupRateLimitMap(false);
  }
  
  const record = rateLimitMap.get(key);

  // Handle expired entry (already deleted above, so create new one)
  if (!record) {
    // Prevent unbounded growth: if map is at max size, remove oldest entry before adding
    if (rateLimitMap.size >= MAX_MAP_SIZE) {
      // Find and remove oldest entry
      let oldestKey = null;
      let oldestTime = Infinity;
      
      for (const [mapKey, mapRecord] of rateLimitMap.entries()) {
        if (mapRecord.firstRequest < oldestTime) {
          oldestTime = mapRecord.firstRequest;
          oldestKey = mapKey;
        }
      }
      
      if (oldestKey) {
        rateLimitMap.delete(oldestKey);
      }
    }
    
    rateLimitMap.set(key, { firstRequest: now, count: 1 });
    return true;
  }

  // Check if rate limit exceeded
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  // Increment count
  record.count++;
  return true;
}

export default function handler(req, res) {
  try {
    // Rate limiting check
    if (!checkRateLimit(req)) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Retry-After', String(Math.ceil(RATE_LIMIT_WINDOW / 1000)));
      return res.status(429).json({ 
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.'
      });
    }

    const filePath = join(__dirname, '..', '..', '.well-known', 'ai-plugin.json');
    const content = readFileSync(filePath, 'utf-8');
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    res.status(200).send(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

