const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const movies = require('./movies.json');

// Addon manifest
const manifest = {
    id: 'org.balkan.movies',
    version: '1.0.0',
    name: 'Balkan On Demand',
    description: 'Stream popular movies and TV shows from the Balkan region (ex-Yugoslavia)',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'balkan-movies',
            name: 'Balkan Movies',
            extra: [
                {
                    name: 'genre',
                    options: ['Drama', 'Comedy', 'War', 'Crime', 'Romance', 'Thriller']
                },
                {
                    name: 'skip'
                }
            ]
        },
        {
            type: 'series',
            id: 'balkan-series',
            name: 'Balkan TV Series'
        }
    ],
    idPrefixes: ['tt', 'balkan:', 'dailymotion:']
};

// Cache for Cinemeta metadata and Dailymotion content
const metaCache = new Map();
const archiveCache = new Map();
let archiveCatalog = [];
let lastArchiveFetch = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Ex-Yu streaming websites
const EX_YU_SOURCES = [
    { name: 'Filmoton.net', searchUrl: 'https://filmoton.net' },
    { name: 'Filmativa.club', searchUrl: 'https://filmativa.club' },
    { name: 'DomaciFilmovi.online', searchUrl: 'https://domacifilmovi.online' },
    { name: 'ToSuSamoFilmovi.rs.ba', searchUrl: 'https://tosusamofilmovi.rs.ba' },
    { name: 'FenixSite.net', searchUrl: 'https://www.fenixsite.net' },
    { name: 'FilmoviX.net', searchUrl: 'https://www.filmovix.net' },
    { name: 'PopcornFilmovi.com', searchUrl: 'https://www.popcornfilmovi.com' }
];

// Generate Ex-Yu website search links
function generateExYuLinks(name, source) {
    // Use search URL for all sites since we can't predict exact movie URLs
    return `${source.searchUrl}/?s=${encodeURIComponent(name)}`;
}

// Get Ex-Yu website streams
function getExYuStreams(name) {
    const streams = [];
    const cleanName = name.replace(/\(.*?\)/g, '').trim();
    
    // Add YouTube search first (most likely to have full movies)
    streams.push({
        name: 'Balkan On Demand',
        title: `🎬 YouTube Search\n${cleanName} - Full Movie`,
        externalUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanName + ' ceo film')}`,
        behaviorHints: {
            notWebReady: true
        }
    });
    
    // Add Archive.org search
    streams.push({
        name: 'Balkan On Demand',
        title: `📼 Archive.org\n${cleanName}`,
        externalUrl: `https://archive.org/search.php?query=${encodeURIComponent(cleanName)}`,
        behaviorHints: {
            notWebReady: true
        }
    });
    
    // Add Ex-Yu sites
    for (const source of EX_YU_SOURCES) {
        const url = generateExYuLinks(cleanName, source);
        streams.push({
            name: 'Balkan On Demand',
            title: `🔍 ${source.name}\n${cleanName}`,
            externalUrl: url,
            behaviorHints: {
                notWebReady: true
            }
        });
    }
    
    return streams;
}

