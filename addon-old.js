const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const sevcetContent = require('./sevcet-films.json');
const sevcetContent = require('./sevcet-films.json');

// Addon manifest
const manifest = {
    id: 'org.balkan.youtube',
    version: '2.0.0',
    name: 'Domaci Filmovi i Serije',
    description: '1090+ Yugoslav/Balkan movies and series with direct YouTube streams',
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
    idPrefixes: ['youtube:']
};

// Simple cache
const metaCache = new Map();

const builder = new addonBuilder(manifest);

// Catalog handler - returns basic info with poster for display
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`Catalog request: type=${type}, id=${id}`);
    
    if (type === 'movie' && id === 'domaci-filmovi') {
        // Use sevcet's YouTube content (1090 movies!)
        let allMovies = [...sevcetContent.movies];
        
        // Filter by genre if requested
        if (extra && extra.genre) {
            allMovies = allMovies.filter(movie => 
                movie.genres && movie.genres.some(g => g.toLowerCase().includes(extra.genre.toLowerCase()))
            );
        }
        
        // Apply pagination
        const skip = extra && extra.skip ? parseInt(extra.skip) : 0;
        const limit = 100;
        allMovies = allMovies.slice(skip, skip + limit);
        
        const metas = allMovies.map(m => ({
            id: m.id,
            type: 'movie',
            name: m.name,
            poster: m.poster,
            posterShape: 'poster',
            releaseInfo: m.releaseInfo,
            description: m.description
        }));
        
        return { metas };
    }
    
    if (type === 'series' && id === 'domace-serije') {
        // Use sevcet's YouTube series (12 series with episodes!)
        const metas = sevcetContent.series.map(s => ({
            id: s.id,
            type: 'series',
            name: s.name,
            poster: s.poster,
            posterShape: 'poster',
            releaseInfo: s.releaseInfo,
            description: s.description
        }));
        
        return { metas };
    }
    
    return { metas: [] };
});

// Meta handler - fetches full metadata from Cinemeta for IMDB IDs
builder.defineMetaHandler(async ({ type, id }) => {
    console.log(`Meta request: type=${type}, id=${id}`);
    
    // Check sevcet's content first
    let item = null;
    if (type === 'movie') {
        item = sevcetContent.movies.find(m => m.id === id);
    } else if (type === 'series') {
        item = sevcetContent.series.find(s => s.id === id);
        
        // Add videos array for series with episodes
        if (item && item.videos) {
            const meta = {
                ...item,
                videos: item.videos.map(v => ({
                    id: `${id}:${v.season}:${v.episode}`,
                    title: v.title || `S${v.season}E${v.episode}`,
                    season: parseInt(v.season),
                    episode: parseInt(v.episode),
                    released: item.releaseInfo
                }))
            };
            return { meta };
        }
    }
    
    if (!item) {
        return { meta: null };
    }
    
    return { meta: item };
});

// Validate stream URL is accessible
async function validateStream(url) {
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
        });
        return response.ok && response.status === 200;
    } catch (error) {
        return false;
    }
}

// Search Dailymotion for Yugoslav/Balkan content using hashtags
async function searchDailymotion(name, year) {
    const streams = [];
    
    try {
        // Clean the search query
        const cleanName = name.replace(/\(.*?\)/g, '').trim();
        const searchTerms = [
            `${cleanName} ${year || ''}`,
            `${cleanName} #domaci`,
            `${cleanName} #filmovi`,
            `${cleanName} #ex-yu`,
            cleanName
        ];
        
        for (const searchTerm of searchTerms) {
            try {
                const query = encodeURIComponent(searchTerm);
                // Search with hashtags and in Dailymotion
                let searchUrl = `https://api.dailymotion.com/videos?search=${query}&fields=id,title,duration,thumbnail_360_url&limit=10&sort=relevance`;
                
                const response = await fetch(searchUrl, {
                    signal: AbortSignal.timeout(5000)
                });
                
                if (!response.ok) continue;
                
                const data = await response.json();
                
                if (data.list?.length > 0) {
                    for (const video of data.list) {
                        const watchUrl = `https://www.dailymotion.com/video/${video.id}`;
                        
                        // Determine quality based on duration
                        const quality = video.duration > 3600 ? 'HD' : 'SD';
                        const durationMin = Math.floor(video.duration / 60);
                        
                        streams.push({
                            name: 'Dailymotion',
                            title: `🎬 ${video.title} - ${quality} (${durationMin}min)`,
                            url: watchUrl,
                            externalUrl: watchUrl,
                            behaviorHints: {
                                notWebReady: true
                            }
                        });
                    }
                    
                    // If we found streams, break
                    if (streams.length > 0) break;
                }
            } catch (error) {
                console.error('Dailymotion search error:', error.message);
            }
        }
    } catch (error) {
        console.error('Error searching Dailymotion:', error);
    }
    
    return streams;
}

