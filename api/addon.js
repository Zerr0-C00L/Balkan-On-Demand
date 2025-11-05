const { addonBuilder } = require('stremio-addon-sdk');
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
    idPrefixes: ['tt', 'balkan:']
};

// Cache for Cinemeta metadata and scraped content
const metaCache = new Map();
const streamCache = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Ex-Yu streaming websites to scrape
const EX_YU_SOURCES = [
    {
        name: 'Filmoton.net',
        searchUrl: 'https://filmoton.net',
        type: 'html'
    },
    {
        name: 'Filmativa.club',
        searchUrl: 'https://filmativa.club',
        type: 'html'
    },
    {
        name: 'DomaciFilmovi.online',
        searchUrl: 'https://domacifilmovi.online',
        type: 'html'
    },
    {
        name: 'ToSuSamoFilmovi.rs.ba',
        searchUrl: 'https://tosusamofilmovi.rs.ba',
        type: 'html'
    },
    {
        name: 'FenixSite.net',
        searchUrl: 'https://www.fenixsite.net',
        type: 'html'
    },
    {
        name: 'FilmoviX.net',
        searchUrl: 'https://www.filmovix.net',
        type: 'html'
    },
    {
        name: 'PopcornFilmovi.com',
        searchUrl: 'https://www.popcornfilmovi.com',
        type: 'html'
    }
];

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

