# Balkan On Demand - Stremio Addon

A Stremio addon that provides access to popular movies and TV series from the Balkan region (ex-Yugoslavia).

## Features

- 🎬 **15,000+ Videos** - Massive collection automatically synced from Bilosta CDN
- 📺 **Direct HD Streams** - Movies, series, cartoons, and 4K content
- 🎭 **Multiple Catalogs** - Domaci Filmovi, Strani Filmovi, Crtani, Serije
- 🌟 **TMDB Integration** - Popular, trending, and year-based catalogs with metadata
- 🔄 **Auto-Updates** - Daily sync discovers new content automatically
- 🔍 **Rich Metadata** - TMDB/Cinemeta enrichment with posters, descriptions, cast
- 🌐 **Easy Installation** - One-click install with configurable catalogs

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Start the addon server:
```bash
npm start
```

The addon will start on port 7000 by default.

### Install in Stremio

1. Start the addon server (it must be running)
2. Open Stremio
3. Go to the Addons section
4. Click on "Community Addons"
5. Paste this URL: `http://127.0.0.1:7000/manifest.json`
6. Click "Install"

The addon will now appear in your Stremio addons list!

## Development

To run in development mode with auto-reload:
```bash
npm run dev
```

## Configuration

You can customize the port by setting the `PORT` environment variable:
```bash
PORT=8080 npm start
```

## Movie Database

The addon includes classic Balkan films such as:

- **Underground** (1995) - Emir Kusturica
- **Pretty Village, Pretty Flame** (1996) - Srđan Dragojević
- **No Man's Land** (2001) - Danis Tanović
- **The Marathon Family** (1982) - Slobodan Šijan
- **Who's Singin' Over There?** (1980) - Slobodan Šijan
- **Balkan Spy** (1984) - Dušan Kovačević
- **Black Cat, White Cat** (1998) - Emir Kusturica

And popular TV series like:
- **The Written Off** (1974)
- **Better Life** (1987)
- **The Grey Home** (1984)

## Content Management

### Automatic Content Sync

The addon automatically syncs with Bilosta CDN server daily at 2 AM UTC. See **[BILOSTA-SYNC.md](BILOSTA-SYNC.md)** for details.

**Key Features:**
- ✅ Discovers new files on Bilosta server
- ✅ Preserves existing metadata and enrichment
- ✅ Optional TMDB metadata fetching for new items
- ✅ Manual trigger available via GitHub Actions

### Manual Content Updates

You can trigger updates manually:

1. **Via GitHub Actions**:
   - Go to Actions tab → "Sync Bilosta Content" → "Run workflow"

2. **Locally**:
   ```bash
   # Sync from Bilosta server
   node scripts/sync-bilosta-content.js
   
   # Analyze server structure
   node scripts/analyze-bilosta-structure.js
   
   # Enrich with TMDB metadata
   node scrape-tmdb-metadata.js
   ```

### Database Files

- **`data/baubau-content.json`** - Main content database (15,000+ items)
- **`data/bilosta/`** - URL lists organized by category
- **`data/metadata-cache.json`** - TMDB/Cinemeta metadata cache
- **`data/BILOSTA-STRUCTURE.md`** - Server content structure report

See **[BILOSTA-SYNC.md](BILOSTA-SYNC.md)** for complete documentation.

## API Endpoints

- `GET /manifest.json` - Addon manifest
- `GET /catalog/:type/:id.json` - Get catalog items
- `GET /stream/:type/:id.json` - Get streams for an item

## License

MIT

## Contributing

Contributions are welcome! Feel free to submit pull requests with additional content or improvements.

## Disclaimer

This addon is for educational purposes. Make sure you have the right to stream any content you add to the database.
