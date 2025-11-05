# BauBau to Stremio Integration Plan

## Overview
Clone BauBau Klik Premium's content library into your Stremio addon with proper metadata, artwork, and organization.

## Current State

### What We Have
✅ **26,032 direct video URLs** from bilosta.org
✅ **721 Ex-YU movies** with direct MP4/MKV links
✅ **16,138 series episodes** organized by season/episode
✅ **Working Stremio addon** (`addon-enhanced.js` v4.1.0)
✅ **1,090 movies** in `sevcet-films.json` with YouTube IDs

### What We Need
- Match bilosta URLs to existing movies
- Fetch metadata (titles, descriptions, release dates)
- Get artwork (posters, fanart)
- Organize series with seasons/episodes
- Create catalog structure for Stremio

## Integration Strategy

### Phase 1: Data Extraction & Matching (2-3 hours)

#### Step 1.1: Parse BauBau API Responses
Extract structured data from XML files in `archive/analysis/baubau-*.xml`:

```javascript
// Extract from XML
{
  title: "Roda (2024)",
  link: "https://content.bilosta.org/SERCRT721/FILMOVI/exyu/Roda.mp4",
  thumbnail: "https://image.tmdb.org/t/p/w780/d06BXJmEfcvvCzp2GRWQeXKVZMT.jpg",
  fanart: "https://image.tmdb.org/t/p/w780/d06BXJmEfcvvCzp2GRWQeXKVZMT.jpg",
  category: "KLIK PREMIJERA",
  year: 2024
}
```

**Output**: `data/baubau-parsed.json`

#### Step 1.2: Match with Existing Database
Match BauBau movies to `sevcet-films.json` by:
- Title comparison (fuzzy matching)
- Year matching
- Manual mapping for mismatches

**Output**: `data/matched-movies.json`

#### Step 1.3: Extract Metadata from URLs
Parse filenames to extract info:
- Remove extensions (.mp4, .mkv, .avi)
- Extract year from filename
- Clean special characters
- Detect series format (S01E01)

### Phase 2: Metadata Enrichment (3-4 hours)

#### Step 2.1: Use Existing TMDB URLs
BauBau already provides TMDB poster URLs:
```
https://image.tmdb.org/t/p/w780/{TMDB_POSTER_PATH}
```

Extract TMDB ID from poster URL and fetch full metadata.

#### Step 2.2: Fetch Missing Metadata
For movies without TMDB posters:
1. Search TMDB by title + year
2. Get Serbian/Croatian title if available
3. Fetch: poster, background, description, genres, cast
4. Cache results to avoid re-fetching

#### Step 2.3: IMDB Integration
Use IMDB ratings from existing database or fetch via TMDB (has IMDB IDs).

**Output**: `data/enriched-content.json`

### Phase 3: Series Organization (2-3 hours)

#### Step 3.1: Parse Series Structure
From bilosta URLs like:
```
https://content.bilosta.org/SERCRT721/SERIJE/NOVE.DOMACE/iudobruiuzlu/S01E01.mp4
```

Extract:
- Series name: "iudobruiuzlu" → "U Dobru i U Zlu"
- Season: 01
- Episode: 01

#### Step 3.2: Group Episodes
Organize into structure:
```javascript
{
  "imdb_id": "tt12345",
  "name": "U Dobru i U Zlu",
  "year": 2024,
  "seasons": [
    {
      "number": 1,
      "episodes": [
        {
          "number": 1,
          "title": "Epizoda 1",
          "stream": "https://content.bilosta.org/.../S01E01.mp4"
        }
      ]
    }
  ]
}
```

#### Step 3.3: Fetch Series Metadata
Use TMDB TV API:
- Series overview
- Episode titles
- Episode descriptions
- Episode thumbnails
- Air dates

**Output**: `data/series-catalog.json`

### Phase 4: Stremio Catalog Structure (1-2 hours)

#### Step 4.1: Movies Catalog
Create catalog with genres:
```javascript
{
  "id": "baubau-exyu-movies",
  "name": "BauBau Ex-YU Filmovi",
  "type": "movie",
  "extra": [
    { "name": "genre", "isRequired": false },
    { "name": "skip", "isRequired": false }
  ]
}
```

Categories:
- Ex-YU Filmovi (721 movies)
- Strani Filmovi (4,371 movies)
- 4K Filmovi (64 movies)
- Dokumentarci
- Crtani Filmovi

