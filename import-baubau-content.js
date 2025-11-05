const fs = require('fs');
const path = require('path');
const https = require('https');
const xml2js = require('xml2js');

// Cinemeta API for metadata enrichment
const CINEMETA_URL = 'https://v3-cinemeta.strem.io';

// Download XML file from BauBau API
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// Fetch metadata from Cinemeta
async function fetchCinemeta(title, year, type = 'movie') {
  const cleanTitle = title
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const searchQuery = encodeURIComponent(cleanTitle);
  const searchUrl = `${CINEMETA_URL}/catalog/${type}/top/search=${searchQuery}.json`;
  
  return new Promise((resolve) => {
    https.get(searchUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results.metas && results.metas.length > 0) {
            const match = results.metas.find(m => {
              if (year && m.year) {
                return Math.abs(parseInt(m.year) - parseInt(year)) <= 1;
              }
              return true;
            });
            resolve(match || results.metas[0]);
          } else {
            resolve(null);
          }
        } catch (err) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Parse XML content
async function parseXML(xmlContent) {
  const parser = new xml2js.Parser();
  const content = [];
  
  try {
    const result = await parser.parseStringPromise(xmlContent);
    
    // Handle <items> structure
    if (!result.items || !result.items.item) {
      return content;
    }
    
    const items = result.items.item;
    
    for (const item of items) {
      const title = item.title?.[0] || '';
      const link = item.link?.[0] || '';
      const thumbnail = item.thumbnail?.[0] || '';
      const fanart = item.fanart?.[0] || '';
      
      if (!title || !link) continue;
      
      // Extract year from title (format: "Title (Year)")
      const yearMatch = title.match(/\((\d{4})\)/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;
      const cleanName = title.replace(/\s*\(\d{4}\)\s*/, '').trim();
      
      // Create base64 ID from title
      const id = Buffer.from(cleanName).toString('base64').replace(/=/g, '');
      
      content.push({
        id: `bilosta:${id}`,
        name: cleanName,
        originalTitle: title,
        year: year,
        url: link,
        thumbnail: thumbnail,
        fanart: fanart,
        type: link.includes('/serije/') ? 'series' : 'movie'
      });
    }
  } catch (err) {
    console.error('XML parse error:', err.message);
  }
  
  return content;
}

// Main import function
async function importContent() {
  console.log('🚀 Starting BauBau content import...\n');
  
  const dataDir = path.join(__dirname, 'data');
  const archiveDir = path.join(__dirname, 'archive', 'analysis');
  
  // Ensure directories exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
  
  const allMovies = [];
  const allSeries = [];
  let enrichedCount = 0;
  
  // Download and parse all files
  for (let i = 1; i <= 6; i++) {
    const fileUrl = `https://dexe.win/addons/klik/klik.php?api&file=file${i}&group=KLIK+PREMIJERA`;
    const outputPath = path.join(archiveDir, `baubau-file${i}.xml`);
    
    console.log(`📥 Downloading file${i}...`);
    
    try {
      await downloadFile(fileUrl, outputPath);
      const xmlContent = fs.readFileSync(outputPath, 'utf8');
      const items = await parseXML(xmlContent);
      
      console.log(`   ✓ Parsed ${items.length} items from file${i}`);
      
      // Separate movies and series
      items.forEach(item => {
        if (item.type === 'movie') {
          allMovies.push(item);
        } else {
          allSeries.push(item);
        }
      });
      
    } catch (err) {
      console.error(`   ✗ Error processing file${i}:`, err.message);
    }
  }
  
  console.log(`\n📊 Total items: ${allMovies.length} movies, ${allSeries.length} series`);
  console.log('🔍 Enriching with Cinemeta metadata...\n');
  
  // Enrich movies with Cinemeta metadata
  const enrichedMovies = [];
  for (let i = 0; i < allMovies.length; i++) {
    const movie = allMovies[i];
    
    if (i % 100 === 0) {
      console.log(`   Processing ${i}/${allMovies.length}...`);
    }
    
    // Use existing poster if available, otherwise fetch from Cinemeta
    let poster = movie.thumbnail;
    let background = movie.fanart || movie.thumbnail;
    let metadata = null;
    
    // Only fetch Cinemeta if no poster exists
    if (!poster || poster.includes('placeholder')) {
      metadata = await fetchCinemeta(movie.name, movie.year, 'movie');
      poster = metadata?.poster || `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.name)}`;
      background = metadata?.background || metadata?.poster || '';
      if (metadata) enrichedCount++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    } else {
      enrichedCount++; // Count as enriched if it has poster from XML
    }
    
    const enriched = {
      id: movie.id,
      type: 'movie',
      name: movie.name,
      year: movie.year,
      poster: poster,
      background: background,
      genres: metadata?.genres || [],
      cast: metadata?.cast || [],
      director: metadata?.director || [],
      streams: [{
        url: movie.url,
        quality: 'HD',
        source: 'bilosta',
        size: null
      }],
      category: 'KLIK PREMIJERA',
      originalTitle: movie.originalTitle
    };
    
    enrichedMovies.push(enriched);
  }
  
  // Process series (use existing posters from XML)
  const enrichedSeries = allSeries.map(series => ({
    id: series.id,
    type: 'series',
    name: series.name,
    year: series.year,
    poster: series.thumbnail || `https://via.placeholder.com/300x450?text=${encodeURIComponent(series.name)}`,
    background: series.fanart || series.thumbnail || '',
    genres: [],
    cast: [],
    director: [],
    streams: [{
      url: series.url,
      quality: 'HD',
      source: 'bilosta'
    }],
    category: 'KLIK PREMIJERA',
    originalTitle: series.originalTitle
  }));
  
  // Create final database
  const database = {
    generated: new Date().toISOString(),
    stats: {
      totalMovies: enrichedMovies.length,
      moviesWithTMDB: enrichedCount,
      moviesEnriched: enrichedCount,
      totalSeries: enrichedSeries.length,
      totalEpisodes: 0
    },
    movies: enrichedMovies,
    series: enrichedSeries
  };
  
  // Save to file
  const outputPath = path.join(dataDir, 'baubau-content.json');
  fs.writeFileSync(outputPath, JSON.stringify(database, null, 2), 'utf8');
  
  console.log('\n✅ Import completed successfully!\n');
  console.log('📊 Final Stats:');
  console.log(`   • Total Movies: ${database.stats.totalMovies}`);
  console.log(`   • Movies with TMDB: ${database.stats.moviesWithTMDB}`);
  console.log(`   • Total Series: ${database.stats.totalSeries}`);
  console.log(`\n💾 Saved to: ${outputPath}`);
}

// Run import if called directly
if (require.main === module) {
  importContent().catch(err => {
    console.error('❌ Import failed:', err);
    process.exit(1);
  });
}

module.exports = { importContent };
