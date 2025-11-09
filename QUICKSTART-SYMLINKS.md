# Quick Start: TMDB Symlink Integration

## What This Solves

Your Balkan content has **TMDB poster URLs** but no **TMDB ID mapping** for streams. This means:
- ❌ Title-based matching is unreliable (transliterations, regional names)
- ❌ TMDB catalogs can't find your streams
- ❌ Users must use your specific catalog to discover content

**Solution:** Create a TMDB ID → Stream URL mapping file that enables:
- ✅ Accurate stream matching by unique TMDB IDs
- ✅ Works with any TMDB-based catalog
- ✅ Fast O(1) lookups (no API calls during streaming)
- ✅ Optional filesystem symlinks for Plex/Jellyfin

## Installation (2 Steps)

### 1. Configure TMDB API Key in Settings

The TMDB API key is configured through your addon's web interface:

```bash
# Start your addon (if not already running)
npm start

# Open configuration page
open http://localhost:7005/configure
```

**In the configuration page:**
1. Click "Settings" in the navigation
2. Enter your TMDB API key in the "🎬 TMDB API Key" field
3. Click "Test Key" to verify it works
4. Click "Save"

**Get your TMDB API key (free, 5 minutes):**
- Go to: https://www.themoviedb.org/signup
- After signup: Settings → API → Request API Key
- Choose "Developer" and fill out the form
- Copy your API v3 key

### 2. Generate TMDB Mapping (One-time, ~20 minutes)

**Using the API key from your Settings page:**

```bash
# Run with API key as argument (copy from Settings page)
npm run mapping:create YOUR_TMDB_API_KEY_HERE

# Or set as environment variable
export TMDB_API_KEY="your_api_key_here"
npm run mapping:create

# Or with manual command:
node scripts/create-tmdb-symlinks.js YOUR_API_KEY
```

**What happens:**
- Reads your `data/baubau-content.json`
- Searches TMDB for each movie/series
- Creates `data/tmdb-id-mapping.json` with TMDB ID → Stream URL mappings
- Console shows progress: `✅ Mapped: Underground (1995) -> TMDB 1966`

### 3. Use Your Addon with TMDB Integration

**Option A: Standard addon (recommended)**

Your existing addon automatically uses TMDB IDs when the mapping file exists:

```bash
# Start your regular addon
npm start
```

The addon will:
- Load the TMDB mapping file
- Use your TMDB API key from the configuration page
- Provide streams for TMDB IDs automatically

**Option B: TMDB-enhanced addon (experimental)**

For testing the dedicated TMDB ID-based addon:

```bash
# Start enhanced addon on port 7007
npm run start:enhanced
```

**Install in Stremio:**
```
# Regular addon (with mapping support)
http://localhost:7005/YOUR_CONFIG/manifest.json

# Or TMDB-enhanced addon
http://localhost:7007/YOUR_CONFIG/manifest.json
```

## Verification

### Check Mapping File

```bash
# Verify mapping was created
ls -lh data/tmdb-id-mapping.json

# Check movie count
npm run mapping:verify | grep -c '"title"'

# View sample
cat data/tmdb-id-mapping.json | jq '.movies | to_entries | .[0]'
```

**Expected output:**
```json
{
  "key": "123456",
  "value": {
    "title": "Underground",
    "year": 1995,
    "originalId": "bilosta:aHR0cHM6...",
    "streams": [
      "https://content.bilosta.org/SERCRT721/FILMOVI/exyu/Underground.mp4"
    ]
  }
}
```

### Test Streams

```bash
# Test movie stream endpoint
curl "http://localhost:7007/stream/movie/tmdb:123456.json"

# Should return:
{
  "streams": [
    {
      "name": "Direct HD",
      "title": "⭐ Underground\n🎬 Direct HD Stream 1",
      "url": "https://content.bilosta.org/SERCRT721/FILMOVI/exyu/Underground.mp4"
    }
  ]
}
```

## Usage Modes

### Mode 1: With Configuration Page (Recommended)

Your addon's configuration page manages everything:

**Setup:**
1. Open `http://localhost:7005/configure`
2. Configure TMDB API key in Settings
3. Select catalogs to show in Catalogs page
4. Click "Install Addon"

