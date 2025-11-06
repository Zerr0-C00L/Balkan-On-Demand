// Sync Balkan On Demand content to MDBList
const fs = require('fs');
const path = require('path');

// Load content database
const bauBauDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'baubau-content.json'), 'utf8'));

// Cinemeta integration to get IMDb IDs
const CINEMETA_URL = 'https://v3-cinemeta.strem.io';

async function searchCinemeta(title, year, type) {
  try {
    const yearStr = year ? ` ${year}` : '';
    const searchUrl = `${CINEMETA_URL}/search-results/${type}/${encodeURIComponent(title + yearStr)}.json`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.metas && data.metas.length > 0) {
      return data.metas[0].imdb_id;
    }
  } catch (error) {
    console.error(`Cinemeta search error for ${title}:`, error.message);
  }
  return null;
}

async function getIMDbIDs() {
  console.log('🔍 Finding IMDb IDs for all content...');
  const imdbIds = [];
  
  // Process movies
  for (const movie of bauBauDB.movies) {
    const imdbId = await searchCinemeta(movie.name, movie.year, 'movie');
    if (imdbId) {
      imdbIds.push(imdbId);
      console.log(`✅ ${movie.name}: ${imdbId}`);
    } else {
      console.log(`❌ ${movie.name}: No IMDb ID found`);
    }
  }
  
  // Process series
  for (const series of bauBauDB.series) {
    const imdbId = await searchCinemeta(series.name, series.year, 'series');
    if (imdbId) {
      imdbIds.push(imdbId);
      console.log(`✅ ${series.name}: ${imdbId}`);
    } else {
      console.log(`❌ ${series.name}: No IMDb ID found`);
    }
  }
  
  return imdbIds;
}

async function syncToMDBList(apiKey) {
  console.log('🚀 Starting MDBList sync...');
  
  // Get all IMDb IDs
  const imdbIds = await getIMDbIDs();
  
  console.log(`\n📊 Found ${imdbIds.length} IMDb IDs out of ${bauBauDB.movies.length + bauBauDB.series.length} total items`);
  
  // Create list on MDBList
  const listName = 'Balkan On Demand';
  const listDescription = 'Movies and series from Serbia, Croatia & Bosnia available on Balkan On Demand addon';
  
  try {
    // First, check if list already exists
    console.log('🔍 Checking for existing list...');
    const listsResponse = await fetch(`https://mdblist.com/api/lists/user?apikey=${apiKey}`);
    
    let listId = null;
    
    if (listsResponse.ok) {
      const lists = await listsResponse.json();
      const existingList = lists.find(l => l.name === listName);
      
      if (existingList) {
        listId = existingList.id;
        console.log(`✅ Found existing list: ${listName} (ID: ${listId})`);
      }
    }
    
    // Create list if it doesn't exist
    if (!listId) {
      console.log('📝 Creating new list...');
      const createResponse = await fetch(`https://mdblist.com/api/lists?apikey=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: listName,
          description: listDescription,
          is_public: 1
        })
      });
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create list (${createResponse.status}): ${errorText}`);
      }
      
      const listData = await createResponse.json();
      listId = listData.id;
      
      console.log(`✅ Created list: ${listName} (ID: ${listId})`);
    }
    
    // Add items to list
    console.log(`📝 Adding ${imdbIds.length} items to list...`);
    
    const addResponse = await fetch(`https://mdblist.com/api/lists/${listId}/items?apikey=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: imdbIds.map(id => ({ imdb_id: id }))
      })
    });
    
    if (!addResponse.ok) {
      const errorText = await addResponse.text();
      throw new Error(`Failed to add items (${addResponse.status}): ${errorText}`);
    }
    
    const addData = await addResponse.json();
    console.log(`✅ Added ${addData.added || imdbIds.length} items to list`);
    
    return {
      success: true,
      listId: listId,
      added: addData.added || imdbIds.length,
      total: imdbIds.length
    };
    
  } catch (error) {
    console.error('❌ MDBList sync error:', error.message);
    throw error;
  }
}

module.exports = { syncToMDBList, getIMDbIDs };

// CLI usage
if (require.main === module) {
  const apiKey = process.env.MDBLIST_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Please set MDBLIST_API_KEY environment variable');
    process.exit(1);
  }
  
  syncToMDBList(apiKey)
    .then(result => {
      console.log('\n✅ Sync complete!');
      console.log(`   List ID: ${result.listId}`);
      console.log(`   Items added: ${result.added}/${result.total}`);
    })
    .catch(error => {
      console.error('\n❌ Sync failed:', error.message);
      process.exit(1);
    });
}
