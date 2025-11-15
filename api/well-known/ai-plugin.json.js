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

function getRateLimitKey(req) {
  return req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || 'unknown';
}

function checkRateLimit(req) {
  const key = getRateLimitKey(req);
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now - record.firstRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { firstRequest: now, count: 1 });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

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

