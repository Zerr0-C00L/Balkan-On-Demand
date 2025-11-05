#!/usr/bin/env node

/**
 * Script to search for torrents for Balkan movies
 * This will help you find magnet links to add to your content
 */

const movies = require('./sevcet-films.json');

// Sample of how to add torrent support to your movies
const exampleMovieWithTorrent = {
    "id": "yt:c9g_UlLVtUM",
    "type": "movie",
    "name": "Uzicka republika",
    "poster": "https://img.youtube.com/vi/c9g_UlLVtUM/hqdefault.jpg",
    "releaseInfo": "1974",
    "genres": ["Domaci film"],
    "description": "Film o Užičkoj republici...",
    "youtubeId": "c9g_UlLVtUM",
    
    // ADD THIS to enable torrent streaming (works perfectly on Apple TV)
    "torrents": [
        {
            "quality": "1080p",
            "infoHash": "TORRENT_INFO_HASH_HERE", // 40-char hex string
            "fileIdx": 0, // Index of video file in torrent (usually 0)
            "size": "2.1 GB"
        },
        {
            "quality": "720p",
            "infoHash": "ANOTHER_HASH_HERE",
            "fileIdx": 0,
            "size": "1.4 GB"
        }
    ]
};

console.log('\n🎬 Torrent Support Guide for Apple TV\n');
console.log('=' .repeat(70));
console.log('\n📊 Current Status:');
console.log(`   Movies: ${movies.movies.length}`);
console.log(`   Series: ${movies.series.length}`);
console.log('\n❌ Problem: YouTube links don\'t work on Apple TV internal player');
console.log('✅ Solution: Add torrent/magnet links for each movie\n');

console.log('=' .repeat(70));
console.log('\n🔍 Where to find Balkan movie torrents:\n');

const sources = [
    {
        name: 'YTS (yts.mx)',
        url: 'https://yts.mx',
        note: 'Has some Yugoslav films, good quality'
    },
    {
        name: '1337x',
        url: 'https://1337x.to',
        note: 'Search: "Yugoslav" "Balkan" "Domaci film"'
    },
    {
        name: 'TorrentGalaxy',
        url: 'https://torrentgalaxy.to',
        note: 'Good for European cinema'
    },
    {
        name: 'RARBG mirrors',
        url: 'Various',
        note: 'Search for specific titles'
    },
    {
        name: 'Torrent search engines',
        url: 'https://torrends.to, https://torrentz2.eu',
        note: 'Aggregate multiple sources'
    }
];

sources.forEach((source, i) => {
    console.log(`${i + 1}. ${source.name}`);
    console.log(`   URL: ${source.url}`);
    console.log(`   Note: ${source.note}\n`);
});

console.log('=' .repeat(70));
console.log('\n📝 How to add torrents to your movies:\n');
console.log('1. Search for movie title on torrent sites');
console.log('2. Get the magnet link or info hash (40-char hex string)');
console.log('3. Add to your sevcet-films.json like the example above');
console.log('4. Restart your addon\n');

console.log('=' .repeat(70));
console.log('\n💡 Example searches to try:\n');

const sampleMovies = movies.movies.slice(0, 5);
sampleMovies.forEach(movie => {
    console.log(`   "${movie.name}" ${movie.releaseInfo}`);
});

console.log('\n' + '=' .repeat(70));
console.log('\n🎯 Want me to help you:');
console.log('   1. Create a script to search torrents automatically?');
console.log('   2. Modify your addon to support torrents?');
console.log('   3. Find alternative direct MP4 sources?\n');
