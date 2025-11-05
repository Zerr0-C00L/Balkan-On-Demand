const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const sevcetContent = require('./sevcet-films.json');

const CINEMETA_URL = 'https://v3-cinemeta.strem.io';

// Cache for Cinemeta lookups
const cinemetaCache = new Map();

// Cache for stream URLs
const streamCache = new Map();

// Enhanced YouTube stream extraction with better Apple TV compatibility
async function getDirectStreamUrl(videoId) {
    if (streamCache.has(videoId)) {
        const cached = streamCache.get(videoId);
        console.log(`Using cached stream URL for ${videoId}`);
        return cached;
    }
    
    try {
        // Method 1: Try Invidious instances (provides direct MP4 links) with shorter timeout
        const invidiousInstances = [
            'https://invidious.io.lol',
            'https://inv.nadeko.net',
            'https://invidious.privacyredirect.com',
            'https://yewtu.be',
            'https://invidious.nerdvpn.de'
        ];
        
        for (const instance of invidiousInstances) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000); // Reduced to 3s
                
                const response = await fetch(`${instance}/api/v1/videos/${videoId}`, { 
                    signal: controller.signal
                });
                clearTimeout(timeout);
                
                if (!response.ok) continue;
                const data = await response.json();
                
                const formats = [];
                
                // Try formatStreams first (video+audio combined - BEST for Apple TV)
                if (data.formatStreams && data.formatStreams.length > 0) {
                    for (const format of data.formatStreams) {
                        if (format.url && format.type?.includes('video/mp4')) {
                            formats.push({
                                url: format.url,
                                quality: parseInt(format.qualityLabel) || 0,
                                type: 'combined',
                                container: format.container,
                                label: format.qualityLabel || 'Unknown'
                            });
                        }
                    }
                }
                
                // Also check adaptiveFormats for HLS/DASH
                if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
                    for (const format of data.adaptiveFormats) {
                        if (format.url && format.type?.includes('video/mp4')) {
                            formats.push({
                                url: format.url,
                                quality: parseInt(format.qualityLabel) || 0,
                                type: 'adaptive',
                                container: format.container,
                                label: format.qualityLabel || 'Unknown'
                            });
                        }
                    }
                }
                
                // Check for HLS manifest (Apple TV's preferred format)
                if (data.hlsUrl) {
                    formats.push({
                        url: data.hlsUrl,
                        quality: 9999, // Prioritize HLS
                        type: 'hls',
                        container: 'm3u8',
                        label: 'HLS Stream'
                    });
                }
                
                if (formats.length > 0) {
                    // Sort by quality and prefer combined/HLS formats
                    formats.sort((a, b) => {
                        if (a.type === 'hls' && b.type !== 'hls') return -1;
                        if (b.type === 'hls' && a.type !== 'hls') return 1;
                        if (a.type === 'combined' && b.type !== 'combined') return -1;
                        if (b.type === 'combined' && a.type !== 'combined') return 1;
                        return b.quality - a.quality;
                    });
                    
                    const result = formats.map(f => ({
                        url: f.url,
                        quality: f.label,
                        type: f.container
                    }));
                    
                    console.log(`✓ Extracted ${result.length} streams for ${videoId} from ${instance}`);
                    streamCache.set(videoId, result);
                    return result;
                }
            } catch (err) {
                // Silently continue to next instance
                continue;
            }
        }
        
        // Method 2: Try Piped API (fallback) with shorter timeout
        const pipedInstances = [
            'https://pipedapi.kavin.rocks',
            'https://api-piped.mha.fi',
            'https://pipedapi.tokhmi.xyz'
        ];
        
        for (const instance of pipedInstances) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);
                
                const response = await fetch(`${instance}/streams/${videoId}`, {
                    signal: controller.signal
                });
                clearTimeout(timeout);
                
                if (!response.ok) continue;
                const data = await response.json();
                
                const formats = [];
                
                // Check for HLS URL
                if (data.hls) {
                    formats.push({
                        url: data.hls,
                        quality: 'HLS',
                        type: 'm3u8'
                    });
                }
                
                // Check video streams
                if (data.videoStreams && data.videoStreams.length > 0) {
                    for (const stream of data.videoStreams) {
                        if (stream.url) {
                            formats.push({
                                url: stream.url,
                                quality: stream.quality || 'Unknown',
                                type: stream.mimeType?.split('/')[1] || 'mp4'
                            });
                        }
                    }
                }
                
                if (formats.length > 0) {
                    console.log(`✓ Extracted ${formats.length} streams for ${videoId} from Piped`);
                    streamCache.set(videoId, formats);
                    return formats;
                }
            } catch (err) {
                continue;
            }
        }
        
        console.log(`⚠ No direct streams found for ${videoId}, using embed URLs`);
        return null;
    } catch (error) {
        console.error(`Error extracting stream URL for ${videoId}:`, error.message);
        return null;
    }
}

