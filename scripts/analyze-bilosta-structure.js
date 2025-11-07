#!/usr/bin/env node

/**
 * Analyze Bilosta Server Structure
 * Processes existing Bilosta URL lists to generate folder structure with file counts
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'bilosta');
const OUTPUT_DIR = path.join(__dirname, '..', 'data');

// Read all URL files
function readURLFiles() {
  const files = [
    'bilosta-all-urls.txt',
    'bilosta-directories.txt',
    'bilosta-4k.txt',
    'bilosta-exyu-movies.txt',
    'bilosta-foreign-movies.txt',
    'bilosta-series.txt'
  ];
  
  const allUrls = new Set();
  
  files.forEach(file => {
    const filePath = path.join(DATA_DIR, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const urls = content.split('\n').filter(line => line.trim().length > 0);
      urls.forEach(url => allUrls.add(url.trim()));
      console.log(`📄 ${file}: ${urls.length} URLs`);
    }
  });
  
  return Array.from(allUrls);
}

// Parse URL structure
function parseURLStructure(urls) {
  const structure = {};
  
  urls.forEach(url => {
    try {
      // Extract path after the secret code
      const match = url.match(/SERCRT\d+\/(.+)/);
      if (!match) return;
      
      const fullPath = match[1];
      const parts = fullPath.split('/').filter(p => p.length > 0);
      
      if (parts.length === 0) return;
      
      // Build nested structure
      let current = structure;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1 && (
          part.includes('.') || 
          !parts[i + 1]
        );
        
        if (isFile) {
          // It's a file
          if (!current._files) current._files = [];
          current._files.push(part);
        } else {
          // It's a folder
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    } catch (error) {
      console.error(`Error parsing URL: ${url}`, error.message);
    }
  });
  
  return structure;
}

// Count items recursively
function countItems(obj) {
  let folders = 0;
  let files = 0;
  
  Object.keys(obj).forEach(key => {
    if (key === '_files') {
      files += obj[key].length;
    } else {
      folders++;
      const subCount = countItems(obj[key]);
      folders += subCount.folders;
      files += subCount.files;
    }
  });
  
  return { folders, files };
}

// Generate text tree
function generateTree(obj, indent = '', prefix = '') {
  let output = '';
  const keys = Object.keys(obj).filter(k => k !== '_files').sort();
  
  keys.forEach((key, index) => {
    const isLast = index === keys.length - 1 && !obj._files;
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';
    
    const subCount = countItems(obj[key]);
    const label = subCount.folders > 0 || subCount.files > 0
      ? `${key}/ (${subCount.folders} folders, ${subCount.files} files)`
      : `${key}/`;
    
    output += `${indent}${connector}📁 ${label}\n`;
    output += generateTree(obj[key], indent + extension, extension);
  });
  
  // Add files
  if (obj._files && obj._files.length > 0) {
    const files = obj._files.sort();
    files.forEach((file, index) => {
      const isLast = index === files.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      
      // Get file extension for icon
      const ext = path.extname(file).toLowerCase();
      const icon = ['.mp4', '.mkv', '.avi', '.mov'].includes(ext) ? '🎬' : '📄';
      
      output += `${indent}${connector}${icon} ${file}\n`;
    });
  }
  
  return output;
}

// Generate markdown report
function generateMarkdown(structure) {
  const totalCount = countItems(structure);
  let md = `# Bilosta Server Content Structure\n\n`;
  md += `📊 **Summary:**\n`;
  md += `- Total Folders: ${totalCount.folders}\n`;
  md += `- Total Files: ${totalCount.files}\n\n`;
  md += `## Folder Structure\n\n`;
  md += `\`\`\`\n`;
  md += `Root/\n`;
  md += generateTree(structure);
  md += `\`\`\`\n\n`;
  
  // Add folder details
  md += `## Detailed Breakdown\n\n`;
  Object.keys(structure).sort().forEach(folder => {
    const count = countItems(structure[folder]);
    md += `### ${folder}/\n`;
    md += `- Subfolders: ${count.folders}\n`;
    md += `- Files: ${count.files}\n\n`;
    
    // List immediate files
    if (structure[folder]._files && structure[folder]._files.length > 0) {
      md += `**Files in this folder (${structure[folder]._files.length}):**\n`;
      structure[folder]._files.slice(0, 10).forEach(file => {
        md += `- ${file}\n`;
      });
      if (structure[folder]._files.length > 10) {
        md += `- ... and ${structure[folder]._files.length - 10} more\n`;
      }
      md += `\n`;
    }
    
    // List immediate subfolders
    const subfolders = Object.keys(structure[folder]).filter(k => k !== '_files');
    if (subfolders.length > 0) {
      md += `**Subfolders (${subfolders.length}):**\n`;
      subfolders.forEach(sub => {
        const subCount = countItems(structure[folder][sub]);
        md += `- **${sub}/** - ${subCount.folders} folders, ${subCount.files} files\n`;
      });
      md += `\n`;
    }
  });
  
  return md;
}

// Main execution
function main() {
  console.log('🔍 Analyzing Bilosta Server Structure...\n');
  
  // Read all URLs
  const urls = readURLFiles();
  console.log(`\n📊 Total unique URLs: ${urls.length}\n`);
  
  // Parse structure
  console.log('🏗️  Building folder structure...');
  const structure = parseURLStructure(urls);
  
  // Count totals
  const totals = countItems(structure);
  console.log(`✅ Structure built successfully!\n`);
  console.log(`📁 Total folders: ${totals.folders}`);
  console.log(`📄 Total files: ${totals.files}\n`);
  
  // Save JSON
  const jsonPath = path.join(OUTPUT_DIR, 'bilosta-server-structure.json');
  fs.writeFileSync(jsonPath, JSON.stringify(structure, null, 2));
  console.log(`💾 Saved JSON to: ${jsonPath}`);
  
  // Save tree view
  const treePath = path.join(OUTPUT_DIR, 'bilosta-server-tree.txt');
  const tree = `Bilosta Server Content\n${'='.repeat(50)}\n\n` +
               `Root/\n${generateTree(structure)}`;
  fs.writeFileSync(treePath, tree);
  console.log(`🌲 Saved tree view to: ${treePath}`);
  
  // Save markdown report
  const mdPath = path.join(OUTPUT_DIR, 'BILOSTA-STRUCTURE.md');
  const markdown = generateMarkdown(structure);
  fs.writeFileSync(mdPath, markdown);
  console.log(`📝 Saved markdown report to: ${mdPath}`);
  
  console.log('\n✅ Analysis complete!');
}

// Run
main();
