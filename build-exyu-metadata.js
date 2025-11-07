const fs = require('fs');
const path = require('path');

/**
 * Build proper Ex-Yu metadata structure
 * - Group series episodes into proper series
 * - Filter out foreign content
 * - Link to real TMDB IDs for enrichment
 */

const dataPath = path.join(__dirname, 'data', 'baubau-content.json');
const outputPath = path.join(__dirname, 'data', 'exyu-metadata.json');

// Load current database
const database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('🔨 Building Ex-Yu metadata structure...\n');

// Categories that are DEFINITELY Ex-Yu content
const EXYU_MOVIE_CATEGORIES = [
  'KLIK PREMIJERA',
  'EX YU FILMOVI',
  'KLASICI',
  'FILMSKI KLASICI'
];

const EXYU_SERIES_CATEGORIES = [
  'EX YU SERIJE',
  'EXYU SERIJE',
  'EXYU SERIJE KOJE SE EMITUJU',
  'Bolji Zivot',
  'Bela Ladja',
  'Policajac Sa Petlovog Brda',
  'Slatke Muke'
];

/**
 * Parse episode info from filename
 * Examples:
 * - "Bolji Zivot S01 E01 Bolji Zivot"
 * - "Bela Ladja S07 E01 Sojic i Stojkovic 1"
 */
function parseEpisodeInfo(name) {
  // Match pattern: SeriesName S##E## EpisodeTitle
  const match = name.match(/^(.+?)\s+S(\d+)\s*E(\d+)\s+(.+)$/i);
  
  if (match) {
    return {
      seriesName: match[1].trim(),
      season: parseInt(match[2]),
      episode: parseInt(match[3]),
      episodeTitle: match[4].trim()
    };
  }
  
  return null;
}

/**
 * Filter movies - only Ex-Yu content
 */
console.log('📽️  Processing movies...');
const exyuMovies = database.movies
  .filter(movie => EXYU_MOVIE_CATEGORIES.includes(movie.category))
  .map(movie => {
    // Create clean movie entry
    return {
      id: movie.id,
      type: 'movie',
      name: movie.name,
      year: movie.year,
      poster: movie.poster,
      background: movie.background,
      description: movie.description || `Ex-Yu film: ${movie.name}`,
      genres: movie.genres || [],
      category: movie.category,
      streams: movie.streams,
      // Add TMDB ID if available
      tmdbId: null, // To be manually curated later
      imdbId: null
    };
  });

console.log(`   ✓ Filtered to ${exyuMovies.length} Ex-Yu movies`);

/**
 * Group series episodes into proper series
 */
console.log('\n📺 Processing series...');
const seriesMap = new Map();

database.series.forEach(episode => {
  const episodeInfo = parseEpisodeInfo(episode.name);
  
  if (!episodeInfo) {
    console.log(`   ⚠️  Could not parse: ${episode.name}`);
    return;
  }
  
  const seriesId = `exyu_series_${Buffer.from(episodeInfo.seriesName).toString('base64').substring(0, 16)}`;
  
  if (!seriesMap.has(seriesId)) {
    seriesMap.set(seriesId, {
      id: seriesId,
      type: 'series',
      name: episodeInfo.seriesName,
      poster: episode.poster,
      background: episode.background,
      description: `Ex-Yu serija: ${episodeInfo.seriesName}`,
      genres: episode.genres || ['Drama'],
      category: episode.category,
      tmdbId: null, // To be manually curated
      imdbId: null,
      seasons: new Map()
    });
  }
  
  const series = seriesMap.get(seriesId);
  
  // Add season if doesn't exist
  if (!series.seasons.has(episodeInfo.season)) {
    series.seasons.set(episodeInfo.season, {
      number: episodeInfo.season,
      episodes: []
    });
  }
  
  // Add episode
  series.seasons.get(episodeInfo.season).episodes.push({
    id: episode.id,
    episode: episodeInfo.episode,
    title: episodeInfo.episodeTitle,
    thumbnail: episode.poster,
    streams: episode.streams
  });
});

// Convert to array and sort episodes
const exyuSeries = Array.from(seriesMap.values()).map(series => {
  const seasons = Array.from(series.seasons.values())
    .map(season => ({
      number: season.number,
      episodes: season.episodes.sort((a, b) => a.episode - b.episode)
    }))
    .sort((a, b) => a.number - b.number);
  
  return {
    ...series,
    seasons: seasons
  };
});

console.log(`   ✓ Grouped into ${exyuSeries.length} series`);
exyuSeries.forEach(series => {
  const totalEpisodes = series.seasons.reduce((sum, s) => sum + s.episodes.length, 0);
  console.log(`      - ${series.name}: ${series.seasons.length} season(s), ${totalEpisodes} episode(s)`);
});

/**
 * Create manual TMDB mapping structure
 */
const tmdbMappings = {
  movies: {
    // Example: "Movie Name": "tmdb_id"
    // To be filled manually
  },
  series: {
    // Example: "Series Name": "tmdb_id"
    "Bolji Zivot": null, // Yugoslav series, probably not on TMDB
    "Bela Ladja": null,
    "Policajac Sa Petlovog Brda": null,
    "Slatke Muke": null
  }
};

/**
 * Save metadata structure
 */
const metadata = {
  generated: new Date().toISOString(),
  stats: {
    totalMovies: exyuMovies.length,
    totalSeries: exyuSeries.length,
    totalEpisodes: exyuSeries.reduce((sum, s) => 
      sum + s.seasons.reduce((esum, season) => esum + season.episodes.length, 0), 0)
  },
  movies: exyuMovies,
  series: exyuSeries,
  tmdbMappings: tmdbMappings
};

fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

console.log(`\n✅ Ex-Yu metadata built successfully!`);
console.log(`\n📊 Final Stats:`);
console.log(`   Movies: ${metadata.stats.totalMovies}`);
console.log(`   Series: ${metadata.stats.totalSeries}`);
console.log(`   Episodes: ${metadata.stats.totalEpisodes}`);
console.log(`\n💾 Saved to: ${outputPath}`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Review exyu-metadata.json`);
console.log(`   2. Add TMDB IDs to tmdbMappings for better metadata`);
console.log(`   3. Update addon.js to use this structure\n`);
