const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const sevcetContent = require('./sevcet-films.json');

const CINEMETA_URL = 'https://v3-cinemeta.strem.io';

// Cache for Cinemeta lookups
const cinemetaCache = new Map();

// Sanitize text to prevent serialization errors
function sanitizeText(text) {
    if (!text) return '';
    return text
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .replace(/\u0000/g, '') // Remove null characters
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
                // Get full metadata
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
    id: 'org.balkan.youtube',
    version: '3.0.0',
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
    idPrefixes: ['yt:']
};

const builder = new addonBuilder(manifest);

// Catalog handler - Fetch posters in real-time
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
        
        // Fetch posters in parallel (batch of 10 at a time to avoid overload)
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
        
        console.log(`Returning ${metas.length} movies with real-time posters`);
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
        
        console.log(`Returning ${metas.length} series with real-time posters`);
        return { metas };
    }
    
    return { metas: [] };
});

// Meta handler - Fetch full metadata from Cinemeta
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
    
    // Fetch full metadata from Cinemeta
    const cinemeta = await searchCinemeta(item.name, item.releaseInfo, type);
    
    // Build enhanced metadata with sanitized text
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
    
    // Add videos for series (seasons/episodes) - using Cinemeta-compatible format
    if (type === 'series' && item.videos && item.videos.length > 0) {
        meta.videos = item.videos.map(v => ({
            id: `${item.id}:${v.season}:${v.episode}`,
            name: sanitizeText(v.title || `Episode ${v.episode}`),
            season: parseInt(v.season),
            episode: parseInt(v.episode),
            number: parseInt(v.episode),
            thumbnail: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
            overview: sanitizeText(item.description),
            released: new Date(item.releaseInfo.split('–')[0] || '1970').toISOString()
        }));
    }
    
    console.log(`Returning enhanced meta for ${item.name}${type === 'series' ? ` with ${meta.videos?.length || 0} episodes` : ''}`);
    return { meta };
});

// Stream handler - Only YouTube streams
builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`Stream request: type=${type}, id=${id}`);
    
    let youtubeId = null;
    let itemName = 'Video';
    
    if (type === 'movie') {
        // For movies: id format is "yt:VIDEO_ID"
        const item = sevcetContent.movies.find(m => m.id === id);
        if (item) {
            youtubeId = id.replace('yt:', '');
            itemName = item.name;
        }
    } else if (type === 'series') {
        // For series episodes: id format is "yt:SERIES_ID:season:episode"
        const parts = id.split(':');
        if (parts.length === 4) {
            // Format: yt:VIDEO_ID:season:episode
            const seriesId = `${parts[0]}:${parts[1]}`; // yt:VIDEO_ID
            const season = parseInt(parts[2]);
            const episode = parseInt(parts[3]);
            
            // Find the series and episode
            for (const series of sevcetContent.series) {
                if (series.id === seriesId && series.videos) {
                    const ep = series.videos.find(v => 
                        parseInt(v.season) === season && parseInt(v.episode) === episode
                    );
                    if (ep) {
                        youtubeId = ep.id;
                        itemName = `${series.name} - S${season}E${episode}`;
                        break;
                    }
                }
            }
        }
    }
    
    if (!youtubeId) {
        console.log(`No YouTube ID found for ${id}`);
        return { streams: [] };
    }
    
    // Build YouTube stream
    const streams = [{
        name: 'YouTube',
        title: itemName,
        ytId: youtubeId
    }];
    
    console.log(`Returning YouTube stream: ${youtubeId} for ${itemName}`);
    return { streams };
});

// Start the server
const port = process.env.PORT || 7001;
serveHTTP(builder.getInterface(), { port: port });

console.log(`\n🎬 Domaci Filmovi i Serije Addon is running!`);
console.log(`📡 ${sevcetContent.movies.length} movies and ${sevcetContent.series.length} series available`);
console.log(`🔗 Install: http://127.0.0.1:${port}/manifest.json\n`);
