#!/usr/bin/env node

/**
 * Probe Bilosta server for actual content
 * Since directory listing is disabled, we'll probe known paths and check HTTP responses
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://content.bilosta.org/SERCRT721/';

// Common folder paths to probe based on database patterns
const KNOWN_FOLDERS = [
  'FILMOVI/',
  'FILMOVI/exyu/',
  'FILMOVI/strani/',
  'FILMOVI/4K/',
  'FILMOVI/crt/',
  'SERIJE/',
  'SERIJE/NOVE.DOMACE/',
  'CRTANI/',
  'CRTANI/CrtaniKlasici/',
  'CRTANI/CrtaniKlasici/DisneyKlasici/',
  'CRTANI/SimsalaGrim/',
  'DOKU/',
];

// Check if URL exists (HEAD request)
function checkURL(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    
    const options = {
      method: 'HEAD',
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      timeout: 5000
    };
    
    const req = https.request(options, (res) => {
      resolve({
        url: url,
        status: res.statusCode,
        exists: res.statusCode === 200,
        contentType: res.headers['content-type'],
        contentLength: res.headers['content-length'],
        lastModified: res.headers['last-modified']
      });
    });
    
    req.on('error', () => {
      resolve({
        url: url,
        status: null,
        exists: false,
        error: 'Connection error'
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url: url,
        status: null,
        exists: false,
        error: 'Timeout'
      });
    });
    
    req.end();
  });
}

// Try to fetch directory (will fail if listing disabled, but might return HTML)
function tryFetchDirectory(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
        // Stop if we get too much data (likely not a directory listing)
        if (data.length > 100000) {
          res.destroy();
        }
      });
      
      res.on('end', () => {
        const hasDirectoryListing = 
          data.includes('Index of') || 
          data.includes('Parent Directory') ||
          data.includes('<a href=');
        
        resolve({
          url: url,
          status: res.statusCode,
          hasDirectoryListing: hasDirectoryListing,
          responseLength: data.length,
          contentType: res.headers['content-type']
        });
      });
    }).on('error', () => {
      resolve({
        url: url,
        status: null,
        hasDirectoryListing: false,
        error: 'Connection error'
      });
    });
  });
}

async function main() {
  console.log('🔍 Probing Bilosta server...\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  // Check base URL
  console.log('📡 Checking base URL...');
  const baseCheck = await tryFetchDirectory(BASE_URL);
  console.log(`   Status: ${baseCheck.status}`);
  console.log(`   Has directory listing: ${baseCheck.hasDirectoryListing}`);
  console.log(`   Content-Type: ${baseCheck.contentType}`);
  console.log('');
  
  if (!baseCheck.hasDirectoryListing) {
    console.log('⚠️  Directory listing is DISABLED on this server');
    console.log('   We can only verify individual file URLs, not discover new content\n');
  }
  
  // Probe known folders
  console.log('📂 Probing known folders...\n');
  
  const results = {
    baseUrl: BASE_URL,
    timestamp: new Date().toISOString(),
    serverSupportsListing: baseCheck.hasDirectoryListing,
    folders: {}
  };
  
  for (const folder of KNOWN_FOLDERS) {
    const folderUrl = BASE_URL + folder;
    console.log(`   Checking: ${folder}`);
    
    const result = await tryFetchDirectory(folderUrl);
    results.folders[folder] = result;
    
    if (result.hasDirectoryListing) {
      console.log(`   ✅ Directory listing available!`);
    } else if (result.status === 200) {
      console.log(`   ⚠️  Exists but no listing (status ${result.status})`);
    } else if (result.status === 403) {
      console.log(`   🔒 Forbidden (status 403)`);
    } else if (result.status === 404) {
      console.log(`   ❌ Not found (status 404)`);
    } else {
      console.log(`   ❓ Unknown (status ${result.status || 'error'})`);
    }
  }
  
  console.log('\n📊 Summary:');
  const existingFolders = Object.values(results.folders).filter(f => f.status === 200 || f.status === 403);
  console.log(`   • Folders checked: ${KNOWN_FOLDERS.length}`);
  console.log(`   • Folders accessible: ${existingFolders.length}`);
  console.log(`   • Directory listing: ${baseCheck.hasDirectoryListing ? 'ENABLED' : 'DISABLED'}`);
  
  // Save results
  const outputPath = path.join(__dirname, '..', 'data', 'bilosta-server-probe.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${outputPath}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMMENDATION:');
  console.log('='.repeat(70));
  
  if (!baseCheck.hasDirectoryListing) {
    console.log('Since directory listing is disabled, the only way to get a complete');
    console.log('file list is to:');
    console.log('  1. Contact the server administrator for a file list');
    console.log('  2. Use our existing database (baubau-content.json)');
    console.log('  3. Import files from bilosta directory text files in data/bilosta/');
  } else {
    console.log('Directory listing is enabled! You can crawl the server to discover');
    console.log('all files. Run: node scripts/crawl-bilosta-content.js');
  }
  
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