#### Step 4.2: Series Catalog
```javascript
{
  "id": "baubau-series",
  "name": "BauBau Serije",
  "type": "series"
}
```

#### Step 4.3: Meta Responses
Return Stremio-compatible meta:
```javascript
{
  "id": "yt:VIDEO_ID", // or bilosta:HASH
  "type": "movie",
  "name": "Roda",
  "year": 2024,
  "poster": "https://image.tmdb.org/t/p/w780/...",
  "background": "https://image.tmdb.org/t/p/original/...",
  "description": "Film o...",
  "genre": ["Drama", "Comedy"],
  "imdbRating": "7.5",
  "director": ["..."],
  "cast": ["..."],
  "runtime": "120 min"
}
```

### Phase 5: Stream Handling (1 hour)

#### Step 5.1: Priority System
Update `addon-enhanced.js` stream priority:

```javascript
// Priority 1: BauBau Direct Links (NEW!)
if (movie.bilostaUrl) {
  streams.push({
    name: "BauBau",
    title: "🇷🇸 Direct HD Stream",
    url: movie.bilostaUrl,
    behaviorHints: {
      bingeGroup: "baubau-" + movie.id
    }
  });
}

// Priority 2: Torrent (existing)
// Priority 3: YouTube Infuse (existing)
// Priority 4: YouTube fallback (existing)
```

#### Step 5.2: Quality Detection
Parse filename for quality:
- 4K folder → "🎬 4K UHD"
- .mkv usually HD → "📺 HD 1080p"
- .mp4 → "📺 HD"
- .avi → "📺 SD"

#### Step 5.3: Series Streams
Return all episodes for a series:
```javascript
{
  "streams": [
    {
      "name": "BauBau",
      "title": "S01E01 - Epizoda 1\n🇷🇸 HD 650MB",
      "url": "https://content.bilosta.org/.../S01E01.mp4"
    },
    // ... all episodes
  ]
}
```

## Implementation Files

### 1. Data Processing Script
**File**: `scripts/import-baubau-content.js`

Purpose:
- Parse BauBau XML files
- Extract metadata
- Match with existing database
- Fetch TMDB data
- Generate final JSON

### 2. Updated Content Database
**File**: `content-database.json`

Structure:
```javascript
{
  "movies": [
    {
      "id": "bilosta:roda-2024",
      "imdb_id": "tt...",
      "tmdb_id": 12345,
      "type": "movie",
      "name": "Roda",
      "year": 2024,
      "poster": "...",
      "background": "...",
      "description": "...",
      "genres": [...],
      "streams": [
        {
          "quality": "HD",
          "size": "1.2GB",
          "url": "https://content.bilosta.org/.../Roda.mp4",
          "source": "bilosta"
        }
      ],
      "youtubeId": "xyz123", // fallback
      "torrents": []
    }
  ],
  "series": [...]
}
```

### 3. Enhanced Addon
**File**: `addon-enhanced.js` (update)

Changes:
- Add BauBau catalogs
- Update stream handler
- Add series support
- Implement search across BauBau content

### 4. Metadata Cache
**File**: `data/metadata-cache.json`

Cache TMDB responses to avoid API rate limits.

## Timeline

| Phase | Task | Time | Output |
|-------|------|------|--------|
| 1 | Data extraction & matching | 3h | Parsed + matched JSON |
| 2 | Metadata enrichment | 4h | Full metadata database |
| 3 | Series organization | 3h | Series catalog |
| 4 | Stremio catalogs | 2h | Catalog structure |
| 5 | Stream integration | 1h | Updated addon |
| **Total** | | **13h** | Production-ready addon |

## Benefits

✅ **26,032 direct streams** - Massive content library
✅ **No scraping** - Direct MP4/MKV links
✅ **Fast streaming** - Cloudflare CDN
✅ **Apple TV compatible** - Direct HTTP streams
✅ **Professional metadata** - TMDB posters, descriptions
✅ **Organized catalogs** - Browse by genre, year, quality
✅ **Search enabled** - Find content easily
✅ **Multi-language** - Serbian, Croatian, English titles
✅ **Quality selection** - HD, 4K options visible
✅ **Binge-watching** - Series with all episodes

## Next Steps

1. **Create import script** to process BauBau XML files
2. **Fetch TMDB metadata** for all movies
3. **Build unified database** with all sources
4. **Update addon** to serve new catalogs
5. **Test on Apple TV** with Stremio + Infuse
6. **Deploy to Heroku** with updated code

Ready to start implementation? I'll create the import script first.
