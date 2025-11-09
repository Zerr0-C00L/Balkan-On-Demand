#!/usr/bin/env node

/**
 * Bilosta Content Crawler
 * Crawls the Bilosta server to discover all available content
 * Lists folders and files in a structured format
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://content.bilosta.org/SERCRT721/';

// Fetch URL and return HTML content
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Parse directory listing HTML
function parseDirectoryListing(html, baseUrl) {
  const items = [];
  
  // Match directory listing links (common Apache/nginx format)
  // Look for <a href="...">...</a> patterns
  const linkRegex = /<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].trim();
    
    // Skip parent directory, query strings, and absolute URLs
    if (href === '../' || href === '/' || href.startsWith('?') || href.startsWith('http')) {
      continue;
    }
    
    // Determine if it's a directory or file
    const isDirectory = href.endsWith('/');
    const name = isDirectory ? href.slice(0, -1) : href;
    
    items.push({
      name: name,
      href: href,
      isDirectory: isDirectory,
      url: baseUrl + href
    });
  }
  
  return items;
}

// Recursively crawl directory
async function crawlDirectory(url, depth = 0, maxDepth = 10) {
  if (depth > maxDepth) {
    console.log(`⚠️  Max depth reached at ${url}`);
    return { folders: [], files: [] };
  }
  
  const indent = '  '.repeat(depth);
  console.log(`${indent}📂 Crawling: ${url}`);
  
  try {
    const html = await fetchURL(url);
    const items = parseDirectoryListing(html, url);
    
    const result = {
      url: url,
      folders: [],
      files: []
    };
    
    for (const item of items) {
      if (item.isDirectory) {
        console.log(`${indent}  📁 ${item.name}/`);
        result.folders.push(item.name);
        
        // Recursively crawl subdirectories
        const subResult = await crawlDirectory(item.url, depth + 1, maxDepth);
        result[item.name] = subResult;
      } else {
        console.log(`${indent}  📄 ${item.name}`);
        result.files.push(item.name);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error(`${indent}❌ Error crawling ${url}: ${error.message}`);
    return { folders: [], files: [], error: error.message };
  }
}

// Generate text report
function generateTextReport(data, indent = '') {
  let report = '';
  
  if (data.url) {
    report += `${indent}${data.url}\n`;
  }
  
  // List folders
  if (data.folders && data.folders.length > 0) {
    report += `${indent}Folders (${data.folders.length}):\n`;
    data.folders.forEach(folder => {
      report += `${indent}  📁 ${folder}/\n`;
      if (data[folder]) {
        report += generateTextReport(data[folder], indent + '    ');
      }
    });
  }
  
  // List files
  if (data.files && data.files.length > 0) {
    report += `${indent}Files (${data.files.length}):\n`;
    data.files.forEach(file => {
      report += `${indent}  📄 ${file}\n`;
    });
  }
  
  return report;
}

// Main execution
async function main() {
  console.log('🚀 Bilosta Content Crawler');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('');
  
  const startTime = Date.now();
  
  const result = await crawlDirectory(BASE_URL);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('');
  console.log(`✅ Crawling complete in ${duration}s`);
  console.log('');
  
  // Save JSON output
  const jsonOutput = path.join(__dirname, '..', 'data', 'bilosta-structure.json');
  fs.writeFileSync(jsonOutput, JSON.stringify(result, null, 2));
  console.log(`💾 Saved JSON structure to: ${jsonOutput}`);
  
  // Save text report
  const textReport = generateTextReport(result);
  const textOutput = path.join(__dirname, '..', 'data', 'bilosta-structure.txt');
  fs.writeFileSync(textOutput, textReport);
  console.log(`📝 Saved text report to: ${textOutput}`);
  
  // Print summary
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total folders: ${result.folders ? result.folders.length : 0}`);
  console.log(`   Total files: ${result.files ? result.files.length : 0}`);
}

// Run the crawler
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
