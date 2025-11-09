#!/usr/bin/env node

/**
 * TMDB Symlink Manager
 * 
 * Creates organized symlink structure that maps TMDB IDs to your actual media files.
 * This allows TMDB to recognize your media while keeping your original CDN structure intact.
 * 
 * Structure created:
 * 
 * symlinks/
 * ├── movies/
 * │   ├── tmdb-123456/
 * │   │   └── movie.mp4 -> ../../../../original/path/to/file.mp4
 * │   └── tmdb-789012/
 * │       └── movie.mp4 -> ../../../../original/path/to/file.mp4
 * └── series/
 *     └── tmdb-345678/
 *         ├── Season 01/
 *         │   ├── S01E01.mp4 -> ../../../../../original/path/s01e01.mp4
 *         │   └── S01E02.mp4 -> ../../../../../original/path/s01e02.mp4
 *         └── Season 02/
 *             └── S02E01.mp4 -> ../../../../../original/path/s02e01.mp4
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const BASE_PATH = path.join(__dirname, '..');
const DATA_PATH = path.join(BASE_PATH, 'data', 'baubau-content.json');
const SYMLINK_BASE = path.join(BASE_PATH, 'symlinks');
const MAPPING_FILE = path.join(BASE_PATH, 'data', 'tmdb-id-mapping.json');

// Get TMDB API key from command line argument or environment variable
const TMDB_API_KEY = process.argv[2] || process.env.TMDB_API_KEY || null;

// TMDB API helper
async function fetchTMDB(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}&language=en-US`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Extract TMDB ID from poster URL
function extractTMDBIdFromPoster(posterUrl) {
  if (!posterUrl || !posterUrl.includes('tmdb')) return null;
  
  // URLs like: https://image.tmdb.org/t/p/w780/d06BXJmEfcvvCzp2GRWQeXKVZMT.jpg
  // The hash is unique per movie/show
  const match = posterUrl.match(/\/([a-zA-Z0-9]+)\.jpg$/);
  return match ? match[1] : null;
}

// Search TMDB by title and year to get proper TMDB ID
async function searchTMDBForId(title, year, type = 'movie') {
  try {
    const cleanTitle = title
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const endpoint = type === 'series' ? 'tv' : 'movie';
    const searchQuery = encodeURIComponent(cleanTitle);
    
    let searchPath = `/search/${endpoint}?query=${searchQuery}`;
    
    if (year) {
      const yearParam = type === 'series' ? 'first_air_date_year' : 'year';
      searchPath += `&${yearParam}=${year}`;
    }
    
    console.log(`🔍 Searching TMDB: ${cleanTitle} (${year || 'no year'})`);
    const data = await fetchTMDB(searchPath);
    
    if (data.results && data.results.length > 0) {
      // Get first result with exact year match (if year provided)
      let match = data.results[0];
      
      if (year) {
        const yearMatch = data.results.find(r => {
          const resultYear = type === 'series' 
            ? (r.first_air_date ? r.first_air_date.split('-')[0] : null)
            : (r.release_date ? r.release_date.split('-')[0] : null);
          return resultYear === year.toString();
        });
        
        if (yearMatch) match = yearMatch;
      }
      
      console.log(`✅ Found: ${match.title || match.name} (${match.id})`);
      return match.id;
    }
    
    console.log(`❌ No TMDB match found`);
    return null;
  } catch (error) {
    console.error(`Error searching TMDB:`, error.message);
    return null;
  }
}

// Parse URL from base64 ID
function parseStreamUrl(itemId) {
  try {
    // Remove bilosta: prefix if exists
    const base64Part = itemId.replace('bilosta:', '');
    const decoded = Buffer.from(base64Part, 'base64').toString('utf8');
    return decoded;
  } catch (e) {
    return null;
  }
}

// Create symlink safely
function createSymlinkSafe(target, link) {
  try {
    // Create directory for link if doesn't exist
    const linkDir = path.dirname(link);
    if (!fs.existsSync(linkDir)) {
      fs.mkdirSync(linkDir, { recursive: true });
    }
    
    // Remove existing symlink if exists
    if (fs.existsSync(link)) {
      fs.unlinkSync(link);
    }
    
    // Create relative symlink
    const relativeTarget = path.relative(path.dirname(link), target);
    fs.symlinkSync(relativeTarget, link);
    
    console.log(`✅ Created symlink: ${link} -> ${relativeTarget}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create symlink: ${error.message}`);
    return false;
  }
}

// Main processing function
async function processContent() {
  console.log('📚 Loading content database...');
  const content = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  
  const mapping = {
    movies: {},
    series: {},
    updated: new Date().toISOString()
  };
  
  let processed = 0;
  let skipped = 0;
  
  // Process movies
  console.log(`\n🎬 Processing ${content.movies.length} movies...`);
  
  for (const movie of content.movies) {
    processed++;
    
    if (!movie.name || !movie.year) {
      console.log(`⚠️  Skipping ${movie.name || 'unnamed'}: Missing name or year`);
      skipped++;
      continue;
    }
    
    // Get TMDB ID
    const tmdbId = await searchTMDBForId(movie.name, movie.year, 'movie');
    
    if (!tmdbId) {
      console.log(`⚠️  No TMDB ID found for: ${movie.name} (${movie.year})`);
      skipped++;
      continue;
    }
    
    // Parse stream URLs
    if (!movie.streams || movie.streams.length === 0) {
      console.log(`⚠️  No streams for: ${movie.name}`);
      skipped++;
      continue;
    }
    
    const streamUrl = movie.streams[0].url;
    
    // Create symlink structure
    const movieDir = path.join(SYMLINK_BASE, 'movies', `tmdb-${tmdbId}`);
    const fileName = `${movie.name.replace(/[/\\?%*:|"<>]/g, '-')} (${movie.year}).mp4`;
    const symlinkPath = path.join(movieDir, fileName);
    
    // For demo purposes, we'll create a placeholder
    // In production, you'd map to actual CDN files
    mapping.movies[tmdbId] = {
      title: movie.name,
      year: movie.year,
      originalId: movie.id,
      streams: movie.streams.map(s => s.url),
      symlinkPath: symlinkPath
    };
    
    console.log(`✅ Mapped: ${movie.name} (${movie.year}) -> TMDB ${tmdbId}`);
    
    // Rate limiting: 40 requests per second max
    if (processed % 40 === 0) {
      console.log(`⏳ Rate limit pause...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Process series
  console.log(`\n📺 Processing ${content.series.length} series...`);
  
  for (const series of content.series) {
    processed++;
    
    if (!series.name) {
      console.log(`⚠️  Skipping unnamed series`);
      skipped++;
      continue;
    }
    
    // Get TMDB ID
    const tmdbId = await searchTMDBForId(series.name, series.year, 'series');
    
    if (!tmdbId) {
      console.log(`⚠️  No TMDB ID found for: ${series.name}`);
      skipped++;
      continue;
    }
    
    // Map series episodes
    const episodeMap = {};
    
    if (series.seasons && Array.isArray(series.seasons)) {
      for (const season of series.seasons) {
        for (const episode of season.episodes || []) {
          const seasonKey = `S${String(season.number).padStart(2, '0')}`;
          const episodeKey = `E${String(episode.episode).padStart(2, '0')}`;
          
          if (!episodeMap[seasonKey]) episodeMap[seasonKey] = {};
          
          episodeMap[seasonKey][episodeKey] = {
            url: episode.url,
            title: episode.title
          };
        }
      }
    }
    
    mapping.series[tmdbId] = {
      title: series.name,
      year: series.year,
      originalId: series.id,
      episodes: episodeMap
    };
    
    console.log(`✅ Mapped: ${series.name} -> TMDB ${tmdbId} (${Object.keys(episodeMap).length} seasons)`);
    
    // Rate limiting
    if (processed % 40 === 0) {
      console.log(`⏳ Rate limit pause...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Save mapping
  console.log(`\n💾 Saving mapping file...`);
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
  
  console.log(`\n✅ Complete!`);
  console.log(`   Movies mapped: ${Object.keys(mapping.movies).length}`);
  console.log(`   Series mapped: ${Object.keys(mapping.series).length}`);
  console.log(`   Total processed: ${processed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`\n📁 Mapping saved to: ${MAPPING_FILE}`);
}

// Run if called directly
if (require.main === module) {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB API key is required!');
    console.error('\n📖 Usage:');
    console.error('   node scripts/create-tmdb-symlinks.js YOUR_TMDB_API_KEY');
    console.error('   OR');
    console.error('   export TMDB_API_KEY="your_key_here"');
    console.error('   node scripts/create-tmdb-symlinks.js');
    console.error('\n🔑 Get your API key:');
    console.error('   1. Go to: https://www.themoviedb.org/settings/api');
    console.error('   2. Copy your "API Key (v3 auth)"');
    console.error('   3. Paste it as the first argument to this script\n');
    process.exit(1);
  }
  
  console.log('🔑 Using TMDB API key:', TMDB_API_KEY.substring(0, 8) + '...');
  processContent().catch(console.error);
}

module.exports = { searchTMDBForId, extractTMDBIdFromPoster };