// Get streams directly from Dailymotion video ID
async function getDailymotionStreams(dailymotionId) {
    const streams = [];
    
    try {
        const videoUrl = `https://api.dailymotion.com/video/${dailymotionId}?fields=id,title,duration,thumbnail_360_url`;
        const response = await fetch(videoUrl, {
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) return streams;
        
        const video = await response.json();
        
        const watchUrl = `https://www.dailymotion.com/video/${video.id}`;
        const quality = video.duration > 3600 ? 'HD' : 'SD';
        const durationMin = Math.floor(video.duration / 60);
        
        streams.push({
            name: 'Dailymotion',
            title: `🎬 ${video.title} - ${quality} (${durationMin}min)`,
            url: watchUrl,
            externalUrl: watchUrl,
            behaviorHints: {
                notWebReady: true
            }
        });
        
    } catch (error) {
        console.error(`Error fetching streams for ${dailymotionId}:`, error.message);
    }
    
    return streams;
}

// Stream handler - searches entire Internet Archive for ANY content
builder.defineStreamHandler(async ({ type, id, name }) => {
    console.log(`Stream request: type=${type}, id=${id}, name=${name}`);
    
    // Extract base ID and episode info for series
    const parts = id.split(':');
    const baseId = parts[0];
    const season = parts[1];
    const episode = parts[2];
    
    // Check sevcet's content first
    let item = null;
    if (type === 'movie') {
        item = sevcetContent.movies.find(m => m.id === baseId);
    } else if (type === 'series') {
        item = sevcetContent.series.find(s => s.id === baseId);
    }
    
    // If this is a YouTube item from sevcet's collection
    if (item && baseId.startsWith('yt:')) {
        const streams = [];
        
        // For series, find the specific episode
        if (type === 'series' && item.videos && season && episode) {
            const ep = item.videos.find(v => v.season === season && v.episode === parseInt(episode));
            if (ep) {
                streams.push({
                    title: `▶️ YouTube\n${item.name} - ${ep.title || `S${season}E${episode}`}`,
                    ytId: ep.id
                });
            }
        } 
        // For movies, use the single YouTube ID
        else if (item.youtubeId) {
            streams.push({
                title: `▶️ YouTube\n${item.name} (${item.releaseInfo || ''})`,
                ytId: item.youtubeId
            });
        }
        
        console.log(`Returning ${streams.length} YouTube stream(s) for ${item.name}`);
        return { streams };
    }
    
    // Fallback to search links for IMDB content
    if (baseId.startsWith('tt')) {
        const searchName = name || 'Unknown';
        const exYuStreams = getExYuStreams(searchName);
        console.log(`Returning ${exYuStreams.length} search links for ${searchName}`);
        return { streams: exYuStreams };
    }
    
    console.log(`No streams found for ${id}`);
    return { streams: [] };
});

// Start the server
const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });

console.log(`\n🎬 Balkan On Demand Addon is running!`);
console.log(`📡 Addon URL: http://127.0.0.1:${port}/manifest.json`);
console.log(`🔗 Install in Stremio: http://127.0.0.1:${port}/manifest.json\n`);
