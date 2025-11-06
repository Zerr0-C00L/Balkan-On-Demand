# TMDB Integration Guide

## Overview

Version 6.0.0 introduces a new approach: **TMDB as the primary metadata source** with your API providing only direct HD streams.

## How It Works

### Architecture

```
┌─────────────────────────────────────────────┐
│  Stremio User Interface                     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Your Addon (addon-tmdb-catalogs.js)       │
│  ┌────────────────────────────────────────┐ │
│  │ TMDB Catalogs (Metadata)               │ │
│  │ - Bosnian Movies (keyword: 1662)       │ │
│  │ - Croatian Movies (keyword: 7492)      │ │
│  │ - Serbian TV (keyword: 9285)           │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ Direct HD Streams (Your Content)       │ │
│  │ - 3,848 Movies                         │ │
│  │ - 37 TV Series                         │ │
│  └────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────┘
                  │
      ┌───────────┴────────────┐
      ▼                        ▼
┌──────────────┐        ┌──────────────┐
│ TMDB API     │        │ Bilosta CDN  │
│ (Metadata)   │        │ (Streams)    │
└──────────────┘        └──────────────┘
```

### User Flow

1. **Browse TMDB Catalogs**: User browses Bosnian/Croatian/Serbian content with full TMDB metadata
2. **Click to Watch**: User selects a movie/series
3. **Smart Matching**: Addon checks if it has a direct HD stream
4. **Stream or Fallback**: 
   - ✅ Match found → Direct HD stream provided
   - ❌ No match → No stream (user tries other addons)

## TMDB Keywords Used

