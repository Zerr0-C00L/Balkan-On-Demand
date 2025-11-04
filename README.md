# Balkan On Demand - Stremio Addon

A Stremio addon that provides access to popular movies and TV series from the Balkan region (ex-Yugoslavia).

## Features

- 🎬 Curated collection of Balkan movies
- 📺 Popular TV series from the region
- 🎭 Multiple genres: Drama, Comedy, War, Crime, Romance, Thriller
- 🔍 Genre filtering support
- 🌐 Easy installation and setup

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

## Adding Content

To add more movies or series, edit the `movies.json` file following this structure:

```json
{
  "id": "unique-id",
  "type": "movie",
  "name": "Movie Title",
  "poster": "https://poster-url.jpg",
  "posterShape": "poster",
  "genres": ["Drama", "Comedy"],
  "description": "Movie description",
  "releaseInfo": "Year",
  "imdbRating": "8.0",
  "runtime": "120 min",
  "director": "Director Name",
  "cast": ["Actor 1", "Actor 2"],
  "country": "Country",
  "streams": []
}
```

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
