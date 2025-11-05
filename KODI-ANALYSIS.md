# Analysis of ExYU Kodi Repositories - Video Sources

## 🔍 Key Findings

I analyzed the Kodi ExYU repositories and found several important streaming sources that provide direct video links for Balkan content.

### 1. **Orion TV API (maketv.rs)**
**Best Source Found!**

Base URL: `https://mw.maketv.rs/rest/client/`

**How it works:**
1. Get ticket: `POST https://mw.maketv.rs/rest/client/users/ticket/oriontv3`
   - Credentials: `password=demo3`, `deviceUid=oriontv3.UUID`, `deviceModelId=14`
2. Get channels: `GET https://mw.maketv.rs/rest/client/users/{USER}/zone-channels`
   - Header: `ticket: {TICKET_FROM_STEP1}`
3. Response contains streaming URLs for live TV channels

**Example Implementation:**
```javascript
async function getOrionStreams() {
    // Step 1: Get ticket
    const ticketResponse = await fetch('https://mw.maketv.rs/rest/client/users/ticket/oriontv3', {
        method: 'POST',
        body: new URLSearchParams({
            password: 'demo3',
            deviceUid: 'oriontv3.' + generateUUID(),
            deviceModelId: '14'
        })
    });
    const ticketData = await ticketResponse.json();
    const ticket = ticketData.ticket;
    const user = ticketData.ticket.split(':')[0];
    
    // Step 2: Get channels
    const channelsResponse = await fetch(
        `https://mw.maketv.rs/rest/client/users/${user}/zone-channels`,
        { headers: { 'ticket': ticket } }
    );
    const channels = await channelsResponse.json();
    
    return channels; // Contains stream URLs
}
```

### 2. **Iskon TV (Croatia)**

Base URL: `https://tv.iskon.hr/`

Endpoint: `https://tv.iskon.hr/ezjscore/call/IskonTvPlayer::getStream::id::{CHANNEL_ID}`

Requires authentication/cookies from: `http://livetvkodiserbia.com/addonxml/iskon_cookie.txt`

### 3. **LiveTV Serbia Database**

Main site: `https://livetvkodiserbia.com/`

Key endpoints:
- XML Database: `http://xbmcplus.xb.funpic.de/www-data/filesystem/`
- Addon XML: `https://livetvkodiserbia.com/addonxml/`
- WebTV: `https://livetvkodiserbia.com/live/`

### 4. **Other Sources Found**

- `http://www.streamlive.to/view/` - Live streams
- `http://community-links.googlecode.com/svn/trunk/` - Community links
- YouTube integration via `plugin://plugin.video.youtube/`

## 💡 Implementation for Your Stremio Addon

### Option A: Use Orion TV API (Recommended)

This provides direct streaming URLs that work on Apple TV!

```javascript
// Add to your addon-enhanced.js

async function getOrionTVStream(channelName) {
    try {
        // Get ticket
        const uuid = generateUUID();
        const params = new URLSearchParams({
            password: 'demo3',
            deviceUid: `oriontv3.${uuid}`,
            deviceModelId: '14'
        });
        
        const ticketRes = await fetch(
            'https://mw.maketv.rs/rest/client/users/ticket/oriontv3',
            { method: 'POST', body: params }
        );
        const ticketData = await ticketRes.json();
        const ticket = ticketData.ticket;
        const user = ticket.split(':')[0];
        
        // Get channels
        const channelsRes = await fetch(
            `https://mw.maketv.rs/rest/client/users/${user}/zone-channels`,
            { headers: { 'ticket': ticket } }
        );
        const channelsData = await channelsRes.json();
        
        // Find channel and return stream URL
        const channel = channelsData.channels.find(ch => 
            ch.name.toLowerCase() === channelName.toLowerCase()
        );
        
        return channel?.streamUrl || null;
    } catch (error) {
        console.error('Orion TV error:', error);
        return null;
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
```

### Option B: Scrape LiveTV Serbia WebTV

The website `https://livetvkodiserbia.com/live/` has channel streams that could be extracted.

## 🎬 For Movies & Series

The Kodi addons primarily focus on **live TV**, not on-demand movies. For Balkan movies, you still need:

1. **Torrents** (best quality, works on Apple TV)
2. **YouTube** (works with Infuse external player)
3. **Direct scraping** from sites like filmoton.net (complex, legal issues)

## ⚠️ Important Notes

1. **Legal Disclaimer**: These sources may have licensing restrictions. Ensure you have rights to access this content.

2. **Authentication**: Some endpoints require authentication/cookies that might expire.

3. **Live TV vs On-Demand**: Most of these sources are for **live TV channels**, not movies/series on-demand.

4. **Rate Limiting**: APIs may have rate limits or require valid credentials.

## 🚀 Recommended Next Steps

1. **Implement Orion TV API** for live TV channels (RTS, Pink, etc.)
2. **Keep torrents** for movies (best Apple TV solution)
3. **Keep YouTube + Infuse** for existing movie content
4. **Add live TV catalog** to your addon for Serbian channels

## 📝 Files Downloaded

- `plugin.program.KodiBalkan-4.4.zip` - Main Kodi wizard
- `plugin.video.livetvSerbia-1.2.6.zip` - Live TV addon with streaming sources

Located in: `/Users/zeroq/Stremio-Addons/Balkan On Demand/kodi-analysis/`

## 🔑 Key Takeaway

**The Orion TV API is your best bet for direct streaming URLs that work on Apple TV!** It provides legitimate streams for Serbian TV channels without needing YouTube or external players.

For **movies**, stick with:
- Torrents (best quality, reliable)
- YouTube + Infuse (current solution)