// Sanitize text to prevent serialization errors
function sanitizeText(text) {
    if (!text) return '';
    return text
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .replace(/\u0000/g, '')
        .trim();
}

// Search Cinemeta for proper poster and metadata
async function searchCinemeta(title, year, type = 'movie') {
    const cacheKey = `${type}:${title}:${year}`;
    
    if (cinemetaCache.has(cacheKey)) {
        return cinemetaCache.get(cacheKey);
    }
    
    try {
        const cleanTitle = title
            .replace(/\([^)]*\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        const searchQuery = encodeURIComponent(cleanTitle);
        const searchUrl = `${CINEMETA_URL}/catalog/${type}/top/search=${searchQuery}.json`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.metas && data.metas.length > 0) {
            let match = data.metas.find(m => {
                const metaYear = m.year || m.releaseInfo;
                return metaYear && metaYear.toString() === year.toString();
            });
            
            if (!match) {
                match = data.metas[0];
            }
            
            if (match) {
                const metaUrl = `${CINEMETA_URL}/meta/${type}/${match.id}.json`;
                const metaResponse = await fetch(metaUrl);
                const metaData = await metaResponse.json();
                
                const result = {
                    poster: match.poster || null,
                    background: metaData.meta?.background || null,
                    imdbId: match.id,
                    fullMeta: metaData.meta || null
                };
                
                cinemetaCache.set(cacheKey, result);
                return result;
            }
        }
    } catch (error) {
        console.error(`Cinemeta search error for ${title}:`, error.message);
    }
    
    cinemetaCache.set(cacheKey, null);
    return null;
}

// Addon manifest
const manifest = {
    id: 'org.balkan.films.enhanced',
    version: '4.0.0',
    name: 'Domaci Filmovi - Apple TV Enhanced',
    description: '1090+ Yugoslav/Balkan movies with Apple TV compatible streams (HLS/MP4)',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'domaci-filmovi',
            name: 'Domaci Filmovi',
            extra: [
                {
                    name: 'genre',
                    options: ['Domaci film', 'Akcija', 'Animirani', 'Dokumentarni', 'Horor', 'Komedija', 'Misterija', 'Romansa', 'Sci-Fi']
                },
                {
                    name: 'skip'
                }
            ]
        },
        {
            type: 'series',
            id: 'domace-serije',
            name: 'Domace Serije'
        }
    ],
    idPrefixes: ['yt:']
};

const builder = new addonBuilder(manifest);

// Catalog handler
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`Catalog request: type=${type}, id=${id}`);
    
    if (type === 'movie' && id === 'domaci-filmovi') {
        let allMovies = [...sevcetContent.movies];
        
        if (extra && extra.genre) {
            allMovies = allMovies.filter(movie => 
                movie.genres && movie.genres.some(g => g.includes(extra.genre))
            );
        }
        
        const skip = extra && extra.skip ? parseInt(extra.skip) : 0;
        const limit = 100;
        const paginatedMovies = allMovies.slice(skip, skip + limit);
        
        const metasPromises = paginatedMovies.map(async m => {
            const cinemeta = await searchCinemeta(m.name, m.releaseInfo, 'movie');
            
            return {
                id: m.id,
                type: 'movie',
                name: sanitizeText(m.name),
                poster: cinemeta?.poster || m.poster,
                posterShape: cinemeta?.poster ? 'poster' : 'landscape',
                releaseInfo: sanitizeText(m.releaseInfo),
                description: sanitizeText(m.description)
            };
        });
        
        const metas = await Promise.all(metasPromises);
        
        console.log(`Returning ${metas.length} movies`);
        return { metas };
    }
    
    if (type === 'series' && id === 'domace-serije') {
        const metasPromises = sevcetContent.series.map(async s => {
            const cinemeta = await searchCinemeta(s.name, s.releaseInfo, 'series');
            
            return {
                id: s.id,
                type: 'series',
                name: sanitizeText(s.name),
                poster: cinemeta?.poster || s.poster,
                posterShape: cinemeta?.poster ? 'poster' : 'landscape',
                releaseInfo: sanitizeText(s.releaseInfo),
                description: sanitizeText(s.description)
            };
        });
        
        const metas = await Promise.all(metasPromises);
        
        console.log(`Returning ${metas.length} series`);
        return { metas };
    }
    
    return { metas: [] };
});

