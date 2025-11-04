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

// Fetch metadata from Cinemeta
async function getCinemetaMeta(type, id) {
    try {
        const response = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.meta;
    } catch (error) {
        console.error('Error fetching from Cinemeta:', error);
        return null;
    }
}

const builder = new addonBuilder(manifest);

// Catalog handler - returns basic info, Stremio will fetch full meta
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
        
        // Return minimal info - just id and type
        // Stremio will fetch full metadata from our meta handler
        const metas = filteredMovies.map(m => ({
            id: m.id,
            type: 'movie'
        }));
        
        return { metas };
    }
    
    if (type === 'series' && id === 'balkan-series') {
        const metas = (movies.series || []).map(s => ({
            id: s.id,
            type: 'series'
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
