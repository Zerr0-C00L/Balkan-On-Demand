#!/usr/bin/env node

/**
 * Test Bilosta Sync - Dry Run
 * Tests the sync logic using existing URL files without crawling
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BILOSTA_DIR = path.join(DATA_DIR, 'bilosta');
const DATABASE_FILE = path.join(DATA_DIR, 'baubau-content.json');

// Load existing database
function loadDatabase() {
  const data = fs.readFileSync(DATABASE_FILE, 'utf8');
  return JSON.parse(data);
}

// Load URL files
function loadURLFiles() {
  const urlFile = path.join(BILOSTA_DIR, 'bilosta-all-urls.txt');
  const content = fs.readFileSync(urlFile, 'utf8');
  return content.split('\n').filter(line => line.trim().length > 0);
}

// Create URL lookup
function createURLLookup(database) {
  const lookup = new Map();
  
  database.movies?.forEach(movie => {
    if (movie.streams) {
      movie.streams.forEach(stream => {
        lookup.set(stream.url, { type: 'movie', entry: movie });
      });
    }
  });
  
  database.series?.forEach(series => {
    series.seasons?.forEach(season => {
      season.episodes?.forEach(episode => {
        if (episode.streams) {
          episode.streams.forEach(stream => {
            lookup.set(stream.url, { type: 'series', entry: series, episode: episode });
          });
        }
      });
    });
  });
  
  return lookup;
}

// Main test
function main() {
  console.log('🧪 Testing Bilosta Sync Logic (Dry Run)\n');
  
  // Load database
  console.log('📂 Loading database...');
  const database = loadDatabase();
  console.log(`✓ ${database.movies.length} movies, ${database.series?.length || 0} series\n`);
  
  // Load URL files
  console.log('📄 Loading URL files...');
  const urls = loadURLFiles();
  console.log(`✓ ${urls.length} URLs loaded\n`);
  
  // Create lookup
  console.log('🔍 Creating URL lookup...');
  const lookup = createURLLookup(database);
  console.log(`✓ ${lookup.size} URLs indexed\n`);
  
  // Analyze
  console.log('📊 Analysis:\n');
  
  let existing = 0;
  let missing = 0;
  const missingExamples = [];
  
  urls.forEach(url => {
    if (lookup.has(url)) {
      existing++;
    } else {
      missing++;
      if (missingExamples.length < 10) {
        missingExamples.push(url);
      }
    }
  });
  
  console.log(`✓ URLs in database: ${existing}`);
  console.log(`+ URLs not in database: ${missing}\n`);
  
  if (missing > 0) {
    console.log('📝 Sample URLs that would be added:\n');
    missingExamples.forEach((url, i) => {
      const filename = url.split('/').pop();
      console.log(`  ${i + 1}. ${filename}`);
      console.log(`     ${url}`);
    });
    
    if (missing > 10) {
      console.log(`\n  ... and ${missing - 10} more\n`);
    }
  }
  
  console.log('\n✅ Dry run complete!');
  console.log('\nTo run actual sync: node scripts/sync-bilosta-content.js');
}

main();