| Catalog | Type | Keyword ID | TMDB URL |
|---------|------|-----------|----------|
| Bosnian Movies | movie | 1662 | [Browse](https://www.themoviedb.org/keyword/1662-bosnia-and-herzegovina/movie) |
| Croatian Movies | movie | 7492 | [Browse](https://www.themoviedb.org/keyword/7492-croatian/movie) |
| Serbian TV Series | tv | 9285 | [Browse](https://www.themoviedb.org/keyword/9285-serbian/tv) |

### Alternative Keywords

- **Croatia (country)**: 1248 - All content from Croatia
- **Croatian language**: 7492 - Croatian language content

## Setup

### 1. Get TMDB API Key

```bash
# Sign up at TMDB
open https://www.themoviedb.org/signup

# Navigate to Settings → API → Request API Key
# Choose "Developer" and fill out the form
# Copy your API key (v3 auth)
```

### 2. Configure Environment

```bash
# Set TMDB API key
export TMDB_API_KEY="your_tmdb_api_key_here"

# Start the new TMDB-powered addon
node addon-tmdb-catalogs.js
```

The addon will run on port **7006** (different from the original port 7005).

### 3. Install in Stremio

1. Go to http://localhost:7006/configure
2. Configure catalogs in Settings
3. Click "Install Addon"

## Features

### ✅ Benefits

1. **No metadata maintenance**: TMDB handles all descriptions, ratings, cast, trailers
2. **Always up-to-date**: New Balkan content automatically appears via TMDB
3. **Rich metadata**: Full cast, crew, trailers, ratings, reviews
4. **Unlimited catalog**: Access TMDB's entire Balkan collection
5. **Simple codebase**: No complex scraping or enrichment logic
6. **Your value**: Direct HD streams for matched content

### 🎯 Catalogs

#### TMDB-Powered (Unlimited)
- 🇧🇦 **Bosnian Movies** - Full TMDB catalog with Bosnia keyword
- 🇭🇷 **Croatian Movies** - Full TMDB catalog with Croatian keyword
- 🇷🇸 **Serbian TV Series** - Full TMDB catalog with Serbian keyword

#### Direct HD (Your Content)
- ⭐ **Direct HD Movies** - Your curated 3,848 movies
- 📺 **Direct HD Series** - Your curated 37 series

## Stream Matching

The addon tries to match TMDB content with your streams using:

### Method 1: Title + Year Match
```javascript
// Exact or fuzzy title match + year within 1 year
const match = yourDatabase.find(item => {
  const titleMatch = item.name.toLowerCase().includes(tmdbTitle.toLowerCase());
  const yearMatch = Math.abs(item.year - tmdbYear) <= 1;
  return titleMatch && yearMatch;
});
```

### Method 2: Normalized Title Only
```javascript
// For items without year information
const normalizedTitle = tmdbTitle.toLowerCase().trim();
const match = yourDatabase.find(item => 
  item.name.toLowerCase().trim() === normalizedTitle
);
```

## API Endpoints

### Catalogs
```
GET /catalog/movie/tmdb_balkan_movies.json
GET /catalog/movie/tmdb_croatian_movies.json
GET /catalog/series/tmdb_serbian_series.json
GET /catalog/movie/bilosta_direct_movies.json
GET /catalog/series/bilosta_direct_series.json
```

### Metadata
```
GET /meta/movie/:imdb_id.json
GET /meta/series/:imdb_id.json
```

### Streams
```
GET /stream/movie/:imdb_id.json
GET /stream/series/:imdb_id.json
```

## Configuration

### Via React App

1. Visit `/configure` page
2. Select catalogs to show on home screen
3. Configure TMDB API key in Settings
4. Install addon

### Via URL Parameters

```
# Enable specific catalogs
/home=tmdb_balkan_movies,bilosta_direct_movies/manifest.json

# With TMDB API key
/home=tmdb_balkan_movies&tmdb=YOUR_KEY/manifest.json

# All catalogs disabled (streams only)
/manifest.json
```

## Comparison: Old vs New

### Old Approach (addon-v5.js)
- ❌ Manual metadata scraping
- ❌ Cinemeta/OMDb enrichment needed
- ❌ Translation files for Serbian titles
- ❌ Complex multi-tier fallback logic
- ❌ Limited to your database only
- ✅ Works without TMDB API key

### New Approach (addon-tmdb-catalogs.js)
- ✅ TMDB handles all metadata
- ✅ No scraping/enrichment needed
- ✅ No translation files needed
- ✅ Simple, clean codebase
- ✅ Unlimited catalog via TMDB
- ⚠️ Requires TMDB API key

## Migration Guide

### For Users

1. Get TMDB API key (free)
2. Set `TMDB_API_KEY` environment variable
3. Run `node addon-tmdb-catalogs.js` on port 7006
4. Uninstall old addon, install new one

### For Developers

The new addon:
- Uses TMDB discover API with keywords
- Fetches full metadata from TMDB
- Only checks your database for streams
- No Cinemeta/OMDb calls needed
- Simpler handler logic

## Limitations

1. **TMDB API required**: Won't work without API key
2. **Keyword-based discovery**: Limited to TMDB's keyword tagging
3. **Match accuracy**: Depends on title/year matching
4. **No fallback**: If no stream match, no stream provided

## Future Enhancements

1. **More keywords**: Add regional keywords (Slovenia, Macedonia, etc.)
2. **Better matching**: Use TMDB alternative titles for matching
3. **Cache layer**: Cache TMDB responses to reduce API calls
4. **Production countries**: Use production countries filter alongside keywords
5. **User ratings**: Add community rating for stream quality

## Troubleshooting

### TMDB API Key Not Working

```bash
# Test your key
curl "https://api.themoviedb.org/3/configuration?api_key=YOUR_KEY"

# Should return JSON configuration, not error
```

### No Streams Appearing

Check console logs:
```
✅ Stream match found: Underground → Underground
❌ No streams found for Title (2024)
```

Improve matching by ensuring your database has:
- Accurate years
- English titles (or TMDB-compatible titles)

### Catalogs Not Loading

Ensure TMDB_API_KEY is set:
```bash
echo $TMDB_API_KEY  # Should print your key
```

## Support

- **GitHub Issues**: Report bugs or request features
- **Ko-fi**: Support development at ko-fi.com/ZeroQ
- **Discord**: Join community (link in README)

---

**Version**: 6.0.0  
**Last Updated**: November 2025  
**Author**: ZeroQ
