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

// Cache for Cinemeta metadata
const metaCache = new Map();

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

const builder = new addonBuilder(manifest);

// Catalog handler - returns basic info with poster for display
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`Catalog request: type=${type}, id=${id}`);
    
    if (type === 'movie' && id === 'balkan-movies') {
        let filteredMovies = movies.movies || [];
        
        // Filter by genre if requested
        if (extra && extra.genre) {
            filteredMovies = filteredMovies.filter(movie => 
                movie.genres && movie.genres.includes(extra.genre)
            );
        }
        
        // Apply pagination
        const skip = extra && extra.skip ? parseInt(extra.skip) : 0;
        const limit = 100;
        filteredMovies = filteredMovies.slice(skip, skip + limit);
        
        // Fetch Cinemeta posters for IMDB IDs with faster timeout for catalog
        const metas = await Promise.all(filteredMovies.map(async m => {
            // Always include local data as base
            const baseMeta = {
                id: m.id,
                type: 'movie',
                name: m.name,
                poster: m.poster || `https://via.placeholder.com/300x450/1a1a2e/16213e?text=${encodeURIComponent(m.name)}`,
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
    
    // Check if this is one of our movies
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
    
    // Fallback to local data
    return { meta: localItem };
});

// Stream handler
builder.defineStreamHandler(({ type, id }) => {
    console.log(`Stream request: type=${type}, id=${id}`);
    
    // Find the movie or series
    let item = null;
    if (type === 'movie') {
        item = movies.movies?.find(m => m.id === id);
    } else if (type === 'series') {
        item = movies.series?.find(s => s.id === id);
    }
    
    if (!item || !item.streams) {
        return Promise.resolve({ streams: [] });
    }
    
    return Promise.resolve({ streams: item.streams });
});

// Export for Vercel
module.exports = (req, res) => {
    const addonInterface = builder.getInterface();
    return addonInterface(req, res);
};
