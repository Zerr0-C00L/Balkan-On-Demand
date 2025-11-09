# TMDB Mapping Workflow

## Quick Overview

Your addon now supports **two matching methods**:

1. **Title-based** (current): Searches by movie title + year
2. **TMDB ID-based** (new): Direct mapping using TMDB IDs

The TMDB ID-based approach is **more accurate** and works seamlessly with TMDB-based catalogs.

## Complete Workflow

```
┌─────────────────────────────────────────────────┐
│ Step 1: Configure TMDB API Key                 │
│ http://localhost:7005/configure → Settings     │
│ Enter key → Test → Save                         │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Step 2: Generate TMDB Mapping (One-time)       │
│ node scripts/create-tmdb-symlinks.js YOUR_KEY  │
│ Output: data/tmdb-id-mapping.json              │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Step 3: Addon Uses Both Methods                │
│                                                  │
│ When stream requested:                          │
│   1. Check TMDB mapping (fast, accurate)        │
│   2. Fallback to title search (if no mapping)   │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Result: Best of Both Worlds                     │
│ ✅ New content: title-based matching           │
│ ✅ Mapped content: TMDB ID matching            │
└─────────────────────────────────────────────────┘
```

## File Structure

```
Your Project/
├── configure/                    # React configuration app
│   └── src/
│       └── pages/
│           └── Settings.jsx     # TMDB API key configuration
│
├── data/
│   ├── baubau-content.json      # Original content database
│   └── tmdb-id-mapping.json     # Generated TMDB ID mapping ⭐
│
├── scripts/
│   └── create-tmdb-symlinks.js  # Mapping generator ⭐
│
├── addon.js                      # Main addon (supports both methods)
└── addon-tmdb-enhanced.js       # Experimental TMDB-only addon
```

## Step-by-Step Guide

### Step 1: Get TMDB API Key

**Via Configuration Page (Easiest):**

1. Start your addon:
   ```bash
   npm start
   ```

2. Open configuration:
   ```
   http://localhost:7005/configure
   ```

3. Go to **Settings** tab

4. Click the link to get API key:
   - https://www.themoviedb.org/signup
   - Settings → API → Request API Key
   - Choose "Developer"
   - Copy your **API Key (v3 auth)**

5. Enter key in Settings page

6. Click **Test Key** (should show ✅ API key is valid!)

7. Click **Save**

### Step 2: Generate TMDB Mapping

**Using your API key from Settings:**

```bash
# Copy your API key from the Settings page
# Then run:
node scripts/create-tmdb-symlinks.js YOUR_API_KEY_HERE

# Or set environment variable:
export TMDB_API_KEY="your_api_key_here"
npm run mapping:create
```

**What happens:**
```
🔍 Searching TMDB: Underground (1995)
✅ Found: Underground (123456)
✅ Mapped: Underground (1995) -> TMDB 123456

🔍 Searching TMDB: Maratonci trce pocasni krug (1982)
✅ Found: The Marathon Family (234567)
✅ Mapped: Maratonci trce pocasni krug (1982) -> TMDB 234567

...

✅ Complete!
   Movies mapped: 683
   Series mapped: 37
   Total processed: 720
   Skipped: 0

📁 Mapping saved to: data/tmdb-id-mapping.json
```

**Time:** ~20 minutes for 720 items (rate limited to 40 req/sec)

### Step 3: Use Your Addon

**No code changes needed!** Your existing addon automatically:

1. Loads `tmdb-id-mapping.json` on startup
2. Uses TMDB API key from configuration URL
3. Falls back to environment variable if not in config

**Start normally:**
```bash
npm start
```

**Console output:**
```
📊 Loaded TMDB mapping: 683 movies, 37 series mapped
🔑 TMDB API Key: ✅ Available from config/env
📚 Loaded Database: 683 movies, 37 series
```

### Step 4: Install in Stremio

**Via Configuration Page:**
1. Open http://localhost:7005/configure
2. Select catalogs in **Catalogs** tab
3. Click **Install Addon**

**The URL includes:**
- Selected catalogs
- TMDB API key (compressed in URL)
- All your settings

## How Stream Matching Works

### Before Mapping (Title-based Only)

```javascript
// User clicks movie "Underground" in TMDB addon
// Request: /stream/movie/tt0114787.json

// Your addon:
1. Searches database for title containing "underground"
2. Checks year matches (±1 year tolerance)
3. ❌ May fail due to:
   - Different transliterations
   - Regional title variations
   - Year discrepancies
```

### After Mapping (Hybrid Approach)

