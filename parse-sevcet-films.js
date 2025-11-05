const https = require('https');
const { parseStringPromise } = require('xml2js');

// XML files to fetch from sevcet's exyuflix repo (much more content!)
const XML_FILES = [
    'domaci_filmovi.xml',
    'domace_serije.xml',
    'akcija.xml',
    'animirani.xml',
    'dokumentarni.xml',
    'horor.xml',
    'komedija.xml',
    'misterija.xml',
    'romansa.xml',
    'sci_fi.xml'
];

const BASE_URL = 'https://raw.githubusercontent.com/sevcet/exyuflix/main/';

async function fetchXML(filename) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}${filename}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function parseAllMovies() {
    const allMovies = [];
    const allSeries = [];
    
    for (const filename of XML_FILES) {
        try {
            console.log(`Fetching ${filename}...`);
            const xml = await fetchXML(filename);
            const parsed = await parseStringPromise(xml);
            
            if (parsed.category && parsed.category.movie) {
                for (const movie of parsed.category.movie) {
                    const isSeries = movie.type && movie.type[0] === 'serija';
                    
                    // For series with episodes
                    if (isSeries && movie.seasons && movie.seasons[0].season) {
                        const firstEpisode = movie.seasons[0].season[0].episode?.[0];
                        const item = {
                            id: `yt:${firstEpisode?.videoId?.[0] || 'unknown'}`,
                            type: 'series',
                            name: movie.title[0],
                            poster: movie.imageUrl[0],
                            posterShape: 'poster',
                            releaseInfo: movie.year ? movie.year[0] : undefined,
                            genres: movie.genre ? [movie.genre[0]] : undefined,
                            description: movie.description ? movie.description[0].trim() : undefined,
                            videos: []
                        };
                        
                        // Collect all episodes
                        for (const season of movie.seasons[0].season) {
                            if (season.episode) {
                                for (const ep of season.episode) {
                                    if (ep.videoId && ep.videoId[0]) {
                                        item.videos.push({
                                            season: season.$.number || '1',
                                            episode: item.videos.length + 1,
                                            id: ep.videoId[0],
                                            title: ep.title?.[0] || `Episode ${item.videos.length + 1}`
                                        });
                                    }
                                }
                            }
                        }
                        
                        allSeries.push(item);
                    } 
                    // For movies or simple series entries
                    else if (movie.videoId && movie.videoId[0]) {
                        const item = {
                            id: `yt:${movie.videoId[0]}`,
                            type: isSeries ? 'series' : 'movie',
                            name: movie.title[0],
                            poster: movie.imageUrl[0],
                            posterShape: 'poster',
                            releaseInfo: movie.year ? movie.year[0] : undefined,
                            genres: movie.genre ? [movie.genre[0]] : undefined,
                            description: movie.description ? movie.description[0].trim() : undefined,
                            youtubeId: movie.videoId[0]
                        };
                        
                        if (isSeries) {
                            allSeries.push(item);
                        } else {
                            allMovies.push(item);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error parsing ${filename}:`, error.message);
        }
    }
    
    console.log(`\nTotal movies: ${allMovies.length}`);
    console.log(`Total series: ${allSeries.length}`);
    
    // Create JSON output
    const output = {
        movies: allMovies,
        series: allSeries
    };
    
    console.log('\nSaving to sevcet-films.json...');
    require('fs').writeFileSync('sevcet-films.json', JSON.stringify(output, null, 2));
    console.log('Done!');
}

parseAllMovies().catch(console.error);
