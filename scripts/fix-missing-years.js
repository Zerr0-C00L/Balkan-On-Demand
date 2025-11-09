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
console.log(`✅ Backup saved: ${BACKUP_FILE}`);

let moviesFixed = 0;
let moviesSkipped = 0;
let seriesFixed = 0;
let seriesSkipped = 0;

// Fix movies
console.log('\n🎬 Processing movies...');
content.movies.forEach(movie => {
  if (movie.year === null || movie.year === undefined) {
    // Try to extract year from originalTitle
    if (movie.originalTitle) {
      const yearMatch = movie.originalTitle.match(/\((\d{4})\)/);
      if (yearMatch) {
        movie.year = parseInt(yearMatch[1]);
        console.log(`✅ Fixed ${movie.name}: added year ${movie.year}`);
        moviesFixed++;
      } else {
        console.log(`⚠️  No year found in originalTitle for: ${movie.name} (${movie.originalTitle})`);
        moviesSkipped++;
      }
    } else {
      console.log(`⚠️  No originalTitle for: ${movie.name}`);
      moviesSkipped++;
    }
  } else {
    moviesSkipped++;
  }
});

// Fix series (they might not have years, which is okay for series)
console.log('\n📺 Processing series...');
content.series.forEach(series => {
  if (series.year === null || series.year === undefined) {
    // Try to extract year from originalTitle
    if (series.originalTitle) {
      const yearMatch = series.originalTitle.match(/\((\d{4})\)/);
      if (yearMatch) {
        series.year = parseInt(yearMatch[1]);
        console.log(`✅ Fixed ${series.name}: added year ${series.year}`);
        seriesFixed++;
      } else {
        // For series, it's okay to not have a year
        seriesSkipped++;
      }
    } else {
      seriesSkipped++;
    }
  } else {
    seriesSkipped++;
  }
});

// Save updated content
console.log('\n💾 Saving updated content...');
fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2));

console.log('\n✅ Done!');
console.log(`\n📊 Movies:`);
console.log(`   Fixed: ${moviesFixed}`);
console.log(`   Skipped: ${moviesSkipped}`);
console.log(`\n📊 Series:`);
console.log(`   Fixed: ${seriesFixed}`);
console.log(`   Skipped: ${seriesSkipped}`);
console.log(`\n💾 Backup saved: ${path.basename(BACKUP_FILE)}`);
console.log('\n🚀 Now run the TMDB mapping script again!');