// Fetch metadata from Cinemeta with caching and timeout
async function getCinemetaMeta(type, id, timeoutMs = 3000) {
    const cacheKey = `${type}:${id}`;
    
    // Check cache first
    if (metaCache.has(cacheKey)) {
        return metaCache.get(cacheKey);
    }
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`, {
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
            metaCache.set(cacheKey, null);
            return null;
        }
        
        const data = await response.json();
        metaCache.set(cacheKey, data.meta);
        return data.meta;
    } catch (error) {
        console.error(`Error fetching from Cinemeta for ${id}:`, error.message);
        metaCache.set(cacheKey, null);
        return null;
    }
}

// Fetch all Yugoslav content from Internet Archive
async function fetchDailymotionCatalog() {
    const now = Date.now();
    
    // Return cached catalog if still valid
    if (archiveCatalog.length > 0 && (now - lastArchiveFetch) < CACHE_DURATION) {
        return archiveCatalog;
    }
    
    console.log('Fetching Yugoslav content from Dailymotion...');
    const items = [];
    const seenIds = new Set();
    
    try {
        // Search using Balkan hashtags
        const hashtags = [
            'domaci',
            'filmovi',
            'serije',
            'ex-yu',
            'balkan',
            'yugoslav',
            'srpski',
            'hrvatski',
            'bosanski',
            'makedonski',
            'crnogorski',
            'jugoslovenski'
        ];
        
        // Fetch from exyuretrotv channel first
        try {
            const channelUrl = `https://api.dailymotion.com/user/exyuretrotv/videos?fields=id,title,description,thumbnail_360_url,duration,created_time&limit=100&sort=recent`;
            
            const response = await fetch(channelUrl, {
                signal: AbortSignal.timeout(15000)
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.list) {
                    for (const video of data.list) {
                        if (video.duration > 600 && !seenIds.has(video.id)) { // 10+ minutes
                            seenIds.add(video.id);
                            const year = video.created_time ? new Date(video.created_time * 1000).getFullYear() : 'Unknown';
                            
                            items.push({
                                id: `dailymotion:${video.id}`,
                                type: video.duration > 2400 ? 'movie' : 'series', // 40+ min = movie
                                name: video.title,
                                poster: video.thumbnail_360_url || 'https://via.placeholder.com/360x203/1a1a2e/16213e?text=Video',
                                posterShape: 'poster',
                                description: video.description || 'Yugoslav/Balkan content',
                                releaseInfo: year.toString(),
                                dailymotionId: video.id
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching from exyuretrotv:', error.message);
        }
        
        // Search using hashtags for more content
        for (const tag of hashtags) {
            try {
                const searchUrl = `https://api.dailymotion.com/videos?search=%23${tag}&fields=id,title,description,thumbnail_360_url,duration,created_time&limit=50&sort=relevance`;
                
                const response = await fetch(searchUrl, {
                    signal: AbortSignal.timeout(10000)
                });
                
                if (!response.ok) continue;
                
                const data = await response.json();
                
                if (data.list) {
                    for (const video of data.list) {
                        if (video.duration > 600 && !seenIds.has(video.id)) { // 10+ minutes, no duplicates
                            seenIds.add(video.id);
                            const year = video.created_time ? new Date(video.created_time * 1000).getFullYear() : 'Unknown';
                            
                            items.push({
                                id: `dailymotion:${video.id}`,
                                type: video.duration > 2400 ? 'movie' : 'series',
                                name: video.title,
                                poster: video.thumbnail_360_url || 'https://via.placeholder.com/360x203/1a1a2e/16213e?text=Video',
                                posterShape: 'poster',
                                description: video.description || 'Yugoslav/Balkan content',
                                releaseInfo: year.toString(),
                                dailymotionId: video.id
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Error fetching hashtag #${tag}:`, error.message);
            }
        }
        
        console.log(`Fetched ${items.length} videos from Dailymotion`);
        archiveCatalog = items;
        lastArchiveFetch = now;
        
    } catch (error) {
        console.error('Error fetching Dailymotion catalog:', error);
    }
    
    return items;
}

const builder = new addonBuilder(manifest);

// Catalog handler - returns basic info with poster for display
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`Catalog request: type=${type}, id=${id}`);
    
    if (type === 'movie' && id === 'balkan-movies') {
        // Combine local movies with Dailymotion catalog
        const localMovies = movies.movies || [];
        const archiveMovies = await fetchDailymotionCatalog();
        
        let allMovies = [...localMovies, ...archiveMovies];
        
        // Filter by genre if requested
        if (extra && extra.genre) {
            allMovies = allMovies.filter(movie => 
                movie.genres && movie.genres.includes(extra.genre)
            );
        }
        
        // Apply pagination
        const skip = extra && extra.skip ? parseInt(extra.skip) : 0;
        const limit = 100;
        allMovies = allMovies.slice(skip, skip + limit);
        
        // Fetch Cinemeta posters for IMDB IDs with faster timeout for catalog
        const metas = await Promise.all(allMovies.map(async m => {
            // Always include local data as base
            const baseMeta = {
                id: m.id,
                type: 'movie',
                name: m.name,
                poster: m.poster || `https://archive.org/services/img/${m.archiveId || 'default'}`,
                posterShape: 'poster'
            };
            
            if (m.id.startsWith('tt')) {
                try {
                    const cinemetaMeta = await getCinemetaMeta('movie', m.id, 2000);
                    if (cinemetaMeta && cinemetaMeta.poster) {
                        return {
                            ...baseMeta,
                            name: cinemetaMeta.name || baseMeta.name,
                            poster: cinemetaMeta.poster
                        };
                    }
                } catch (error) {
                    console.error(`Failed to fetch poster for ${m.id}:`, error.message);
                }
            }
            
            return baseMeta;
        }));
        
        return { metas };
    }
    
    if (type === 'series' && id === 'balkan-series') {
        const series = movies.series || [];
        const metas = await Promise.all(series.map(async s => {
            const baseMeta = {
                id: s.id,
                type: 'series',
                name: s.name,
                poster: s.poster || `https://via.placeholder.com/300x450/1a1a2e/16213e?text=${encodeURIComponent(s.name)}`,
                posterShape: 'poster'
            };
            
            if (s.id.startsWith('tt')) {
                try {
                    const cinemetaMeta = await getCinemetaMeta('series', s.id, 2000);
                    if (cinemetaMeta && cinemetaMeta.poster) {
                        return {
                            ...baseMeta,
                            name: cinemetaMeta.name || baseMeta.name,
                            poster: cinemetaMeta.poster
                        };
                    }
                } catch (error) {
                    console.error(`Failed to fetch poster for ${s.id}:`, error.message);
                }
            }
            
            return baseMeta;
        }));
        return { metas };
    }
    
    return { metas: [] };
});

// Meta handler - fetches full metadata from Cinemeta for IMDB IDs
builder.defineMetaHandler(async ({ type, id }) => {
    console.log(`Meta request: type=${type}, id=${id}`);
    
    // Check local movies first
    let localItem = null;
    if (type === 'movie') {
        localItem = movies.movies?.find(m => m.id === id);
    } else if (type === 'series') {
        localItem = movies.series?.find(s => s.id === id);
    }
    
    // Check Dailymotion catalog
    if (!localItem && id.startsWith('dailymotion:')) {
        const dailymotionMovies = await fetchDailymotionCatalog();
        localItem = dailymotionMovies.find(m => m.id === id);
    }
    
    if (!localItem) {
        return { meta: null };
    }
    
    // If it has an IMDB ID (starts with 'tt'), fetch from Cinemeta
    if (id.startsWith('tt')) {
        const cinemetaMeta = await getCinemetaMeta(type, id);
        if (cinemetaMeta) {
            // Merge Cinemeta data with our local data
            return {
                meta: {
                    ...cinemetaMeta,
                    // Add Balkan-specific info
                    description: cinemetaMeta.description || localItem.description,
                    country: localItem.country
                }
            };
        }
    }
    
    // Fallback to local/archive data
    return { meta: localItem };
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
    
    // Extract base ID for series (remove episode info)
    const baseId = id.split(':')[0];
    
    let item = null;
    let searchName = name;
    let year = null;
    
    // Check local movies first
    if (type === 'movie') {
        item = movies.movies?.find(m => m.id === baseId);
    } else if (type === 'series') {
        item = movies.series?.find(s => s.id === baseId);
    }
    
    // Extract info from item
    if (item) {
        searchName = item.name;
        year = item.releaseInfo;
    }
    
    // If we have an IMDB ID but no name yet, fetch metadata from Cinemeta
    if (baseId.startsWith('tt') && !searchName) {
        try {
            const meta = await getCinemetaMeta(type, baseId, 3000);
            if (meta) {
                searchName = meta.name;
                year = meta.releaseInfo || meta.year;
                console.log(`Fetched name from Cinemeta: ${searchName}`);
            }
        } catch (error) {
            console.error('Failed to fetch metadata:', error.message);
        }
    }
    
    // Get manual streams from movies.json if available
    const manualStreams = item?.streams || [];
    
    let exYuStreams = [];
    
    // If this is a Dailymotion catalog item, get streams directly
    if (baseId.startsWith('dailymotion:')) {
        const dailymotionId = baseId.replace('dailymotion:', '');
        const dailymotionStreams = await getDailymotionStreams(dailymotionId);
        const allStreams = [...manualStreams, ...dailymotionStreams];
        console.log(`Returning ${allStreams.length} streams for Dailymotion video ${dailymotionId}`);
        return { streams: allStreams };
    }
    
    // For IMDB/regular movies, only show search links (no random Dailymotion results)
    if (searchName) {
        exYuStreams = getExYuStreams(searchName);
    }
    
    // Combine: manual first, then search links
    const allStreams = [...manualStreams, ...exYuStreams];
    
    console.log(`Returning ${allStreams.length} streams for ${searchName || id}`);
    return { streams: allStreams };
});

// Start the server
const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });

console.log(`\n🎬 Balkan On Demand Addon is running!`);
console.log(`📡 Addon URL: http://127.0.0.1:${port}/manifest.json`);
console.log(`🔗 Install in Stremio: http://127.0.0.1:${port}/manifest.json\n`);
