const fs = require('fs');

// Cinemeta is Stremio's official metadata addon with IMDb posters
const CINEMETA_URL = 'https://v3-cinemeta.strem.io';

async function searchCinemeta(title, year, type = 'movie') {
    try {
        // Clean title for search
        const cleanTitle = title
            .replace(/\([^)]*\)/g, '') // Remove parentheses
            .replace(/\s+/g, ' ')
            .trim();
        
        // Search on Cinemeta
        const searchQuery = encodeURIComponent(cleanTitle);
        const searchUrl = `${CINEMETA_URL}/catalog/${type}/top/search=${searchQuery}.json`;
        
        console.log(`  Searching Cinemeta: ${searchUrl.substring(0, 100)}...`);
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.metas && data.metas.length > 0) {
            // Try to find exact year match first
            let match = data.metas.find(m => {
                const metaYear = m.year || m.releaseInfo;
                return metaYear && metaYear.toString() === year.toString();
            });
            
            // If no exact year match, take first result
            if (!match) {
                match = data.metas[0];
            }
            
            if (match && match.poster) {
                console.log(`  ✓ Found on Cinemeta: ${match.name} (${match.year || match.releaseInfo})`);
                return match.poster;
            }
        }
    } catch (error) {
        console.log(`  ✗ Cinemeta error: ${error.message}`);
    }
    return null;
}

async function searchIMDb(title, year) {
    try {
        // Try alternative: OMDb API-like free services or direct IMDb poster fetch
        // Using a free movie database API that doesn't require key
        const cleanTitle = title
            .replace(/\([^)]*\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Search via public IMDb suggestions API
        const searchUrl = `https://v2.sg.media-imdb.com/suggestion/${cleanTitle.charAt(0).toLowerCase()}/${encodeURIComponent(cleanTitle)}.json`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.d && data.d.length > 0) {
            // Find movie with matching year
            let match = data.d.find(m => {
                return m.y && m.y.toString() === year.toString() && m.i && m.i.imageUrl;
            });
            
            if (!match) {
                match = data.d.find(m => m.i && m.i.imageUrl);
            }
            
            if (match && match.i && match.i.imageUrl) {
                console.log(`  ✓ Found on IMDb: ${match.l} (${match.y})`);
                return match.i.imageUrl;
            }
        }
    } catch (error) {
        console.log(`  ✗ IMDb error: ${error.message}`);
    }
    return null;
}

async function getBestPoster(item, type = 'movie') {
    console.log(`\n[${item.name}] (${item.releaseInfo})`);
    
    // First try Cinemeta (best quality, official Stremio source)
    let poster = await searchCinemeta(item.name, item.releaseInfo, type);
    if (poster) {
        return poster;
    }
    
    // Then try IMDb
    poster = await searchIMDb(item.name, item.releaseInfo);
    if (poster) {
        return poster;
    }
    
    // Keep HD YouTube thumbnail as fallback
    console.log(`  ○ Keeping YouTube thumbnail`);
    if (item.youtubeId) {
        return `https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg`;
    }
    
    return item.poster;
}

async function updatePosters() {
    console.log('🎬 Fetching Portrait Posters from Cinemeta & IMDb\n');
    console.log('Loading sevcet-films.json...\n');
    
    const content = JSON.parse(fs.readFileSync('sevcet-films.json', 'utf8'));
    
    let updated = 0;
    let failed = 0;
    
    console.log(`Processing ${content.movies.length} movies...`);
    console.log('=' .repeat(60));
    
    for (let i = 0; i < content.movies.length; i++) {
        const movie = content.movies[i];
        
        console.log(`\n[${i + 1}/${content.movies.length}]`);
        
        const newPoster = await getBestPoster(movie, 'movie');
        
        if (newPoster && newPoster !== movie.poster && !newPoster.includes('youtube.com')) {
            movie.poster = newPoster;
            movie.posterShape = 'poster'; // Portrait
            updated++;
        } else if (newPoster && newPoster.includes('youtube.com')) {
            movie.poster = newPoster;
            movie.posterShape = 'landscape'; // Keep landscape for YouTube
            failed++;
        } else {
            failed++;
        }
        
        // Rate limiting - wait 300ms between requests
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Save progress every 50 movies
        if ((i + 1) % 50 === 0) {
            fs.writeFileSync('sevcet-films.json', JSON.stringify(content, null, 2));
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Progress: ${i + 1}/${content.movies.length} | Updated: ${updated} | Failed: ${failed}`);
            console.log(`${'='.repeat(60)}`);
        }
    }
    
    // Process series
    console.log(`\n\nProcessing ${content.series.length} series...`);
    console.log('=' .repeat(60));
    
    for (let i = 0; i < content.series.length; i++) {
        const series = content.series[i];
        
        console.log(`\n[${i + 1}/${content.series.length}]`);
        
        const newPoster = await getBestPoster(series, 'series');
        
        if (newPoster && newPoster !== series.poster && !newPoster.includes('youtube.com')) {
            series.poster = newPoster;
            series.posterShape = 'poster';
            updated++;
        } else if (newPoster && newPoster.includes('youtube.com')) {
            series.poster = newPoster;
            series.posterShape = 'landscape';
            failed++;
        } else {
            failed++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Save final results
    fs.writeFileSync('sevcet-films.json', JSON.stringify(content, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPLETE');
    console.log('='.repeat(60));
    console.log(`✓ Portrait posters: ${updated}`);
    console.log(`○ YouTube fallback: ${failed}`);
    console.log(`📊 Total: ${content.movies.length + content.series.length}`);
    console.log('\n💾 Saved to: sevcet-films.json');
}

updatePosters().catch(console.error);
