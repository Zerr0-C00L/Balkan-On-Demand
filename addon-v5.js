const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const fs = require('fs');
const path = require('path');

// Load content databases
const bauBauDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'baubau-content.json'), 'utf8'));

console.log(`📚 Loaded Database: ${bauBauDB.movies.length} movies, ${bauBauDB.series.length} series`);

// Cinemeta integration for metadata enrichment
const CINEMETA_URL = 'https://v3-cinemeta.strem.io';
const cinemetaCache = new Map();

// OMDb API integration for additional metadata (descriptions, etc)
const OMDB_URL = 'https://www.omdbapi.com';
const OMDB_API_KEY = 'trilogy'; // Free public API key
const omdbCache = new Map();

// Fetch metadata from OMDb by IMDb ID or search by title
async function fetchOMDb(imdbId, title = null, year = null) {
    const cacheKey = imdbId || `${title}:${year}`;
    
    if (omdbCache.has(cacheKey)) {
        return omdbCache.get(cacheKey);
    }
    
    try {
        let url;
        if (imdbId) {
            url = `${OMDB_URL}/?i=${imdbId}&apikey=${OMDB_API_KEY}&plot=full`;
        } else if (title) {
            url = `${OMDB_URL}/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}&plot=full`;
            if (year) url += `&y=${year}`;
        } else {
            return null;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`OMDb responded with ${response.status}`);
        
        const data = await response.json();
        
        if (data.Response === 'True') {
            const result = {
                plot: data.Plot && data.Plot !== 'N/A' ? data.Plot : null,
                genre: data.Genre || null,
                rated: data.Rated || null,
                awards: data.Awards && data.Awards !== 'N/A' ? data.Awards : null,
                metascore: data.Metascore || null,
                country: data.Country || null,
                language: data.Language || null
            };
            
            omdbCache.set(cacheKey, result);
            return result;
        }
    } catch (error) {
        console.error(`OMDb fetch error for ${cacheKey}:`, error.message);
    }
    
    omdbCache.set(cacheKey, null);
    return null;
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
        if (!response.ok) throw new Error(`Cinemeta responded with ${response.status}`);
        
        const data = await response.json();
        
        if (data.metas && data.metas.length > 0) {
            // Only accept exact year matches to prevent wrong metadata
            let match = data.metas.find(m => {
                const metaYear = m.year || m.releaseInfo;
                return metaYear && metaYear.toString() === year?.toString();
            });
            
            // If no year match and year is provided, don't use any match
            // This prevents wrong metadata for regional content not in Cinemeta
            if (!match && year) {
                console.log(`No Cinemeta year match for ${title} (${year}), skipping enrichment`);
                cinemetaCache.set(cacheKey, null);
                return null;
            }
            
            // If no year provided, use first result (for content without year info)
            if (!match && !year) {
                match = data.metas[0];
            }
            
            if (match) {
                const metaUrl = `${CINEMETA_URL}/meta/${type}/${match.id}.json`;
                const metaResponse = await fetch(metaUrl);
                if (!metaResponse.ok) throw new Error(`Meta fetch failed`);
                
                const metaData = await metaResponse.json();
                
                const result = {
                    poster: match.poster || null,
                    background: metaData.meta?.background || null,
                    logo: metaData.meta?.logo || null,
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

// Sanitize text to prevent serialization errors
function sanitizeText(text) {
    if (!text) return '';
    return text
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .replace(/\u0000/g, '')
        .trim();
}

// All available catalogs with their base configuration
const allCatalogs = [
  {
    id: 'balkan_movies',
    name: '⭐ Filmovi',
    type: 'movie',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  },
  {
    id: 'balkan_foreign_movies',
    name: '🌍 Strani Filmovi',
    type: 'movie',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  },
  {
    id: 'balkan_kids',
    name: '🎨 Crtani Filmovi',
    type: 'movie',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  },
  {
    id: 'balkan_series',
    name: '📺 Serije',
    type: 'series',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  }
];

// Parse configuration from URL
function parseConfig(configString) {
  if (!configString) {
    return null;
  }
  
  try {
    // Check if it's a simple home=catalog1,catalog2 format
    if (configString.startsWith('home=')) {
      const homeCatalogs = configString.replace('home=', '').split(',');
      
      // Build full config object
      const config = {
        catalogs: allCatalogs.map(cat => ({
          id: cat.id,
          type: cat.type,
          enabled: true, // All catalogs enabled
          showInHome: homeCatalogs.includes(cat.id) // Home only for selected
        }))
      };
      
      return config;
    }
    
    // Try to parse as JSON
    const config = JSON.parse(decodeURIComponent(configString));
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
    // User has configured catalogs - use their selection
    catalogs = config.catalogs
      .filter(cat => cat.enabled) // Only include enabled catalogs
      .map(cat => {
        const baseCatalog = allCatalogs.find(c => c.id === cat.id && c.type === cat.type);
        
        if (!baseCatalog) return null;
        
        // Determine extra based on showInHome setting
        const extra = cat.showInHome 
          ? [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }] // Home + Discover
          : [{ name: 'search', isRequired: true }]; // Discover only (requires search)
        
        return {
          ...baseCatalog,
          extra: extra,
          extraSupported: cat.showInHome ? ['search', 'skip'] : ['search']
        };
      })
      .filter(cat => cat !== null); // Remove any null entries
  } else {
    // Default configuration - all catalogs in both Home and Discover
    catalogs = allCatalogs.map(cat => ({
      ...cat,
      extraSupported: ['search', 'skip'],
      extra: [
        { name: 'search', isRequired: false },
        { name: 'skip', isRequired: false }
      ]
    }));
  }

  return {
    id: 'community.balkan.on.demand',
    version: '5.3.0',
    name: 'Balkan On Demand',
    description: 'Movies & Series from Serbia, Croatia & Bosnia',
    
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

// Helper: Categorize movies with deduplication
function categorizeMovies() {
  const categories = {
    movies: [],
    foreign: [],
    kids: []
  };
  
  // Use Map to track movies by normalized name for deduplication
  const movieMap = new Map();
  const foreignMap = new Map();
  const kidsMap = new Map();
  
  // Add BauBau movies
  bauBauDB.movies.forEach(movie => {
    const normalizedName = movie.name.toLowerCase().trim();
    
    // Kids/Cartoons
    if (movie.category && movie.category.toLowerCase().includes('crtani')) {
      if (!kidsMap.has(normalizedName)) {
        kidsMap.set(normalizedName, movie);
      }
    }
    // Ex-YU movies
    else if (movie.category && (
      movie.category.includes('EX YU') ||
      movie.category.includes('PREMIJERA') ||
      movie.category.includes('Domaci')
    )) {
      if (!movieMap.has(normalizedName)) {
        movieMap.set(normalizedName, movie);
      }
    }
    // 4K movies
    else if (movie.streams && movie.streams[0].quality === '4K') {
      if (!movieMap.has(normalizedName)) {
        movieMap.set(normalizedName, movie);
      }
    }
    // Foreign movies (everything else)
    else {
      if (!foreignMap.has(normalizedName)) {
        foreignMap.set(normalizedName, movie);
      }
    }
  });
  
  // Convert Maps back to arrays (no YouTube movies)
  categories.movies = Array.from(movieMap.values());
  categories.foreign = Array.from(foreignMap.values());
  categories.kids = Array.from(kidsMap.values());
  
  return categories;
}

const movieCategories = categorizeMovies();
console.log(`📊 Categories: Movies(${movieCategories.movies.length}), Foreign(${movieCategories.foreign.length}), Kids(${movieCategories.kids.length})`);

// Use only BauBau series (direct streams only, no YouTube series)
const allSeriesItems = bauBauDB.series;
console.log(`📊 Total Series: ${allSeriesItems.length}`);

// Define handlers on a builder instance (will be attached to route handler)
function defineHandlers(builder) {
  // CATALOG Handler with Cinemeta enrichment
  builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`📖 Catalog request: ${id} (type: ${type})`);
    
    const limit = 100;
    const skip = parseInt(extra.skip) || 0;
    const search = extra.search || '';
    const genre = extra.genre || '';
    
    let items = [];
    
    switch (id) {
      case 'balkan_movies':
        items = movieCategories.movies;
        break;
        
      case 'balkan_foreign_movies':
        items = movieCategories.foreign;
        break;
        
      case 'balkan_kids':
        items = movieCategories.kids;
        break;
        
      case 'balkan_series':
        items = allSeriesItems;
        break;
    }
    
    // Apply search filter first (before enrichment for better performance)
    if (search) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // If genre filter is specified, we need to enrich first, then filter, then paginate
    // Otherwise we can paginate first for better performance
    let metas;
    
    if (genre) {
      // Enrich ALL items first (needed to get genres from Cinemeta)
      const metasPromises = items.map(item => 
        toStremioMeta(item, id === 'balkan_series' ? 'series' : 'movie', true)
      );
      
      metas = await Promise.all(metasPromises);
      
      // Apply genre filter AFTER enrichment (since genres come from Cinemeta)
      metas = metas.filter(meta => {
        if (!meta.genres || !Array.isArray(meta.genres)) return false;
        return meta.genres.some(g => g.toLowerCase() === genre.toLowerCase());
      });
      
      // Apply pagination AFTER filtering
      metas = metas.slice(skip, skip + limit);
    } else {
      // No genre filter: paginate first, then enrich (better performance)
      items = items.slice(skip, skip + limit);
      
      const metasPromises = items.map(item => 
        toStremioMeta(item, id === 'balkan_series' ? 'series' : 'movie', true)
      );
      
      metas = await Promise.all(metasPromises);
    }
    
    return { metas };
  });

  // META Handler with full Cinemeta enrichment
  builder.defineMetaHandler(async ({ type, id }) => {
    console.log(`ℹ️  Meta request: ${id} (type: ${type})`);
    
    let item = null;
    
    // BauBau movie
    if (id.startsWith('bilosta:') && !id.includes(':series:')) {
      item = bauBauDB.movies.find(m => m.id === id);
      if (item) {
        const meta = await toStremioMeta(item, 'movie', true);
        return { meta };
      }
    }
    
    // BauBau series
    if (id.startsWith('bilosta:series:')) {
      item = bauBauDB.series.find(s => s.id === id);
      if (item) {
        const meta = await toStremioMeta(item, 'series', true);
        return { meta };
      }
    }
    
    return { meta: null };
  });

  // Helper: Quality sorting order
  const qualityOrder = { '4K': 4, '1080p': 3, 'HD': 2, '720p': 1, 'SD': 0 };

  function getQualityScore(quality) {
    if (!quality) return 0;
    for (const [key, value] of Object.entries(qualityOrder)) {
      if (quality.includes(key)) return value;
    }
    return 0;
  }

  function sortStreamsByQuality(streams) {
    return streams.sort((a, b) => {
      const scoreA = getQualityScore(a.title);
      const scoreB = getQualityScore(b.title);
      return scoreB - scoreA; // Descending order (4K first)
    });
  }

  // STREAM Handler - only for OUR content (bilosta/yt IDs)
  builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`🎬 Stream request: ${id} (type: ${type})`);
    
    let streams = [];
    
    // We only provide streams for OUR content, not for Cinemeta/IMDb IDs
    // If someone clicks a movie from Cinemeta (tt12345), we return empty - that's expected!
    if (id.startsWith('tt')) {
      console.log(`ℹ️  IMDb ID ${id} - not in our database (this is normal)`);
      return Promise.resolve({ streams: [] });
    }
    
    // Handle series episode streams
    if (id.includes(':series:') && id.split(':').length === 5) {
      const [, , seriesSlug, seasonNum, epNum] = id.split(':');
      const seriesId = `bilosta:series:${seriesSlug}`;
      
      const series = bauBauDB.series.find(s => s.id === seriesId);
      if (series) {
        const season = series.seasons.find(s => s.number === parseInt(seasonNum));
        if (season) {
          const episode = season.episodes.find(e => e.episode === parseInt(epNum));
          if (episode) {
            // Only return the current episode's stream
            // Stremio will handle "Next Episode" navigation automatically
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
      
      return Promise.resolve({ streams });
    }
    
    // For movies, collect all available streams from all sources
    let movieName = '';
    
    // Handle direct movie streams from BauBau
    if (id.startsWith('bilosta:')) {
      const movie = bauBauDB.movies.find(m => m.id === id);
      
      if (movie) {
        movieName = movie.name;
        
        if (movie.streams) {
          movie.streams.forEach(stream => {
            const quality = stream.quality || 'HD';
            // Don't assume HD = 1080p, just show the quality as-is
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
      }
    }
    
    // Sort streams by quality: 4K > 1080p > 720p > SD
    streams = sortStreamsByQuality(streams);
    
    return Promise.resolve({ streams });
  });
  
  return builder;
}


// Helper: Convert to Stremio meta format with year-based Cinemeta enrichment
async function toStremioMeta(item, type = 'movie', enrichMetadata = false) {
  let cinemeta = null;
  let omdb = null;
  
  // Option 1: Year-based matching
  // Only enrich with Cinemeta if the item has a year to prevent wrong matches
  if (enrichMetadata && item.year) {
    cinemeta = await searchCinemeta(item.name, item.year, type);
    
    // If Cinemeta found a match, also try OMDb for enhanced descriptions
    if (cinemeta?.imdbId) {
      omdb = await fetchOMDb(cinemeta.imdbId);
    }
  }
  // If no year is available, skip Cinemeta enrichment entirely
  // This prevents wrong matches like "Boomerang" matching wrong content
  
  if (type === 'series') {
    // Extract fallback poster from first episode's thumbnail
    let fallbackPoster = null;
    if (item.seasons && item.seasons.length > 0) {
      const firstSeason = item.seasons[0];
      if (firstSeason.episodes && firstSeason.episodes.length > 0) {
        fallbackPoster = firstSeason.episodes[0].thumbnail;
      }
    }
    
    // Use Cinemeta data if available (only enriched if year exists), fallback to local data
    const poster = cinemeta?.poster || fallbackPoster || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=' + encodeURIComponent(item.name);
    
    // Build videos array with Cinemeta episode metadata when available
    const videos = item.seasons.flatMap(season =>
      season.episodes.map(ep => {
        // Try to find matching episode from Cinemeta
        const cinemetaEpisode = cinemeta?.fullMeta?.videos?.find(v => 
          v.season === season.number && v.episode === ep.episode
        );
        
        return {
          id: `${item.id}:${season.number}:${ep.episode}`,
          title: sanitizeText(cinemetaEpisode?.title || ep.title || `Episode ${ep.episode}`),
          season: season.number,
          episode: ep.episode,
          released: cinemetaEpisode?.released || new Date().toISOString(),
          thumbnail: cinemetaEpisode?.thumbnail || ep.thumbnail || poster,
          overview: cinemetaEpisode?.overview || null
        };
      })
    );
    
    return {
      id: item.id,
      type: 'series',
      name: sanitizeText(cinemeta?.fullMeta?.name || item.name),
      poster: poster,
      posterShape: 'poster',
      background: cinemeta?.background || null,
      logo: cinemeta?.logo || null,
      description: sanitizeText(omdb?.plot || cinemeta?.fullMeta?.description || ''),
      releaseInfo: cinemeta?.fullMeta?.year?.toString() || item.year?.toString() || '',
      genres: cinemeta?.fullMeta?.genres || [],
      cast: cinemeta?.fullMeta?.cast || [],
      director: cinemeta?.fullMeta?.director || [],
      writer: cinemeta?.fullMeta?.writer || [],
      imdbRating: cinemeta?.fullMeta?.imdbRating || null,
      awards: omdb?.awards || cinemeta?.fullMeta?.awards || null,
      trailers: cinemeta?.fullMeta?.trailers || [],
      trailerStreams: cinemeta?.fullMeta?.trailerStreams || [],
      videos: videos,
      // DON'T add IMDb links - Stremio will use IMDb IDs for stream requests
      // and we only have streams for bilosta IDs
      links: [],
      behaviorHints: cinemeta?.fullMeta?.behaviorHints || {}
    };
  }
  
  // For movies: Use Cinemeta metadata (only if year exists) with OMDb enhancements, fallback to local data
  const meta = {
    id: item.id,
    type: 'movie',
    name: sanitizeText(cinemeta?.fullMeta?.name || item.name),
    poster: cinemeta?.poster || item.poster || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=' + encodeURIComponent(item.name),
    posterShape: 'poster',
    background: cinemeta?.background || item.background || null,
    logo: cinemeta?.logo || null,
    description: sanitizeText(omdb?.plot || cinemeta?.fullMeta?.description || item.description || ''),
    releaseInfo: cinemeta?.fullMeta?.year?.toString() || item.year?.toString() || '',
    released: cinemeta?.fullMeta?.released || null,
    genres: cinemeta?.fullMeta?.genres || item.genres || [],
    cast: cinemeta?.fullMeta?.cast || item.cast || [],
    director: cinemeta?.fullMeta?.director || item.director || [],
    writer: cinemeta?.fullMeta?.writer || [],
    awards: omdb?.awards || cinemeta?.fullMeta?.awards || null,
    imdbRating: cinemeta?.fullMeta?.imdbRating || null,
    runtime: cinemeta?.fullMeta?.runtime || null,
    trailers: cinemeta?.fullMeta?.trailers || [],
    trailerStreams: cinemeta?.fullMeta?.trailerStreams || [],
    country: omdb?.country || cinemeta?.fullMeta?.country || null,
    dvdRelease: cinemeta?.fullMeta?.dvdRelease || null,
    // DON'T add IMDb links - Stremio will use IMDb IDs for stream requests
    // and we only have streams for bilosta IDs
    links: []
  };
  
  return meta;
  if (cinemeta?.fullMeta?.behaviorHints) {
    meta.behaviorHints = cinemeta.fullMeta.behaviorHints;
  }
  
  return meta;
}

// Serve addon with landing page
const PORT = process.env.PORT || 7005;
const express = require('express');
const { getRouter } = require('stremio-addon-sdk');

const app = express();

// Serve React configure app from dist directory
app.use('/configure', express.static('dist'));

// API endpoint to get content stats
app.get('/api/stats', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.json({
    movies: movieCategories.movies.length,
    foreign: movieCategories.foreign.length,
    kids: movieCategories.kids.length,
    series: allSeriesItems.length
  });
});

// Redirect root to configure
app.get('/', (req, res) => {
  res.redirect('/configure');
});

// Handle configure route with config parameter
app.get('/:config?/configure', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Handle manifest requests with optional configuration
app.get('/:config?/manifest.json', (req, res) => {
  const configString = req.params.config;
  const config = parseConfig(configString);
  
  const manifest = generateManifest(config);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  res.json(manifest);
});

// Create default addon instance for routes without config
const defaultBuilder = createBuilder(null);
defineHandlers(defaultBuilder);
const defaultRouter = getRouter(defaultBuilder.getInterface());

// Handle addon routes without config (default)
app.use((req, res, next) => {
  const path = req.path;
  
  // Check if this is an addon route (catalog, meta, stream)
  if (path.startsWith('/catalog/') || path.startsWith('/meta/') || path.startsWith('/stream/')) {
    return defaultRouter(req, res, next);
  }
  
  // Check if path has config prefix (e.g., /home=movies,series/catalog/...)
  const pathParts = path.split('/').filter(p => p);
  if (pathParts.length > 0 && (pathParts[0].includes('=') || pathParts[0].includes('home'))) {
    const configString = pathParts[0];
    const config = parseConfig(configString);
    
    // Create a builder for this specific configuration
    const builder = createBuilder(config);
    defineHandlers(builder);
    
    // Modify the request path to remove the config prefix
    req.url = '/' + pathParts.slice(1).join('/');
    
    // Get the router for this builder and use it
    const addonRouter = getRouter(builder.getInterface());
    return addonRouter(req, res, next);
  }
  
  next();
});

app.listen(PORT, () => {
  console.log(`\n🚀 Balkan On Demand v5.3.0 running on http://localhost:${PORT}\n`);
  console.log(`📊 Content Stats:`);
  console.log(`   • Movies: ${movieCategories.movies.length}`);
  console.log(`   • Foreign Movies: ${movieCategories.foreign.length}`);
  console.log(`   • Crtani Filmovi: ${movieCategories.kids.length}`);
  console.log(`   • Series: ${allSeriesItems.length}`);
  console.log(`\n✅ Ready to serve streams with year-based Cinemeta enrichment!`);
  console.log(`   ℹ️  Only content with year metadata will be enriched (prevents wrong matches)`);
  console.log(`🎛️  Custom catalog configuration supported!`);
  console.log(`\n📖 Usage:`);
  console.log(`   Default (all catalogs): http://localhost:${PORT}/manifest.json`);
  console.log(`   Custom config: http://localhost:${PORT}/YOUR_CONFIG/manifest.json\n`);
});
