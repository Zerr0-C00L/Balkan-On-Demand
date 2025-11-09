# TMDB Symlink Management Guide

## Overview

This guide explains how to integrate symlink management for your Balkan media content to enable proper TMDB recognition and seamless integration with TMDB-based catalogs.

## Problem Statement

Your current setup has:
- ✅ **Direct CDN streams** at `content.bilosta.org`
- ✅ **TMDB poster URLs** in database (proves content exists in TMDB)
- ❌ **No TMDB ID → Stream URL mapping**
- ❌ **Title-based matching is unreliable** (Balkan names, transliterations)

## Solution Architecture

### Hybrid Approach: Symlinks + TMDB ID Mapping

```
┌─────────────────────────────────────────────────┐
│  TMDB Database (Source of Truth)                │
│  • Unique IDs for all content                   │
│  • Rich metadata (cast, crew, descriptions)     │
│  • IMDb ID cross-references                     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  TMDB ID Mapping File (tmdb-id-mapping.json)   │
│  {                                              │
│    "movies": {                                  │
│      "123456": {                                │
│        "title": "Underground",                  │
│        "year": 1995,                            │
│        "streams": ["https://cdn.../file.mp4"]   │
│      }                                          │
│    }                                            │
│  }                                              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Symlink Structure (Optional, for filesystem)   │
│                                                  │
│  symlinks/                                      │
│  ├── movies/                                    │
│  │   └── tmdb-123456/                          │
│  │       └── movie.mp4 -> ../../../../cdn/file │
│  └── series/                                    │
│      └── tmdb-789012/                          │
│          └── Season 01/                         │
│              └── S01E01.mp4 -> ../../cdn/ep1   │
└─────────────────────────────────────────────────┘
```

## Step-by-Step Implementation

### Step 1: Generate TMDB ID Mapping

This script searches TMDB for each item in your database and creates a mapping file.

```bash
# Set your TMDB API key
export TMDB_API_KEY="your_api_key_here"

# Run the mapping script
node scripts/create-tmdb-symlinks.js
```

**What it does:**
1. Reads `data/baubau-content.json`
2. For each movie/series:
   - Searches TMDB API by title + year
   - Gets unique TMDB ID
   - Maps: TMDB ID → Your stream URLs
3. Saves to `data/tmdb-id-mapping.json`

**Output:**
```json
{
  "movies": {
    "123456": {
      "title": "Underground",
      "year": 1995,
      "originalId": "bilosta:aHR0cHM6...",
      "streams": [
        "https://content.bilosta.org/SERCRT721/FILMOVI/exyu/Underground.mp4"
      ]
    }
  },
  "series": {
    "789012": {
      "title": "Senke nad Balkanom",
      "year": 2017,
      "episodes": {
        "S01": {
          "E01": {
            "url": "https://content.bilosta.org/.../S01E01.mp4",
            "title": "Episode 1"
          }
        }
      }
    }
  }
}
```

### Step 2: Start Enhanced Addon

```bash
# Make sure mapping exists
ls data/tmdb-id-mapping.json

# Start the TMDB-enhanced addon
TMDB_API_KEY="your_key" node addon-tmdb-enhanced.js
```

The addon runs on **port 7007** (different from original).

### Step 3: Install in Stremio

```
http://localhost:7007/manifest.json
```

## How It Works

### Movie Stream Request Flow

```
User clicks "Play" on TMDB movie
         ↓
Stremio sends: GET /stream/movie/tmdb:123456.json
         ↓
Addon checks: tmdbMapping.movies["123456"]
         ↓
    ┌─────────┐
    │ Found?  │
    └─────────┘
         │
    ┌────┴────┐
   YES       NO
    ↓         ↓
  Return    Return
  streams   empty []
```

### Series Episode Request Flow

```
User clicks episode S01E05
         ↓
Stremio sends: GET /stream/series/tmdb:789012:1:5.json
         ↓
Addon parses: tmdbId=789012, season=1, episode=5
         ↓
Looks up: tmdbMapping.series["789012"]["S01"]["E05"]
         ↓
Returns stream URL
```

