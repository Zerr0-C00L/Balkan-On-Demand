const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const fs = require('fs');
const path = require('path');

// Load content databases
const bauBauDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'baubau-content.json'), 'utf8'));
const sevcetDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'sevcet-films.json'), 'utf8'));

console.log(`📚 Loaded Database: ${bauBauDB.movies.length} movies, ${bauBauDB.series.length} series`);
console.log(`📚 Loaded YouTube: ${sevcetDB.movies?.length || 0} movies, ${sevcetDB.series?.length || 0} series`);

// Cinemeta integration for metadata enrichment
const CINEMETA_URL = 'https://v3-cinemeta.strem.io';
const cinemetaCache = new Map();

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
            let match = data.metas.find(m => {
                const metaYear = m.year || m.releaseInfo;
                return metaYear && metaYear.toString() === year?.toString();
            });
            
            if (!match) {
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

// Manifest with user-configurable catalogs
const manifest = {
  id: 'community.balkan.on.demand',
  version: '5.0.1',
  name: 'Balkan On Demand',
  description: 'Balkan Movies & Series from Serbia, Croatia & Bosnia, with direct streaming links',
  
  resources: [
    'catalog',
    'meta',
    'stream'
  ],
  
  types: ['movie', 'series'],
  
  idPrefixes: ['tt', 'yt', 'bilosta'],
  
  catalogs: [
    // All Movies (Ex-YU + 4K + YouTube merged)
    {
      id: 'balkan_movies',
      name: 'Filmovi',
      type: 'movie',
      extra: [
        { name: 'genre', isRequired: false },
        { name: 'search', isRequired: false },
        { name: 'skip', isRequired: false }
      ]
    },
    // Foreign Movies
    {
      id: 'balkan_foreign_movies',
      name: 'Strani Filmovi',
      type: 'movie',
      extra: [
        { name: 'genre', isRequired: false },
        { name: 'search', isRequired: false },
        { name: 'skip', isRequired: false }
      ]
    },
    // Kids/Cartoons
    {
      id: 'balkan_kids',
      name: 'Crtani Filmovi',
      type: 'movie',
      extra: [
        { name: 'skip', isRequired: false }
      ]
    },
    // Series
    {
      id: 'balkan_series',
      name: 'Serije',
      type: 'series',
      extra: [
        { name: 'skip', isRequired: false }
      ]
    }
  ],
  
  behaviorHints: {
    configurable: true,
    configurationRequired: false
  }
};

// Create builder
const builder = new addonBuilder(manifest);

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
  
  // Add YouTube movies only if they don't exist in BauBau (no duplicates)
  if (sevcetDB.movies && Array.isArray(sevcetDB.movies)) {
    sevcetDB.movies.forEach(item => {
      if (item.youtubeId) {
        const normalizedName = item.name.toLowerCase().trim();
        
        // Only add if not already in movieMap (prefer direct streams)
        if (!movieMap.has(normalizedName)) {
          movieMap.set(normalizedName, {
            id: item.id || `yt:${item.youtubeId}`,
            name: item.name,
            poster: item.poster || `https://img.youtube.com/vi/${item.youtubeId}/mqdefault.jpg`,
            type: 'youtube',
            youtubeId: item.youtubeId,
            year: item.releaseInfo,
            description: item.description,
            genres: item.genres
          });
        }
      }
    });
  }
  
  // Convert Maps back to arrays
  categories.movies = Array.from(movieMap.values());
  categories.foreign = Array.from(foreignMap.values());
  categories.kids = Array.from(kidsMap.values());
  
  return categories;
}

const movieCategories = categorizeMovies();
console.log(`📊 Categories: Movies(${movieCategories.movies.length}), Foreign(${movieCategories.foreign.length}), Kids(${movieCategories.kids.length})`);

