const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const fs = require('fs');
const path = require('path');
const { decompressFromEncodedURIComponent } = require('lz-string');

// Load content databases
const bauBauDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'baubau-content.json'), 'utf8'));

// Load translations for Serbian/Croatian titles
let titleTranslations = {};
try {
  const translationsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'translations.json'), 'utf8'));
  titleTranslations = translationsData.serbian_to_english || {};
  console.log(`🌍 Loaded ${Object.keys(titleTranslations).length} title translations`);
} catch (err) {
  console.warn('⚠️  Could not load translations.json, using fallback translations');
  titleTranslations = {
    'Kung Fu Panda': 'Kung Fu Panda',
    'U Mojoj Glavi': 'Inside Out',
    'Neukrotivi Robot': 'The Wild Robot',
    'Gru i Malci': 'Despicable Me'
  };
}

console.log(`📚 Loaded Database: ${bauBauDB.movies.length} movies, ${bauBauDB.series.length} series`);

// Cinemeta integration for metadata enrichment
const CINEMETA_URL = 'https://v3-cinemeta.strem.io';
const cinemetaCache = new Map();

// OMDb API integration for additional metadata (descriptions, etc)
const OMDB_URL = 'https://www.omdbapi.com';
const OMDB_API_KEY = 'trilogy'; // Free public API key
const omdbCache = new Map();

// TMDB API integration for enhanced metadata (when API key is provided)
const tmdbCache = new Map();

// MetaHub integration for fallback metadata (no API key required)
const METAHUB_URL = 'https://images.metahub.space';
const metahubCache = new Map();

// Extract TMDB ID from poster URL
function extractTMDBId(posterUrl) {
    if (!posterUrl || !posterUrl.includes('tmdb')) return null;
    
    // Extract the image hash from URLs like:
    // https://image.tmdb.org/t/p/w780/d06BXJmEfcvvCzp2GRWQeXKVZMT.jpg
    const match = posterUrl.match(/\/([a-zA-Z0-9]+)\.jpg$/);
    return match ? match[1] : null;
}

// Search TMDB by title and year to get movie details
async function searchTMDB(title, year, type = 'movie', apiKey = null) {
    if (!apiKey) return null;
    
    const cacheKey = `search:${type}:${title}:${year}`;
    
    if (tmdbCache.has(cacheKey)) {
        return tmdbCache.get(cacheKey);
    }
    
    try {
        const cleanTitle = title
            .replace(/\([^)]*\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        const endpoint = type === 'series' ? 'tv' : 'movie';
        const searchQuery = encodeURIComponent(cleanTitle);
        let searchUrl = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${apiKey}&query=${searchQuery}&language=en-US`;
        
        if (year) {
            const yearParam = type === 'series' ? 'first_air_date_year' : 'year';
            searchUrl += `&${yearParam}=${year}`;
        }
        
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error(`TMDB search responded with ${response.status}`);
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // Get full details for the first match
            const result = data.results[0];
            const detailsUrl = `https://api.themoviedb.org/3/${endpoint}/${result.id}?api_key=${apiKey}&language=en-US&append_to_response=credits`;
            const detailsResponse = await fetch(detailsUrl);
            
            if (detailsResponse.ok) {
                const details = await detailsResponse.json();
                tmdbCache.set(cacheKey, details);
                return details;
            }
        }
    } catch (error) {
        console.error(`TMDB search error for ${title}:`, error.message);
    }
    
    tmdbCache.set(cacheKey, null);
    return null;
}

