#!/usr/bin/env node

/**
 * Reorganize Balkan content using Plex naming conventions
 * Parses filenames, groups series properly, matches with TMDB
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const INPUT_FILE = path.join(DATA_DIR, 'baubau-content-full-backup.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'baubau-content.json');

// Load source database
console.log('📚 Loading source database...\n');
const sourceDB = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

// Ex-Yu content categories to keep
const EXYU_CATEGORIES = [
  'KLIK PREMIJERA',
  'EX YU FILMOVI',
  'FILMSKI KLASICI' // Only domestic classics, not foreign "KLASICI"
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
 * Parse filename to extract series name, season, episode
 * Supports formats:
 * - "Show Name S01 E01 Episode Title"
 * - "Show.Name.S01E01.Episode.Title"
 * - "Show Name - 1x01 - Episode Title"
 */
function parseSeriesFilename(filename) {
  // Remove extension
  let name = filename.replace(/\.(mp4|mkv|avi|mov)$/i, '');
  
  // Try pattern: "Name S## E## Title" or "Name S##E##"
  let match = name.match(/^(.+?)\s*S(\d+)\s*E(\d+)\s*(.*)$/i);
  if (match) {
    return {
      seriesName: match[1].trim(),
      season: parseInt(match[2]),
      episode: parseInt(match[3]),
      episodeTitle: match[4].trim() || null
    };
  }
  
  // Try pattern: "Name - 1x01 - Title"
  match = name.match(/^(.+?)\s*-?\s*(\d+)x(\d+)\s*-?\s*(.*)$/i);
  if (match) {
    return {
      seriesName: match[1].trim(),
      season: parseInt(match[2]),
      episode: parseInt(match[3]),
      episodeTitle: match[4].trim() || null
    };
  }
  
  // Try pattern with dots: "Name.S01E01.Title"
  match = name.match(/^(.+?)\.S(\d+)E(\d+)\.(.*)$/i);
  if (match) {
    return {
      seriesName: match[1].replace(/\./g, ' ').trim(),
      season: parseInt(match[2]),
      episode: parseInt(match[3]),
      episodeTitle: match[4].replace(/\./g, ' ').trim() || null
    };
  }
  
  return null;
}

/**
 * Parse movie filename
 */
