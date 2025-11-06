/**
 * TMDB Metadata Scraper for Balkan Content
 * 
 * This script searches TMDB for Serbian/Croatian titles and extracts metadata.
 * Since our database already has TMDB poster URLs, we know these titles exist in TMDB.
 * 
 * Usage: node scrape-tmdb-metadata.js
 */

const fs = require('fs');
const https = require('https');

// Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY_HERE';
const CONTENT_FILE = './data/baubau-content.json';
const OUTPUT_FILE = './data/tmdb-metadata.json';
const DELAY_MS = 300; // Delay between requests to respect rate limits

// Load existing content
const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));

// Helper: Make HTTPS request
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
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

// Helper: Delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Search TMDB for a title
async function searchTMDB(title, type, year) {
  const endpoint = type === 'movie' ? 'movie' : 'tv';
  const encodedTitle = encodeURIComponent(title);
  const yearParam = year ? `&year=${year}` : '';
  const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodedTitle}&language=en-US${yearParam}`;
  
  console.log(`🔍 Searching TMDB for: ${title} (${type}) ${year || ''}`);
  
  try {
    const results = await httpsGet(url);
    
    if (results.results && results.results.length > 0) {
      const match = results.results[0];
      const tmdbId = match.id;
      
      // Get detailed info
      const detailUrl = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`;
      const details = await httpsGet(detailUrl);
      
      return {
        tmdb_id: tmdbId,
        title: match.title || match.name,
        original_title: match.original_title || match.original_name,
        overview: match.overview,
        release_date: match.release_date || match.first_air_date,
        vote_average: match.vote_average,
        poster_path: match.poster_path,
        backdrop_path: match.backdrop_path,
        genres: details.genres?.map(g => g.name),
        runtime: details.runtime || details.episode_run_time?.[0],
        cast: details.credits?.cast?.slice(0, 10).map(c => c.name),
        director: details.credits?.crew?.find(c => c.job === 'Director')?.name,
        production_countries: details.production_countries?.map(c => c.name)
      };
    }
    
    console.log(`  ❌ No results found`);
    return null;
  } catch (error) {
    console.error(`  ⚠️  Error: ${error.message}`);
    return null;
  }
}

// Extract TMDB ID from poster URL
function extractTMDBIdFromPoster(posterUrl) {
  // TMDB poster URLs look like: https://image.tmdb.org/t/p/w780/4AnSeJ3u0WIIksVeEBsaEW3n5lQ.jpg
  // But they don't contain the TMDB ID, so we need to search by title
  return null;
}

// Main scraper
async function scrapeMetadata() {
  console.log('🎬 Starting TMDB metadata scraper...\n');
  
  // Check API key
  if (TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
    console.error('❌ Please set TMDB_API_KEY environment variable or edit the script');
    console.error('   Get your free API key at: https://www.themoviedb.org/settings/api');
    process.exit(1);
  }
  
  const metadata = {
    movies: {},
    series: {},
    scraped_at: new Date().toISOString()
  };
  
  // Process movies
  console.log(`📽️  Processing ${content.movies.length} movies...\n`);
  for (let i = 0; i < content.movies.length; i++) {
    const movie = content.movies[i];
    const tmdbData = await searchTMDB(movie.name, 'movie', movie.year);
    
    if (tmdbData) {
      metadata.movies[movie.id] = tmdbData;
      console.log(`  ✅ ${movie.name} - Found!`);
    }
    
    await delay(DELAY_MS);
    
    // Progress update every 50 items
    if ((i + 1) % 50 === 0) {
      console.log(`\n  Progress: ${i + 1}/${content.movies.length} movies processed\n`);
    }
  }
  
  // Process series
  console.log(`\n📺 Processing ${content.series.length} series...\n`);
  for (let i = 0; i < content.series.length; i++) {
    const series = content.series[i];
    const tmdbData = await searchTMDB(series.name, 'series', series.year);
    
    if (tmdbData) {
      metadata.series[series.id] = tmdbData;
      console.log(`  ✅ ${series.name} - Found!`);
    }
    
    await delay(DELAY_MS);
  }
  
  // Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadata, null, 2));
  
  console.log('\n✅ Scraping complete!');
  console.log(`\n📊 Results:`);
  console.log(`   Movies: ${Object.keys(metadata.movies).length}/${content.movies.length} found`);
  console.log(`   Series: ${Object.keys(metadata.series).length}/${content.series.length} found`);
  console.log(`\n💾 Metadata saved to: ${OUTPUT_FILE}`);
  console.log('\n📝 Next steps:');
  console.log('   1. Review the scraped metadata');
  console.log('   2. Use this data to enrich your addon responses');
  console.log('   3. Consider caching this data and updating periodically');
}

// Run scraper
scrapeMetadata().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
