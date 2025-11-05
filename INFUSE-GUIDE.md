# Using Your Addon with Infuse on Apple TV

## ✅ Great News!

**Infuse DOES support YouTube links!** Your addon will work with Infuse on Apple TV without any modifications.

## 🎯 The Confusion

- **Stremio on Apple TV**: ❌ Does NOT support YouTube (`ytId`)
- **Infuse on Apple TV**: ✅ DOES support YouTube (`ytId`)

## 📱 How to Use with Infuse

### Step 1: Install Infuse on Apple TV
Download Infuse from the App Store on your Apple TV.

### Step 2: Add Your Addon to Infuse
Since Infuse doesn't have a built-in addon system like Stremio, you'll need to use one of these methods:

#### Option A: Use Stremio Web as Bridge
1. Open Stremio Web (https://web.stremio.com) on your computer
2. Install your addon: `https://balkan-on-demand-828b9dd653f6.herokuapp.com/manifest.json`
3. Infuse can access streams through Stremio's catalog

#### Option B: Direct Streaming (Recommended)
Since Infuse doesn't directly support Stremio addons, you'll need to:

1. **Create an Infuse-compatible feed** (XML/JSON)
2. **Or use Jellyfin/Plex as intermediary**
3. **Or manually add YouTube links to Infuse**

## 🔄 The Better Solution: Multi-Platform Addon

Let me modify your addon to work with BOTH:
- Stremio (with torrents for Apple TV)
- Infuse (with YouTube support)

Your addon can detect which client is requesting and provide appropriate streams!

## 🎬 Current Situation

Your addon URL: `https://balkan-on-demand-828b9dd653f6.herokuapp.com/manifest.json`

**Works with:**
- ✅ Stremio on Web (YouTube)
- ✅ Stremio on Android (YouTube)
- ✅ Stremio on Windows/Mac (YouTube)
- ⚠️ Stremio on Apple TV (needs torrents or direct URLs)

**For Infuse:**
- Infuse doesn't use Stremio addons directly
- Would need a different integration approach

## 💡 Recommendations

### If Using Stremio on Apple TV:
- Add torrent support (as we already did)
- Torrents work perfectly in Stremio Apple TV

### If Using Infuse on Apple TV:
- Your YouTube links will work!
- But Infuse doesn't support Stremio addon format
- Need to create Infuse-compatible format

### Best Solution:
Keep using **Stremio** with your addon, and add **torrents** for Apple TV playback. This gives you:
- ✅ Works on all Stremio platforms
- ✅ Apple TV support via torrents
- ✅ No need for multiple apps

## 🤔 Which Are You Using?

**Are you trying to use:**
1. Stremio app on Apple TV? → You need torrents
2. Infuse app on Apple TV? → YouTube works, but need different addon format

Let me know and I can help with the right solution!