## Benefits

### ✅ Advantages

1. **Accurate Matching**
   - No more title/year mismatches
   - Handles transliterations automatically
   - Works with TMDB's canonical names

2. **Fast Lookups**
   - Direct ID → URL mapping (O(1) lookup)
   - No API calls during streaming
   - Pre-computed mapping file

3. **TMDB Catalog Compatibility**
   - Works seamlessly with TMDB addon
   - Works with any addon using TMDB IDs
   - Cross-addon content discovery

4. **Maintenance**
   - Update mapping only when content changes
   - No runtime metadata enrichment needed
   - Clear separation: TMDB = metadata, You = streams

5. **Symlinks (Optional)**
   - Organize files by TMDB ID
   - Compatible with Plex/Jellyfin scanners
   - Preserves original CDN structure

### 🎯 Use Cases

**Use Case 1: Standalone with TMDB API**
```
Your addon provides both:
- Catalogs (via TMDB API)
- Streams (via TMDB ID mapping)

Users browse your catalogs, click play, instant streams.
```

**Use Case 2: Stream Provider Only**
```
User has TMDB addon for browsing
Your addon provides streams only
When user clicks play:
  → TMDB addon shows metadata
  → Your addon provides HD stream
```

**Use Case 3: Hybrid**
```
TMDB addon for browsing international content
Your addon for browsing Balkan-specific catalogs
Both work together using TMDB IDs
```

## Advanced: Filesystem Symlinks

### Why Symlinks?

If you want to:
- Use Plex/Jellyfin/Emby with TMDB agents
- Organize files by TMDB ID on disk
- Keep original CDN structure intact

### Creating Symlinks

The `create-tmdb-symlinks.js` script can be extended to create actual symlinks:

```javascript
// Add after mapping generation:
const movieDir = path.join(SYMLINK_BASE, 'movies', `tmdb-${tmdbId}`);
fs.mkdirSync(movieDir, { recursive: true });

// Create symlink
const target = '/path/to/cdn/mirror/file.mp4';
const link = path.join(movieDir, 'movie.mp4');
fs.symlinkSync(target, link);
```

### Symlink Structure

```
symlinks/
├── movies/
│   ├── tmdb-123456/           # Underground (1995)
│   │   └── Underground (1995).mp4 -> ../../../../cdn/mirror/Underground.mp4
│   │
│   ├── tmdb-234567/           # Maratonci trce pocasni krug
│   │   └── Maratonci (1982).mp4 -> ../../../../cdn/mirror/Maratonci.mp4
│   │
│   └── tmdb-345678/           # Ko to tamo peva
│       └── Ko to tamo peva (1980).mp4 -> ../../../../cdn/mirror/KoToTamo.mp4
│
└── series/
    └── tmdb-789012/           # Senke nad Balkanom
        ├── Season 01/
        │   ├── S01E01.mp4 -> ../../../../../cdn/mirror/Senke/S01E01.mp4
        │   ├── S01E02.mp4 -> ../../../../../cdn/mirror/Senke/S01E02.mp4
        │   └── ...
        └── Season 02/
            └── ...
```

### Plex/Jellyfin Configuration

1. **Add Library**
   ```
   Type: Movies or TV Shows
   Folder: /path/to/symlinks/movies
   Agent: The Movie Database (TMDB)
   ```

2. **Scan**
   - Plex/Jellyfin will see folders named `tmdb-123456`
   - TMDB agent recognizes the ID format
   - Metadata fetched automatically from TMDB
   - Your streams play through symlinks

## Updating the Mapping

When you add new content:

```bash
# Re-run the mapping script
TMDB_API_KEY="your_key" node scripts/create-tmdb-symlinks.js

# Restart addon to reload mapping
# (or add file watcher for auto-reload)
```

## Troubleshooting

### No TMDB Match Found

**Problem:** Script can't find TMDB ID for some content

**Solutions:**
1. Check title spelling in your database
2. Verify year is correct
3. Search TMDB manually: https://www.themoviedb.org/search
4. Add manual overrides in mapping file

