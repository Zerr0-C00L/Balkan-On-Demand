#!/usr/bin/env node
/**
 * BauBau Content Importer
 * Extracts metadata from BauBau XML files and enriches with Cinemeta
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Cinemeta API
const CINEMETA_API = 'https://v3-cinemeta.strem.io';

// Paths
const ARCHIVE_DIR = path.join(__dirname, 'archive', 'analysis');
const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'baubau-content.json');
const CACHE_FILE = path.join(DATA_DIR, 'metadata-cache.json');

// Load or initialize cache
let metadataCache = {};
if (fs.existsSync(CACHE_FILE)) {
  metadataCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  console.log(`📦 Loaded ${Object.keys(metadataCache).length} cached metadata entries`);
}

// Helper: Make HTTPS request
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

// Helper: Search Cinemeta for movie
async function searchCinemeta(title, year, type = 'movie') {
  const cacheKey = `${type}:${title}:${year}`;
  
  if (metadataCache[cacheKey]) {
    return metadataCache[cacheKey];
  }
  
  try {
    // Search by title
    const searchUrl = `${CINEMETA_API}/catalog/${type}/top/search=${encodeURIComponent(title)}.json`;
    const searchResult = await httpsGet(searchUrl);
    
    if (searchResult && searchResult.metas && searchResult.metas.length > 0) {
      // Find best match by year
      let bestMatch = searchResult.metas[0];
      
      if (year) {
        const yearMatch = searchResult.metas.find(m => 
          m.releaseInfo && m.releaseInfo.includes(year.toString())
        );
        if (yearMatch) bestMatch = yearMatch;
      }
      
      // Get full metadata
      const metaUrl = `${CINEMETA_API}/meta/${type}/${bestMatch.id}.json`;
      const metaResult = await httpsGet(metaUrl);
      
      if (metaResult && metaResult.meta) {
        const meta = metaResult.meta;
        const result = {
          id: meta.id,
          imdb_id: meta.imdb_id || meta.id,
          name: meta.name,
          year: year || (meta.releaseInfo ? parseInt(meta.releaseInfo) : null),
          poster: meta.poster,
          background: meta.background,
          logo: meta.logo,
          description: meta.description,
          genres: meta.genres || [],
          runtime: meta.runtime,
          imdbRating: meta.imdbRating,
          cast: meta.cast || [],
          director: meta.director || [],
          writer: meta.writer || []
        };
        
        metadataCache[cacheKey] = result;
        return result;
      }
    }
  } catch (error) {
    console.error(`❌ Cinemeta search failed for "${title}":`, error.message);
  }
  
  return null;
}

// Helper: Parse XML file
function parseXML(xmlContent) {
  const items = [];
  
  // Match <item>...</item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xmlContent)) !== null) {
    const itemXml = match[1];
    
    // Extract fields
    const extractTag = (tag) => {
      const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, 's');
      const m = itemXml.match(regex);
      return m ? m[1].trim() : null;
    };
    
    const title = extractTag('title');
    const link = extractTag('link');
    const thumbnail = extractTag('thumbnail');
    const fanart = extractTag('fanart');
    const info = extractTag('info');
    
    if (title && link && link.includes('bilosta.org')) {
      // Parse year from title
      const yearMatch = title.match(/\((\d{4})\)/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;
      const cleanTitle = title.replace(/\s*\(\d{4}\)/, '').trim();
      
      // Detect type
      const isSeriesEpisode = /S\d+E\d+/i.test(link) || /[Ee]pizoda/i.test(title);
      
      items.push({
        title: cleanTitle,
        originalTitle: title,
        year,
        link,
        thumbnail: thumbnail || null,
        fanart: fanart || null,
        category: info || 'Unknown',
        type: isSeriesEpisode ? 'series' : 'movie',
        hasTMDBPoster: thumbnail && thumbnail.includes('image.tmdb.org')
      });
    }
  }
  
  return items;
}

// Helper: Extract TMDB ID from poster URL
function extractTMDBId(posterUrl) {
  if (!posterUrl) return null;
  
  // URL format: https://image.tmdb.org/t/p/w780/POSTER_PATH.jpg
  const match = posterUrl.match(/\/([^/]+)\.(jpg|png)$/);
  return match ? match[1] : null;
}

// Helper: Organize series episodes
function organizeSeries(items) {
  const seriesMap = {};
  
  items.filter(item => item.type === 'series').forEach(item => {
    // Extract series name and episode info from URL
    const urlMatch = item.link.match(/\/SERIJE\/[^/]+\/([^/]+)\/S(\d+)E(\d+)/i);
    
    if (urlMatch) {
      const seriesSlug = urlMatch[1];
      const season = parseInt(urlMatch[2]);
      const episode = parseInt(urlMatch[3]);
      
      if (!seriesMap[seriesSlug]) {
        seriesMap[seriesSlug] = {
          slug: seriesSlug,
          name: item.title.replace(/\s*S\d+\s*E\d+.*$/i, '').trim(),
          seasons: {}
        };
      }
      
      if (!seriesMap[seriesSlug].seasons[season]) {
        seriesMap[seriesSlug].seasons[season] = [];
      }
      
      seriesMap[seriesSlug].seasons[season].push({
        episode,
        title: item.title,
        url: item.link,
        thumbnail: item.thumbnail
      });
    }
  });
  
  // Convert to array and sort episodes
  return Object.values(seriesMap).map(series => {
    const seasons = Object.keys(series.seasons).map(seasonNum => ({
      number: parseInt(seasonNum),
      episodes: series.seasons[seasonNum].sort((a, b) => a.episode - b.episode)
    })).sort((a, b) => a.number - b.number);
    
    return {
      ...series,
      seasons
    };
  });
}

// Main import function
async function importBauBauContent() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         BauBau Content Importer v1.0                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  // Find all XML files
  const xmlFiles = fs.readdirSync(ARCHIVE_DIR)
    .filter(f => f.startsWith('baubau-') && f.endsWith('.xml'))
    .map(f => path.join(ARCHIVE_DIR, f));
  
  console.log(`📂 Found ${xmlFiles.length} BauBau XML files\n`);
  
  let allItems = [];
  
  // Parse all XML files
  for (const xmlFile of xmlFiles) {
    const filename = path.basename(xmlFile);
    console.log(`📄 Parsing ${filename}...`);
    
    const xmlContent = fs.readFileSync(xmlFile, 'utf8');
    const items = parseXML(xmlContent);
    
    console.log(`   ✓ Extracted ${items.length} items`);
    console.log(`   ✓ With TMDB posters: ${items.filter(i => i.hasTMDBPoster).length}`);
    
    allItems = allItems.concat(items);
  }
  
  console.log(`\n✅ Total items extracted: ${allItems.length}\n`);
  
  // Separate movies and series
  const movies = allItems.filter(item => item.type === 'movie');
  const seriesItems = allItems.filter(item => item.type === 'series');
  const series = organizeSeries(seriesItems);
  
  console.log(`🎬 Movies: ${movies.length}`);
  console.log(`📺 Series: ${series.length} (${seriesItems.length} episodes)\n`);
  
  // Enrich with Cinemeta for items without TMDB metadata
  console.log('🔍 Enriching metadata with Cinemeta...\n');
  
  const moviesWithoutPoster = movies.filter(m => !m.hasTMDBPoster);
  console.log(`📡 Need to fetch metadata for ${moviesWithoutPoster.length} movies`);
  
  let enriched = 0;
  let failed = 0;
  
  for (let i = 0; i < moviesWithoutPoster.length; i++) {
    const movie = moviesWithoutPoster[i];
    
    if (i % 10 === 0 && i > 0) {
      console.log(`   Progress: ${i}/${moviesWithoutPoster.length}...`);
      // Save cache periodically
      fs.writeFileSync(CACHE_FILE, JSON.stringify(metadataCache, null, 2));
    }
    
    const meta = await searchCinemeta(movie.title, movie.year, 'movie');
    
    if (meta) {
      movie.cinemeta = meta;
      movie.poster = meta.poster;
      movie.background = meta.background;
      movie.imdb_id = meta.imdb_id;
      enriched++;
    } else {
      failed++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ Enriched: ${enriched}`);
  console.log(`❌ Failed: ${failed}\n`);
  
  // Save final cache
  fs.writeFileSync(CACHE_FILE, JSON.stringify(metadataCache, null, 2));
  console.log(`💾 Saved metadata cache (${Object.keys(metadataCache).length} entries)\n`);
  
  // Build final database
  const database = {
    generated: new Date().toISOString(),
    stats: {
      totalMovies: movies.length,
      moviesWithTMDB: movies.filter(m => m.hasTMDBPoster).length,
      moviesEnriched: enriched,
      totalSeries: series.length,
      totalEpisodes: seriesItems.length
    },
    movies: movies.map(m => ({
      id: m.imdb_id || `bilosta:${Buffer.from(m.title).toString('base64').substring(0, 12)}`,
      type: 'movie',
      name: m.title,
      year: m.year,
      poster: m.poster || m.thumbnail,
      background: m.background || m.fanart,
      description: m.cinemeta?.description,
      genres: m.cinemeta?.genres || [],
      imdbRating: m.cinemeta?.imdbRating,
      runtime: m.cinemeta?.runtime,
      cast: m.cinemeta?.cast || [],
      director: m.cinemeta?.director || [],
      streams: [{
        url: m.link,
        quality: m.link.includes('/4k/') ? '4K' : 'HD',
        source: 'bilosta',
        size: null
      }],
      category: m.category,
      originalTitle: m.originalTitle
    })),
    series: series.map(s => ({
      id: `bilosta:series:${s.slug}`,
      type: 'series',
      name: s.name,
      slug: s.slug,
      seasons: s.seasons,
      // TODO: Fetch series metadata from Cinemeta
    }))
  };
  
  // Save database
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));
  console.log(`💾 Saved database to: ${OUTPUT_FILE}`);
  console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB\n`);
  
  // Print summary
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    IMPORT COMPLETE                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  console.log('📊 Final Statistics:');
  console.log(`   • Total Movies: ${database.stats.totalMovies}`);
  console.log(`   • With TMDB Metadata: ${database.stats.moviesWithTMDB}`);
  console.log(`   • Enriched via Cinemeta: ${database.stats.moviesEnriched}`);
  console.log(`   • Total Series: ${database.stats.totalSeries}`);
  console.log(`   • Total Episodes: ${database.stats.totalEpisodes}`);
  console.log(`\n✅ Ready to integrate into Stremio addon!\n`);
}

// Run import
importBauBauContent().catch(console.error);
