const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const fs = require('fs');
const path = require('path');

// Load content databases
const bauBauDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'baubau-content.json'), 'utf8'));
const sevcetDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'sevcet-films.json'), 'utf8'));

console.log(`📚 Loaded Database: ${bauBauDB.movies.length} movies, ${bauBauDB.series.length} series`);
console.log(`📚 Loaded YouTube: ${sevcetDB.movies?.length || 0} movies, ${sevcetDB.series?.length || 0} series`);

// Manifest with user-configurable catalogs
const manifest = {
  id: 'community.balkan.on.demand',
  version: '5.0.0',
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

// Helper: Convert to Stremio meta format
function toStremioMeta(item, type = 'movie') {
  if (type === 'series') {
    return {
      id: item.id,
      type: 'series',
      name: item.name,
      poster: item.poster || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=' + encodeURIComponent(item.name),
      posterShape: 'poster',
      background: item.background,
      description: item.description || 'Serbian/Croatian TV series',
      releaseInfo: item.year?.toString(),
      videos: item.seasons.flatMap(season =>
        season.episodes.map(ep => ({
          id: `${item.id}:${season.number}:${ep.episode}`,
          title: ep.title || `Episode ${ep.episode}`,
          season: season.number,
          episode: ep.episode,
          released: new Date().toISOString()
        }))
      )
    };
  }
  
  return {
    id: item.id,
    type: 'movie',
    name: item.name,
    poster: item.poster || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=' + encodeURIComponent(item.name),
    posterShape: 'poster',
    background: item.background,
    logo: item.logo,
    description: item.description || '',
    releaseInfo: item.year?.toString(),
    imdbRating: item.imdbRating,
    genres: item.genres || [],
    cast: item.cast || [],
    director: item.director || [],
    runtime: item.runtime,
    links: item.streams?.map(s => ({
      name: s.source,
      url: s.url
    }))
  };
}

// CATALOG Handler
builder.defineCatalogHandler(({ type, id, extra }) => {
  console.log(`📖 Catalog request: ${id} (type: ${type})`);
  
  const limit = 100;
  const skip = parseInt(extra.skip) || 0;
  const search = extra.search || '';
  
  let metas = [];
  
  switch (id) {
    case 'balkan_movies':
      let allMovies = movieCategories.movies;
      
      // Apply search filter
      if (search) {
        allMovies = allMovies.filter(m => 
          m.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      metas = allMovies
        .slice(skip, skip + limit)
        .map(m => toStremioMeta(m));
      break;
      
    case 'balkan_foreign_movies':
      let foreignMovies = movieCategories.foreign;
      
      // Apply search filter
      if (search) {
        foreignMovies = foreignMovies.filter(m => 
          m.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      metas = foreignMovies
        .slice(skip, skip + limit)
        .map(m => toStremioMeta(m));
      break;
      
    case 'balkan_kids':
      metas = movieCategories.kids
        .slice(skip, skip + limit)
        .map(m => toStremioMeta(m));
      break;
      
    case 'balkan_series':
      metas = bauBauDB.series
        .slice(skip, skip + limit)
        .map(s => toStremioMeta(s, 'series'));
      break;
  }
  
  return Promise.resolve({ metas });
});

// META Handler
builder.defineMetaHandler(({ type, id }) => {
  console.log(`ℹ️  Meta request: ${id} (type: ${type})`);
  
  let meta = null;
  
  // BauBau movie
  if (id.startsWith('bilosta:') && !id.includes(':series:')) {
    meta = bauBauDB.movies.find(m => m.id === id);
    if (meta) {
      return Promise.resolve({ meta: toStremioMeta(meta) });
    }
  }
  
  // BauBau series
  if (id.startsWith('bilosta:series:')) {
    meta = bauBauDB.series.find(s => s.id === id);
    if (meta) {
      return Promise.resolve({ meta: toStremioMeta(meta, 'series') });
    }
  }
  
  // YouTube movie
  if (id.startsWith('yt:')) {
    const ytId = id.replace('yt:', '');
    const movie = sevcetDB.movies?.find(m => m.youtubeId === ytId);
    
    if (movie) {
      return Promise.resolve({
        meta: {
          id: id,
          type: 'movie',
          name: movie.name,
          poster: movie.poster || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
          posterShape: 'poster',
          description: movie.description || 'Serbian/Croatian movie available on YouTube',
          releaseInfo: movie.releaseInfo,
          genres: movie.genres || ['Drama']
        }
      });
    }
  }
  
  return Promise.resolve({ meta: null });
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

console.log(`\n🚀 Balkan On Demand v5.0.0 running on http://localhost:${PORT}\n`);
console.log(`📊 Content Stats:`);
console.log(`   • Movies: ${movieCategories.movies.length}`);
console.log(`   • Foreign Movies: ${movieCategories.foreign.length}`);
console.log(`   • Crtani Filmovi: ${movieCategories.kids.length}`);
console.log(`   • Series: ${bauBauDB.series.length}`);
console.log(`\n✅ Ready to serve streams!\n`);
