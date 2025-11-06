const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load content databases (for stream matching only)
const bauBauDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'baubau-content.json'), 'utf8'));

console.log(`📚 Loaded Stream Database: ${bauBauDB.movies.length} movies, ${bauBauDB.series.length} series`);

// TMDB Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY_HERE';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// TMDB Keywords for Balkan content
const BALKAN_KEYWORDS = {
  bosnian: 1662,        // Bosnia and Herzegovina
  croatian_movie: 7492, // Croatian movies
  croatian_country: 1248, // Croatia (country)
  serbian: 9285         // Serbian
};

// Cache for TMDB API responses
const tmdbCache = new Map();

// Helper: Make HTTPS GET request
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Fetch movies from TMDB by keyword
async function fetchTMDBByKeyword(keywordId, page = 1, type = 'movie') {
  const cacheKey = `keyword:${keywordId}:${type}:${page}`;
  
  if (tmdbCache.has(cacheKey)) {
    return tmdbCache.get(cacheKey);
  }
  
  try {
    const endpoint = type === 'series' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/discover/${endpoint}?api_key=${TMDB_API_KEY}&with_keywords=${keywordId}&sort_by=popularity.desc&page=${page}&language=en-US`;
    
    const data = await httpsGet(url);
    tmdbCache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error(`TMDB keyword fetch error:`, error.message);
    return { results: [], total_pages: 0, total_results: 0 };
  }
}

// Fetch detailed metadata from TMDB
async function fetchTMDBDetails(tmdbId, type = 'movie') {
  const cacheKey = `details:${type}:${tmdbId}`;
  
  if (tmdbCache.has(cacheKey)) {
    return tmdbCache.get(cacheKey);
  }
  
  try {
    const endpoint = type === 'series' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,videos,external_ids`;
    
    const data = await httpsGet(url);
    tmdbCache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error(`TMDB details fetch error for ${tmdbId}:`, error.message);
    return null;
  }
}

// Search TMDB by title
async function searchTMDB(query, type = 'movie') {
  const cacheKey = `search:${type}:${query}`;
  
  if (tmdbCache.has(cacheKey)) {
    return tmdbCache.get(cacheKey);
  }
  
  try {
    const endpoint = type === 'series' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/search/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`;
    
    const data = await httpsGet(url);
    tmdbCache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error(`TMDB search error:`, error.message);
    return { results: [] };
  }
}

// Convert TMDB item to Stremio meta format
function tmdbToStremioMeta(tmdbItem, type = 'movie', fullDetails = null) {
  const isMovie = type === 'movie';
  
  const meta = {
    id: `tt${fullDetails?.external_ids?.imdb_id?.replace('tt', '') || tmdbItem.id}`, // Use IMDb ID if available
    type: type,
    name: isMovie ? tmdbItem.title : tmdbItem.name,
    poster: tmdbItem.poster_path ? `https://image.tmdb.org/t/p/w780${tmdbItem.poster_path}` : null,
    posterShape: 'poster',
    background: tmdbItem.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbItem.backdrop_path}` : null,
    description: tmdbItem.overview || '',
    releaseInfo: isMovie 
      ? (tmdbItem.release_date ? tmdbItem.release_date.split('-')[0] : '')
      : (tmdbItem.first_air_date ? tmdbItem.first_air_date.split('-')[0] : ''),
    imdbRating: tmdbItem.vote_average ? tmdbItem.vote_average.toFixed(1) : null,
    genres: tmdbItem.genre_ids ? [] : (tmdbItem.genres?.map(g => g.name) || [])
  };
  
  // Add full details if available
  if (fullDetails) {
    meta.genres = fullDetails.genres?.map(g => g.name) || [];
    meta.runtime = fullDetails.runtime ? `${fullDetails.runtime} min` : null;
    meta.cast = fullDetails.credits?.cast?.slice(0, 10).map(c => c.name) || [];
    meta.director = fullDetails.credits?.crew?.filter(c => c.job === 'Director').map(d => d.name) || [];
    meta.writer = fullDetails.credits?.crew?.filter(c => c.job === 'Writer' || c.job === 'Screenplay').map(w => w.name) || [];
    meta.country = fullDetails.production_countries?.map(c => c.name) || [];
    
    // Add trailers
    const youtubeTrailers = fullDetails.videos?.results?.filter(v => v.type === 'Trailer' && v.site === 'YouTube') || [];
    if (youtubeTrailers.length > 0) {
      meta.trailers = youtubeTrailers.map(t => ({
        source: t.key,
        type: 'Trailer'
      }));
    }
    
    // Add IMDb ID link
    if (fullDetails.external_ids?.imdb_id) {
      meta.id = fullDetails.external_ids.imdb_id;
      meta.links = [{
        name: 'IMDb',
        category: 'imdb',
        url: `https://www.imdb.com/title/${fullDetails.external_ids.imdb_id}`
      }];
    }
    
    // Add seasons for series
    if (!isMovie && fullDetails.number_of_seasons) {
      meta.videos = [];
      // Note: We'd need additional API calls to get episode lists
      // For now, indicate seasons exist
      for (let i = 1; i <= fullDetails.number_of_seasons; i++) {
        // This is placeholder - would need separate API call per season
      }
    }
  }
  
  return meta;
}

