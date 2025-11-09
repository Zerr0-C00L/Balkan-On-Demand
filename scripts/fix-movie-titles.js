#!/usr/bin/env node

/**
 * Fix Movie Titles
 * 
 * Updates movie titles in baubau-content.json to use proper spacing
 * from the originalTitle field when available.
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'baubau-content.json');

console.log('📚 Loading content database...');
const content = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

let fixed = 0;
let skipped = 0;

console.log(`\n🔍 Checking ${content.movies.length} movies...`);

content.movies.forEach(movie => {
  if (movie.originalTitle && movie.name !== movie.originalTitle) {
    // Extract clean title from originalTitle (remove year in parentheses)
    const cleanTitle = movie.originalTitle
      .replace(/\s*\(\d{4}\)\s*$/, '') // Remove (2024) at end
      .trim();
    
    // Check if names differ significantly (not just case)
    if (cleanTitle.toLowerCase().replace(/\s/g, '') === movie.name.toLowerCase().replace(/\s/g, '')) {
      console.log(`\n✏️  Fixing: ${movie.name}`);
      console.log(`   → ${cleanTitle}`);
      movie.name = cleanTitle;
      fixed++;
    } else {
      skipped++;
    }
  } else {
    skipped++;
  }
});

if (fixed > 0) {
  // Create backup
  const backup = DATA_PATH.replace('.json', `-backup-${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify(content, null, 2));
  console.log(`\n💾 Backup created: ${backup}`);
  
  // Save updated content
  fs.writeFileSync(DATA_PATH, JSON.stringify(content, null, 2));
  console.log(`✅ Updated ${fixed} movie titles`);
  console.log(`⏭️  Skipped ${skipped} movies (no changes needed)`);
  console.log(`\n📝 Please restart your addon to load updated titles.`);
} else {
  console.log(`\n✅ All movie titles are already correct!`);
  console.log(`⏭️  ${skipped} movies checked`);
}
