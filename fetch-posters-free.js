const fs = require('fs');

// Free poster sources (no API key needed)
const POSTER_SOURCES = {
    // IMDb posters via DuckDuckGo search
    duckduckgo: async (title, year) => {
        try {
            const query = `${title} ${year} film poster`;
            const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&t=stremio`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.Image) {
                return data.Image;
            }
        } catch (error) {
            // Silent fail, try next source
        }
        return null;
    },
    
    // YouTube thumbnail - higher quality
    youtubeMaxRes: (youtubeId) => {
        return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    },
    
    // YouTube high quality
    youtubeHQ: (youtubeId) => {
        return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    },
    
    // OpenGraph scraper for film websites
    scrapeWebsite: async (title, year) => {
        try {
            // Search for the movie on common Balkan film databases
            const searchTerms = encodeURIComponent(`${title} ${year} film`);
            
            // Try filmovi.com or similar sites
            const sites = [
                `https://www.filmovi.com/search?q=${searchTerms}`,
                `https://www.imdb.com/find?q=${searchTerms}`,
            ];
            
            // For now, we'll skip actual scraping to avoid legal issues
            // Instead, use a placeholder that could be filled manually
            return null;
        } catch (error) {
            return null;
        }
    }
};

async function testYouTubePoster(youtubeId) {
    try {
        // Check if maxresdefault exists (not all videos have it)
        const maxResUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
        const response = await fetch(maxResUrl, { method: 'HEAD' });
        
        // If maxresdefault is available and not a placeholder (size > 5000 bytes)
        const contentLength = response.headers.get('content-length');
        if (response.ok && contentLength && parseInt(contentLength) > 5000) {
            return maxResUrl;
        }
        
        // Fall back to hqdefault
        return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    } catch (error) {
        return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }
}

async function getBestPoster(item) {
    console.log(`  Checking ${item.name}...`);
    
    // First, try to get better YouTube thumbnail
    const youtubeId = item.youtubeId;
    if (youtubeId) {
        const betterThumb = await testYouTubePoster(youtubeId);
        if (betterThumb) {
            console.log(`  ✓ Using YouTube HD thumbnail`);
            return betterThumb;
        }
    }
    
    // Try DuckDuckGo image search
    const ddgPoster = await POSTER_SOURCES.duckduckgo(item.name, item.releaseInfo);
    if (ddgPoster) {
        console.log(`  ✓ Found via DuckDuckGo`);
        return ddgPoster;
    }
    
    console.log(`  ○ Keeping current poster`);
    return item.poster;
}

async function updatePosters() {
    console.log('Loading sevcet-films.json...');
    const content = JSON.parse(fs.readFileSync('sevcet-films.json', 'utf8'));
    
    let updated = 0;
    let skipped = 0;
    
    console.log(`\nProcessing ${content.movies.length} movies...\n`);
    
    for (let i = 0; i < content.movies.length; i++) {
        const movie = content.movies[i];
        
        console.log(`[${i + 1}/${content.movies.length}] ${movie.name} (${movie.releaseInfo})`);
        
        const newPoster = await getBestPoster(movie);
        
        if (newPoster && newPoster !== movie.poster) {
            movie.poster = newPoster;
            updated++;
        } else {
            skipped++;
        }
        
        // Rate limiting - wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Save progress every 100 movies
        if ((i + 1) % 100 === 0) {
            fs.writeFileSync('sevcet-films.json', JSON.stringify(content, null, 2));
            console.log(`\n--- Progress saved (${i + 1}/${content.movies.length}) ---\n`);
        }
    }
    
    // Process series too
    console.log(`\nProcessing ${content.series.length} series...\n`);
    
    for (let i = 0; i < content.series.length; i++) {
        const series = content.series[i];
        
        console.log(`[${i + 1}/${content.series.length}] ${series.name} (${series.releaseInfo})`);
        
        const newPoster = await getBestPoster(series);
        
        if (newPoster && newPoster !== series.poster) {
            series.poster = newPoster;
            updated++;
        } else {
            skipped++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Save final results
    fs.writeFileSync('sevcet-films.json', JSON.stringify(content, null, 2));
    fs.writeFileSync('sevcet-films-backup.json', JSON.stringify(content, null, 2));
    
    console.log('\n=== Summary ===');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${content.movies.length + content.series.length}`);
    console.log('\nPosters updated in sevcet-films.json');
    console.log('Backup saved to sevcet-films-backup.json');
}

console.log('🎬 Free Poster Fetcher for Balkan Films');
console.log('========================================\n');
console.log('This script will upgrade YouTube thumbnails to HD quality');
console.log('and attempt to find better posters from free sources.\n');

updatePosters().catch(console.error);