// Match TMDB content with our stream database
async function findStreamMatch(tmdbId, imdbId, title, year, type = 'movie') {
  // Try to find a match in our database
  const db = type === 'series' ? bauBauDB.series : bauBauDB.movies;
  
  // Method 1: Match by title and year
  if (title && year) {
    const match = db.find(item => {
      const titleMatch = item.name.toLowerCase().includes(title.toLowerCase()) || 
                        title.toLowerCase().includes(item.name.toLowerCase());
      const yearMatch = item.year && Math.abs(item.year - year) <= 1;
      return titleMatch && yearMatch;
    });
    
    if (match) {
      console.log(`✅ Stream match found: ${match.name} → ${title}`);
      return match;
    }
  }
  
  // Method 2: Match by normalized title only (for items without year)
  if (title) {
    const normalizedTitle = title.toLowerCase().trim();
    const match = db.find(item => 
      item.name.toLowerCase().trim() === normalizedTitle
    );
    
    if (match) {
      console.log(`✅ Stream match found (by title): ${match.name}`);
      return match;
    }
  }
  
  return null;
}

// All available catalogs
const allCatalogs = [
  {
    id: 'tmdb_balkan_movies',
    name: '🇧🇦 Bosnian Movies',
    type: 'movie',
    keyword: BALKAN_KEYWORDS.bosnian,
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  },
  {
    id: 'tmdb_croatian_movies',
    name: '🇭🇷 Croatian Movies',
    type: 'movie',
    keyword: BALKAN_KEYWORDS.croatian_movie,
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  },
  {
    id: 'tmdb_serbian_series',
    name: '🇷🇸 Serbian TV Series',
    type: 'series',
    keyword: BALKAN_KEYWORDS.serbian,
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  },
  {
    id: 'bilosta_direct_movies',
    name: '⭐ Direct HD Movies',
    type: 'movie',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  },
  {
    id: 'bilosta_direct_series',
    name: '📺 Direct HD Series',
    type: 'series',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  }
];

// Parse configuration from URL
function parseConfig(configString) {
  if (!configString) return null;
  
  try {
    const config = {
      catalogs: null,
      tmdbApiKey: null
    };
    
    const parts = configString.split('&');
    
    parts.forEach(part => {
      if (part.startsWith('home=')) {
        const homeValue = part.replace('home=', '');
        const homeCatalogs = homeValue === 'none' ? [] : homeValue.split(',');
        
        config.catalogs = allCatalogs.map(cat => ({
          id: cat.id,
          type: cat.type,
          enabled: true,
          showInHome: homeCatalogs.includes(cat.id)
        }));
      }
      
      if (part.startsWith('tmdb=')) {
        config.tmdbApiKey = decodeURIComponent(part.replace('tmdb=', ''));
      }
    });
    
    return config;
  } catch (e) {
    console.error('Failed to parse config:', e.message);
    return null;
  }
}