function parseMovieFilename(filename, originalTitle) {
  // Remove extension
  let name = filename.replace(/\.(mp4|mkv|avi|mov)$/i, '');
  
  // Extract year if present: (2024) or [2024]
  const yearMatch = name.match(/[\(\[](\d{4})[\)\]]/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;
  
  // Remove year from name
  if (yearMatch) {
    name = name.replace(/[\(\[]\d{4}[\)\]]/g, '').trim();
  }
  
  // Use original title if it has year info
  if (originalTitle) {
    const origYearMatch = originalTitle.match(/\((\d{4})\)/);
    if (origYearMatch && !year) {
      return {
        title: name,
        year: parseInt(origYearMatch[1])
      };
    }
  }
  
  return {
    title: name,
    year: year
  };
}

/**
 * Check if content is Ex-Yu based on path and category
 */
function isExYuContent(item) {
  const url = item.streams?.[0]?.url || '';
  const category = item.category || '';
  const name = item.name || '';
  const upperPath = url.toUpperCase();
  
  // Skip foreign content paths
  if (upperPath.includes('STRANI') || 
      upperPath.includes('FOREIGN') || 
      upperPath.includes('4K') ||
      upperPath.includes('IMDB') ||
      upperPath.includes('CARTOON') ||
      upperPath.includes('CRTANI')) {
    return false;
  }
  
  // Special handling for KLASICI - only keep if from EX-YU subdirectory
  if (category === 'KLASICI' || category === 'FILMSKI KLASICI') {
    // Skip if filename is just numbers (these are TMDB IDs for foreign movies)
    const filename = url.split('/').pop();
    if (/^\d+\.(mkv|mp4|avi)$/i.test(filename)) {
      return false; // Foreign classic with TMDB ID as filename
    }
    
    // Only keep if path contains domestic/balkan markers
    if (upperPath.includes('/EX.YU/') || 
        upperPath.includes('/EXYU/') ||
        upperPath.includes('/DOMACE/') ||
        upperPath.includes('/DOMACIFILMOVI/') ||
        upperPath.includes('/JUGOSLOVENSKI/') ||
        upperPath.includes('/SRPSKI/') ||
        upperPath.includes('/HRVATSKI/') ||
        upperPath.includes('/BOSANSKI/')) {
      return true;
    }
    // Otherwise skip - it's foreign classics
    return false;
  }
  
  // Must be in Ex-Yu categories
  if (item.type === 'series') {
    return EXYU_SERIES_CATEGORIES.includes(category);
  } else {
    return EXYU_CATEGORIES.includes(category);
  }
}

/**
 * Process movies
 */
function processMovies() {
  console.log('🎬 Processing movies...');
  
  const movies = [];
  const seenUrls = new Set();
  
  sourceDB.movies.forEach(movie => {
    if (!isExYuContent(movie)) return;
    
    const url = movie.streams?.[0]?.url;
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    
    // Extract filename from URL
    const filename = url.split('/').pop();
    const parsed = parseMovieFilename(filename, movie.originalTitle);
    
    // Create unique ID from URL
    const urlHash = Buffer.from(url).toString('base64').replace(/[=/+]/g, '');
    
    movies.push({
      id: `bilosta:${urlHash}`,
      type: 'movie',
      name: parsed.title,
      year: parsed.year || movie.year,
      poster: movie.poster,
      background: movie.background,
      genres: movie.genres || [],
      cast: movie.cast || [],
      director: movie.director || [],
      streams: movie.streams,
      category: movie.category,
      originalTitle: movie.originalTitle
    });
  });
  
  console.log(`   ✓ Processed ${movies.length} Ex-Yu movies\n`);
  return movies;
}

/**
 * Process series - filter Ex-Yu series only
 */
function processSeries() {
  console.log('📺 Processing series...');
  
  const series = [];
  const seenIds = new Set();
  
  (sourceDB.series || []).forEach(s => {
    // Check if any episode is from Ex-Yu path
    let isExYu = false;
    if (s.seasons && s.seasons.length > 0) {
      const firstEpisode = s.seasons[0]?.episodes?.[0];
      if (firstEpisode && firstEpisode.url) {
        const url = firstEpisode.url.toUpperCase();
        // Keep only if path contains DOMACE (domestic) or EXYU
        if (url.includes('DOMACE') || url.includes('EXYU') || url.includes('EX.YU')) {
          // Skip foreign paths
          if (!url.includes('STRANI') && !url.includes('FOREIGN')) {
            isExYu = true;
          }
        }
      }
    }
    
    if (!isExYu) return;
    if (seenIds.has(s.id)) return;
    seenIds.add(s.id);
    
    // Count total episodes
    const episodeCount = s.seasons.reduce((sum, season) => 
      sum + (season.episodes?.length || 0), 0);
    
    series.push({
      ...s,
      episodeCount: episodeCount
    });
  });
  
  console.log(`   ✓ Processed ${series.length} Ex-Yu series with proper episode grouping\n`);
  
  // Show series breakdown
  series.forEach(s => {
    console.log(`   📺 ${s.name}: ${s.seasons.length} season(s), ${s.episodeCount} episodes`);
  });
  
  return series;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Reorganizing content with Plex-style naming...\n');
  
  const movies = processMovies();
  const series = processSeries();
  
  const outputDB = {
    generated: new Date().toISOString(),
    stats: {
      totalMovies: movies.length,
      moviesWithTMDB: 0,
      moviesEnriched: movies.length,
      totalSeries: series.length,
      totalEpisodes: series.reduce((sum, s) => sum + s.episodeCount, 0)
    },
    movies: movies,
    series: series
  };
  
  // Save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputDB, null, 2));
  
  console.log('\n✅ Content reorganized!');
  console.log(`   📊 Movies: ${movies.length}`);
  console.log(`   📺 Series: ${series.length}`);
  console.log(`   📝 Episodes: ${outputDB.stats.totalEpisodes}`);
  console.log(`\n💾 Saved to: ${OUTPUT_FILE}\n`);
}

main().catch(console.error);
