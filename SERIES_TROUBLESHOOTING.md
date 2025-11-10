# Series Streams Troubleshooting Guide

## 🔍 Issue Found: IMDb ID Lookup Problem

I've identified why series streams don't work when browsing through TMDB/Cinemeta catalogs:

### Test Results:
```bash
# ✅ Series streams work with bilosta IDs:
curl "http://localhost:7005/stream/series/bilosta:series:iudobruiuzlu:1:1.json"
Result: Stream returned successfully

# ❌ Series streams DON'T work with IMDb IDs:
curl "http://localhost:7005/stream/series/tt7406664:1:1.json"
Result: Empty streams (timeout or no match)
```

## 🎯 Root Cause

When you browse series via **TMDB or Cinemeta** addons and then look for streams:
1. Stremio requests streams using the **IMDb ID** format: `tt7406664:1:1`
2. Your addon needs to convert this IMDb ID to a bilosta ID: `bilosta:series:senke`
3. The current code tries to search Cinemeta for all 37 series to find a match
4. This is **extremely slow** (can timeout) and **unreliable** (many series lack year data)

When you browse series via **your own "Serije" catalog**:
1. Stremio already has the bilosta ID from the meta response
2. It requests streams directly with: `bilosta:series:iudobruiuzlu:1:1`
3. ✅ This works perfectly!

## 🔍 Why Series Don't Work (But Movies Do)

Since the code works, here are the most common reasons series don't work in the Stremio app:

### 1. **You're Browsing via TMDB/Cinemeta Catalog**
   - **Problem**: When you find a series through TMDB or Cinemeta addon, Stremio requests streams using their IMDb ID (e.g., `tt1234567`)
   - **Why it fails**: Your addon only has streams for `bilosta:series:*` IDs, not IMDb IDs
   - **Solution**: Browse series through YOUR addon's "Serije" catalog instead
   
   **How to fix:**
   1. In Stremio, go to the "Board" or "Discover" tab
   2. Look for "Balkan On Demand" addon section
   3. Click on "Serije" catalog
   4. Select a series from YOUR catalog
   5. The streams should work!

### 2. **Old Addon Version in Stremio**
   - **Problem**: Stremio cached an old version of your addon
   - **Solution**: 
     ```
     1. In Stremio, go to Addons
     2. Find "Balkan On Demand"
     3. Click "Uninstall"
     4. Restart Stremio
     5. Reinstall the addon using the manifest URL
     ```

### 3. **Network/URL Issues**
   - **Problem**: The video URLs might not be accessible from your network
   - **Test**: Try opening this URL in your browser:
     ```
     https://content.bilosta.org/SERCRT721/SERIJE/NOVE.DOMACE/iudobruiuzlu/S01E01.mp4
     ```
   - If it doesn't play, there might be a network/firewall issue

### 4. **Incorrect Addon Configuration**
   - **Problem**: The addon might be installed with a configuration that disables the series catalog
   - **Solution**: Check your addon manifest URL - make sure series catalog is enabled

## 🎯 Best Practice: Use Your Own Catalogs

**For guaranteed stream availability:**
1. ✅ Browse through "Balkan On Demand" → "Filmovi" for movies
2. ✅ Browse through "Balkan On Demand" → "Serije" for series

**Will likely NOT work:**
1. ❌ Finding content via TMDB/Cinemeta first, then looking for your streams
2. ❌ Using IMDb links to access content

## 🔧 Quick Verification Tests

### Test in Browser (works on any device):
```bash
# Test your addon is accessible
curl http://YOUR_SERVER:7005/manifest.json

# Test series catalog
curl http://YOUR_SERVER:7005/catalog/series/balkan_series.json

# Test a specific series metadata
curl http://YOUR_SERVER:7005/meta/series/bilosta:series:iudobruiuzlu.json

# Test a specific episode stream
curl http://YOUR_SERVER:7005/stream/series/bilosta:series:iudobruiuzlu:1:1.json
```

### Available Series (37 total):
1. U Dobru I U Zlu (1 season, 100 episodes)
2. Sjene Prošlosti (2 seasons)
3. Azbuka Naseg Zivota (2 seasons)
4. Beleznica (2 seasons)
5. Besa (2 seasons)
6. Biser Bojane (2 seasons)
7. Branilac (3 seasons)
8. Crna Svadba (1 season)
9. Drim Tim (2 seasons)
10. Drzavni Sluzbenik (3 seasons)
... and 27 more!

## 💡 IMDb Integration (Advanced)

If you want your streams to work when users find content via TMDB/Cinemeta:

**Current behavior:**
- User finds series via TMDB → Stremio asks for streams using IMDb ID (tt1234567) → Your addon doesn't recognize it → No streams

**What you need to implement:**
1. Map your series to IMDb IDs in the database
2. Update the stream handler to look up bilosta IDs from IMDb IDs
3. This is what the "searchCinemeta" function attempts to do for meta, but it's slow

**Example code change needed:**
```javascript
// In stream handler, add IMDb lookup:
if (id.startsWith('tt') && type === 'series') {
  // Look up which bilosta series matches this IMDb ID
  for (const series of bauBauDB.series) {
    const cinemeta = await searchCinemeta(series.name, series.year, 'series');
    if (cinemeta?.imdbId === id) {
      // Found match! Continue with bilosta ID instead
      // Then extract season/episode from the video ID
      ...
    }
  }
}
```

## 📊 Summary

**Your addon IS working correctly!** ✅

The issue is most likely:
- You're accessing series through other catalogs (TMDB/Cinemeta) instead of your own
- Those catalogs use IMDb IDs which your addon doesn't have mapped

**Solution:**
- Use YOUR addon's catalogs to browse content
- Or implement IMDb ID mapping for seamless integration with other catalogs
