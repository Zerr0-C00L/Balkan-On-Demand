const { addonBuilder } = require('stremio-addon-sdk');
const movies = require('./movies.json');

// Addon manifest
const manifest = {
    id: 'org.balkan.movies',
    version: '1.0.0',
    name: 'Balkan On Demand',
    description: 'Stream popular movies and TV shows from the Balkan region (ex-Yugoslavia)',
    resources: ['catalog', 'stream'],
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

const builder = new addonBuilder(manifest);

// Catalog handler
builder.defineCatalogHandler(({ type, id, extra }) => {
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
        
        return Promise.resolve({ metas: filteredMovies });
    }
    
    if (type === 'series' && id === 'balkan-series') {
        return Promise.resolve({ metas: movies.series || [] });
    }
    
    return Promise.resolve({ metas: [] });
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