// Extract video URLs from webpage HTML
async function extractStreamFromPage(url, sourceName) {
    try {
        console.log(`Scraping ${sourceName}: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) return [];
        
        const html = await response.text();
        const streams = [];
        
        // Extract video sources using regex patterns
        const patterns = [
            // Direct video sources
            /<video[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/gi,
            /src:\s*["']([^"']+\.mp4[^"']*)["']/gi,
            /file:\s*["']([^"']+\.mp4[^"']*)["']/gi,
            // iframe embeds
            /<iframe[^>]+src=["']([^"']+)["']/gi,
            // Common CDN patterns
            /https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mpd)[^"'\s]*/gi
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const streamUrl = match[1] || match[0];
                if (streamUrl && !streamUrl.includes('google') && !streamUrl.includes('facebook')) {
                    streams.push({
                        name: sourceName,
                        title: `🎬 ${sourceName}`,
                        url: streamUrl.startsWith('http') ? streamUrl : new URL(streamUrl, url).href,
                        behaviorHints: {
                            notWebReady: false
                        }
                    });
                }
            }
        }
        
        // If no direct streams found, return the page URL for external viewing
        if (streams.length === 0) {
            streams.push({
                name: sourceName,
                title: `📺 Watch on ${sourceName}`,
                externalUrl: url,
                behaviorHints: {
                    notWebReady: true
                }
            });
        }
        
        return streams;
    } catch (error) {
        console.error(`Error scraping ${sourceName}:`, error.message);
        return [];
    }
}

const builder = new addonBuilder(manifest);

// Catalog handler - returns basic info with poster for display
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`Catalog request: type=${type}, id=${id}`);
    
    if (type === 'movie' && id === 'balkan-movies') {
        // Use only local curated movies with Cinemeta artwork
        const localMovies = movies.movies || [];
        
        let allMovies = [...localMovies];
        
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

// Search Dailymotion for Yugoslav/Balkan content
async function searchDailymotion(name, year) {
    const streams = [];
    
    try {
        const cleanName = name.replace(/\(.*?\)/g, '').trim();
        const searchTerms = [
            `${cleanName} ${year || ''}`,
            `${cleanName} srpski`,
            `${cleanName} hrvatski`,
            `${cleanName} bosanski`,
            `${cleanName} film`
        ];
        
        for (const searchTerm of searchTerms) {
            try {
                const query = encodeURIComponent(searchTerm);
                // Dailymotion API search
                const searchUrl = `https://api.dailymotion.com/videos?search=${query}&fields=id,title,duration,quality,url&limit=10`;
                
                const response = await fetch(searchUrl, {
                    signal: AbortSignal.timeout(5000)
                });
                
                if (!response.ok) continue;
                
                const data = await response.json();
                
                if (data.list && data.list.length > 0) {
                    for (const video of data.list) {
                        const duration = Math.floor(video.duration / 60);
                        const quality = video.quality || 'SD';
                        
                        streams.push({
                            title: `▶️ Dailymotion - ${quality} (${duration}min)`,
                            url: `https://www.dailymotion.com/embed/video/${video.id}`,
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

// Search Ex-Yu websites for content by name
async function searchExYuSites(name, year) {
    const cacheKey = `${name}-${year}`;
    
    // Check cache first
    const cached = streamCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log(`Using cached streams for: ${name}`);
        return cached.streams;
    }
    
    const streams = [];
    const cleanName = name.replace(/\(.*?\)/g, '').trim().toLowerCase();
    
    try {
        // Search patterns for different sites
        const searchUrls = [
            `https://filmoton.net/?s=${encodeURIComponent(cleanName)}`,
            `https://filmativa.club/?s=${encodeURIComponent(cleanName)}`,
            `https://domacifilmovi.online/?s=${encodeURIComponent(cleanName)}`,
            `https://tosusamofilmovi.rs.ba/?s=${encodeURIComponent(cleanName)}`,
            `https://www.fenixsite.net/?s=${encodeURIComponent(cleanName)}`,
            `https://www.filmovix.net/?s=${encodeURIComponent(cleanName)}`,
            `https://www.popcornfilmovi.com/?s=${encodeURIComponent(cleanName)}`
        ];
        
        // Try to find movie pages
        for (let i = 0; i < searchUrls.length; i++) {
            try {
                const source = EX_YU_SOURCES[i];
                const response = await fetch(searchUrls[i], {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    signal: AbortSignal.timeout(8000)
                });
                
                if (!response.ok) continue;
                
                const html = await response.text();
                
                // Extract movie page links
                const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
                const links = [];
                let match;
                
                while ((match = linkPattern.exec(html)) !== null) {
                    const link = match[1];
                    if (link && link.includes(source.searchUrl) && 
                        (link.includes('/film') || link.includes('/movie') || 
                         link.includes(cleanName.split(' ')[0]))) {
                        links.push(link);
                    }
                }
                
                // Extract streams from first matching page
                if (links.length > 0) {
                    const pageStreams = await extractStreamFromPage(links[0], source.name);
                    streams.push(...pageStreams);
                }
                
            } catch (error) {
                console.error(`Error searching ${EX_YU_SOURCES[i].name}:`, error.message);
            }
        }
        
        // Cache the results
        streamCache.set(cacheKey, {
            streams,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Error searching Ex-Yu sites:', error);
    }
    
    return streams;
}



// Stream handler - searches entire Internet Archive for ANY content
builder.defineStreamHandler(async ({ type, id, name }) => {
    console.log(`Stream request: type=${type}, id=${id}, name=${name}`);
    
    let item = null;
    let archiveId = null;
    let searchName = name;
    let year = null;
    
    // Check local movies first
    if (type === 'movie') {
        item = movies.movies?.find(m => m.id === id);
    } else if (type === 'series') {
        item = movies.series?.find(s => s.id === id);
    }
    
    // Check Internet Archive catalog
    if (!item && id.startsWith('archive:')) {
        archiveId = id.replace('archive:', '');
        const archiveMovies = await fetchArchiveCatalog();
        item = archiveMovies.find(m => m.id === id);
    }
    
    // Extract info from item or use provided metadata
    if (item) {
        searchName = item.name;
        year = item.releaseInfo;
    }
    
    // If we have an IMDB ID but no local item, fetch metadata from Cinemeta
    if (!item && id.startsWith('tt')) {
        try {
            const meta = await getCinemetaMeta(type, id, 3000);
            if (meta) {
                searchName = meta.name;
                year = meta.releaseInfo || meta.year;
            }
        } catch (error) {
            console.error('Failed to fetch metadata:', error.message);
        }
    }
    
    // Get manual streams from movies.json if available
    const manualStreams = item?.streams || [];
    
    let exYuStreams = [];
    
    // Search Ex-Yu websites for streams
    if (searchName) {
        console.log(`Searching Ex-Yu sites for: ${searchName} (${year})`);
        exYuStreams = await searchExYuSites(searchName, year);
    }
    
    // Combine: manual first, then Ex-Yu scraped streams
    const allStreams = [...manualStreams, ...exYuStreams];
    
    return { streams: allStreams };
});

// Export for Vercel
module.exports = (req, res) => {
    const addonInterface = builder.getInterface();
    return addonInterface(req, res);
};
