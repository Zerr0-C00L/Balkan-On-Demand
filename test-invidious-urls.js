#!/usr/bin/env node

// Quick test script for Invidious direct video URLs
const testVideoId = 'hm_dKv-k0SY'; // APSTINENTI movie

const urls = [
    {
        name: 'Invidious 720p (itag=22)',
        url: `https://invidious.io.lol/latest_version?id=${testVideoId}&itag=22`
    },
    {
        name: 'Invidious 360p (itag=18)',
        url: `https://invidious.io.lol/latest_version?id=${testVideoId}&itag=18`
    },
    {
        name: 'Yewtu.be 720p',
        url: `https://yewtu.be/latest_version?id=${testVideoId}&itag=22`
    }
];

console.log(`\n🧪 Testing Invidious direct video URLs for: ${testVideoId}\n`);

async function testUrl(name, url) {
    try {
        const response = await fetch(url, { 
            method: 'HEAD',
            redirect: 'follow'
        });
        
        const finalUrl = response.url;
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const sizeMB = contentLength ? (parseInt(contentLength) / (1024 * 1024)).toFixed(2) : 'Unknown';
        
        console.log(`✅ ${name}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Type: ${contentType}`);
        console.log(`   Size: ${sizeMB} MB`);
        console.log(`   Final URL: ${finalUrl.substring(0, 80)}...`);
        console.log('');
        
        return true;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        console.log('');
        return false;
    }
}

async function runTests() {
    let passed = 0;
    for (const { name, url } of urls) {
        const result = await testUrl(name, url);
        if (result) passed++;
    }
    
    console.log(`\n📊 Results: ${passed}/${urls.length} tests passed\n`);
    
    if (passed > 0) {
        console.log('✅ At least one URL works! These should play on Apple TV.\n');
    } else {
        console.log('❌ No URLs working. May need to try different approach.\n');
    }
}

runTests();