// Helper: Convert to Stremio meta format with Cinemeta enrichment
async function toStremioMeta(item, type = 'movie', enrichMetadata = false) {
  // Fetch Cinemeta metadata if enrichment is requested
  let cinemeta = null;
  if (enrichMetadata && item.name && item.year) {
    cinemeta = await searchCinemeta(item.name, item.year, type);
  }
  
  if (type === 'series') {
    return {
      id: item.id,
      type: 'series',
      name: sanitizeText(item.name),
      poster: cinemeta?.poster || item.poster || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=' + encodeURIComponent(item.name),
      posterShape: 'poster',
      background: cinemeta?.background || item.background || null,
      logo: cinemeta?.logo || item.logo || null,
      description: sanitizeText(item.description || cinemeta?.fullMeta?.description || 'Serbian/Croatian TV series'),
      releaseInfo: item.year?.toString() || '',
      genres: item.genres || cinemeta?.fullMeta?.genres || [],
      cast: cinemeta?.fullMeta?.cast || [],
      director: cinemeta?.fullMeta?.director || [],
      imdbRating: cinemeta?.fullMeta?.imdbRating || null,
      videos: item.seasons.flatMap(season =>
        season.episodes.map(ep => ({
          id: `${item.id}:${season.number}:${ep.episode}`,
          title: sanitizeText(ep.title || `Episode ${ep.episode}`),
          season: season.number,
          episode: ep.episode,
          released: new Date().toISOString()
        }))
      )
    };
  }
  
  const meta = {
    id: item.id,
    type: 'movie',
    name: sanitizeText(item.name),
    poster: cinemeta?.poster || item.poster || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=' + encodeURIComponent(item.name),
    posterShape: 'poster',
    background: cinemeta?.background || item.background || null,
    logo: cinemeta?.logo || item.logo || null,
    description: sanitizeText(item.description || cinemeta?.fullMeta?.description || ''),
    releaseInfo: item.year?.toString() || '',
    genres: item.genres || cinemeta?.fullMeta?.genres || [],
    cast: cinemeta?.fullMeta?.cast || [],
    director: cinemeta?.fullMeta?.director || [],
    imdbRating: cinemeta?.fullMeta?.imdbRating || item.imdbRating || null,
    runtime: cinemeta?.fullMeta?.runtime || item.runtime || null
  };
  
  // Add IMDb link if available
  if (cinemeta?.imdbId) {
    meta.links = [{
      name: 'IMDb',
      category: 'imdb',
      url: `https://www.imdb.com/title/${cinemeta.imdbId}/`
    }];
  }
  
  return meta;
}

