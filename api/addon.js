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

// Generate direct links to Ex-Yu websites
function generateExYuLinks(name, source) {
    const cleanName = name.toLowerCase()
        .replace(/[():]/g, '')
        .replace(/\s+/g, '-')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    
    const links = [];
    
    // Generate likely movie URLs for each site
    switch(source.name) {
        case 'Filmoton.net':
            links.push(`${source.searchUrl}/film/${cleanName}`);
            links.push(`${source.searchUrl}/?s=${encodeURIComponent(name)}`);
            break;
        case 'Filmativa.club':
            links.push(`${source.searchUrl}/filmovi/${cleanName}`);
            links.push(`${source.searchUrl}/?s=${encodeURIComponent(name)}`);
            break;
        case 'DomaciFilmovi.online':
            links.push(`${source.searchUrl}/film/${cleanName}`);
            links.push(`${source.searchUrl}/?s=${encodeURIComponent(name)}`);
            break;
        case 'ToSuSamoFilmovi.rs.ba':
            links.push(`${source.searchUrl}/filmovi/${cleanName}`);
            break;
        case 'FenixSite.net':
            links.push(`${source.searchUrl}/film/${cleanName}`);
            break;
        case 'FilmoviX.net':
            links.push(`${source.searchUrl}/video/${cleanName}`);
            break;
        case 'PopcornFilmovi.com':
            links.push(`${source.searchUrl}/film/${cleanName}`);
            break;
    }
    
    return links[0] || `${source.searchUrl}/?s=${encodeURIComponent(name)}`;
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

// Generate Ex-Yu website links for content
function getExYuLinks(name, year) {
    const streams = [];
    const cleanName = name.replace(/\(.*?\)/g, '').trim();
    
    // Generate links for all sources
    for (const source of EX_YU_SOURCES) {
        const url = generateExYuLinks(cleanName, source);
        
        streams.push({
            name: source.name,
            title: `📺 Watch on ${source.name}`,
            externalUrl: url,
            behaviorHints: {
                notWebReady: true
            }
        });
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
    
    // Generate Ex-Yu website links
    if (searchName) {
        console.log(`Generating Ex-Yu links for: ${searchName} (${year})`);
        exYuStreams = getExYuLinks(searchName, year);
    }
    
    // Combine: manual first, then Ex-Yu links
    const allStreams = [...manualStreams, ...exYuStreams];
    
    return { streams: allStreams };
});

// Export for Vercel
module.exports = (req, res) => {
    const addonInterface = builder.getInterface();
    return addonInterface(req, res);
};
