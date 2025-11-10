const fs = require('fs');
const path = require('path');

// Load TMDB mapping
const tmdbMapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'tmdb-id-mapping.json'), 'utf8'));

console.log('Building IMDb to bilosta mapping from TMDB data...\n');

async function buildIMDbMapping() {
  const imdbMapping = {
    movies: {},
    series: {}
  };
  
  // Process movies
  console.log(`Processing ${Object.keys(tmdbMapping.movies).length} movies...`);
  let movieCount = 0;
  for (const [tmdbId, movieData] of Object.entries(tmdbMapping.movies)) {
    try {
      // Fetch TMDB data to get IMDb ID
      const url = `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${process.env.TMDB_API_KEY || 'YOUR_API_KEY'}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.imdb_id) {
          imdbMapping.movies[data.imdb_id] = {
            tmdbId: tmdbId,
            bilostaId: movieData.originalId,
            title: movieData.title,
            year: movieData.year
          };
          movieCount++;
          if (movieCount % 10 === 0) {
            process.stdout.write(`\r   Processed ${movieCount} movies...`);
          }
        }
      }
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`\nError processing movie TMDB ${tmdbId}:`, error.message);
    }
  }
  console.log(`\n✅ Processed ${movieCount} movies`);
  
  // Process series
  console.log(`\nProcessing ${Object.keys(tmdbMapping.series).length} series...`);
  let seriesCount = 0;
  for (const [tmdbId, seriesData] of Object.entries(tmdbMapping.series)) {
    try {
      // Fetch TMDB data to get IMDb ID
      const url = `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${process.env.TMDB_API_KEY || 'YOUR_API_KEY'}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.imdb_id) {
          imdbMapping.series[data.imdb_id] = {
            tmdbId: tmdbId,
            bilostaId: seriesData.originalId,
            title: seriesData.title
          };
          seriesCount++;
          console.log(`   ${data.imdb_id} -> ${seriesData.title}`);
        }
      }
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`\nError processing series TMDB ${tmdbId}:`, error.message);
    }
  }
  console.log(`✅ Processed ${seriesCount} series`);
  
  // Save the mapping
  const outputPath = path.join(__dirname, 'data', 'imdb-to-bilosta-mapping.json');
  fs.writeFileSync(outputPath, JSON.stringify(imdbMapping, null, 2));
  console.log(`\n✅ Saved mapping to ${outputPath}`);
  console.log(`\nSummary:`);
  console.log(`   Movies: ${Object.keys(imdbMapping.movies).length}`);
  console.log(`   Series: ${Object.keys(imdbMapping.series).length}`);
}

buildIMDbMapping();