// Generate manifest with optional catalog configuration
function generateManifest(config = null) {
  let catalogs = [];
  
  if (config && config.catalogs && Array.isArray(config.catalogs)) {
    catalogs = config.catalogs
      .filter(cat => cat.enabled)
      .map(cat => {
        const baseCatalog = allCatalogs.find(c => c.id === cat.id && c.type === cat.type);
        if (!baseCatalog) return null;
        
        const extra = cat.showInHome 
          ? [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }]
          : [{ name: 'search', isRequired: true }];
        
        return {
          ...baseCatalog,
          extra: extra,
          extraSupported: cat.showInHome ? ['search', 'skip'] : ['search']
        };
      })
      .filter(cat => cat !== null);
  }

  return {
    id: 'community.balkan.tmdb.streams',
    version: '6.0.0',
    name: 'Balkan HD Streams',
    description: catalogs.length > 0
      ? 'TMDB-powered Balkan catalogs with Direct HD streams'
      : 'Direct HD streams for Balkan content. Browse via TMDB/Cinemeta.',
    
    resources: [
      'catalog',
      'meta',
      'stream'
    ],
    
    types: ['movie', 'series'],
    
    idPrefixes: ['tt', 'bilosta'],
    
    catalogs: catalogs,
    
    behaviorHints: {
      configurable: true,
      configurationRequired: false
    }
  };
}

// Create builder dynamically based on config
function createBuilder(config = null) {
  const manifest = generateManifest(config);
  return new addonBuilder(manifest);
}