**Features:**
- TMDB API key stored in browser (localStorage)
- Key included in addon configuration URL
- Server can use environment variable as fallback
- Works with both title-based and ID-based matching

### Mode 2: Standalone (Your Addon Only)

```bash
# Start enhanced addon
npm run start:enhanced
```

Note: The configuration page is designed for the main addon (port 7005). The enhanced addon (port 7007) is experimental.

**Features:**
- Your own catalogs (browsing interface)
- TMDB metadata (descriptions, cast, ratings)
- Direct HD streams

**User flow:**
1. Opens Stremio
2. Sees your "Balkan Movies (TMDB)" catalog
3. Browses with full TMDB metadata
3. Clicks play → instant HD stream

### Mode 3: Stream Provider (With TMDB Addon)

```bash
# Start enhanced addon (no catalogs needed)
npm run start:enhanced
```

**User installs:**
1. TMDB addon (for browsing)
2. Your addon (for streams only)

**User flow:**
1. Browses TMDB's Balkan catalogs
2. Finds movie "Underground (1995)"
3. Clicks play
4. TMDB addon shows metadata
5. Your addon provides HD stream

### Mode 4: Hybrid (Best of Both)

**User installs:**
1. TMDB addon (browse international content)
2. Your addon (browse Balkan-specific + streams)

**Benefits:**
- TMDB's huge catalog for discovery
- Your curated Balkan catalog
- Seamless cross-addon streaming

## File Structure

```
Balkan On Demand/
├── data/
│   ├── baubau-content.json          # Original database
│   └── tmdb-id-mapping.json         # Generated mapping ⭐
│
├── scripts/
│   └── create-tmdb-symlinks.js      # Mapping generator ⭐
│
├── addon.js                          # Original addon
├── addon-tmdb-catalogs.js           # TMDB catalog addon
├── addon-tmdb-enhanced.js           # TMDB ID-based addon ⭐
│
└── symlinks/                         # Optional filesystem symlinks
    ├── movies/
    │   └── tmdb-123456/
    │       └── movie.mp4 -> ../../cdn/mirror/file.mp4
    └── series/
        └── tmdb-789012/
            └── Season 01/
                └── S01E01.mp4 -> ../../cdn/mirror/ep1.mp4
```

## Common Issues

### ❌ "No TMDB mapping found"

**Cause:** Mapping file doesn't exist or empty

**Fix:**
```bash
# Generate mapping
TMDB_API_KEY="your_key" npm run mapping:create

# Verify created
ls -lh data/tmdb-id-mapping.json
```

### ❌ "TMDB API error 401"

**Cause:** Invalid or missing API key

**Fix:**
```bash
# Check your API key in the configuration page
# Settings → TMDB API Key → Test Key

# Should show: ✅ API key is valid!

# If error, regenerate key at themoviedb.org
```

**For mapping script:**
```bash
# Make sure you're passing the correct key
node scripts/create-tmdb-symlinks.js YOUR_CORRECT_KEY
```

### ❌ "No streams found for TMDB ID"

**Cause:** Movie exists in TMDB but not in your database

**Expected:** This is normal! Not all TMDB content has your streams.

**Result:** Other addons provide streams, or user tries different content.

### ❌ Mapping takes forever

**Cause:** Rate limiting (40 requests/sec)

**Normal timing:**
- 683 movies → ~17 minutes
- 37 series → ~1 minute
- Total: ~20 minutes

**Speed up:** Process only new content:
```javascript
// Add to create-tmdb-symlinks.js:
const existingMapping = require('./data/tmdb-id-mapping.json');
if (existingMapping.movies[itemId]) {
  console.log('⏭️  Already mapped, skipping');
  continue;
}
```

## Advanced: Filesystem Symlinks

### When to Use

- ✅ Using Plex/Jellyfin/Emby
- ✅ Want TMDB ID-based file organization
- ✅ Have local file mirror of CDN

### Setup

1. **Mirror CDN Locally** (optional)
   ```bash
   # Example: sync CDN to local storage
   rclone sync bilosta-remote: /mnt/media/bilosta/
   ```

