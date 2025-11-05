# Streaming Sources Guide for Balkan Content

## Current Solution: YouTube with Enhanced Extraction

### ✅ Advantages:
- **1090+ movies** already indexed
- Legal content (mostly)
- Free hosting
- Good quality
- Automatic captions/subtitles

### ❌ Disadvantages:
- Apple TV internal player doesn't support `ytId` parameter
- YouTube links can be region-blocked
- Videos can be removed/deleted
- Some devices have issues

### 🍎 Apple TV Solution (addon-enhanced.js):
The enhanced addon extracts **direct HLS (.m3u8) and MP4 streams** from YouTube that work natively on Apple TV:
- Uses Invidious/Piped APIs to get direct URLs
- Prioritizes HLS streams (Apple's native format)
- Provides multiple quality options
- Falls back to YouTube for other devices

---

## Alternative Streaming Sources

### 1. 🎯 VidSrc / VidSrc.to
**Best for**: Multi-device compatibility, reliable streams

```javascript
// Example implementation
async function getVidSrcStream(imdbId, season, episode) {
    if (season && episode) {
        return `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`;
    }
    return `https://vidsrc.to/embed/movie/${imdbId}`;
}
```

**Pros**:
- Works on all devices including Apple TV
- Good quality
- Reliable uptime
- Supports IMDb IDs

**Cons**:
- Requires IMDb IDs (you need to map your content)
- May have ads
- Third-party service reliability

---

### 2. 🌊 Torrent/Magnet Links
**Best for**: High quality, reliability, no takedowns

```javascript
// Example implementation
streams.push({
    name: 'Torrent 1080p',
    title: movieName,
    infoHash: 'TORRENT_INFO_HASH',
    fileIdx: 0,
    sources: [
        'tracker:udp://tracker.opentrackr.org:1337/announce',
        'dht:MAGNET_LINK'
    ]
});
```

**Pros**:
- Best quality available
- Can't be taken down
- Works perfectly on all Stremio clients
- Free

**Cons**:
- Need to find/index torrents for Balkan content
- Users need VPN in some countries
- Slower start time (depends on seeders)

**Sources for Balkan torrents**:
- YTS (yts.mx) - has some Yugoslav films
- RARBG mirrors
- 1337x
- TorrentGalaxy

---

### 3. 📡 Direct MP4/MKV URLs
**Best for**: Apple TV, simple implementation

```javascript
streams.push({
    name: 'Direct Stream',
    title: movieName,
    url: 'https://example.com/movie.mp4',
    behaviorHints: {
        notWebReady: false
    }
});
```

**Pros**:
- Works perfectly on Apple TV
- Fast playback start
- Simple implementation

**Cons**:
- Need reliable hosting (expensive)
- Copyright issues if hosting copyrighted content
- Bandwidth costs

---

### 4. 🔴 Ace Stream Links
**Best for**: Live TV, Serbian/Croatian channels

```javascript
streams.push({
    name: 'Ace Stream',
    title: 'RTS 1',
    type: 'acestream',
    infoHash: 'ACESTREAM_HASH',
    behaviorHints: {
        notWebReady: true
    }
});
```

**Pros**:
- Great for live TV
- Popular in Balkans
- Good quality

**Cons**:
- Doesn't work on Apple TV/iOS
- Requires Ace Stream engine
- Better for live content than movies

---

### 5. 🎬 Filmoton.net & Similar Sites
**How they work**: They embed players from these services:
- Fembed / Streamtape / Mixdrop / Doodstream
- Their own CDN servers
- Multiple backup links per movie

**To scrape them**:
```javascript
// Pseudo-code for scraping
async function scrapeFilmoton(movieUrl) {
    // 1. Fetch the movie page
    const html = await fetch(movieUrl);
    
    // 2. Find iframe embeds
    const iframes = extractIframes(html);
    
    // 3. For each iframe, extract video source
    for (const iframe of iframes) {
        if (iframe.includes('fembed')) {
            return await extractFembed(iframe);
        }
        // ... other extractors
    }
}
```

**Legal Notice**: ⚠️ Scraping copyrighted content may be illegal in your jurisdiction

---

## Recommended Approach

### For Your Use Case (Apple TV):

1. **Short-term**: Use the **addon-enhanced.js** I created
   - Already working with your 1090+ movies
   - Extracts HLS streams that work on Apple TV
   - No additional work needed

2. **Medium-term**: Add **torrent support** for high-quality content
   - Search YTS/1337x for Yugoslav/Balkan films
   - Add torrents to your JSON as backup streams
   - Users get best quality

3. **Long-term**: Hybrid approach
   - YouTube (via enhanced extraction) for free content
   - Torrents for unavailable/high-quality content
   - VidSrc as fallback for IMDb-available content

---

## Testing Your Enhanced Addon on Apple TV

1. **Install addon on your Stremio account**:
   ```
   http://YOUR_SERVER_IP:7002/manifest.json
   ```

2. **Test a movie** and check if you see these streams:
   - 🍎 HLS Stream (Apple TV) - BEST OPTION
   - 🎬 Direct 720p/1080p
   - 📺 YouTube (Fallback)

3. **On Apple TV**, select the HLS stream for native playback

---

## Example: Adding Torrents to Your Content

```javascript
// In your sevcet-films.json, add:
{
  "id": "yt:Te9s3xcF1sE",
  "type": "movie",
  "name": "Sesir profesora Koste Vujica",
  "youtubeId": "Te9s3xcF1sE",
  "torrents": [
    {
      "quality": "1080p",
      "infoHash": "HASH_HERE",
      "fileIdx": 0,
      "size": "2.1 GB"
    }
  ]
}
```

Then in your stream handler:
```javascript
// Add torrent streams
if (item.torrents) {
    for (const torrent of item.torrents) {
        streams.push({
            name: `⚡ Torrent ${torrent.quality}`,
            title: `${itemName} (${torrent.size})`,
            infoHash: torrent.infoHash,
            fileIdx: torrent.fileIdx
        });
    }
}
```

---

## Need Help?

- Test the enhanced addon on Apple TV
- If you want to add torrents, I can help you search and add them
- If you want to scrape other sites, I can help create scrapers (with legal disclaimers)
