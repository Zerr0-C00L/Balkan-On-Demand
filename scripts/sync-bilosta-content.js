#!/usr/bin/env node

/**
 * Sync Bilosta Content
 * Fetches current Bilosta server content and merges with existing database
 * - Preserves existing metadata (TMDB enrichment, descriptions, etc.)
 * - Adds new files discovered on the server
 * - Removes files that no longer exist on the server (optional)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BILOSTA_DIR = path.join(DATA_DIR, 'bilosta');
const DATABASE_FILE = path.join(DATA_DIR, 'baubau-content.json');

// Bilosta server configuration
const BASE_URL = 'https://content.bilosta.org/SERCRT721/';
const SECRET_CODE = 'SERCRT721';

/**
 * Fetch URL with retries
 */
function fetchURL(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (retriesLeft) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else if (retriesLeft > 0) {
            console.log(`  ⚠️  HTTP ${res.statusCode}, retrying... (${retriesLeft} left)`);
            setTimeout(() => attempt(retriesLeft - 1), 1000);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          }
        });
      }).on('error', (err) => {
        if (retriesLeft > 0) {
          console.log(`  ⚠️  Error: ${err.message}, retrying... (${retriesLeft} left)`);
          setTimeout(() => attempt(retriesLeft - 1), 1000);
        } else {
          reject(err);
        }
      });
    };
    
    attempt(retries);
  });
}

/**
 * Parse directory listing HTML
 */
function parseDirectoryListing(html, baseUrl) {
  const items = [];
  const linkRegex = /<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    
    // Skip parent directory, query strings, and absolute URLs
    if (href === '../' || href === '/' || href.startsWith('?') || href.startsWith('http')) {
      continue;
    }
    
    const isDirectory = href.endsWith('/');
    const name = isDirectory ? href.slice(0, -1) : href;
    
    items.push({
      name: name,
      href: href,
      isDirectory: isDirectory,
      url: baseUrl + href
    });
  }
  
  return items;
}

/**
 * Recursively crawl directory
 */
async function crawlDirectory(url, relativePath = '', depth = 0, maxDepth = 10) {
  if (depth > maxDepth) {
    console.log(`⚠️  Max depth reached at ${relativePath}`);
    return [];
  }
  
  const indent = '  '.repeat(depth);
  
  try {
    const html = await fetchURL(url);
    const items = parseDirectoryListing(html, url);
    const allFiles = [];
    
    for (const item of items) {
      const itemPath = relativePath ? `${relativePath}/${item.name}` : item.name;
      
      if (item.isDirectory) {
        console.log(`${indent}📁 ${item.name}/`);
        const subFiles = await crawlDirectory(item.url, itemPath, depth + 1, maxDepth);
        allFiles.push(...subFiles);
      } else {
        // Only include video files
        if (/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(item.name)) {
          console.log(`${indent}  📄 ${item.name}`);
          allFiles.push({
            url: item.url,
            path: itemPath,
            filename: item.name
          });
        }
      }
    }
    
    return allFiles;
    
  } catch (error) {
    console.error(`${indent}❌ Error crawling ${url}: ${error.message}`);
    return [];
  }
}

/**
 * Load existing database
 */
function loadDatabase() {
  if (!fs.existsSync(DATABASE_FILE)) {
    return {
      generated: new Date().toISOString(),
      stats: {
        totalMovies: 0,
        moviesWithTMDB: 0,
        moviesEnriched: 0,
        totalSeries: 0,
        totalEpisodes: 0
      },
      movies: [],
      series: []
    };
  }
  
  const data = fs.readFileSync(DATABASE_FILE, 'utf8');
  return JSON.parse(data);
}

/**
 * Normalize URL by extracting just the path after SERCRT code
 */
function normalizeURL(url) {
  const match = url.match(/SERCRT\d+\/(.+)/);
  return match ? match[1] : url;
}

/**
 * Create URL to database entry lookup
 */
function createURLLookup(database) {
  const lookup = new Map();
  
  // Index movies by stream URLs (normalized)
  database.movies?.forEach(movie => {
    if (movie.streams) {
      movie.streams.forEach(stream => {
        const normalizedURL = normalizeURL(stream.url);
        lookup.set(normalizedURL, { type: 'movie', entry: movie });
      });
    }
  });
  
  // Index series by stream URLs (normalized)
  database.series?.forEach(series => {
    series.seasons?.forEach(season => {
      season.episodes?.forEach(episode => {
        if (episode.streams) {
          episode.streams.forEach(stream => {
            const normalizedURL = normalizeURL(stream.url);
            lookup.set(normalizedURL, { type: 'series', entry: series, episode: episode });
          });
        }
      });
    });
  });
  
  return lookup;
}

