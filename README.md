# Balkan On Demand - Stremio Addon

A Stremio addon that provides access to popular movies and TV series from the Balkan region (ex-Yugoslavia).

## ⚠️ Important Disclaimer

This addon aggregates streams from the **BauBau Click Premium** Kodi addon. I do not own, host, or control any of the media content or streams. Users install and use this addon at their own discretion and responsibility. All content is provided by third-party sources.

## Features

- 🎬 **15,000+ Videos** - Massive collection automatically synced from Bilosta CDN
- 📺 **Direct HD Streams** - Movies, series, cartoons, and 4K content
- 🎭 **Multiple Catalogs** - Domaci Filmovi, Strani Filmovi, Crtani, Serije
- 🌟 **TMDB Integration** - Popular, trending, and year-based catalogs with metadata
- 🔄 **Auto-Updates** - Daily sync discovers new content automatically
- 🔍 **Rich Metadata** - TMDB/Cinemeta enrichment with posters, descriptions, cast
- 🌐 **Easy Installation** - One-click install with configurable catalogs

## Installation

### Using Vercel (Recommended)

**Live Production URL:** https://balkan-ondemand.vercel.app

1. Visit: https://balkan-ondemand.vercel.app/configure
2. Configure your catalogs (movies, series)
3. Click "Install to Stremio"

That's it! The addon is hosted on Vercel with 99.9% uptime.

### Self-Hosting

#### Prerequisites

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

The addon will start on port 7005 by default.

#### Install in Stremio (Self-Hosted)

1. Start the addon server (it must be running)
2. Open Stremio
3. Go to the Addons section
4. Click on "Community Addons"
5. Paste this URL: `http://127.0.0.1:7005/manifest.json`
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

The addon syncs content from Bilosta CDN server. Content is automatically updated and deployed via GitHub Actions.

### Database Files

- **`data/baubau-content.json`** - Main content database (movies and series)
- **`data/bilosta/`** - URL lists organized by category
- **`data/metadata-cache.json`** - TMDB/Cinemeta metadata cache
- **`data/tmdb-id-mapping.json`** - TMDB ID to stream mapping

## API Endpoints

- `GET /manifest.json` - Addon manifest
- `GET /catalog/:type/:id` - Get catalog items
- `GET /meta/:type/:id` - Get metadata for an item
- `GET /stream/:type/:id` - Get streams for an item
- `GET /configure` - Web UI for configuring catalogs

## Deployment

This project is deployed on Vercel. To deploy your own instance:

1. Fork this repository
2. Sign up for [Vercel](https://vercel.com)
3. Import your forked repository
4. Deploy!

Vercel will automatically build and deploy on every push to main.

## License

MIT

## Contributing

Contributions are welcome! Feel free to submit pull requests with improvements.

---

**Made with ❤️ for the Balkan community**