// Fetch metadata from TMDB by movie/series ID
async function fetchTMDB(tmdbId, type = 'movie') {
    const cacheKey = `${type}:${tmdbId}`;
    
    if (tmdbCache.has(cacheKey)) {
        return tmdbCache.get(cacheKey);
    }
    
    try {
        const endpoint = type === 'series' ? 'tv' : 'movie';
        const url = `${TMDB_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits,videos`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`TMDB responded with ${response.status}`);
        
        const data = await response.json();
        
        const result = {
            description: data.overview || null,
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w780${data.poster_path}` : null,
            background: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
            genres: data.genres ? data.genres.map(g => g.name) : [],
            cast: data.credits?.cast ? data.credits.cast.slice(0, 10).map(c => c.name) : [],
            director: data.credits?.crew ? data.credits.crew.filter(c => c.job === 'Director').map(d => d.name) : [],
            year: type === 'series' 
                ? (data.first_air_date ? new Date(data.first_air_date).getFullYear() : null)
                : (data.release_date ? new Date(data.release_date).getFullYear() : null),
            rating: data.vote_average || null,
            runtime: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : null),
            trailers: data.videos?.results ? data.videos.results
                .filter(v => v.type === 'Trailer' && v.site === 'YouTube')
                .map(v => ({ source: v.key, type: 'Trailer' })) : []
        };
        
        tmdbCache.set(cacheKey, result);
        return result;
    } catch (error) {
        console.error(`TMDB fetch error for ${tmdbId}:`, error.message);
    }
    
    tmdbCache.set(cacheKey, null);
    return null;
}

// Normalize Serbian/Croatian titles to English equivalents for better API matching
function normalizeTitle(title) {
    // Try direct translation from loaded translations file
    for (const [serbian, english] of Object.entries(titleTranslations)) {
        if (title.includes(serbian)) {
            // Extract sequel number (e.g., "4" from "Kung Fu Panda 4")
            const numberMatch = title.match(/\d+/);
            return numberMatch ? `${english} ${numberMatch[0]}` : english;
        }
    }
    
    // If no translation found, try removing Serbian diacritics and common words
    let cleaned = title
        .replace(/č/gi, 'c')
        .replace(/ć/gi, 'c')
        .replace(/š/gi, 's')
        .replace(/ž/gi, 'z')
        .replace(/đ/gi, 'd')
        .replace(/\([^)]*\)/g, '') // Remove parentheses
        .replace(/\s+/g, ' ')
        .trim();
    
    return cleaned;
}

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
                language: data.Language || null,
                // Include additional fields for fallback metadata
                poster: data.Poster && data.Poster !== 'N/A' ? data.Poster : null,
                year: data.Year || null,
                imdbRating: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : null,
                runtime: data.Runtime && data.Runtime !== 'N/A' ? data.Runtime : null,
                director: data.Director && data.Director !== 'N/A' ? data.Director.split(', ') : [],
                cast: data.Actors && data.Actors !== 'N/A' ? data.Actors.split(', ') : [],
                genres: data.Genre && data.Genre !== 'N/A' ? data.Genre.split(', ') : []
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
  // Direct HD Catalogs (bilosta collection)
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
  },
  // TMDB Dynamic Catalogs
  {
    id: 'tmdb_popular_movies',
    name: '🔥 Popular Movies',
    type: 'movie',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  },
  {
    id: 'tmdb_popular_series',
    name: '🔥 Popular Series',
    type: 'series',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  },
  {
    id: 'tmdb_year_movies',
    name: '📅 Movies by Year',
    type: 'movie',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false },
      { name: 'genre', isRequired: false }
    ]
  },
  {
    id: 'tmdb_year_series',
    name: '📅 Series by Year',
    type: 'series',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false },
      { name: 'genre', isRequired: false }
    ]
  },
  {
    id: 'tmdb_language_movies',
    name: '🌍 Movies by Language',
    type: 'movie',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false },
      { name: 'genre', isRequired: false }
    ]
  },
  {
    id: 'tmdb_language_series',
    name: '🌍 Series by Language',
    type: 'series',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false },
      { name: 'genre', isRequired: false }
    ]
  },
  {
    id: 'tmdb_trending_movies',
    name: '📈 Trending Movies',
    type: 'movie',
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ]
  },
  {
    id: 'tmdb_trending_series',
    name: '📈 Trending Series',
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
    // First, try to decompress using lz-string (new config format from React app)
    try {
      const decompressed = decompressFromEncodedURIComponent(configString);
      if (decompressed) {
        const config = JSON.parse(decompressed);
        console.log('📦 Loaded compressed config:', config);
        return config;
      }
    } catch (decompressError) {
      // Not a compressed config, try legacy formats
    }
    
    const config = {
      catalogs: null,
      tmdbApiKey: null
    };
    
    // Split by & to handle multiple config parameters
    const parts = configString.split('&');
    
    parts.forEach(part => {
      // Handle home=catalog1,catalog2 format
      if (part.startsWith('home=')) {
        const homeValue = part.replace('home=', '');
        const homeCatalogs = homeValue === 'none' ? [] : homeValue.split(',');
        
        // Build catalogs config
        config.catalogs = allCatalogs.map(cat => ({
          id: cat.id,
          type: cat.type,
          enabled: true, // All catalogs enabled
          showInHome: homeCatalogs.includes(cat.id) // Home only for selected
        }));
      }
      
      // Handle tmdb=API_KEY format
      if (part.startsWith('tmdb=')) {
        config.tmdbApiKey = decodeURIComponent(part.replace('tmdb=', ''));
      }
    });
    
    // If no parts were parsed, try parsing as JSON (legacy support)
    if (!config.catalogs && !config.tmdbApiKey) {
      const jsonConfig = JSON.parse(decodeURIComponent(configString));
      return jsonConfig;
    }
    
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
    console.log('📦 Generating manifest with config:', JSON.stringify(config.catalogs, null, 2));
    
    // User has configured catalogs - all catalogs in array are already enabled (filtered by frontend)
    catalogs = config.catalogs
      .map(cat => {
        // Map bilosta.* IDs to actual catalog IDs
        let catalogId = cat.id;
        if (cat.id === 'bilosta.movies') catalogId = 'balkan_movies';
        if (cat.id === 'bilosta.foreign') catalogId = 'balkan_foreign_movies';
        if (cat.id === 'bilosta.kids') catalogId = 'balkan_kids';
        if (cat.id === 'bilosta.series') catalogId = 'balkan_series';
        
        // Map tmdb.* IDs to actual catalog IDs
        if (cat.id === 'tmdb.top' && cat.type === 'movie') catalogId = 'tmdb_popular_movies';
        if (cat.id === 'tmdb.top' && cat.type === 'series') catalogId = 'tmdb_popular_series';
        if (cat.id === 'tmdb.year' && cat.type === 'movie') catalogId = 'tmdb_year_movies';
        if (cat.id === 'tmdb.year' && cat.type === 'series') catalogId = 'tmdb_year_series';
        if (cat.id === 'tmdb.language' && cat.type === 'movie') catalogId = 'tmdb_language_movies';
        if (cat.id === 'tmdb.language' && cat.type === 'series') catalogId = 'tmdb_language_series';
        if (cat.id === 'tmdb.trending' && cat.type === 'movie') catalogId = 'tmdb_trending_movies';
        if (cat.id === 'tmdb.trending' && cat.type === 'series') catalogId = 'tmdb_trending_series';
        
        const baseCatalog = allCatalogs.find(c => c.id === catalogId && c.type === cat.type);
        
        if (!baseCatalog) {
          console.log(`⚠️  Skipping unknown catalog: ${cat.id} (${cat.type}) - mapped to ${catalogId}`);
          return null;
        }
        
        console.log(`✅ Found catalog: ${cat.id} -> ${catalogId} (${cat.type}) - showInHome: ${cat.showInHome}`);
        
        // Control where catalog appears using extraRequired field (like Cinemeta's "New" catalog)
        // - showInHome: true = no extraRequired, appears on Board (home screen)
        // - showInHome: false = add genre as extraRequired with default option, only in Discover
        const extra = [
          { name: 'search', isRequired: false }, 
          { name: 'skip', isRequired: false }
        ];
        
        // Add genre support for filtering (optional for all catalogs)
        extra.push({ name: 'genre', isRequired: false });
        
        const catalogConfig = {
          ...baseCatalog,
          extra: extra,
          extraSupported: ['search', 'skip', 'genre']
        };
        
        // If showInHome is false, require genre selection (Discover-only like Cinemeta "New")
        if (!cat.showInHome) {
          catalogConfig.extraRequired = ['genre'];
          catalogConfig.genres = ['All']; // Default genre option
          console.log(`   → Added extraRequired=['genre'] for Discover-only`);
        }
        
        return catalogConfig;
      })
      .filter(cat => cat !== null); // Remove any null entries
    
    console.log(`📋 Generated ${catalogs.length} catalogs`);
  } else {
    console.log('⚠️  No config provided or no catalogs in config');
  }
  // If no config, catalogs remain empty (disabled by default)

  return {
    id: 'community.balkan.on.demand',
    version: '6.0.0',
    name: 'Balkan On Demand',
    description: catalogs.length > 0
      ? `Direct HD streams + Balkan catalogs for movies & series. ${catalogs.length} catalog(s) active. (TMDB catalogs coming soon!)`
      : 'Direct HD streams for Balkan movies & series. Use with TMDB/Cinemeta for browsing.',
    
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
    
    // Kids/Cartoons - always goes to kids category
    if (movie.category && movie.category.toLowerCase().includes('crtani')) {
      if (!kidsMap.has(normalizedName)) {
        kidsMap.set(normalizedName, movie);
      }
    }
    // Ex-YU/Domaci movies - goes to main movies category
    else if (movie.category && (
      movie.category.includes('EX YU') ||
      movie.category.includes('PREMIJERA') ||
      movie.category.includes('Domaci')
    )) {
      if (!movieMap.has(normalizedName)) {
        movieMap.set(normalizedName, movie);
      }
    }
    // Foreign movies (everything else, including 4K foreign movies)
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

// TMDB Catalog Handler
async function handleTMDBCatalog(catalogId, type, extra, apiKey) {
  if (!apiKey || apiKey === 'YOUR_TMDB_API_KEY_HERE') {
    console.log(`❌ TMDB catalog ${catalogId} requires API key`);
    return { metas: [] };
  }
  
  const limit = 100;
  const skip = parseInt(extra.skip) || 0;
  const page = Math.floor(skip / 20) + 1; // TMDB uses 20 items per page
  
  try {
    let endpoint = '';
    const mediaType = type === 'series' ? 'tv' : 'movie';
    
    // Determine TMDB API endpoint based on catalog
    if (catalogId.includes('popular')) {
      endpoint = `https://api.themoviedb.org/3/${mediaType}/popular?api_key=${apiKey}&page=${page}&language=en-US`;
    } else if (catalogId.includes('trending')) {
      endpoint = `https://api.themoviedb.org/3/trending/${mediaType}/week?api_key=${apiKey}&page=${page}`;
    } else if (catalogId.includes('year')) {
      const currentYear = new Date().getFullYear();
      const year = extra.genre || currentYear; // Use genre field for year
      endpoint = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${apiKey}&page=${page}&sort_by=popularity.desc&primary_release_year=${year}&language=en-US`;
    } else if (catalogId.includes('language')) {
      const language = extra.genre || 'en'; // Use genre field for language code
      endpoint = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${apiKey}&page=${page}&sort_by=popularity.desc&with_original_language=${language}&language=en-US`;
    }
    
    console.log(`🎬 Fetching TMDB catalog: ${catalogId} (page ${page})`);
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      console.error(`TMDB API error: ${response.status}`);
      return { metas: [] };
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return { metas: [] };
    }
    
    // Convert TMDB results to Stremio meta format
    const metas = data.results.map(item => {
      const id = `tt${item.id}`; // Use TMDB ID with tt prefix for compatibility
      const name = type === 'series' ? item.name : item.title;
      const year = type === 'series' 
        ? (item.first_air_date ? item.first_air_date.split('-')[0] : '')
        : (item.release_date ? item.release_date.split('-')[0] : '');
      
      return {
        id: id,
        type: type,
        name: name,
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w780${item.poster_path}` : null,
        posterShape: 'poster',
        background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
        description: item.overview || '',
        releaseInfo: year,
        imdbRating: item.vote_average ? item.vote_average.toFixed(1) : null
      };
    }).filter(meta => meta.poster); // Only include items with posters
    
    console.log(`✅ Returned ${metas.length} TMDB items`);
    return { metas };
    
  } catch (error) {
    console.error(`Error fetching TMDB catalog ${catalogId}:`, error.message);
    return { metas: [] };
  }
}

// Define handlers on a builder instance (will be attached to route handler)
function defineHandlers(builder, config = null) {
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
        
      // TMDB Catalogs
      case 'tmdb_popular_movies':
      case 'tmdb_popular_series':
      case 'tmdb_year_movies':
      case 'tmdb_year_series':
      case 'tmdb_language_movies':
      case 'tmdb_language_series':
      case 'tmdb_trending_movies':
      case 'tmdb_trending_series':
        return await handleTMDBCatalog(id, type, extra, config?.tmdbApiKey);
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
    
    // Special case: genre="All" means show everything (for Discover-only catalogs)
    if (genre && genre !== 'All') {
      // For genre filtering: NO enrichment in catalog, use database genres
      // Enrichment only happens in individual meta view for descriptions
      const metasPromises = items.map(item => 
        toStremioMeta(item, id === 'balkan_series' ? 'series' : 'movie', false) // false = no enrichment
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
      // No genre filter OR genre="All": paginate first, NO enrichment for catalog (use database posters)
      items = items.slice(skip, skip + limit);
      
      const metasPromises = items.map(item => 
        toStremioMeta(item, id === 'balkan_series' ? 'series' : 'movie', false) // false = no enrichment
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
        const meta = await toStremioMeta(item, 'movie', true, config?.tmdbApiKey);
        return { meta };
      }
    }
    
    // BauBau series
    if (id.startsWith('bilosta:series:')) {
      item = bauBauDB.series.find(s => s.id === id);
      if (item) {
        const meta = await toStremioMeta(item, 'series', true, config?.tmdbApiKey);
        return { meta };
      }
    }
    
    // IMDb ID - search our database for a match
    if (id.startsWith('tt')) {
      console.log(`🔍 IMDb ID ${id} - searching our database for match...`);
      
      const db = type === 'series' ? bauBauDB.series : bauBauDB.movies;
      
      for (const dbItem of db) {
        // Try to match by Cinemeta lookup
        const cinemeta = await searchCinemeta(dbItem.name, dbItem.year, type);
        if (cinemeta?.imdbId === id) {
          console.log(`✅ Found match: ${dbItem.name} (${dbItem.id})`);
          const meta = await toStremioMeta(dbItem, type, true, config?.tmdbApiKey);
          // Override the ID to use the IMDb ID for cross-addon compatibility
          if (meta) {
            meta.id = id;
          }
          return { meta };
        }
      }
      
      console.log(`❌ No match found in our database for ${id}`);
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
    
    // If it's an IMDb ID, try to find the matching item in our database
    if (id.startsWith('tt')) {
      console.log(`🔍 IMDb ID ${id} - searching our database for match...`);
      
      // Search our database by trying to match via Cinemeta/OMDb
      // This is slower but allows users to search globally and still get our streams
      let matchedItem = null;
      
      if (type === 'movie') {
        // Try to find a movie that matches this IMDb ID
        for (const movie of bauBauDB.movies) {
          if (movie.year) {
            const cinemeta = await searchCinemeta(movie.name, movie.year, 'movie');
            if (cinemeta?.imdbId === id) {
              matchedItem = movie;
              console.log(`✅ Found match: ${movie.name} (${movie.id})`);
              break;
            }
          }
        }
      } else if (type === 'series') {
        // Try to find a series that matches this IMDb ID
        for (const series of bauBauDB.series) {
          if (series.year) {
            const cinemeta = await searchCinemeta(series.name, series.year, 'series');
            if (cinemeta?.imdbId === id) {
              matchedItem = series;
              console.log(`✅ Found match: ${series.name} (${series.id})`);
              break;
            }
          }
        }
      }
      
      if (!matchedItem) {
        console.log(`❌ No match found in our database for IMDb ID ${id}`);
        return Promise.resolve({ streams: [] });
      }
      
      // Use the matched item's ID to continue with stream lookup
      id = matchedItem.id;
      console.log(`🔄 Using our ID: ${id}`);
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
            console.log(`✅ Found episode stream for ${series.name} S${seasonNum}E${epNum}`);
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
          } else {
            console.log(`❌ Episode not found: S${seasonNum}E${epNum}`);
          }
        } else {
          console.log(`❌ Season not found: ${seasonNum}`);
        }
      } else {
        console.log(`❌ Series not found: ${seriesId}`);
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
        console.log(`✅ Found movie: ${movieName}`);
        
        if (movie.streams) {
          console.log(`✅ Movie has ${movie.streams.length} stream(s)`);
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
        } else {
          console.log(`❌ Movie has no streams property`);
        }
      } else {
        console.log(`❌ Movie not found in database: ${id}`);
      }
    }
    
    // Sort streams by quality: 4K > 1080p > 720p > SD
    streams = sortStreamsByQuality(streams);
    
    console.log(`📤 Returning ${streams.length} stream(s)`);
    return Promise.resolve({ streams });
  });
  
  return builder;
}


// Helper: Convert to Stremio meta format with multi-tier enrichment
async function toStremioMeta(item, type = 'movie', enrichMetadata = false, tmdbApiKey = null) {
  let cinemeta = null;
  let omdb = null;
  let tmdb = null;
  
  if (enrichMetadata) {
    // TIER 1: Items with years - try Cinemeta first (most accurate with IMDb IDs)
    if (item.year) {
      cinemeta = await searchCinemeta(item.name, item.year, type);
      
      // If Cinemeta found a match, also try OMDb for enhanced descriptions
      if (cinemeta?.imdbId) {
        omdb = await fetchOMDb(cinemeta.imdbId);
      }
      // If Cinemeta failed, try OMDb direct search with title + year
      else {
        omdb = await fetchOMDb(null, item.name, item.year);
      }
      
      // TIER 1.5: If we have a TMDB API key, try TMDB as well for additional metadata
      if (tmdbApiKey && tmdbApiKey !== 'YOUR_TMDB_API_KEY_HERE') {
        try {
          tmdb = await searchTMDB(item.name, item.year, type, tmdbApiKey);
        } catch (e) {
          console.error('TMDB search failed:', e.message);
        }
      }
    }
    // TIER 2: Items without years - try OMDb with normalized title
    else {
      const normalizedTitle = normalizeTitle(item.name);
      omdb = await fetchOMDb(null, normalizedTitle, null);
      
      // If normalized title didn't work, try original title
      if (!omdb || !omdb.plot) {
        omdb = await fetchOMDb(null, item.name, null);
      }
      
      // Try TMDB without year if API key is available
      if (tmdbApiKey && tmdbApiKey !== 'YOUR_TMDB_API_KEY_HERE') {
        try {
          tmdb = await searchTMDB(item.name, null, type, tmdbApiKey);
        } catch (e) {
          console.error('TMDB search failed:', e.message);
        }
      }
    }
    // TIER 3: If all enrichment fails - use local database only
  }
  
  if (type === 'series') {
    // Extract fallback poster from first episode's thumbnail
    let fallbackPoster = null;
    if (item.seasons && item.seasons.length > 0) {
      const firstSeason = item.seasons[0];
      if (firstSeason.episodes && firstSeason.episodes.length > 0) {
        fallbackPoster = firstSeason.episodes[0].thumbnail;
      }
    }
    
    // Use enriched data if available: Cinemeta > OMDb fallback > local data
    const poster = cinemeta?.poster || omdb?.poster || fallbackPoster || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=' + encodeURIComponent(item.name);
    
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
      name: sanitizeText(tmdb?.name || cinemeta?.fullMeta?.name || item.name),
      poster: tmdb?.poster_path ? `https://image.tmdb.org/t/p/w780${tmdb.poster_path}` : poster,
      posterShape: 'poster',
      background: tmdb?.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdb.backdrop_path}` : (cinemeta?.background || null),
      logo: cinemeta?.logo || null,
      description: sanitizeText(tmdb?.overview || omdb?.plot || cinemeta?.fullMeta?.description || ''),
      releaseInfo: tmdb?.first_air_date?.split('-')[0] || cinemeta?.fullMeta?.year?.toString() || omdb?.year?.toString() || item.year?.toString() || '',
      genres: tmdb?.genres?.map(g => g.name) || cinemeta?.fullMeta?.genres || omdb?.genres || [],
      cast: tmdb?.credits?.cast?.slice(0, 10).map(c => c.name) || cinemeta?.fullMeta?.cast || omdb?.cast || [],
      director: tmdb?.credits?.crew?.find(c => c.job === 'Director')?.name ? [tmdb.credits.crew.find(c => c.job === 'Director').name] : (cinemeta?.fullMeta?.director || omdb?.director || []),
      writer: tmdb?.credits?.crew?.filter(c => c.job === 'Writer' || c.job === 'Screenplay').map(c => c.name) || cinemeta?.fullMeta?.writer || [],
      imdbRating: tmdb?.vote_average?.toString() || cinemeta?.fullMeta?.imdbRating || omdb?.imdbRating || null,
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
  
  // For movies: Priority order: TMDB (if available) > Cinemeta > OMDb fallback > Local data
  const meta = {
    id: item.id,
    type: 'movie',
    name: sanitizeText(tmdb?.title || cinemeta?.fullMeta?.name || item.name),
    poster: tmdb?.poster_path ? `https://image.tmdb.org/t/p/w780${tmdb.poster_path}` : (cinemeta?.poster || omdb?.poster || item.poster || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=' + encodeURIComponent(item.name)),
    posterShape: 'poster',
    background: tmdb?.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdb.backdrop_path}` : (cinemeta?.background || item.background || null),
    logo: cinemeta?.logo || null,
    description: sanitizeText(tmdb?.overview || omdb?.plot || cinemeta?.fullMeta?.description || item.description || ''),
    releaseInfo: tmdb?.release_date?.split('-')[0] || cinemeta?.fullMeta?.year?.toString() || omdb?.year?.toString() || item.year?.toString() || '',
    released: tmdb?.release_date ? new Date(tmdb.release_date).toISOString() : (cinemeta?.fullMeta?.released || null),
    genres: tmdb?.genres?.map(g => g.name) || cinemeta?.fullMeta?.genres || omdb?.genres || item.genres || [],
    cast: tmdb?.credits?.cast?.slice(0, 10).map(c => c.name) || cinemeta?.fullMeta?.cast || omdb?.cast || item.cast || [],
    director: tmdb?.credits?.crew?.find(c => c.job === 'Director')?.name ? [tmdb.credits.crew.find(c => c.job === 'Director').name] : (cinemeta?.fullMeta?.director || omdb?.director || item.director || []),
    writer: tmdb?.credits?.crew?.filter(c => c.job === 'Writer' || c.job === 'Screenplay').map(c => c.name) || cinemeta?.fullMeta?.writer || [],
    awards: omdb?.awards || cinemeta?.fullMeta?.awards || null,
    imdbRating: tmdb?.vote_average?.toString() || cinemeta?.fullMeta?.imdbRating || omdb?.imdbRating || null,
    runtime: tmdb?.runtime?.toString() || cinemeta?.fullMeta?.runtime || omdb?.runtime || null,
    trailers: cinemeta?.fullMeta?.trailers || [],
    trailerStreams: cinemeta?.fullMeta?.trailerStreams || [],
    country: tmdb?.production_countries?.map(c => c.name).join(', ') || omdb?.country || cinemeta?.fullMeta?.country || null,
    dvdRelease: cinemeta?.fullMeta?.dvdRelease || null,
    // DON'T add IMDb links - Stremio will use IMDb IDs for stream requests
    // and we only have streams for bilosta IDs
    links: []
  };
  
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

// Enable JSON body parsing
app.use(express.json());

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

// Handle addon routes with or without config prefix
app.use((req, res, next) => {
  const path = req.path;
  const pathParts = path.split('/').filter(p => p);
  
  // Check if this is a direct addon route without config (catalog, meta, stream)
  if (path.startsWith('/catalog/') || path.startsWith('/meta/') || path.startsWith('/stream/')) {
    return defaultRouter(req, res, next);
  }
  
  // Check if path has config prefix
  // Config can be: compressed (N4Ig...), legacy with = (home=movies), or contain 'home' or 'tmdb'
  if (pathParts.length > 1) {
    const firstPart = pathParts[0];
    const secondPart = pathParts[1];
    
    // If second part is catalog/meta/stream, first part is likely the config
    if (secondPart === 'catalog' || secondPart === 'meta' || secondPart === 'stream') {
      const configString = firstPart;
      const config = parseConfig(configString);
      
      console.log(`🔧 Config request detected: ${configString.substring(0, 20)}...`);
      
      // Create a builder for this specific configuration
      const builder = createBuilder(config);
      defineHandlers(builder, config);
      
      // Modify the request path to remove the config prefix
      req.url = '/' + pathParts.slice(1).join('/');
      
      // Get the router for this builder and use it
      const addonRouter = getRouter(builder.getInterface());
      return addonRouter(req, res, next);
    }
  }
  
  next();
});

app.listen(PORT, () => {
  console.log(`\n🚀 Balkan On Demand v5.6.0 running on http://localhost:${PORT}\n`);
  console.log(`📊 Content Stats:`);
  console.log(`   • Movies: ${movieCategories.movies.length}`);
  console.log(`   • Foreign Movies: ${movieCategories.foreign.length}`);
  console.log(`   • Crtani Filmovi: ${movieCategories.kids.length}`);
  console.log(`   • Series: ${allSeriesItems.length}`);
  console.log(`\n✅ Ready to serve streams with optimized metadata!`);
  console.log(`   📋 Catalog View: Fast database posters (no API calls)`);
  console.log(`   📋 Detail View: Full enrichment (Cinemeta + OMDb + translations)`);
  console.log(`   � Performance: Instant catalog loading`);
  console.log(`   🌍 Serbian title normalization: ${Object.keys(titleTranslations).length} translations`);
  console.log(`🎛️  Custom catalog configuration supported!`);
  console.log(`\n📖 Usage:`);
  console.log(`   Default (all catalogs): http://localhost:${PORT}/manifest.json`);
  console.log(`   Custom config: http://localhost:${PORT}/YOUR_CONFIG/manifest.json\n`);
});
