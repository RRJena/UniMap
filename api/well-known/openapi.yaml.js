/**
 * Serve openapi.yaml for OpenAI Plugin
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function handler(req, res) {
  try {
    const filePath = join(__dirname, '..', '..', '.well-known', 'openapi.yaml');
    const content = readFileSync(filePath, 'utf-8');
    
    res.setHeader('Content-Type', 'text/yaml');
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

