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
    idPrefixes: ['tt', 'balkan:', 'archive:']
};

// Cache for Cinemeta metadata and Internet Archive content
const metaCache = new Map();
const archiveCache = new Map();
let archiveCatalog = [];
let lastArchiveFetch = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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
async function fetchArchiveCatalog() {
    const now = Date.now();
    
    // Return cached catalog if still valid
    if (archiveCatalog.length > 0 && (now - lastArchiveFetch) < CACHE_DURATION) {
        return archiveCatalog;
    }
    
    console.log('Fetching Yugoslav content from Internet Archive...');
    const items = [];
    
    try {
        // Search for Yugoslav/Balkan films
        const searchQueries = [
            'yugoslav film',
            'serbian film',
            'croatian film',
            'bosnian film',
            'balkan cinema'
        ];
        
        for (const query of searchQueries) {
            try {
                const encodedQuery = encodeURIComponent(query);
                const searchUrl = `https://archive.org/advancedsearch.php?q=${encodedQuery}%20AND%20mediatype:(movies)&fl[]=identifier,title,description,year,language&output=json&rows=100&sort[]=downloads%20desc`;
                
                const response = await fetch(searchUrl, {
                    signal: AbortSignal.timeout(10000)
                });
                
                if (!response.ok) continue;
                
                const data = await response.json();
                
                if (data.response?.docs) {
                    for (const doc of data.response.docs) {
                        // Create unique ID
                        const id = `archive:${doc.identifier}`;
                        
                        // Avoid duplicates
                        if (!items.find(item => item.id === id)) {
                            items.push({
                                id: id,
                                type: 'movie',
                                name: doc.title || doc.identifier,
                                poster: `https://archive.org/services/img/${doc.identifier}`,
                                posterShape: 'poster',
                                description: doc.description || 'Yugoslav/Balkan film from Internet Archive',
                                releaseInfo: doc.year || 'Unknown',
                                archiveId: doc.identifier
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Error fetching ${query}:`, error.message);
            }
        }
        
        console.log(`Fetched ${items.length} Yugoslav films from Internet Archive`);
        archiveCatalog = items;
        lastArchiveFetch = now;
        
    } catch (error) {
        console.error('Error fetching Archive catalog:', error);
    }
    
    return items;
}

const builder = new addonBuilder(manifest);

// Catalog handler - returns basic info with poster for display
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`Catalog request: type=${type}, id=${id}`);
    
    if (type === 'movie' && id === 'balkan-movies') {
        // Combine local movies with Internet Archive catalog
        const localMovies = movies.movies || [];
        const archiveMovies = await fetchArchiveCatalog();
        
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
    
    // Check Internet Archive catalog
    if (!localItem && id.startsWith('archive:')) {
        const archiveMovies = await fetchArchiveCatalog();
        localItem = archiveMovies.find(m => m.id === id);
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

// Search Internet Archive for Yugoslav/Balkan content
async function searchInternetArchive(name, year) {
    const streams = [];
    
    try {
        // Clean the search query
        const cleanName = name.replace(/\(.*?\)/g, '').trim();
        const searchTerms = [
            `${cleanName} ${year || ''}`,
            `${cleanName} yugoslav`,
            `${cleanName} serbian`,
            `${cleanName} croatian`,
            `${cleanName} bosnian`
        ];
        
        for (const searchTerm of searchTerms) {
            try {
                const query = encodeURIComponent(searchTerm);
                const searchUrl = `https://archive.org/advancedsearch.php?q=${query}%20AND%20mediatype:(movies)&fl[]=identifier,title,format&output=json&rows=10`;
                
                const response = await fetch(searchUrl, {
                    signal: AbortSignal.timeout(5000)
                });
                
                if (!response.ok) continue;
                
                const data = await response.json();
                
                if (data.response?.docs?.length > 0) {
                    for (const doc of data.response.docs) {
                        try {
                            // Get file details
                            const metadataUrl = `https://archive.org/metadata/${doc.identifier}`;
                            const metaResponse = await fetch(metadataUrl, {
                                signal: AbortSignal.timeout(3000)
                            });
                            
                            if (!metaResponse.ok) continue;
                            
                            const metadata = await metaResponse.json();
                            const files = metadata.files || [];
                            
                            // Find video files, prioritize HD
                            const videoFiles = files.filter(f => 
                                f.name && (
                                    f.name.endsWith('.mp4') ||
                                    f.name.endsWith('.mkv') ||
                                    f.name.endsWith('.avi')
                                ) && f.format !== 'Metadata'
                            );
                            
                            // Sort by quality/size
                            videoFiles.sort((a, b) => {
                                const aSize = parseInt(a.size) || 0;
                                const bSize = parseInt(b.size) || 0;
                                return bSize - aSize; // Larger files = better quality
                            });
                            
                            for (const file of videoFiles.slice(0, 3)) {
                                const sizeGB = (parseInt(file.size) / (1024 * 1024 * 1024)).toFixed(2);
                                const quality = parseInt(file.size) > 1000000000 ? 'HD' : 'SD';
                                const format = file.format || 'Video';
                                
                                streams.push({
                                    title: `Internet Archive - ${quality} (${sizeGB}GB)`,
                                    url: `https://archive.org/download/${doc.identifier}/${encodeURIComponent(file.name)}`,
                                    behaviorHints: {
                                        notWebReady: false
                                    }
                                });
                            }
                            
                        } catch (error) {
                            console.error(`Error fetching metadata for ${doc.identifier}:`, error.message);
                        }
                    }
                    
                    // If we found streams, break
                    if (streams.length > 0) break;
                }
            } catch (error) {
                console.error('Internet Archive search error:', error.message);
            }
        }
    } catch (error) {
        console.error('Error searching Internet Archive:', error);
    }
    
    return streams;
}

// Get streams directly from Internet Archive item
async function getArchiveStreams(archiveId) {
    const streams = [];
    
    try {
        const metadataUrl = `https://archive.org/metadata/${archiveId}`;
        const response = await fetch(metadataUrl, {
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) return streams;
        
        const metadata = await response.json();
        const files = metadata.files || [];
        
        // Find video files
        const videoFiles = files.filter(f => 
            f.name && (
                f.name.endsWith('.mp4') ||
                f.name.endsWith('.mkv') ||
                f.name.endsWith('.avi')
            ) && f.format !== 'Metadata'
        );
        
        // Sort by quality/size (larger = better)
        videoFiles.sort((a, b) => {
            const aSize = parseInt(a.size) || 0;
            const bSize = parseInt(b.size) || 0;
            return bSize - aSize;
        });
        
        for (const file of videoFiles.slice(0, 5)) {
            const sizeGB = (parseInt(file.size) / (1024 * 1024 * 1024)).toFixed(2);
            const quality = parseInt(file.size) > 1000000000 ? 'HD' : 'SD';
            
            streams.push({
                title: `Internet Archive - ${quality} (${sizeGB}GB)`,
                url: `https://archive.org/download/${archiveId}/${encodeURIComponent(file.name)}`,
                behaviorHints: {
                    notWebReady: false
                }
            });
        }
        
    } catch (error) {
        console.error(`Error fetching streams for ${archiveId}:`, error.message);
    }
    
    return streams;
}

// Stream handler - returns HTTP streams from Internet Archive
builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`Stream request: type=${type}, id=${id}`);
    
    let item = null;
    let archiveId = null;
    
    // Check local movies
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
    
    if (!item) {
        return { streams: [] };
    }
    
    // Get manual streams from movies.json
    const manualStreams = item.streams || [];
    
    let archiveStreams = [];
    
    // If this is an Internet Archive item, get streams directly
    if (archiveId || item.archiveId) {
        archiveStreams = await getArchiveStreams(archiveId || item.archiveId);
    } else {
        // Search Internet Archive
        const searchName = item.name.replace(/\(.*?\)/g, '').trim();
        const year = item.releaseInfo;
        archiveStreams = await searchInternetArchive(searchName, year);
    }
    
    // Combine: manual first, then Internet Archive (HD first)
    const allStreams = [...manualStreams, ...archiveStreams];
    
    return { streams: allStreams };
});

// Export for Vercel
module.exports = (req, res) => {
    const addonInterface = builder.getInterface();
    return addonInterface(req, res);
};
