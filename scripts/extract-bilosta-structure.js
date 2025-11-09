#!/usr/bin/env node

/**
 * Extract Bilosta folder structure from baubau-content.json
 * Generates a complete list of all folders and files from the database
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'baubau-content.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('📊 Extracting Bilosta structure from database...\n');

const structure = {
  baseUrl: 'https://content.bilosta.org/SERCRT721/',
  folders: {},
  stats: {
    totalMovies: 0,
    totalSeries: 0,
    totalEpisodes: 0,
    totalFolders: 0
  }
};

// Extract movie URLs
console.log('🎬 Processing movies...');
db.movies.forEach(movie => {
  if (movie.streams && movie.streams.length > 0) {
    movie.streams.forEach(stream => {
      const url = stream.url;
      // Extract folder path: https://content.bilosta.org/SERCRT721/FILMOVI/exyu/file.mp4
      const match = url.match(/SERCRT721\/(.+?)\/([^\/]+)$/);
      if (match) {
        const folderPath = match[1];
        const filename = match[2];
        
        if (!structure.folders[folderPath]) {
          structure.folders[folderPath] = {
            type: 'movies',
            files: []
          };
        }
        
        structure.folders[folderPath].files.push({
          name: filename,
          title: movie.name,
          year: movie.year,
          quality: stream.quality,
          url: url
        });
        
        structure.stats.totalMovies++;
      }
    });
  }
});

// Extract series URLs
console.log('📺 Processing series...');
db.series.forEach(series => {
  series.seasons.forEach(season => {
    season.episodes.forEach(episode => {
      const url = episode.url;
      // Extract folder path
      const match = url.match(/SERCRT721\/(.+?)\/([^\/]+)$/);
      if (match) {
        const folderPath = match[1];
        const filename = match[2];
        
        if (!structure.folders[folderPath]) {
          structure.folders[folderPath] = {
            type: 'series',
            seriesName: series.name,
            files: []
          };
        }
        
        structure.folders[folderPath].files.push({
          name: filename,
          title: episode.title,
          season: season.number,
          episode: episode.episode,
          url: url
        });
        
        structure.stats.totalEpisodes++;
      }
    });
  });
  structure.stats.totalSeries++;
});

structure.stats.totalFolders = Object.keys(structure.folders).length;

// Sort folder paths
const sortedFolders = Object.keys(structure.folders).sort();
const sortedStructure = {
  ...structure,
  folders: {}
};

sortedFolders.forEach(folderPath => {
  sortedStructure.folders[folderPath] = structure.folders[folderPath];
});

// Save JSON
const jsonOutput = path.join(__dirname, '..', 'data', 'bilosta-folder-structure.json');
fs.writeFileSync(jsonOutput, JSON.stringify(sortedStructure, null, 2));
console.log(`\n💾 Saved JSON to: ${jsonOutput}`);

// Generate text report
let textReport = '📁 BILOSTA CONTENT STRUCTURE\n';
textReport += '='.repeat(50) + '\n\n';
textReport += `Base URL: ${sortedStructure.baseUrl}\n\n`;
textReport += `Statistics:\n`;
textReport += `  • Total Folders: ${sortedStructure.stats.totalFolders}\n`;
textReport += `  • Total Movies: ${sortedStructure.stats.totalMovies}\n`;
textReport += `  • Total Series: ${sortedStructure.stats.totalSeries}\n`;
textReport += `  • Total Episodes: ${sortedStructure.stats.totalEpisodes}\n`;
textReport += `  • Total Files: ${sortedStructure.stats.totalMovies + sortedStructure.stats.totalEpisodes}\n\n`;
textReport += '='.repeat(50) + '\n\n';

sortedFolders.forEach(folderPath => {
  const folder = sortedStructure.folders[folderPath];
  textReport += `📂 ${folderPath}/ (${folder.type})\n`;
  if (folder.seriesName) {
    textReport += `   Series: ${folder.seriesName}\n`;
  }
  textReport += `   Files: ${folder.files.length}\n`;
  
  // List first 5 files as examples
  const exampleFiles = folder.files.slice(0, 5);
  exampleFiles.forEach(file => {
    textReport += `   📄 ${file.name}`;
    if (file.quality) {
      textReport += ` [${file.quality}]`;
    }
    textReport += `\n`;
  });
  
  if (folder.files.length > 5) {
    textReport += `   ... and ${folder.files.length - 5} more files\n`;
  }
  
  textReport += '\n';
});

const textOutput = path.join(__dirname, '..', 'data', 'bilosta-folder-structure.txt');
fs.writeFileSync(textOutput, textReport);
console.log(`📝 Saved text report to: ${textOutput}`);

// Print summary
console.log('\n📊 Summary:');
console.log(`   📂 Total folders: ${sortedStructure.stats.totalFolders}`);
console.log(`   🎬 Total movie files: ${sortedStructure.stats.totalMovies}`);
console.log(`   📺 Total series: ${sortedStructure.stats.totalSeries}`);
console.log(`   📹 Total episode files: ${sortedStructure.stats.totalEpisodes}`);
console.log(`   📁 Total files: ${sortedStructure.stats.totalMovies + sortedStructure.stats.totalEpisodes}`);
console.log('\n✅ Done!');
