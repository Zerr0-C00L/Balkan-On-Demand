const fs = require('fs');
const path = require('path');

// Load the database directly without loading addon.js
const bauBauDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'baubau-content.json'), 'utf8'));

console.log('Testing series stream logic...\n');
console.log(`Loaded: ${bauBauDB.movies.length} movies, ${bauBauDB.series.length} series\n`);

// Test with the first series
const testSeries = bauBauDB.series[0];
console.log(`Testing series: ${testSeries.name}`);
console.log(`Series ID: ${testSeries.id}`);
console.log(`Seasons: ${testSeries.seasons?.length || 0}`);

if (testSeries.seasons && testSeries.seasons.length > 0) {
  const firstSeason = testSeries.seasons[0];
  const firstEpisode = firstSeason.episodes[0];
  
  console.log(`\nFirst episode:`);
  console.log(`  Season: ${firstSeason.number}`);
  console.log(`  Episode: ${firstEpisode.episode}`);
  console.log(`  URL: ${firstEpisode.url}`);
  
  // Build the video ID as it would be in meta response
  const videoId = `${testSeries.id}:${firstSeason.number}:${firstEpisode.episode}`;
  console.log(`\nVideo ID that would be returned in meta: ${videoId}`);
  
  // Test the stream handler logic
  console.log('\n--- Testing stream handler logic ---');
  const id = videoId;
  
  console.log(`ID includes ':series:': ${id.includes(':series:')}`);
  console.log(`ID split length: ${id.split(':').length}`);
  console.log(`ID split parts: ${JSON.stringify(id.split(':'))}`);
  
  if (id.includes(':series:') && id.split(':').length === 5) {
    const [, , seriesSlug, seasonNum, epNum] = id.split(':');
    const seriesId = `bilosta:series:${seriesSlug}`;
    
    console.log(`\nExtracted values:`);
    console.log(`  seriesSlug: ${seriesSlug}`);
    console.log(`  seasonNum: ${seasonNum}`);
    console.log(`  epNum: ${epNum}`);
    console.log(`  Reconstructed seriesId: ${seriesId}`);
    
    // Try to find the series
    const series = bauBauDB.series.find(s => s.id === seriesId);
    if (series) {
      console.log(`✅ Found series: ${series.name}`);
      
      const season = series.seasons.find(s => s.number === parseInt(seasonNum));
      if (season) {
        console.log(`✅ Found season: ${season.number}`);
        
        const episode = season.episodes.find(e => e.episode === parseInt(epNum));
        if (episode) {
          console.log(`✅ Found episode: ${episode.episode}`);
          console.log(`✅ Episode URL: ${episode.url}`);
          console.log(`\n✅✅✅ STREAM WOULD BE RETURNED SUCCESSFULLY! ✅✅✅`);
        } else {
          console.log(`❌ Episode not found`);
        }
      } else {
        console.log(`❌ Season not found`);
      }
    } else {
      console.log(`❌ Series not found`);
    }
  } else {
    console.log(`❌ ID format check failed`);
  }
}

// List all series for reference
console.log(`\n\n--- All series in database ---`);
bauBauDB.series.forEach((s, i) => {
  console.log(`${i + 1}. ${s.name} (${s.id}) - ${s.seasons?.length || 0} seasons`);
});