// Define handlers
function defineHandlers(builder, config = null) {
  // CATALOG Handler - TMDB as primary source
  builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`📖 Catalog request: ${id} (type: ${type})`);
    
    const limit = 100;
    const skip = parseInt(extra.skip) || 0;
    const search = extra.search || '';
    
    let metas = [];
    
    // Handle search queries
    if (search) {
      const searchResults = await searchTMDB(search, type);
      const items = searchResults.results || [];
      
      const metasPromises = items
        .slice(skip, skip + limit)
        .map(item => Promise.resolve(tmdbToStremioMeta(item, type)));
      
      metas = await Promise.all(metasPromises);
      return { metas };
    }
    
    // Handle TMDB keyword catalogs
    const catalog = allCatalogs.find(c => c.id === id);
    
    if (catalog && catalog.keyword) {
      const page = Math.floor(skip / 20) + 1; // TMDB uses 20 items per page
      const tmdbResults = await fetchTMDBByKeyword(catalog.keyword, page, type);
      
      const items = tmdbResults.results || [];
      const metasPromises = items.map(item => Promise.resolve(tmdbToStremioMeta(item, type)));
      
      metas = await Promise.all(metasPromises);
      return { metas };
    }
    
    // Handle direct Bilosta catalogs (our database)
    if (id === 'bilosta_direct_movies') {
      const items = bauBauDB.movies
        .slice(skip, skip + limit)
        .map(movie => ({
          id: movie.id,
          type: 'movie',
          name: movie.name,
          poster: movie.poster,
          posterShape: 'poster',
          background: movie.background,
          releaseInfo: movie.year?.toString() || '',
          genres: movie.genres || []
        }));
      
      return { metas: items };
    }
    
    if (id === 'bilosta_direct_series') {
      const items = bauBauDB.series
        .slice(skip, skip + limit)
        .map(series => ({
          id: series.id,
          type: 'series',
          name: series.name,
          poster: series.poster,
          posterShape: 'poster',
          background: series.background,
          releaseInfo: series.year?.toString() || '',
          genres: series.genres || []
        }));
      
      return { metas: items };
    }
    
    return { metas: [] };
  });

  // META Handler - Full TMDB details
  builder.defineMetaHandler(async ({ type, id }) => {
    console.log(`ℹ️  Meta request: ${id} (type: ${type})`);
    
    // Handle bilosta IDs (direct database lookup)
    if (id.startsWith('bilosta:')) {
      const db = type === 'series' ? bauBauDB.series : bauBauDB.movies;
      const item = db.find(i => i.id === id);
      
      if (item) {
        const meta = {
          id: item.id,
          type: type,
          name: item.name,
          poster: item.poster,
          posterShape: 'poster',
          background: item.background,
          description: item.description || '',
          releaseInfo: item.year?.toString() || '',
          genres: item.genres || [],
          cast: item.cast || [],
          director: item.director || []
        };
        
        // Add videos for series
        if (type === 'series' && item.seasons) {
          meta.videos = item.seasons.flatMap(season =>
            season.episodes.map(ep => ({
              id: `${item.id}:${season.number}:${ep.episode}`,
              title: ep.title || `Episode ${ep.episode}`,
              season: season.number,
              episode: ep.episode,
              released: new Date().toISOString(),
              thumbnail: ep.thumbnail || item.poster
            }))
          );
        }
        
        return { meta };
      }
    }
    
    // Handle IMDb IDs - fetch from TMDB
    if (id.startsWith('tt')) {
      const imdbId = id;
      
      // Search TMDB by IMDb external ID
      try {
        const url = `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        const findResults = await httpsGet(url);
        
        const tmdbItem = type === 'series' 
          ? findResults.tv_results?.[0]
          : findResults.movie_results?.[0];
        
        if (tmdbItem) {
          // Fetch full details
          const fullDetails = await fetchTMDBDetails(tmdbItem.id, type);
          const meta = tmdbToStremioMeta(tmdbItem, type, fullDetails);
          meta.id = imdbId; // Ensure we use the IMDb ID
          
          return { meta };
        }
      } catch (error) {
        console.error(`Error fetching IMDb ${id}:`, error.message);
      }
    }
    
    return { meta: null };
  });

  // STREAM Handler - Only for content we have
  builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`🎬 Stream request: ${id} (type: ${type})`);
    
    let streams = [];
    
    // Handle bilosta IDs directly
    if (id.startsWith('bilosta:')) {
      // Handle series episodes
      if (id.includes(':series:') && id.split(':').length === 5) {
        const [, , seriesSlug, seasonNum, epNum] = id.split(':');
        const seriesId = `bilosta:series:${seriesSlug}`;
        
        const series = bauBauDB.series.find(s => s.id === seriesId);
        if (series) {
          const season = series.seasons.find(s => s.number === parseInt(seasonNum));
          if (season) {
            const episode = season.episodes.find(e => e.episode === parseInt(epNum));
            if (episode) {
              streams.push({
                name: 'Direct HD',
                title: `⭐ ${series.name}\nDirect HD`,
                url: episode.url,
                behaviorHints: {
                  bingeGroup: `balkan-series-${seriesSlug}`
                }
              });
            }
          }
        }
        
        return { streams };
      }
      
      // Handle movie streams
      const movie = bauBauDB.movies.find(m => m.id === id);
      if (movie && movie.streams) {
        movie.streams.forEach(stream => {
          const quality = stream.quality || 'HD';
          const qualityLabel = quality === '4K' ? '4K UHD' : 'HD';
          
          streams.push({
            name: `Direct ${qualityLabel}`,
            title: `⭐ Direct ${qualityLabel}\n${stream.source || 'Balkan'} • Cloudflare CDN`,
            url: stream.url,
            behaviorHints: {
              bingeGroup: 'balkan-' + movie.id
            }
          });
        });
      }
      
      return { streams };
    }
    
    // Handle IMDb IDs - try to find matching stream in our database
    if (id.startsWith('tt')) {
      // First, get TMDB details to find title and year
      try {
        const url = `${TMDB_BASE_URL}/find/${id}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        const findResults = await httpsGet(url);
        
        const tmdbItem = type === 'series' 
          ? findResults.tv_results?.[0]
          : findResults.movie_results?.[0];
        
        if (tmdbItem) {
          const title = type === 'series' ? tmdbItem.name : tmdbItem.title;
          const year = type === 'series' 
            ? (tmdbItem.first_air_date ? new Date(tmdbItem.first_air_date).getFullYear() : null)
            : (tmdbItem.release_date ? new Date(tmdbItem.release_date).getFullYear() : null);
          
          // Try to find a match in our database
          const match = await findStreamMatch(tmdbItem.id, id, title, year, type);
          
          if (match && match.streams) {
            console.log(`✅ Found streams for ${title} (${year})`);
            
            if (type === 'movie') {
              match.streams.forEach(stream => {
                const quality = stream.quality || 'HD';
                const qualityLabel = quality === '4K' ? '4K UHD' : 'HD';
                
                streams.push({
                  name: `Direct ${qualityLabel}`,
                  title: `⭐ Direct ${qualityLabel}\n${stream.source || 'Balkan'} • Cloudflare CDN`,
                  url: stream.url
                });
              });
            }
          } else {
            console.log(`❌ No streams found for ${title} (${year})`);
          }
        }
      } catch (error) {
        console.error(`Error finding streams for ${id}:`, error.message);
      }
    }
    
    return { streams };
  });
  
  return builder;
}

