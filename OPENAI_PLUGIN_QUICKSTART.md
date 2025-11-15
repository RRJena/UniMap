# 🚀 OpenAI Plugin Quick Start Guide

## ⚡ 3-Step Setup (15 minutes)

### Step 1: Update Configuration Files

1. Edit `.well-known/ai-plugin.json`:
   ```json
   {
     "api": {
       "url": "https://YOUR-DOMAIN.com/.well-known/openapi.yaml"
     },
     "logo_url": "https://YOUR-DOMAIN.com/logo.png",
     "contact_email": "your-email@example.com"
   }
   ```
   Replace `YOUR-DOMAIN.com` with your actual domain.

2. Edit `.well-known/openapi.yaml`:
   ```yaml
   servers:
     - url: https://YOUR-DOMAIN.com/api
   ```
   Replace `YOUR-DOMAIN.com` with your actual domain.

### Step 2: Deploy Server

**Option A: Vercel (Easiest - 5 minutes)**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Install Express (if not already)
npm install express

# 3. Deploy
vercel

# You'll get a URL like: https://unimap-plugin.vercel.app
# Use this URL in Step 1 above
```

**Option B: Netlify**

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Deploy
netlify deploy --prod
```

**Option C: Render (Free Node.js hosting)**

1. Go to https://render.com
2. Create new Web Service
3. Connect your GitHub repo
4. Set build command: `npm install`
5. Set start command: `node examples/openai-plugin-server.js`
6. Deploy!

### Step 3: Install in ChatGPT

1. Open ChatGPT (ChatGPT Plus required)
2. Click your name → Settings → Beta Features
3. Enable "Plugins"
4. In chat, click "Plugins" → "Plugin Store"
5. Click "Develop your own plugin"
6. Enter your domain: `https://YOUR-DOMAIN.com`
7. Click "Find manifest file"
8. If valid, click "Install plugin"

## ✅ Test It!

Once installed, try:

```
"Create a map of Paris with the Eiffel Tower marked"
"Show me a route from San Francisco to Los Angeles"
"Generate a map of Tokyo with markers at Shibuya and Shinjuku"
```

## 📝 Files Created

- `.well-known/ai-plugin.json` - Plugin manifest
- `.well-known/openapi.yaml` - API specification
- `examples/openai-plugin-server.js` - Server implementation
- `docs/OPENAI_PLUGIN_SETUP.md` - Detailed guide

## 🔧 Development Mode

Test locally first:

```bash
# Install dependencies
npm install express

# Run server
node examples/openai-plugin-server.js

# Server runs on http://localhost:3000
# Test: http://localhost:3000/.well-known/ai-plugin.json
```

**Note**: For OpenAI plugin, you need HTTPS. Use local tunnel:

```bash
npm install -g localtunnel
lt --port 3000
# Use the generated HTTPS URL
```

## 🎯 What Happens Next?

Once installed:
- ChatGPT can create maps for users
- ChatGPT can add markers, routes, shapes
- ChatGPT can geocode addresses
- ChatGPT returns embeddable HTML code

## 📚 Need More Help?

See `docs/OPENAI_PLUGIN_SETUP.md` for:
- Full implementation details
- Error handling
- Production deployment
- Security considerations

## 🎉 You're Done!

Your UniMap plugin is now available in ChatGPT! Users can ask for maps and ChatGPT will use your plugin to generate them.

