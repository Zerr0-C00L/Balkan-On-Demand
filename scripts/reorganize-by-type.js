#!/usr/bin/env node

/**
 * Reorganize Database by Type
 * 
 * Restructures baubau-content.json to organize content by:
 * 1. Type (movies vs series)
 * 2. Genre (extracted from TMDB or folder path)
 * 3. Year (from metadata or filename)
 * 4. Language (from metadata or defaults to 'sr' for Serbian)
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'baubau-content.json');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'baubau-content-backup-' + Date.now() + '.json');

console.log('📦 Loading database...');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// Backup original database
console.log('💾 Creating backup...');
fs.writeFileSync(BACKUP_PATH, JSON.stringify(db, null, 2));
console.log(`✅ Backup saved to: ${path.basename(BACKUP_PATH)}`);

// Extract genres from category or default genres based on folder path
function extractGenres(item) {
    const genres = new Set();
    
    // Add existing genres from TMDB enrichment
    if (item.genres && Array.isArray(item.genres)) {
        item.genres.forEach(g => genres.add(g));
    }
    
    // Infer genres from category/folder path
    if (item.category) {
        const cat = item.category.toLowerCase();
        
        if (cat.includes('crtani') || cat.includes('kids')) {
            genres.add('Animation');
            genres.add('Family');
        } else if (cat.includes('domaci') || cat.includes('exyu') || cat.includes('ex yu')) {
            genres.add('Drama');
        } else if (cat.includes('strani') || cat.includes('foreign')) {
            // Keep existing genres or add generic
            if (genres.size === 0) genres.add('Drama');
        } else if (cat.includes('4k')) {
            // 4K is just quality, keep existing genres
            if (genres.size === 0) genres.add('Drama');
        }
    }
    
    // Infer from URL path
    if (item.streams && item.streams.length > 0) {
        const url = item.streams[0].url.toLowerCase();
        
        if (url.includes('/crtani/')) {
            genres.add('Animation');
            genres.add('Family');
        } else if (url.includes('/imdb')) {
            // Foreign content from IMDB folder
            if (genres.size === 0) genres.add('Drama');
        }
    }
    
    // Default if no genres found
    if (genres.size === 0) {
        genres.add('Unknown');
    }
    
    return Array.from(genres);
}

// Extract year from item (use existing year or extract from name/filename)
function extractYear(item) {
    if (item.year) return item.year;
    
    // Try to extract from name: "Movie Name (2024)"
    const nameMatch = item.name.match(/\((\d{4})\)/);
    if (nameMatch) return parseInt(nameMatch[1]);
    
    // Try to extract from originalTitle
    if (item.originalTitle) {
        const titleMatch = item.originalTitle.match(/\((\d{4})\)/);
        if (titleMatch) return parseInt(titleMatch[1]);
    }
    
    // Try to extract from streams URL
    if (item.streams && item.streams.length > 0) {
        const url = item.streams[0].url;
        const urlMatch = url.match(/[._\-](\d{4})[._\-]/);
        if (urlMatch) return parseInt(urlMatch[1]);
    }
    
    return null;
}

// Extract language (default to Serbian for Balkan content)
function extractLanguage(item) {
    // Check if enriched with language data
    if (item.language) return item.language;
    
    // Infer from category
    if (item.category) {
        const cat = item.category.toLowerCase();
        if (cat.includes('domaci') || cat.includes('exyu') || cat.includes('ex yu')) {
            return 'sr'; // Serbian
        } else if (cat.includes('strani') || cat.includes('foreign') || cat.includes('imdb')) {
            return 'en'; // English (most foreign content)
        } else if (cat.includes('crtani')) {
            return 'sr'; // Serbian dubbed cartoons
        }
    }
    
    // Default to Serbian for all Balkan content
    return 'sr';
}

console.log('\n🔄 Reorganizing content...');

// Separate movies and series
const allMovies = [];
const allSeries = [];

db.movies.forEach(item => {
    // Enhance item with additional metadata
    const enhancedItem = {
        ...item,
        genres: extractGenres(item),
        year: extractYear(item),
        language: extractLanguage(item)
    };
    
    if (item.type === 'series') {
        allSeries.push(enhancedItem);
    } else {
        allMovies.push(enhancedItem);
    }
});

// Add series from db.series if it exists
if (db.series && Array.isArray(db.series)) {
    db.series.forEach(item => {
        const enhancedItem = {
            ...item,
            genres: extractGenres(item),
            year: extractYear(item),
            language: extractLanguage(item)
        };
        allSeries.push(enhancedItem);
    });
}

console.log(`📊 Found ${allMovies.length} movies and ${allSeries.length} series`);

// Extract unique genres, years, and languages
const movieGenres = new Set();
const movieYears = new Set();
const movieLanguages = new Set();

const seriesGenres = new Set();
const seriesYears = new Set();
const seriesLanguages = new Set();

allMovies.forEach(item => {
    item.genres.forEach(g => movieGenres.add(g));
    if (item.year) movieYears.add(item.year);
    if (item.language) movieLanguages.add(item.language);
});

allSeries.forEach(item => {
    item.genres.forEach(g => seriesGenres.add(g));
    if (item.year) seriesYears.add(item.year);
    if (item.language) seriesLanguages.add(item.language);
});

// Sort for consistent output
const sortedMovieGenres = Array.from(movieGenres).sort();
const sortedMovieYears = Array.from(movieYears).sort((a, b) => b - a); // Newest first
const sortedMovieLanguages = Array.from(movieLanguages).sort();

const sortedSeriesGenres = Array.from(seriesGenres).sort();
const sortedSeriesYears = Array.from(seriesYears).sort((a, b) => b - a);
const sortedSeriesLanguages = Array.from(seriesLanguages).sort();

console.log('\n📋 Movies:');
console.log(`   Genres: ${sortedMovieGenres.join(', ')}`);
console.log(`   Years: ${sortedMovieYears.length} unique years (${sortedMovieYears[0]} - ${sortedMovieYears[sortedMovieYears.length - 1]})`);
console.log(`   Languages: ${sortedMovieLanguages.join(', ')}`);

console.log('\n📋 Series:');
console.log(`   Genres: ${sortedSeriesGenres.join(', ')}`);
console.log(`   Years: ${sortedSeriesYears.length} unique years (${sortedSeriesYears[0]} - ${sortedSeriesYears[sortedSeriesYears.length - 1]})`);
console.log(`   Languages: ${sortedSeriesLanguages.join(', ')}`);

// Create new database structure
const newDB = {
    generated: new Date().toISOString(),
    version: '7.0.0',
    structure: 'type-first',
    
    // Statistics
    stats: {
        totalMovies: allMovies.length,
        totalSeries: allSeries.length,
        totalEpisodes: allSeries.reduce((sum, s) => {
            if (s.seasons && Array.isArray(s.seasons)) {
                return sum + s.seasons.reduce((epSum, season) => epSum + (season.episodes?.length || 0), 0);
            }
            return sum;
        }, 0),
        moviesEnriched: allMovies.filter(m => m.poster && m.poster !== 'https://via.placeholder.com/300x450').length,
        seriesEnriched: allSeries.filter(s => s.poster && s.poster !== 'https://via.placeholder.com/300x450').length
    },
    
    // Metadata for filtering
    metadata: {
        movies: {
            genres: sortedMovieGenres,
            years: sortedMovieYears,
            languages: sortedMovieLanguages
        },
        series: {
            genres: sortedSeriesGenres,
            years: sortedSeriesYears,
            languages: sortedSeriesLanguages
        }
    },
    
    // Content organized by type
    movies: allMovies,
    series: allSeries
};

// Save new database
console.log('\n💾 Saving reorganized database...');
fs.writeFileSync(DB_PATH, JSON.stringify(newDB, null, 2));

console.log('\n✅ Reorganization complete!');
console.log(`\n📊 New Structure:`);
console.log(`   - Version: 7.0.0 (type-first organization)`);
console.log(`   - Movies: ${newDB.stats.totalMovies}`);
console.log(`   - Series: ${newDB.stats.totalSeries}`);
console.log(`   - Episodes: ${newDB.stats.totalEpisodes}`);
console.log(`   - Movies with metadata: ${newDB.stats.moviesEnriched}`);
console.log(`   - Series with metadata: ${newDB.stats.seriesEnriched}`);
console.log(`\n📋 Filter Options:`);
console.log(`   Movies: ${sortedMovieGenres.length} genres, ${sortedMovieYears.length} years, ${sortedMovieLanguages.length} languages`);
console.log(`   Series: ${sortedSeriesGenres.length} genres, ${sortedSeriesYears.length} years, ${sortedSeriesLanguages.length} languages`);
console.log(`\n💾 Backup saved: ${path.basename(BACKUP_PATH)}`);
