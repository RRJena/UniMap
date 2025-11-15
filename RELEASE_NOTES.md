# Release v2.3.0 - Release Notes

## 🚀 Ready for Release

### Build Status
✅ All builds completed successfully:
- `unimap.mini.js` - 122.17 KB (JS API only)
- `unimap-element.mini.js` - 135.30 KB (Custom Element only)
- `unimap-complete.mini.js` - 135.47 KB (Both features - Recommended)

### Git Status
✅ Branch created: `release/v2.3.0`
✅ Committed and pushed to GitHub
✅ Ready for Pull Request

### Next Steps

#### 1. Create Pull Request on GitHub
Visit: https://github.com/RRJena/UniMap/pull/new/release/v2.3.0

**PR Title:** `Release v2.3.0: Custom HTML Element & Unified Build`

**PR Description:**
```markdown
## Release v2.3.0

### ✨ New Features
- Custom HTML Element (`<unimap-map>`) - Use maps without JavaScript
- Unified build (`unimap-complete.mini.js`) - Both JS API and Custom Element
- Secure API Key Handling - Config endpoint, global config, attribute-based
- Child Elements Support - Declarative markers, routes, shapes via HTML

### 🐛 Bug Fixes
- Critical: Added initialization checks to prevent errors before `init()`
- Fixed OSM adapter destroy method null reference errors
- Fixed race conditions in custom element initialization

### 🔧 Improvements
- Added initialization lock to prevent concurrent initializations
- Better input validation for all public methods
- Enhanced destroy method with null checks
- Production-ready code with proper error handling

### 📝 Documentation
- Updated README with security considerations
- Added version history and changelog
- Updated support links

### 📦 Build Files
- `unimap.mini.js` (122.17 KB) - JS API only
- `unimap-element.mini.js` (135.30 KB) - Custom Element only
- `unimap-complete.mini.js` (135.47 KB) - Both features (Recommended)
```

#### 2. After PR is Merged - Publish to npm

```bash
# Make sure you're on main/master branch after merge
git checkout main
git pull origin main

# Verify version in package.json is 2.3.0
cat package.json | grep version

# Run final build
npm run build:mini

# Publish to npm (this will run prepublishOnly script automatically)
npm publish

# Create and push git tag
git tag v2.3.0
git push origin v2.3.0
```

#### 3. Create GitHub Release

After publishing to npm, create a GitHub release:
1. Go to: https://github.com/RRJena/UniMap/releases/new
2. Tag: `v2.3.0`
3. Title: `v2.3.0 - Custom HTML Element & Unified Build`
4. Description: Copy from PR description above
5. Attach build files (optional):
   - `build/unimap.mini.js`
   - `build/unimap-element.mini.js`
   - `build/unimap-complete.mini.js`

### Files Changed
- ✅ `unimap.js` - Added initialization checks
- ✅ `unimap-element.js` - New entry point for custom element
- ✅ `unimap-complete.js` - New unified entry point
- ✅ `utils/unimap-element.js` - Custom HTML element implementation
- ✅ `adapters/OSMAdapter.js` - Fixed destroy method
- ✅ `build.js` - Added unified build configuration
- ✅ `package.json` - Updated version and files array
- ✅ `README.md` - Updated with new features and security info
- ✅ `examples/` - New example files

### Verification Checklist
- [x] Build completed successfully
- [x] All tests pass (if applicable)
- [x] Version updated in package.json
- [x] README updated
- [x] Changes committed
- [x] Branch pushed to GitHub
- [ ] PR created and reviewed
- [ ] PR merged to main
- [ ] Published to npm
- [ ] GitHub release created
- [ ] Tag pushed to GitHub

