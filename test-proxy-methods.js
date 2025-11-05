#!/usr/bin/env node

// Test different YouTube proxy methods
const testVideoId = 'hm_dKv-k0SY';

const methods = [
    {
        name: 'Piped API - Video Streams',
        test: async () => {
            const response = await fetch(`https://pipedapi.kavin.rocks/streams/${testVideoId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.videoStreams?.[0]?.url || null;
        }
    },
    {
        name: 'Invidious API - Format Streams',
        test: async () => {
            const response = await fetch(`https://invidious.io.lol/api/v1/videos/${testVideoId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.formatStreams?.[0]?.url || null;
        }
    },
    {
        name: 'YouTube Watch Page Scrape',
        test: async () => {
            const response = await fetch(`https://www.youtube.com/watch?v=${testVideoId}`);
            const html = await response.text();
            // This would require parsing - just checking if accessible
            return response.ok ? 'Accessible' : null;
        }
    }
];

async function testMethod(method) {
    console.log(`\n🧪 Testing: ${method.name}`);
    try {
        const result = await method.test();
        if (result) {
            console.log(`✅ Success!`);
            if (typeof result === 'string' && result.startsWith('http')) {
                console.log(`   URL: ${result.substring(0, 100)}...`);
            } else {
                console.log(`   Result: ${result}`);
            }
            return true;
        } else {
            console.log(`❌ No result returned`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return false;
    }
}

async function runTests() {
    console.log(`\n🎬 Testing YouTube Proxy Methods for video: ${testVideoId}\n`);
    console.log('='.repeat(60));
    
    let working = 0;
    for (const method of methods) {
        const result = await testMethod(method);
        if (result) working++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 ${working}/${methods.length} methods working\n`);
}

runTests();