2. **Modify Mapping Script**
   Edit `scripts/create-tmdb-symlinks.js`:
   ```javascript
   // After mapping, create symlinks
   const localMirror = '/mnt/media/bilosta';
   const symlinkBase = '/mnt/media/symlinks';
   
   // Create symlink
   const movieDir = path.join(symlinkBase, 'movies', `tmdb-${tmdbId}`);
   fs.mkdirSync(movieDir, { recursive: true });
   
   const localFile = streamUrl.replace('https://content.bilosta.org', localMirror);
   const symlink = path.join(movieDir, 'movie.mp4');
   
   fs.symlinkSync(localFile, symlink);
   ```

3. **Configure Plex**
   ```
   Library: Movies
   Folder: /mnt/media/symlinks/movies
   Agent: The Movie Database
   Scanner: Plex Movie Scanner
   ```

**Result:** Plex sees `tmdb-123456` folders, recognizes IDs, fetches metadata.

## Performance

### Mapping Generation (One-time)
| Items | Time | Rate |
|-------|------|------|
| 100 movies | ~2.5 min | 40/sec |
| 683 movies | ~17 min | 40/sec |
| 37 series | ~1 min | 40/sec |

### Runtime (Per Request)
| Operation | Time | Method |
|-----------|------|--------|
| Stream lookup | <1ms | Hash map O(1) |
| Catalog load | ~500ms | TMDB API calls |
| Meta request | ~200ms | TMDB API (cached) |

### Caching Strategy
- ✅ Mapping file loaded once at startup
- ✅ TMDB metadata cached in-memory (Map)
- ✅ No database queries during streaming

## Migration Path

### From Original Addon
1. Keep original addon running (port 7005)
2. Start enhanced addon (port 7007)
3. Test enhanced version
4. Gradually migrate users
5. Deprecate original when ready

### From Title-Based Matching
```javascript
// OLD (slow, unreliable)
const match = database.find(m => 
  fuzzyMatch(m.name, searchTitle) && 
  Math.abs(m.year - searchYear) <= 1
);

// NEW (fast, accurate)
const movieData = tmdbMapping.movies[tmdbId];
```

## Next Steps

1. ✅ **Configure TMDB key** → Open `/configure` → Settings → Add API key
2. ✅ **Generate mapping** → `npm run mapping:create YOUR_API_KEY`
3. ✅ **Test in Stremio** → Install from configuration page
4. 📖 **Read full guide** → See `SYMLINK-MANAGEMENT.md`
5. 🚀 **Deploy** → Set TMDB_API_KEY on server (optional, uses config)

## How the API Key Works

### Client-Side (Browser)
- API key entered in Settings page
- Stored in `localStorage` (browser only)
- Included in compressed configuration URL
- Used for testing key validity

### Server-Side (Addon)
- API key from configuration URL takes priority
- Falls back to `TMDB_API_KEY` environment variable
- Used for fetching TMDB metadata at runtime

### Mapping Script
- Requires API key as command argument
- Or from `TMDB_API_KEY` environment variable
- One-time use to generate mapping file

**Example flow:**
```
User enters API key in Settings
         ↓
Key saved in localStorage
         ↓
User clicks "Install Addon"
         ↓
Config URL includes API key (compressed)
         ↓
Stremio sends config to addon
         ↓
Addon uses key from config for TMDB requests
```

## Resources

- **Full Documentation:** `SYMLINK-MANAGEMENT.md`
- **TMDB Integration:** `TMDB-INTEGRATION.md`
- **TMDB API Docs:** https://developers.themoviedb.org/3
- **Get API Key:** https://www.themoviedb.org/settings/api

## Support

**Console Output:**
```
🚀 Balkan On Demand (TMDB Enhanced) v7.0.0
📊 TMDB Mapping Stats:
   • Movies: 683 mapped
   • Series: 37 mapped
```

If you see this, everything is working! 🎉

---

**Quick Reference:**
- Configure key: `http://localhost:7005/configure` → Settings
- Mapping script: `npm run mapping:create YOUR_API_KEY`
- Start regular: `npm start` (port 7005)
- Start enhanced: `npm run start:enhanced` (port 7007)
- Verify mapping: `npm run mapping:verify`