```javascript
// User clicks movie "Underground" in TMDB addon
// Request: /stream/movie/tmdb:123456.json

// Your addon:
1. Checks tmdb-id-mapping.json
2. ✅ Found: tmdbMapping.movies["123456"]
3. Returns stream URL instantly (<1ms)

// OR if IMDb ID:
// Request: /stream/movie/tt0114787.json

// Your addon:
1. Checks if mapped to TMDB ID (future feature)
2. Falls back to title-based search
3. Returns stream if found
```

## API Key Usage

### Configuration Page (Browser)
- **Stored:** localStorage (browser only)
- **Used for:** Testing key validity
- **Included in:** Addon configuration URL (compressed)

### Addon Server
- **Priority 1:** API key from configuration URL
- **Priority 2:** `TMDB_API_KEY` environment variable
- **Used for:** Fetching TMDB metadata at runtime

### Mapping Script
- **Required:** API key as command argument or env variable
- **Used for:** One-time generation of mapping file
- **Not needed after:** Mapping file is generated

## Updating the Mapping

When you add new content to `baubau-content.json`:

```bash
# Re-generate mapping (adds new items)
node scripts/create-tmdb-symlinks.js YOUR_API_KEY

# Restart addon to reload mapping
npm start
```

**Future improvement:** Auto-detect new content and update incrementally.

## Advantages of This Approach

### ✅ Accurate Matching
- TMDB IDs are unique and permanent
- No confusion with similar titles
- Works across all languages

### ⚡ Fast Performance
- Direct hash lookup: O(1)
- No API calls during streaming
- No fuzzy string matching needed

### 🔗 Compatibility
- Works with any TMDB-based catalog
- Works with TMDB addon
- Works with Cinemeta (IMDb IDs mapped to TMDB)

### 🔄 Backward Compatible
- Still supports title-based matching
- Existing functionality unchanged
- Gradual adoption possible

### 📊 Future-Proof
- TMDB is industry standard
- Easy to extend (IMDb ID mapping)
- Can add more metadata sources

## Troubleshooting

### No streams appearing

**Check 1:** Is mapping file loaded?
```bash
# Look for this in console on startup:
📊 Loaded TMDB mapping: 683 movies, 37 series mapped
```

**Check 2:** Is API key configured?
```bash
# Look for:
🔑 TMDB API Key: ✅ Available from config/env
```

**Check 3:** Verify mapping file exists
```bash
ls -lh data/tmdb-id-mapping.json
cat data/tmdb-id-mapping.json | head -20
```

### Mapping generation fails

**Issue:** API key not valid
```bash
# Test your key:
curl "https://api.themoviedb.org/3/configuration?api_key=YOUR_KEY"

# Should return JSON, not error
```

**Issue:** Rate limiting
- Normal: Script pauses every 40 requests
- Just wait, it will continue automatically

### Streams work but metadata is missing

**Cause:** API key not passed to addon

**Fix:**
- Use configuration page to install addon
- Or set `TMDB_API_KEY` environment variable on server

## Production Deployment

### Heroku

```bash
# Set TMDB API key
heroku config:set TMDB_API_KEY="your_key_here"

# Push code (includes mapping file)
git add data/tmdb-id-mapping.json
git commit -m "Add TMDB ID mapping"
git push heroku main
```

### Vercel

Add to `vercel.json`:
```json
{
  "env": {
    "TMDB_API_KEY": "@tmdb_api_key"
  }
}
```

Then set secret:
```bash
vercel secrets add tmdb_api_key YOUR_KEY
```

### Docker

```dockerfile
ENV TMDB_API_KEY=your_key_here
COPY data/tmdb-id-mapping.json /app/data/
```

## Summary

### What You Have Now

✅ **Configuration Page** - Easy TMDB API key setup  
✅ **Mapping Script** - Generates TMDB ID → Stream URL mapping  
✅ **Enhanced Addon** - Uses mapping for accurate stream matching  
✅ **Backward Compatible** - Still works with title-based search  
✅ **Production Ready** - Works on Heroku, Vercel, Docker

### What to Do

1. Configure API key in Settings (one-time)
2. Generate mapping (one-time, ~20 minutes)
3. Continue using your addon normally
4. Enjoy more accurate stream matching!

### Files to Commit

```bash
git add data/tmdb-id-mapping.json
git add scripts/create-tmdb-symlinks.js
git add addon-tmdb-enhanced.js
git add TMDB-MAPPING-WORKFLOW.md
git commit -m "Add TMDB ID mapping support"
```

---

**Questions?** Check:
- `QUICKSTART-SYMLINKS.md` - Quick start guide
- `SYMLINK-MANAGEMENT.md` - Detailed technical docs
- `TMDB-INTEGRATION.md` - TMDB integration overview
