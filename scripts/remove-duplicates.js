#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'baubau-content.json');
const BACKUP_FILE = path.join(DATA_DIR, `baubau-content-backup-${Date.now()}.json`);

console.log('📚 Loading content database...');
const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));

// Create backup
console.log('💾 Creating backup...');
fs.writeFileSync(BACKUP_FILE, JSON.stringify(content, null, 2));
console.log(`✅ Backup saved: ${path.basename(BACKUP_FILE)}`);

console.log(`\n📊 Before deduplication:`);
console.log(`   Total movies: ${content.movies.length}`);

// Find duplicates by name
const seen = new Map();
const duplicates = [];
const unique = [];

content.movies.forEach((movie, index) => {
  const key = movie.name.toLowerCase().trim();
  
  if (seen.has(key)) {
    const original = seen.get(key);
    console.log(`\n🔍 Found duplicate: ${movie.name}`);
    console.log(`   Original: ${original.id.substring(0, 50)}...`);
    console.log(`   Duplicate: ${movie.id.substring(0, 50)}...`);
    
    // Keep the one with more information (description, genres, etc.)
    const originalScore = scoreMovie(original);
    const duplicateScore = scoreMovie(movie);
    
    console.log(`   Scores - Original: ${originalScore}, Duplicate: ${duplicateScore}`);
    
    if (duplicateScore > originalScore) {
      console.log(`   ✅ Keeping duplicate (has more info), removing original`);
      // Replace original with duplicate
      const idx = unique.findIndex(m => m.id === original.id);
      if (idx !== -1) {
        unique[idx] = movie;
      }
      seen.set(key, movie);
      duplicates.push(original);
    } else {
      console.log(`   ✅ Keeping original, removing duplicate`);
      duplicates.push(movie);
    }
  } else {
    seen.set(key, movie);
    unique.push(movie);
  }
});

console.log(`\n📊 After deduplication:`);
console.log(`   Unique movies: ${unique.length}`);
console.log(`   Duplicates removed: ${duplicates.length}`);
console.log(`   Total movies before: ${content.movies.length}`);

// Update content
content.movies = unique;

// Update stats
if (content.stats) {
  content.stats.totalMovies = unique.length;
  content.stats.lastUpdated = new Date().toISOString();
}

// Save
console.log('\n💾 Saving deduplicated database...');
fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2));

console.log('\n✅ Deduplication complete!');
console.log(`\n📝 Summary:`);
console.log(`   Before: ${content.movies.length + duplicates.length} movies`);
console.log(`   After: ${content.movies.length} movies`);
console.log(`   Removed: ${duplicates.length} duplicates`);
console.log(`\n💾 Backup saved: ${path.basename(BACKUP_FILE)}`);

// Helper function to score movies based on completeness
function scoreMovie(movie) {
  let score = 0;
  
  if (movie.description && movie.description !== 'No description available') score += 3;
  if (movie.poster && movie.poster.includes('tmdb')) score += 2;
  if (movie.year) score += 1;
  if (movie.genres && movie.genres.length > 0) score += 1;
  if (movie.cast && movie.cast.length > 0) score += 1;
  if (movie.director && movie.director.length > 0) score += 1;
  if (movie.runtime) score += 1;
  if (movie.streams && movie.streams.length > 1) score += 1; // Multiple quality options
  
  return score;
}
