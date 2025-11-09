#!/usr/bin/env node

/**
 * View detailed contents of Bilosta folders
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'bilosta-folder-structure.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const folderName = process.argv[2];

if (!folderName) {
  console.log('📁 Available folders:\n');
  Object.keys(data.folders).sort().forEach((folder, i) => {
    const folderData = data.folders[folder];
    console.log(`${i + 1}. ${folder} (${folderData.type}, ${folderData.files.length} files)`);
  });
  console.log('\nUsage: node view-folder-contents.js <folder-name>');
  console.log('Example: node view-folder-contents.js "FILMOVI/exyu"');
  process.exit(0);
}

const folder = data.folders[folderName];

if (!folder) {
  console.error(`❌ Folder not found: ${folderName}`);
  console.log('\nDid you mean one of these?');
  const similar = Object.keys(data.folders).filter(f => 
    f.toLowerCase().includes(folderName.toLowerCase())
  );
  similar.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}

console.log(`📂 Folder: ${folderName}`);
console.log(`Type: ${folder.type}`);
if (folder.seriesName) {
  console.log(`Series: ${folder.seriesName}`);
}
console.log(`Files: ${folder.files.length}\n`);
console.log('='.repeat(80));
console.log('');

folder.files.forEach((file, i) => {
  console.log(`${i + 1}. ${file.name}`);
  console.log(`   Title: ${file.title}`);
  if (file.year) console.log(`   Year: ${file.year}`);
  if (file.quality) console.log(`   Quality: ${file.quality}`);
  if (file.season) console.log(`   Season: ${file.season}, Episode: ${file.episode}`);
  console.log(`   URL: ${file.url}`);
  console.log('');
});

console.log('='.repeat(80));
console.log(`Total: ${folder.files.length} files`);