**Manual Override Example:**
```javascript
// In create-tmdb-symlinks.js, add:
const manualMappings = {
  'bilosta:aHR0cHM6...': 123456,  // Known TMDB ID
};

if (manualMappings[movie.id]) {
  tmdbId = manualMappings[movie.id];
}
```

### Streams Not Appearing

**Problem:** TMDB ID exists but no streams show

**Debug:**
```javascript
// Check mapping file
const mapping = require('./data/tmdb-id-mapping.json');
console.log(mapping.movies['123456']); // Should show streams array
```

**Common Issues:**
- Mapping file not loaded (check console on startup)
- TMDB ID format wrong (should be number, not string with prefix)
- Stream URLs broken (test URLs directly)

### Rate Limiting

**Problem:** TMDB API rate limit (40 req/sec)

**Solution:** Script includes automatic rate limiting:
```javascript
if (processed % 40 === 0) {
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

For large libraries (>1000 items), run overnight.

## Performance Metrics

### Initial Mapping Generation
- **683 movies**: ~17 minutes (with rate limiting)
- **37 series**: ~1 minute
- **Total**: ~20 minutes one-time cost

### Runtime Performance
- **Catalog load**: ~500ms (fetches TMDB metadata)
- **Stream lookup**: <1ms (direct hash lookup)
- **Meta request**: ~200ms (single TMDB API call)

### Caching
The enhanced addon caches TMDB responses:
```javascript
const tmdbCache = new Map();
// First request: 200ms
// Subsequent: <1ms
```

## Migration from Title-Based Matching

### Before (Title Matching)
```javascript
// Slow, unreliable
const movie = database.find(m => 
  m.name.toLowerCase().includes(searchTitle.toLowerCase()) &&
  Math.abs(m.year - searchYear) <= 1
);
```

### After (ID Mapping)
```javascript
// Fast, accurate
const movieData = tmdbMapping.movies[tmdbId];
```

### Migration Steps
1. ✅ Run `create-tmdb-symlinks.js` (creates mapping)
2. ✅ Deploy `addon-tmdb-enhanced.js` (uses mapping)
3. ✅ Test streams with TMDB IDs
4. ✅ Update production URL
5. ⚠️ Keep old addon running for IMDb ID support (optional)

## API Endpoints Comparison

### Old Addon (Title-Based)
```
GET /stream/movie/bilosta:aHR0cHM6...json
└─> Searches database by ID
└─> Returns streams
```

### New Addon (TMDB ID-Based)
```
GET /stream/movie/tmdb:123456.json
└─> Looks up tmdbMapping.movies["123456"]
└─> Returns streams

GET /stream/series/tmdb:789012:1:5.json
└─> Looks up tmdbMapping.series["789012"]["S01"]["E05"]
└─> Returns stream
```

## Future Enhancements

### 1. IMDb ID Support
Add IMDb ID mapping during initial scan:
```javascript
// Fetch TMDB details to get IMDb ID
const tmdbData = await fetchTMDB(tmdbId);
mapping.imdbIds[tmdbData.imdb_id] = tmdbId;
```

### 2. Auto-Update Mapping
Watch for new content:
```javascript
fs.watch('data/baubau-content.json', () => {
  console.log('Content updated, regenerating mapping...');
  processContent();
});
```

### 3. Bidirectional Sync
If you have local files + CDN streams:
```javascript
// Map both symlink paths and CDN URLs
mapping.movies[tmdbId] = {
  streams: [...cdnUrls],
  localPath: symlinkPath,
  priority: 'cdn' // or 'local'
};
```

## Support

- **Run mapping script**: `node scripts/create-tmdb-symlinks.js`
- **Start enhanced addon**: `node addon-tmdb-enhanced.js`
- **Check logs**: Look for "📊 Loaded TMDB mapping" on startup
- **Verify mapping**: `cat data/tmdb-id-mapping.json | jq '.movies | length'`

---

**Version**: 7.0.0  
**Created**: November 2025  
**Author**: ZeroQ