// Meta handler
builder.defineMetaHandler(async ({ type, id }) => {
    console.log(`Meta request: type=${type}, id=${id}`);
    
    let item = null;
    if (type === 'movie') {
        item = sevcetContent.movies.find(m => m.id === id);
    } else if (type === 'series') {
        item = sevcetContent.series.find(s => s.id === id);
    }
    
    if (!item) {
        console.log(`No meta found for ${id}`);
        return { meta: null };
    }
    
    const cinemeta = await searchCinemeta(item.name, item.releaseInfo, type);
    
    const meta = {
        id: item.id,
        type: type,
        name: sanitizeText(item.name),
        poster: cinemeta?.poster || item.poster,
        posterShape: cinemeta?.poster ? 'poster' : 'landscape',
        background: cinemeta?.background || null,
        releaseInfo: sanitizeText(item.releaseInfo),
        description: sanitizeText(item.description || cinemeta?.fullMeta?.description || ''),
        genre: (item.genres || cinemeta?.fullMeta?.genres || []).map(g => sanitizeText(g)),
        cast: (cinemeta?.fullMeta?.cast || []).map(c => sanitizeText(c)),
        director: (cinemeta?.fullMeta?.director || []).map(d => sanitizeText(d)),
        imdbRating: cinemeta?.fullMeta?.imdbRating || null,
        runtime: cinemeta?.fullMeta?.runtime || null,
        trailers: cinemeta?.fullMeta?.trailers || [],
        links: cinemeta?.imdbId ? [{ 
            name: 'IMDb',
            category: 'imdb',
            url: `https://www.imdb.com/title/${cinemeta.imdbId}/`
        }] : []
    };
    
    if (type === 'series' && item.videos && item.videos.length > 0) {
        const yearMatch = item.releaseInfo.match(/(\d{4})/);
        const year = yearMatch ? yearMatch[1] : '1970';
        
        meta.videos = item.videos.map(v => ({
            id: `${item.id}:${v.season}:${v.episode}`,
            name: sanitizeText(v.title || `Episode ${v.episode}`),
            season: parseInt(v.season),
            episode: parseInt(v.episode),
            number: parseInt(v.episode),
            thumbnail: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
            overview: sanitizeText(item.description),
            released: new Date(`${year}-01-01`).toISOString()
        }));
    }
    
    console.log(`Returning meta for ${item.name}`);
    return { meta };
});

