const fs = require('fs');

// TMDb API - free, requires API key
// You can get one at: https://www.themoviedb.org/settings/api
const TMDB_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your API key
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

async function searchMovie(title, year) {
    try {
        const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}&language=sr`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const movie = data.results[0];
            if (movie.poster_path) {
                return TMDB_IMAGE_BASE + movie.poster_path;
            }
        }
    } catch (error) {
        console.error(`Error fetching poster for ${title}:`, error.message);
    }
    return null;
}

async function updatePosters() {
    console.log('Loading sevcet-films.json...');
    const content = JSON.parse(fs.readFileSync('sevcet-films.json', 'utf8'));
    
    let updated = 0;
    let failed = 0;
    
    console.log(`Processing ${content.movies.length} movies...`);
    
    for (let i = 0; i < content.movies.length; i++) {
        const movie = content.movies[i];
        
        // Skip if already has a proper poster (not YouTube thumbnail)
        if (movie.poster && !movie.poster.includes('img.youtube.com')) {
            continue;
        }
        
        console.log(`[${i + 1}/${content.movies.length}] Searching: ${movie.name} (${movie.releaseInfo})`);
        
        const posterUrl = await searchMovie(movie.name, movie.releaseInfo);
        
        if (posterUrl) {
            movie.poster = posterUrl;
            updated++;
            console.log(`  ✓ Found poster`);
        } else {
            failed++;
            console.log(`  ✗ No poster found`);
        }
        
        // Rate limiting - wait 250ms between requests
        await new Promise(resolve => setTimeout(resolve, 250));
        
        // Save progress every 50 movies
        if ((i + 1) % 50 === 0) {
            fs.writeFileSync('sevcet-films.json', JSON.stringify(content, null, 2));
            console.log(`\n--- Progress saved (${i + 1}/${content.movies.length}) ---\n`);
        }
    }
    
    // Process series too
    console.log(`\nProcessing ${content.series.length} series...`);
    for (let i = 0; i < content.series.length; i++) {
        const series = content.series[i];
        
        if (series.poster && !series.poster.includes('img.youtube.com')) {
            continue;
        }
        
        console.log(`[${i + 1}/${content.series.length}] Searching: ${series.name} (${series.releaseInfo})`);
        
        // For series, use TV search endpoint
        const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(series.name)}&first_air_date_year=${series.releaseInfo}&language=sr`;
        
        try {
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            if (data.results && data.results.length > 0 && data.results[0].poster_path) {
                series.poster = TMDB_IMAGE_BASE + data.results[0].poster_path;
                updated++;
                console.log(`  ✓ Found poster`);
            } else {
                failed++;
                console.log(`  ✗ No poster found`);
            }
        } catch (error) {
            console.error(`  Error: ${error.message}`);
            failed++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    // Save final results
    fs.writeFileSync('sevcet-films.json', JSON.stringify(content, null, 2));
    
    console.log('\n=== Summary ===');
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${content.movies.length + content.series.length}`);
    console.log('\nPosters updated in sevcet-films.json');
}

// Check if API key is set
if (TMDB_API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('\n⚠️  TMDb API key not set!');
    console.log('\nTo get proper movie posters:');
    console.log('1. Create free account at: https://www.themoviedb.org/signup');
    console.log('2. Get API key at: https://www.themoviedb.org/settings/api');
    console.log('3. Edit fetch-posters.js and replace YOUR_API_KEY_HERE with your key');
    console.log('4. Run: node fetch-posters.js\n');
    process.exit(1);
}

updatePosters().catch(console.error);