// Serve addon with landing page
const PORT = process.env.PORT || 7006;
const express = require('express');
const { getRouter } = require('stremio-addon-sdk');

const app = express();

app.use(express.json());

// Serve React configure app
app.use('/configure', express.static('dist'));

// Redirect root to configure
app.get('/', (req, res) => {
  res.redirect('/configure');
});

// Handle manifest requests
app.get('/:config?/manifest.json', (req, res) => {
  const configString = req.params.config;
  const config = parseConfig(configString);
  
  const manifest = generateManifest(config);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  res.json(manifest);
});

// Create default addon instance
const defaultBuilder = createBuilder(null);
defineHandlers(defaultBuilder);
const defaultRouter = getRouter(defaultBuilder.getInterface());

// Handle addon routes
app.use((req, res, next) => {
  const path = req.path;
  
  if (path.startsWith('/catalog/') || path.startsWith('/meta/') || path.startsWith('/stream/')) {
    return defaultRouter(req, res, next);
  }
  
  const pathParts = path.split('/').filter(p => p);
  if (pathParts.length > 0 && (pathParts[0].includes('=') || pathParts[0].includes('home'))) {
    const configString = pathParts[0];
    const config = parseConfig(configString);
    
    const builder = createBuilder(config);
    defineHandlers(builder, config);
    
    req.url = '/' + pathParts.slice(1).join('/');
    
    const addonRouter = getRouter(builder.getInterface());
    return addonRouter(req, res, next);
  }
  
  next();
});

app.listen(PORT, () => {
  console.log(`\n🚀 Balkan HD Streams v6.0.0 running on http://localhost:${PORT}\n`);
  console.log(`📊 Stream Database:`);
  console.log(`   • Movies: ${bauBauDB.movies.length}`);
  console.log(`   • Series: ${bauBauDB.series.length}`);
  console.log(`\n✨ Features:`);
  console.log(`   📚 TMDB-powered catalogs with full metadata`);
  console.log(`   ⭐ Direct HD streams for matched content`);
  console.log(`   🌍 Bosnian, Croatian, Serbian content`);
  console.log(`\n🔑 TMDB API Key: ${TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE' ? '❌ NOT SET' : '✅ Configured'}`);
  
  if (TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
    console.log(`\n⚠️  Warning: Set TMDB_API_KEY environment variable for full functionality`);
    console.log(`   export TMDB_API_KEY="your_key_here"\n`);
  }
});
