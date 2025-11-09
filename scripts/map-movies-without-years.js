#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// TMDB API Configuration
const TMDB_API_KEY = process.argv[2] || process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RATE_LIMIT_MS = 250; // 4 requests per second

if (!TMDB_API_KEY) {
  console.error('❌ Error: TMDB API key required');
  console.error('Usage: node map-movies-without-years.js YOUR_API_KEY');
  process.exit(1);
}

console.log(`🔑 Using TMDB API key: ${TMDB_API_KEY.substring(0, 12)}...`);

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'baubau-content.json');
const MAPPING_FILE = path.join(DATA_DIR, 'tmdb-id-mapping.json');

// TMDB Search Function for Balkan content
async function searchTMDBForBalkanMovie(title) {
  try {
    // Try with region filter for Ex-Yu countries
    const regions = ['RS', 'HR', 'BA', 'ME', 'SI', 'MK']; // Serbia, Croatia, Bosnia, Montenegro, Slovenia, Macedonia
    
    for (const region of regions) {
      const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&region=${region}&language=en-US`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Return the first result with year preference for older movies
        const result = data.results[0];
        return {
          id: result.id,
          title: result.title,
          original_title: result.original_title,
          year: result.release_date ? parseInt(result.release_date.split('-')[0]) : null,
          region: region
        };
      }
    }
    
    // If no regional results, try general search
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=en-US`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        id: result.id,
        title: result.title,
        original_title: result.original_title,
        year: result.release_date ? parseInt(result.release_date.split('-')[0]) : null,
        region: 'general'
      };
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error searching TMDB: ${error.message}`);
    return null;
  }
}

// Helper to get clean title (try originalTitle first, then name)
function getCleanTitle(movie) {
  // Try originalTitle first (usually has better formatting)
  if (movie.originalTitle && movie.originalTitle !== movie.name) {
    // Remove year in parentheses if present
    return movie.originalTitle.replace(/\s*\(\d{4}\)\s*$/, '').trim();
  }
  return movie.name;
}

// Rate limiter
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main async function to wrap everything
async function main() {
  // Load existing content
  console.log('📚 Loading content database...');
  const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));

  // Load existing mapping or create new
  let mapping = { movies: {}, series: {} };
  if (fs.existsSync(MAPPING_FILE)) {
    console.log('📂 Loading existing TMDB mapping...');
    mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
    console.log(`   Found ${Object.keys(mapping.movies).length} movies, ${Object.keys(mapping.series).length} series already mapped`);
  }

  // Filter movies without years that aren't already mapped
  const moviesWithoutYears = content.movies.filter(movie => {
    const hasYear = movie.year !== null && movie.year !== undefined;
    const alreadyMapped = Object.values(mapping.movies).some(m => m.originalId === movie.id);
    return !hasYear && !alreadyMapped;
  });

  console.log(`\n🎬 Found ${moviesWithoutYears.length} movies without years that need mapping`);
  console.log(`📝 Note: Searching without year may produce less accurate results`);
  console.log(`⚠️  Manual verification recommended for critical titles\n`);
  
  // Process movies
  let processed = 0;
  let mapped = 0;
  let failed = 0;

  console.log('🔍 Starting search (this will take a while due to rate limiting)...\n');

  for (const movie of moviesWithoutYears) {
    const title = getCleanTitle(movie);
    console.log(`🔍 Searching TMDB: ${title}`);
    
    const tmdbResult = await searchTMDBForBalkanMovie(title);
    
    if (tmdbResult) {
      console.log(`✅ Found: ${tmdbResult.title} (${tmdbResult.id}) - ${tmdbResult.year || 'no year'} [${tmdbResult.region}]`);
      
      // Add to mapping
      mapping.movies[tmdbResult.id] = {
        title: movie.name,
        year: tmdbResult.year,
        originalId: movie.id,
        streams: movie.streams.map(s => s.url),
        symlinkPath: path.join(__dirname, '..', 'symlinks', 'movies', `tmdb-${tmdbResult.id}`, `${movie.name}${tmdbResult.year ? ` (${tmdbResult.year})` : ''}.mp4`),
        confidence: 'low', // Mark as low confidence since we searched without year
        tmdbTitle: tmdbResult.title,
        originalTitle: tmdbResult.original_title
      };
      
      console.log(`✅ Mapped: ${movie.name} -> TMDB ${tmdbResult.id}`);
      mapped++;
    } else {
      console.log(`❌ No TMDB match found`);
      console.log(`⚠️  No TMDB ID found for: ${title}`);
      failed++;
    }
    
    processed++;
    
    // Save progress every 10 movies
    if (processed % 10 === 0) {
      fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
      console.log(`💾 Progress saved (${processed}/${moviesWithoutYears.length})`);
    }
    
    // Rate limiting
    await sleep(RATE_LIMIT_MS);
  }

  // Final save
  console.log('\n💾 Saving final mapping file...');
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

  console.log('\n✅ Complete!');
  console.log(`\n📊 Results for movies without years:`);
  console.log(`   Successfully mapped: ${mapped}`);
  console.log(`   Failed to find: ${failed}`);
  console.log(`   Total processed: ${processed}`);
  console.log(`\n💡 Note: Mappings without years are marked as "confidence: low"`);
  console.log(`   Please verify critical titles manually in the mapping file`);
  console.log(`\n📁 Mapping saved to: ${MAPPING_FILE}`);
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
