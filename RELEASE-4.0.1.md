# v4.0.1 Release - Stream Reliability Fix

## Problem
The Invidious/Piped API instances were timing out or failing, causing users to only see the YouTube fallback option which doesn't work on Apple TV's internal player.

## Solution Implemented

### 1. **Better API Instances**
Replaced unreliable instances with tested working ones:
- ✅ `invidious.io.lol` (primary)
- ✅ `yewtu.be` (popular alternative)
- ✅ `invidious.privacyredirect.com`
- ✅ `api-piped.mha.fi` (Piped alternative)

### 2. **Faster Timeout**
- Reduced from 5 seconds to 3 seconds
- Allows faster failover between instances
- Better user experience with quicker responses

### 3. **Always-Available Fallback Players**
Even if direct stream extraction fails, users now get:

```
🎥 Invidious Player    - https://invidious.io.lol/embed/{videoId}
🌊 Piped Player        - https://piped.video/watch?v={videoId}
📺 YouTube            - ytId (for web/Android)
```

### 4. **Silent Error Handling**
- No more verbose error logs
- Cleaner output
- Continues silently to next instance

## Stream Options Users Will See

### Best Case (Direct extraction succeeds):
1. 🍎 HLS Stream (Apple TV) - m3u8 format
2. 🎬 Direct 1080p - MP4
3. 🎬 Direct 720p - MP4
4. 🎥 Invidious Player
5. 🌊 Piped Player
6. 📺 YouTube

### Fallback Case (Direct extraction fails):
1. 🎥 Invidious Player - **Works on Apple TV!**
2. 🌊 Piped Player - Alternative
3. 📺 YouTube - Web/Android only

## Testing

Test a movie stream:
```bash
curl "https://balkan-on-demand-828b9dd653f6.herokuapp.com/stream/movie/yt:c9g_UlLVtUM.json"
```

Expected response: Multiple stream options including Invidious and Piped embeds.

## Deployment

1. ✅ Code pushed to GitHub
2. ✅ Procfile updated to use `addon-enhanced.js`
3. ✅ Version bumped to 4.0.1
4. ⏳ Heroku auto-deploy from main branch

Once Heroku deploys, the improved streams will be available at:
```
https://balkan-on-demand-828b9dd653f6.herokuapp.com/manifest.json
```

## Why This Works

**Invidious & Piped embeds** are iframe-based players that:
- Work on Apple TV's internal browser/player
- Don't require direct stream extraction
- Are more reliable than API extraction
- Provide their own quality selection
- Are privacy-friendly YouTube frontends

## Next Steps

If you still have issues:
1. Check Heroku logs: `heroku logs --tail -a balkan-on-demand-828b9dd653f6`
2. Test individual Invidious instances manually
3. Consider adding torrent support for better reliability