/**
 * Extract title from filename
 */
function extractTitle(filename, folderPath) {
  // Remove extension
  let title = filename.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '');
  
  // For numbered episodes or episode patterns, use parent folder name as title
  if (/^(S\d+E\d+|\d+|Ep?\d+|epizoda\d+)$/i.test(title)) {
    const parts = folderPath.split('/');
    // Get the parent folder name (series/show name)
    const folderName = parts[parts.length - 2] || parts[parts.length - 1] || title;
    return folderName.replace(/\./g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  // Clean up common patterns
  title = title
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return title;
}

/**
 * Determine content category from path
 * Returns null for foreign/non-Balkan content to skip it
 */
function determineCategory(filePath) {
  const upperPath = filePath.toUpperCase();
  
  // Skip foreign content entirely
  if (upperPath.includes('STRANI') || upperPath.includes('FOREIGN') || 
      upperPath.includes('4K') || upperPath.includes('DOKU') ||
      upperPath.includes('CARTOON') || upperPath.includes('CRTANI')) {
    return null; // Skip non-Balkan content
  }
  
  // Special handling for KLASICI (00klsk) - contains both foreign and domestic classics
  // Only keep if path contains domestic/balkan markers
  if (upperPath.includes('00KLSK') || upperPath.includes('/KLASICI/')) {
    if (upperPath.includes('/EX.YU/') || 
        upperPath.includes('/EXYU/') ||
        upperPath.includes('/DOMACE/') ||
        upperPath.includes('/JUGOSLOVENSKI/') ||
        upperPath.includes('/SRPSKI/') ||
        upperPath.includes('/HRVATSKI/') ||
        upperPath.includes('/BOSANSKI/')) {
      return 'movies'; // Domestic classics
    }
    return null; // Foreign classics - skip
  }
  
  // Keep only Ex-Yu/Balkan content
  if (upperPath.includes('SERIJE') || upperPath.includes('SERIES')) {
    // Skip IMDB series (foreign), keep only domestic
    if (upperPath.includes('IMDB')) return null;
    // Only keep if path contains domestic markers
    if (upperPath.includes('/DOMACE/') || upperPath.includes('/EXYU/') || upperPath.includes('/EX.YU/')) {
      return 'series'; // Ex-YU TV Series
    }
    return null; // Foreign series
  } else if (upperPath.includes('EXYU') || upperPath.includes('DOMACI')) {
    return 'movies'; // Ex-YU movies
  } else if (upperPath.includes('FILMOVI')) {
    // Check if it's domestic or foreign
    if (upperPath.includes('STRANI')) return null;
    return 'movies'; // Domestic movies
  }
  
  return null; // Skip unknown content
}

/**
 * Create basic entry for new content
 */
function createBasicEntry(file, category) {
  const title = extractTitle(file.filename, file.path);
  // Use full URL hash for unique ID (no substring to avoid collisions)
  const urlHash = Buffer.from(file.url).toString('base64').replace(/[=/+]/g, '');
  const id = `bilosta:${urlHash}`;
  
  // Map internal category to user-facing category
  const categoryMap = {
    'movies': 'EX YU FILMOVI',
    'series': 'EX YU SERIJE',
    'unknown': 'Direct HD'
  };
  
  const basicEntry = {
    id: id,
    type: category === 'series' ? 'series' : 'movie',
    name: title,
    streams: [{
      url: file.url,
      quality: file.path.includes('/4K/') || file.path.includes('/4k/') ? '4K' : 'HD',
      source: 'bilosta',
      size: null
    }],
    category: categoryMap[category] || 'Direct HD',
    needsEnrichment: true // Flag for future TMDB enrichment
  };
  
  return basicEntry;
}

/**
 * Merge new files with existing database
 */
function mergeContent(database, newFiles, options = {}) {
  const { removeOld = false } = options;
  
  console.log('\n🔄 Merging content...\n');
  
  const urlLookup = createURLLookup(database);
  const newURLs = new Set(newFiles.map(f => f.url));
  
  let stats = {
    existing: 0,
    new: 0,
    removed: 0,
    updated: 0
  };
  
  // Process new files
  newFiles.forEach(file => {
    const normalizedURL = normalizeURL(file.url);
    const existing = urlLookup.get(normalizedURL);
    
    if (existing) {
      stats.existing++;
      console.log(`✓ Existing: ${file.filename}`);
    } else {
      // Determine category - skip if null (foreign content)
      const category = determineCategory(file.path);
      
      if (category === null) {
        // Skip foreign/non-Balkan content
        return;
      }
      
      stats.new++;
      console.log(`+ New: ${file.filename}`);
      
      // Add to database
      const entry = createBasicEntry(file, category);
      
      if (category === 'series') {
        // For series, this is more complex - would need episode parsing
        // For now, add as movie to be manually fixed later
        database.movies.push(entry);
      } else {
        database.movies.push(entry);
      }
    }
  });
  
  // Optionally remove old entries
  if (removeOld) {
    database.movies = database.movies.filter(movie => {
      const hasValidStream = movie.streams?.some(stream => newURLs.has(stream.url));
      if (!hasValidStream) {
        stats.removed++;
        console.log(`- Removed: ${movie.name}`);
      }
      return hasValidStream;
    });
  }
  
  // Update stats
  database.stats = {
    totalMovies: database.movies.length,
    moviesWithTMDB: database.movies.filter(m => m.imdb_id || m.tmdb_id).length,
    moviesEnriched: database.movies.filter(m => !m.needsEnrichment).length,
    totalSeries: database.series?.length || 0,
    totalEpisodes: database.series?.reduce((sum, s) => 
      sum + (s.seasons?.reduce((eSum, season) => 
        eSum + (season.episodes?.length || 0), 0) || 0), 0) || 0
  };
  
  database.generated = new Date().toISOString();
  
  return { database, stats };
}

/**
 * Load URLs from existing files instead of crawling
 */
function loadURLsFromFiles() {
  const urlFile = path.join(BILOSTA_DIR, 'bilosta-all-urls.txt');
  
  if (!fs.existsSync(urlFile)) {
    console.log('⚠️  No URL file found, will try to crawl server...');
    return null;
  }
  
  const content = fs.readFileSync(urlFile, 'utf8');
  const urls = content.split('\n').filter(line => line.trim().length > 0);
  
  // Convert URLs to file objects
  return urls.map(url => {
    const match = url.match(/SERCRT\d+\/(.+)/);
    if (!match) return null;
    
    const fullPath = match[1];
    const parts = fullPath.split('/');
    const filename = parts[parts.length - 1];
    
    return {
      url: url.trim(),
      path: fullPath,
      filename: filename
    };
  }).filter(f => f !== null);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Bilosta Content Sync\n');
  console.log(`📍 Server: ${BASE_URL}\n`);
  
  const startTime = Date.now();
  
  // Step 1: Load existing database
  console.log('📂 Loading existing database...');
  const database = loadDatabase();
  console.log(`✓ Loaded ${database.movies.length} movies, ${database.series?.length || 0} series\n`);
  
  // Step 2: Load URLs from files (or crawl if files don't exist)
  console.log('📄 Loading URLs from files...\n');
  let newFiles = loadURLsFromFiles();
  
  if (!newFiles) {
    console.log('🕷️  Crawling Bilosta server...\n');
    newFiles = await crawlDirectory(BASE_URL);
  } else {
    console.log(`✓ Loaded ${newFiles.length} URLs from files\n`);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Load complete in ${duration}s`);
  console.log(`📊 Found ${newFiles.length} video files\n`);
  
  if (newFiles.length === 0) {
    console.log('⚠️  No files found! Aborting to prevent data loss.');
    process.exit(1);
  }
  
  // Step 3: Merge with existing database
  const { database: updatedDB, stats } = mergeContent(database, newFiles, { removeOld: false });
  
  // Step 4: Save updated database
  const dbPath = DATABASE_FILE;
  fs.writeFileSync(dbPath, JSON.stringify(updatedDB, null, 2));
  console.log(`\n💾 Saved database: ${dbPath}\n`);
  
  // Step 6: Summary
  console.log('📊 Sync Summary:');
  console.log(`  • Existing items: ${stats.existing}`);
  console.log(`  • New items: ${stats.new}`);
  console.log(`  • Removed items: ${stats.removed}`);
  console.log(`  • Total movies: ${updatedDB.stats.totalMovies}`);
  console.log(`  • Total series: ${updatedDB.stats.totalSeries}`);
  console.log(`  • Items needing enrichment: ${updatedDB.movies.filter(m => m.needsEnrichment).length}`);
  
  console.log('\n✅ Sync complete!');
  
  if (stats.new > 0) {
    console.log('\n💡 Tip: Run TMDB enrichment to fetch metadata for new items:');
    console.log('   node scrape-tmdb-metadata.js');
  }
}

// Run
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
