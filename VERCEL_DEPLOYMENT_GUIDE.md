# 🚀 Vercel Deployment Guide - Step by Step

## ✅ Current Step (You are here)

**Prompt:** `? In which directory is your code located?`

**Answer:** Press `Enter` (or type `./` and press Enter)

---

## 📋 Next Steps After Pressing Enter

Vercel will ask a few more questions. Here's what to answer:

1. **"Override settings?"** → Press `Enter` (No)

2. **"Install dependencies?"** → Type `y` and press Enter (Yes)

3. **"Build command?"** → Press `Enter` (leave blank)

4. **"Output directory?"** → Press `Enter` (leave blank)

5. **"Development command?"** → Press `Enter` (leave blank)

---

## 🎉 After Deployment

Vercel will show you a URL like:
```
✅ Production: https://uni-map-xxxxx.vercel.app
```

**Save this URL!** You'll need it in the next steps.

---

## 🔧 Step 1: Update Configuration Files

After deployment, you need to update your domain in 2 files:

### A. Update `.well-known/ai-plugin.json`

```bash
# Replace "your-domain.com" with your Vercel URL
# Example: https://uni-map-xxxxx.vercel.app
```

Edit line 12:
```json
"url": "https://YOUR-VERCEL-URL.vercel.app/.well-known/openapi.yaml"
```

Edit line 15:
```json
"logo_url": "https://YOUR-VERCEL-URL.vercel.app/logo.png"
```

### B. Update `.well-known/openapi.yaml`

Edit line 7:
```yaml
- url: https://YOUR-VERCEL-URL.vercel.app/api
```

### C. Commit and Redeploy

```bash
git add .well-known/
git commit -m "Update OpenAI plugin URLs"
git push
vercel --prod
```

---

## 🧪 Step 2: Test Your Deployment

1. **Test manifest:**
   ```
   https://YOUR-VERCEL-URL.vercel.app/.well-known/ai-plugin.json
   ```

2. **Test OpenAPI spec:**
   ```
   https://YOUR-VERCEL-URL.vercel.app/.well-known/openapi.yaml
   ```

3. **Test health endpoint:**
   ```
   https://YOUR-VERCEL-URL.vercel.app/api/health
   ```

All should return valid responses!

---

## 🔌 Step 3: Install in ChatGPT

1. Open ChatGPT (ChatGPT Plus required)
2. Click your name → **Settings** → **Beta Features**
3. Enable **"Plugins"**
4. In the chat, click **"Plugins"** → **"Plugin Store"**
5. Click **"Develop your own plugin"**
6. Enter your domain: `https://YOUR-VERCEL-URL.vercel.app`
7. Click **"Find manifest file"**
8. If validation passes, click **"Install plugin"**

---

## ✅ Success!

Once installed, test with prompts like:

- "Create a map of Paris with the Eiffel Tower"
- "Show me a route from San Francisco to Los Angeles"
- "Generate a map of Tokyo with markers at Shibuya and Shinjuku"

---

## 🐛 Troubleshooting

**Issue:** "Plugin manifest not found"
- ✅ Check: `https://YOUR-VERCEL-URL.vercel.app/.well-known/ai-plugin.json`
- ✅ Ensure the file exists in `public/.well-known/` folder
- ✅ Redeploy if needed: `vercel --prod`

**Issue:** "OpenAPI spec not valid"
- ✅ Validate at: https://editor.swagger.io/
- ✅ Check the URL in `ai-plugin.json` matches your domain

**Issue:** "API endpoints not working"
- ✅ Test: `https://YOUR-VERCEL-URL.vercel.app/api/health`
- ✅ Check Vercel function logs in dashboard

---

## 📝 Quick Commands Reference

```bash
# Deploy to Vercel
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# Open dashboard
vercel open
```

---

**Current Status:** Waiting for you to answer the Vercel prompt!

**Next:** After deployment, come back here and update the configuration files with your Vercel URL.

