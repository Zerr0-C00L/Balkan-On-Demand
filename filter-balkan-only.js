const fs = require('fs');
const path = require('path');

// Categories to keep (Balkan/Ex-Yu only)
const BALKAN_CATEGORIES = [
  'KLIK PREMIJERA',
  'EX YU FILMOVI',
  'EX YU SERIJE',
  'EXYU SERIJE',
  'EXYU SERIJE KOJE SE EMITUJU',
  'KLASICI',
  'FILMSKI KLASICI',
  'Bolji Zivot',
  'Bela Ladja',
  'Policajac Sa Petlovog Brda',
  'Slatke Muke'
];

console.log('🔍 Filtering for Balkan-only content...\n');

// Load current database
const dataPath = path.join(__dirname, 'data', 'baubau-content.json');
const database = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log(`📊 Current database:`);
console.log(`   Total movies: ${database.movies.length}`);
console.log(`   Total series: ${database.series.length}`);

// Series categories
const SERIES_CATEGORIES = [
  'EX YU SERIJE',
  'EXYU SERIJE',
  'EXYU SERIJE KOJE SE EMITUJU',
  'Bolji Zivot',
  'Bela Ladja',
  'Policajac Sa Petlovog Brda',
  'Slatke Muke'
];

// Filter and separate movies vs series
const balkanMovies = database.movies.filter(movie => 
  BALKAN_CATEGORIES.includes(movie.category) && !SERIES_CATEGORIES.includes(movie.category)
);

// Convert series episodes stored as movies to proper series
// Make each episode have a unique ID by using the full URL WITHOUT substring
const seriesFromMovies = database.movies.filter(movie =>
  SERIES_CATEGORIES.includes(movie.category)
).map((episode, index) => {
  // Create unique ID from FULL URL - no substring, keep entire hash
  const url = episode.streams?.[0]?.url || `episode_${index}`;
  const urlHash = Buffer.from(url).toString('base64').replace(/[=/+]/g, '');
  
  return {
    ...episode,
    id: `bilosta:${urlHash}`, // Completely unique ID - full URL hash
    type: 'series'
  };
});

// Combine with actual series
const balkanSeries = [
  ...database.series.filter(series => BALKAN_CATEGORIES.includes(series.category)),
  ...seriesFromMovies
];

console.log(`\n✅ Filtered to Balkan content:`);
console.log(`   Balkan movies: ${balkanMovies.length}`);
console.log(`   Balkan series: ${balkanSeries.length}`);
console.log(`   Total removed: ${(database.movies.length - balkanMovies.length) + (database.series.length - balkanSeries.length)}`);

// Show category breakdown
console.log(`\n📂 Movies by category:`);
const movieCategories = {};
balkanMovies.forEach(m => {
  movieCategories[m.category] = (movieCategories[m.category] || 0) + 1;
});
Object.entries(movieCategories).forEach(([cat, count]) => {
  console.log(`   ${cat}: ${count}`);
});

console.log(`\n📂 Series by category:`);
const seriesCategories = {};
balkanSeries.forEach(s => {
  seriesCategories[s.category] = (seriesCategories[s.category] || 0) + 1;
});
Object.entries(seriesCategories).forEach(([cat, count]) => {
  console.log(`   ${cat}: ${count}`);
});

// Create filtered database
const filteredDatabase = {
  generated: new Date().toISOString(),
  stats: {
    totalMovies: balkanMovies.length,
    moviesWithTMDB: 0,
    moviesEnriched: balkanMovies.length,
    totalSeries: balkanSeries.length,
    totalEpisodes: database.stats?.totalEpisodes || 0
  },
  movies: balkanMovies,
  series: balkanSeries
};

// Backup original
const backupPath = path.join(__dirname, 'data', 'baubau-content-full-backup.json');
if (!fs.existsSync(backupPath)) {
  console.log(`\n💾 Creating backup at: ${backupPath}`);
  fs.writeFileSync(backupPath, JSON.stringify(database, null, 2));
}

// Save filtered database
console.log(`\n💾 Saving filtered database...`);
fs.writeFileSync(dataPath, JSON.stringify(filteredDatabase, null, 2));

console.log(`\n✅ Done! Database now contains only Balkan/Ex-Yu content.`);
console.log(`   Backup of full database saved to: baubau-content-full-backup.json\n`);