// Stream handler - Enhanced for Apple TV with torrent and direct stream support
builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`Stream request: type=${type}, id=${id}`);
    
    let youtubeId = null;
    let itemName = 'Video';
    let item = null;
    
    if (type === 'movie') {
        item = sevcetContent.movies.find(m => m.id === id);
        if (item) {
            youtubeId = id.replace('yt:', '');
            itemName = item.name;
        }
    } else if (type === 'series') {
        const parts = id.split(':');
        if (parts.length === 4) {
            const seriesId = `${parts[0]}:${parts[1]}`;
            const season = parseInt(parts[2]);
            const episode = parseInt(parts[3]);
            
            for (const series of sevcetContent.series) {
                if (series.id === seriesId && series.videos) {
                    const ep = series.videos.find(v => 
                        parseInt(v.season) === season && parseInt(v.episode) === episode
                    );
                    if (ep) {
                        item = series;
                        youtubeId = ep.id;
                        itemName = `${series.name} - S${season}E${episode}`;
                        break;
                    }
                }
            }
        }
    }
    
    if (!youtubeId && !item) {
        console.log(`No content found for ${id}`);
        return { streams: [] };
    }
    
    const streams = [];
    
    // Priority 1: Torrents (BEST for Apple TV - works perfectly!)
    if (item && item.torrents && item.torrents.length > 0) {
        for (const torrent of item.torrents) {
            streams.push({
                name: `⚡ Torrent ${torrent.quality}`,
                title: `${itemName} (${torrent.size || 'Unknown size'})`,
                infoHash: torrent.infoHash,
                fileIdx: torrent.fileIdx || 0,
                behaviorHints: {
                    bingeGroup: `balkan-torrent-${torrent.quality}`
                }
            });
        }
        console.log(`✓ Added ${item.torrents.length} torrent streams for ${itemName}`);
    }
    
        // Priority 2: Try to extract direct stream URLs from YouTube
    if (youtubeId) {
        console.log(`Extracting direct streams for: ${youtubeId}`);
        const directStreams = await getDirectStreamUrl(youtubeId);
        
        if (directStreams && directStreams.length > 0) {
            // Add each quality option as a separate stream
            for (const stream of directStreams) {
                const streamName = stream.type === 'm3u8' 
                    ? '🍎 HLS Stream' 
                    : `🎬 Direct ${stream.quality}`;
                
                streams.push({
                    name: streamName,
                    title: `${itemName} - ${stream.quality}`,
                    url: stream.url,
                    behaviorHints: {
                        notWebReady: false,
                        bingeGroup: `balkan-${stream.type}`
                    }
                });
            }
            console.log(`✓ Added ${directStreams.length} direct streams`);
        } else {
            console.log(`⚠ No direct streams extracted, only YouTube fallback available`);
        }
        
        // Priority 3: YouTube fallback (works on web/Android, NOT on Apple TV)
        streams.push({
            name: '📺 YouTube',
            title: itemName,
            ytId: youtubeId,
            behaviorHints: {
                notWebReady: false
            }
        });
    }
    
    // Fallback options when direct extraction fails
    // Apple TV needs actual MP4/M3U8 URLs, not embed pages
    
    // 1. Invidious direct video URL (720p MP4)
    // Using itag=22 for 720p or itag=18 for 360p combined streams
    streams.push({
        name: '� Invidious 720p',
        title: itemName,
        url: `https://invidious.io.lol/latest_version?id=${youtubeId}&itag=22`,
        behaviorHints: {
            notWebReady: false,
            bingeGroup: 'balkan-inv-720'
        }
    });
    
    // 2. Invidious 360p (more reliable, smaller file)
    streams.push({
        name: '🎥 Invidious 360p',
        title: itemName,
        url: `https://invidious.io.lol/latest_version?id=${youtubeId}&itag=18`,
        behaviorHints: {
            notWebReady: false,
            bingeGroup: 'balkan-inv-360'
        }
    });
    
    // 3. Alternative Invidious instance
    streams.push({
        name: '🔄 Alt Server 720p',
        title: itemName,
        url: `https://yewtu.be/latest_version?id=${youtubeId}&itag=22`,
        behaviorHints: {
            notWebReady: false,
            bingeGroup: 'balkan-yewtu'
        }
    });
    
    // 4. YouTube as last resort (for web/Android only)
    streams.push({
        name: '📺 YouTube (Web Only)',
        title: itemName,
        ytId: youtubeId,
        behaviorHints: {
            notWebReady: false
        }
    });
    
    console.log(`Returning ${streams.length} stream options for: ${itemName}`);
    return { streams };
});

// Start the server
const port = process.env.PORT || 7002;
serveHTTP(builder.getInterface(), { port: port });

console.log(`\n🎬 Domaci Filmovi (Apple TV Enhanced) is running!`);
console.log(`📡 ${sevcetContent.movies.length} movies and ${sevcetContent.series.length} series available`);
console.log(`🍎 Apple TV compatible HLS & MP4 streams`);
console.log(`🔗 Install: http://127.0.0.1:${port}/manifest.json\n`);
