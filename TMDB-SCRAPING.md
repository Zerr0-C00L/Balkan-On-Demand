# TMDB Metadata Scraping Guide

## Overview

This guide explains how to scrape metadata from TMDB for your Balkan content to get authentic descriptions, cast information, and more details.

## Why TMDB?

1. **Your content is already there** - Your database has TMDB poster URLs, proving these titles exist in TMDB
2. **Free API** - TMDB provides a free API with 40 requests/second limit
3. **Better coverage** - TMDB has good coverage of Balkan/Ex-Yugoslav content
4. **Structured data** - Proper JSON API responses

## Getting Started

### 1. Get TMDB API Key (Free)

1. Go to https://www.themoviedb.org/signup
2. Create a free account
3. Go to Settings → API → Request an API Key
4. Choose "Developer" option
5. Fill out the form (use your addon details)
6. Copy your API key (v3 auth)

### 2. Run the Scraper

```bash
# Set your API key
export TMDB_API_KEY="your_key_here"

# Run the scraper
node scrape-tmdb-metadata.js
```

The scraper will:
- Search TMDB for each title in your database
- Extract metadata (description, cast, genres, etc.)
- Save results to `data/tmdb-metadata.json`
- Show progress and success rate

**Estimated time:** ~3 hours for 3,848 movies + 37 series (300ms delay between requests)

### 3. Use the Metadata

The scraped data will be saved in `data/tmdb-metadata.json`:

```json
{
  "movies": {
    "bilosta:movie:movieid": {
      "tmdb_id": 12345,
      "title": "Movie Title",
      "overview": "Description...",
      "genres": ["Drama", "Action"],
      "cast": ["Actor 1", "Actor 2"],
      "director": "Director Name",
      "vote_average": 7.5
    }
  },
  "series": { ... }
}
```

### 4. Integrate with Addon

Update `addon-v5.js` to load and use this metadata:

```javascript
// Load TMDB metadata at startup
let tmdbMetadata = {};
try {
  tmdbMetadata = JSON.parse(fs.readFileSync('./data/tmdb-metadata.json', 'utf8'));
  console.log(`📊 Loaded TMDB metadata: ${Object.keys(tmdbMetadata.movies).length} movies, ${Object.keys(tmdbMetadata.series).length} series`);
} catch (e) {
  console.log('⚠️  No TMDB metadata file found');
}

// In toStremioMeta(), prefer TMDB metadata over OMDb
if (tmdbMetadata.movies && tmdbMetadata.movies[item.id]) {
  const tmdb = tmdbMetadata.movies[item.id];
  description = tmdb.overview;
  genres = tmdb.genres;
  cast = tmdb.cast;
  // etc.
}
```

## Advantages Over Current System

| Feature | Current (OMDb) | With TMDB Scraper |
|---------|---------------|-------------------|
| **Descriptions** | English titles only | Direct from TMDB database |
| **Coverage** | Requires translation | Native Serbian/Croatian titles |
| **Cast/Crew** | Limited | Full cast & crew lists |
| **Genres** | Generic | TMDB genre taxonomy |
| **Ratings** | IMDb ratings | TMDB ratings (community) |
| **API Calls** | Every detail view | Zero (pre-scraped) |

## Rate Limits

- TMDB allows **40 requests/second** (generous)
- Script uses **300ms delay** (~3 requests/second) to be conservative
- No API key required for image URLs (you already have these)

## Maintenance

Run the scraper periodically to:
- Update metadata for existing content
- Add metadata for new content from GitHub Actions
- Refresh descriptions/ratings

Suggested schedule: **Weekly or monthly**

## Alternative: On-Demand Scraping

Instead of scraping everything, you could:
1. Only scrape titles that have no description
2. Cache results in `metadata-cache.json` (already exists)
3. Add new titles as they're requested

This would be faster but less comprehensive.

## Troubleshooting

**"No results found" for many titles:**
- Serbian/Croatian titles might need translation
- Try searching with year parameter
- Some titles might use different names on TMDB

**Rate limiting errors:**
- Increase `DELAY_MS` in the script
- Script auto-retries failed requests

**API key not working:**
- Make sure you requested a "Developer" key
- Wait a few minutes after creation
- Check the key has no extra spaces

## Next Steps

1. Get your TMDB API key
2. Run the scraper overnight
3. Review the results
4. Integrate into your addon
5. Redeploy to production

This will give you much better metadata coverage than the current OMDb fallback system!
