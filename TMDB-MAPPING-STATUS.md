# TMDB Mapping Status Report

## Summary

Your TMDB mapping script **successfully** created mappings for:
- ✅ **26 movies** (2021-2024 releases with year information)
- ✅ **37 series** (all series successfully mapped)
- ❌ **651 movies skipped** (missing year information in database)

## What Worked

The mapping worked perfectly for recent movies (2021-2024) that have year information:

### Successfully Mapped Movies:
1. Roda (2024) → TMDB 1351063
2. Drava (2024) → TMDB 1505938
3. Volja Sinovljeva (2024) → TMDB 687238
4. Proslava (2024) → TMDB 1261060
5. Bauk (2024) → TMDB 1160614
6. ...and 21 more recent releases

### All 37 Series Mapped:
- U Dobru I U Zlu → TMDB 278302
- Senke Nad Balkanom → TMDB 74647
- Juzni Vetar → TMDB 99123
- ...and 34 more

## Why 651 Movies Were Skipped

Your database (`data/baubau-content.json`) has **`year: null`** for most older movies. The original data source apparently didn't include release years for classic films.

### Example of the problem:
```json
{
  "name": "Parada",
  "year": null,
  "originalTitle": "Parada"  // No year here either
}
```

Without a year, TMDB search becomes unreliable because:
- Many titles are remade multiple times
- Generic titles match hundreds of movies
- Risk of mapping to wrong TMDB ID

## Solutions

### Option 1: Use What You Have (Recommended for Now) ✅

**The 26 mapped movies + 37 series are your most important content** - your newest releases (2021-2024) that users want to watch.

**Action:** Restart your addon to use the existing mapping:
```bash
npm start
```

Your addon will now:
- Show rich TMDB metadata for the 26 mapped movies
- Show rich TMDB metadata for all 37 series
- Fall back to Cinemeta/OMDb for older movies (which works fine for most classic films)

### Option 2: Map Movies Without Years (Low Confidence) ⚠️

I created a script (`scripts/map-movies-without-years.js`) that searches TMDB **without year** using regional filters (Serbia, Croatia, Bosnia, etc.).

**Pros:**
- Might map many classic Ex-Yu films
- Uses regional filtering to improve accuracy

**Cons:**
- Lower accuracy (marked as `confidence: low`)
- May map wrong movies for common titles
- Takes 2-3 hours to process 651 movies (rate limiting)
- Requires manual verification

**To run:**
```bash
node scripts/map-movies-without-years.js df4b2479daeb0a045afdc8ec1d958d65
```

### Option 3: Add Years Manually (Most Accurate) 📝

Research and add years for important classic films in your database.

**Example fix for one movie:**
```bash
# Find the movie in baubau-content.json
# Change: "year": null
# To: "year": 2011  # (actual release year of Parada)
```

Then re-run the original mapping script:
```bash
node scripts/create-tmdb-symlinks.js df4b2479daeb0a045afdc8ec1d958d65
```

### Option 4: Import IMDb Dataset (Advanced) 🎓

Download IMDb's free dataset and cross-reference titles to add years automatically.

**Steps:**
1. Download: https://datasets.imdbws.com/title.basics.tsv.gz
2. Create script to match titles and extract years
3. Update your database with years
4. Run TMDB mapping script

## Current Mapping File Status

**File:** `data/tmdb-id-mapping.json`

**Contents:**
- 26 movies with TMDB IDs (all 2021-2024)
- 37 series with TMDB IDs (all seasons mapped)
- Ready to use immediately

**Your addon (`addon.js`) already supports this file:**
- Loads automatically on startup
- Provides TMDB ID-based streaming
- Falls back gracefully for unmapped content

## Specific Movies Mentioned

### ✅ Fixed and Mapped:
- **Volja Sinovljeva** → TMDB 687238
- **Roda** → TMDB 1351063
- **Drava** → TMDB 1505938
- **Supermarket** → TMDB 1199175
- **Escort** → TMDB 1030542

### ❌ Still Not Mapped (no year in DB):
- **Žena Sa Gumenim Rukavicama** - Has title fix but year=2024 wasn't recognized by TMDB search
- **Parada** - Classic film, year: null
- **Underground** - Classic film, year: null
- **Maratonci** - Classic film, year: null
- ...and 647 more

### Why "Žena Sa Gumenim Rukavicama" Failed:

This movie **DOES** have a year (2024) and was searched, but TMDB returned no match. Possible reasons:
1. **Too new** - May not be in TMDB yet (very recent 2024 release)
2. **Different title** - TMDB might have it under English title or different spelling
3. **Diacritics** - Special characters might need different search format

**Manual check:**
Search TMDB directly: https://www.themoviedb.org/search?query=Zena+Sa+Gumenim+Rukavicama

If you find it, you can manually add it to the mapping file.

## Recommendation

**Start with Option 1:**

1. Your current mapping file is ready with 63 items (26 movies + 37 series)
2. Restart your addon: `npm start`
3. Test your newest content - it should now show full TMDB metadata
4. Older movies will continue working via Cinemeta/OMDb fallback

**Then consider Option 2 or 3** if you want to improve mapping for classic films.

## Files Created

1. ✅ `data/tmdb-id-mapping.json` - Working mapping file with 63 items
2. ✅ `scripts/create-tmdb-symlinks.js` - Main mapping script (already run)
3. ✅ `scripts/fix-movie-titles.js` - Title fixer (already run, fixed 147 titles)
4. ✅ `scripts/fix-missing-years.js` - Year extractor (tried, but no years found in originalTitle)
5. ✅ `scripts/map-movies-without-years.js` - Optional low-confidence mapper for yearless movies
6. ✅ `addon.js` - Already updated to support TMDB ID mapping

## Next Steps

```bash
# 1. Restart addon to use current mapping
npm start

# 2. Test a recent movie URL in browser
# Example: http://localhost:7005/manifest.json

# 3. Check if metadata improved for 2021-2024 content

# 4. (Optional) If you want to map older movies:
node scripts/map-movies-without-years.js df4b2479daeb0a045afdc8ec1d958d65
```

---

**Questions?** Let me know if you need help with any option!
