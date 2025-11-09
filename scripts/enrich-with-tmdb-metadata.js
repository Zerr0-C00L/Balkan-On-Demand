#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// TMDB API Configuration
const TMDB_API_KEY = process.argv[2] || process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RATE_LIMIT_MS = 250; // 4 requests per second

if (!TMDB_API_KEY) {
  console.error('❌ Error: TMDB API key required');
  console.error('Usage: node enrich-with-tmdb-metadata.js YOUR_API_KEY');
  process.exit(1);
}

console.log(`🔑 Using TMDB API key: ${TMDB_API_KEY.substring(0, 12)}...`);

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'baubau-content.json');
const MAPPING_FILE = path.join(DATA_DIR, 'tmdb-id-mapping.json');
const BACKUP_FILE = path.join(DATA_DIR, `baubau-content-backup-${Date.now()}.json`);

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch TMDB movie details
async function getTMDBMovieDetails(tmdbId) {
  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success === false) {
      return null;
    }
    
    return {
      description: data.overview || '',
      runtime: data.runtime || null,
      genres: data.genres ? data.genres.map(g => g.name) : [],
      releaseDate: data.release_date || '',
      voteAverage: data.vote_average || 0,
      voteCount: data.vote_count || 0,
      originalLanguage: data.original_language || '',
      tagline: data.tagline || ''
    };
  } catch (error) {
    console.error(`❌ Error fetching TMDB ${tmdbId}:`, error.message);
    return null;
  }
}

// Main function
async function main() {
  console.log('📚 Loading content database...');
  const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
  
  console.log('📂 Loading TMDB mapping...');
  const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
  
  // Create backup
  console.log('💾 Creating backup...');
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(content, null, 2));
  console.log(`✅ Backup saved: ${path.basename(BACKUP_FILE)}`);
  
  // Build reverse lookup: originalId -> TMDB ID
  const idToTMDB = {};
  Object.entries(mapping.movies).forEach(([tmdbId, data]) => {
    idToTMDB[data.originalId] = tmdbId;
  });
  
  console.log(`\n🎬 Processing ${content.movies.length} movies...`);
  console.log(`   ${Object.keys(idToTMDB).length} movies have TMDB mappings\n`);
  
  let enriched = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const movie of content.movies) {
    const tmdbId = idToTMDB[movie.id];
    
    if (!tmdbId) {
      skipped++;
      continue;
    }
    
    // Skip if already has description
    if (movie.description && movie.description !== 'No description available' && movie.description.trim() !== '') {
      console.log(`⏭️  ${movie.name} - already has description`);
      skipped++;
      continue;
    }
    
    console.log(`🔍 Enriching: ${movie.name} (TMDB ${tmdbId})`);
    
    const details = await getTMDBMovieDetails(tmdbId);
    
    if (details) {
      movie.description = details.description || 'No description available';
      if (details.runtime) movie.runtime = details.runtime;
      if (details.genres && details.genres.length > 0) movie.genres = details.genres;
      if (details.releaseDate && !movie.year) {
        movie.year = parseInt(details.releaseDate.split('-')[0]);
      }
      
      console.log(`✅ Enriched: ${movie.name}`);
      if (details.description) {
        console.log(`   📝 Description: ${details.description.substring(0, 100)}...`);
      }
      enriched++;
    } else {
      console.log(`❌ Failed to enrich: ${movie.name}`);
      failed++;
    }
    
    // Save progress every 20 movies
    if ((enriched + failed) % 20 === 0) {
      fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2));
      console.log(`💾 Progress saved (${enriched} enriched, ${failed} failed, ${skipped} skipped)`);
    }
    
    // Rate limiting
    await sleep(RATE_LIMIT_MS);
  }
  
  // Final save
  console.log('\n💾 Saving final database...');
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2));
  
  console.log('\n✅ Enrichment complete!');
  console.log(`\n📊 Statistics:`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total processed: ${content.movies.length}`);
  console.log(`\n💾 Backup saved: ${path.basename(BACKUP_FILE)}`);
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
