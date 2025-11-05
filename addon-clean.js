const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
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

const builder = new addonBuilder(manifest);

// Catalog handler
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`Catalog request: type=${type}, id=${id}`);
    
    if (type === 'movie' && id === 'domaci-filmovi') {
        let allMovies = [...sevcetContent.movies];
        
        // Filter by genre if requested
        if (extra && extra.genre) {
            allMovies = allMovies.filter(movie => 
                movie.genres && movie.genres.some(g => g.includes(extra.genre))
            );
        }
        
        // Apply pagination
        const skip = extra && extra.skip ? parseInt(extra.skip) : 0;
        const limit = 100;
        const paginatedMovies = allMovies.slice(skip, skip + limit);
        
        const metas = paginatedMovies.map(m => ({
            id: m.id,
            type: 'movie',
            name: m.name,
            poster: m.poster,
            posterShape: 'poster',
            releaseInfo: m.year,
            description: m.description
        }));
        
        console.log(`Returning ${metas.length} movies`);
        return { metas };
    }
    
    if (type === 'series' && id === 'domace-serije') {
        const metas = sevcetContent.series.map(s => ({
            id: s.id,
            type: 'series',
            name: s.name,
            poster: s.poster,
            posterShape: 'poster',
            releaseInfo: s.year,
            description: s.description
        }));
        
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
    
    console.log(`Returning meta for ${item.name}`);
    return { meta: item };
});

// Stream handler - Only YouTube streams
builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`Stream request: type=${type}, id=${id}`);
    
    // Find the item
    let item = null;
    if (type === 'movie') {
        item = sevcetContent.movies.find(m => m.id === id);
    } else if (type === 'series') {
        item = sevcetContent.series.find(s => s.id === id);
    }
    
    if (!item) {
        console.log(`No item found for ${id}`);
        return { streams: [] };
    }
    
    // Return YouTube stream
    const streams = item.streams || [];
    console.log(`Returning ${streams.length} YouTube stream(s) for ${item.name}`);
    return { streams };
});

// Start the server
const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });

console.log(`\n🎬 Domaci Filmovi i Serije Addon is running!`);
console.log(`📡 ${sevcetContent.movies.length} movies and ${sevcetContent.series.length} series available`);
console.log(`🔗 Install: http://127.0.0.1:${port}/manifest.json\n`);