// CATALOG Handler with Cinemeta enrichment
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  console.log(`📖 Catalog request: ${id} (type: ${type})`);
  
  const limit = 100;
  const skip = parseInt(extra.skip) || 0;
  const search = extra.search || '';
  
  let items = [];
  
  switch (id) {
    case 'balkan_movies':
      items = movieCategories.movies;
      
      // Apply search filter
      if (search) {
        items = items.filter(m => 
          m.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      items = items.slice(skip, skip + limit);
      break;
      
    case 'balkan_foreign_movies':
      items = movieCategories.foreign;
      
      // Apply search filter
      if (search) {
        items = items.filter(m => 
          m.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      items = items.slice(skip, skip + limit);
      break;
      
    case 'balkan_kids':
      items = movieCategories.kids.slice(skip, skip + limit);
      break;
      
    case 'balkan_series':
      items = bauBauDB.series.slice(skip, skip + limit);
      break;
  }
  
  // Enrich metadata with Cinemeta in parallel (for catalog view)
  const metasPromises = items.map(item => 
    toStremioMeta(item, id === 'balkan_series' ? 'series' : 'movie', true)
  );
  
  const metas = await Promise.all(metasPromises);
  
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
  
  // YouTube movie
  if (id.startsWith('yt:')) {
    const ytId = id.replace('yt:', '');
    const movie = sevcetDB.movies?.find(m => m.youtubeId === ytId);
    
    if (movie) {
      const movieData = {
        id: id,
        name: movie.name,
        year: movie.releaseInfo,
        poster: movie.poster || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
        description: movie.description,
        genres: movie.genres || ['Drama']
      };
      
      const meta = await toStremioMeta(movieData, 'movie', true);
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

// STREAM Handler with merged streams
builder.defineStreamHandler(({ type, id }) => {
  console.log(`🎬 Stream request: ${id} (type: ${type})`);
  
  let streams = [];
  
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
          streams.push({
            name: 'Direct HD',
            title: `🇷🇸 ${series.name}\nS${seasonNum}E${epNum} - Direct HD 1080p`,
            url: episode.url,
            behaviorHints: {
              bingeGroup: `series-${seriesSlug}`
            }
          });
          
          // Add all other episodes for binge-watching
          season.episodes.forEach(ep => {
            if (ep.episode !== parseInt(epNum)) {
              streams.push({
                name: 'Direct HD',
                title: `S${seasonNum}E${ep.episode} - ${ep.title || 'Episode ' + ep.episode}`,
                url: ep.url,
                behaviorHints: {
                  bingeGroup: `series-${seriesSlug}`
                }
              });
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
          const qualityLabel = quality === '4K' ? '4K UHD' : quality === 'HD' ? 'HD 1080p' : quality;
          
          streams.push({
            name: `Direct ${qualityLabel}`,
            title: `🇷🇸 Direct ${qualityLabel}\n${stream.source || 'Bilosta'} • Cloudflare CDN`,
            url: stream.url,
            behaviorHints: {
              bingeGroup: 'balkan-' + movie.id
            }
          });
        });
      }
      
      // Check if this movie also exists on YouTube
      const youtubeMatch = sevcetDB.movies?.find(m => 
        m.name.toLowerCase().trim() === movieName.toLowerCase().trim()
      );
      
      if (youtubeMatch && youtubeMatch.youtubeId) {
        streams.push({
          name: 'YouTube HD (Infuse)',
          title: '📺 YouTube HD 720p\nExternal Player (Infuse)',
          url: `https://www.youtube.com/watch?v=${youtubeMatch.youtubeId}`,
          behaviorHints: {
            bingeGroup: 'balkan-' + movie.id
          }
        });
        
        streams.push({
          name: 'YouTube SD',
          title: '📺 YouTube SD 480p\nWeb Player (Fallback)',
          ytId: youtubeMatch.youtubeId,
          behaviorHints: {
            bingeGroup: 'balkan-' + movie.id
          }
        });
      }
    }
  }
  
  // Handle YouTube-only movies (no direct stream available)
  if (id.startsWith('yt:')) {
    const ytId = id.replace('yt:', '');
    const movie = sevcetDB.movies?.find(m => m.youtubeId === ytId);
    
    if (movie) {
      movieName = movie.name;
      
      // YouTube for Infuse (Apple TV)
      streams.push({
        name: 'YouTube HD (Infuse)',
        title: '📺 YouTube HD 720p\nExternal Player (Infuse)',
        url: `https://www.youtube.com/watch?v=${ytId}`,
        behaviorHints: {
          bingeGroup: 'youtube-' + ytId
        }
      });
      
      // YouTube ytId fallback (Web/Android)
      streams.push({
        name: 'YouTube SD',
        title: '📺 YouTube SD 480p\nWeb Player (Android/Desktop)',
        ytId: ytId,
        behaviorHints: {
          bingeGroup: 'youtube-' + ytId
        }
      });
    }
  }
  
  // Sort streams by quality: 4K > 1080p > 720p > SD
  streams = sortStreamsByQuality(streams);
  
  return Promise.resolve({ streams });
});

// Serve addon
const PORT = process.env.PORT || 7005;

serveHTTP(builder.getInterface(), {
  port: PORT
});

console.log(`\n🚀 Balkan On Demand v5.0.1 running on http://localhost:${PORT}\n`);
console.log(`📊 Content Stats:`);
console.log(`   • Movies: ${movieCategories.movies.length}`);
console.log(`   • Foreign Movies: ${movieCategories.foreign.length}`);
console.log(`   • Crtani Filmovi: ${movieCategories.kids.length}`);
console.log(`   • Series: ${bauBauDB.series.length}`);
console.log(`\n✅ Ready to serve streams with Cinemeta metadata enrichment!\n`);
