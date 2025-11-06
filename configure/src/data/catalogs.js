// Base TMDB catalogs - inspired by mrcanelas addon
export const baseCatalogs = [
  { id: "tmdb.popular", name: "Popular", type: "movie" },
  { id: "tmdb.popular", name: "Popular", type: "series" },
  { id: "tmdb.year", name: "Year", type: "movie" },
  { id: "tmdb.year", name: "Year", type: "series" },
  { id: "tmdb.language", name: "Language", type: "movie" },
  { id: "tmdb.language", name: "Language", type: "series" },
  { id: "tmdb.trending", name: "Trending", type: "movie" },
  { id: "tmdb.trending", name: "Trending", type: "series" },
];

// Direct HD catalogs from your Bilosta collection
export const directCatalogs = [
  { id: "bilosta.movies", name: "Direct HD Movies", type: "movie" },
  { id: "bilosta.series", name: "Direct HD Series", type: "series" },
];

// Balkan regional catalogs (TMDB keyword-based)
export const balkanCatalogs = [
  { id: "tmdb.bosnian", name: "🇧🇦 Bosnian", type: "movie" },
  { id: "tmdb.bosnian", name: "🇧🇦 Bosnian", type: "series" },
  { id: "tmdb.croatian", name: "🇭🇷 Croatian", type: "movie" },
  { id: "tmdb.croatian", name: "🇭🇷 Croatian", type: "series" },
  { id: "tmdb.serbian", name: "🇷🇸 Serbian", type: "movie" },
  { id: "tmdb.serbian", name: "🇷🇸 Serbian", type: "series" },
];

// Age rating options
export const ageRatings = [
  {
    id: "NONE",
    name: "No Restriction",
    description: "Show all content without age restrictions",
    order: 0,
    badge: { text: "ALL", color: "bg-gray-500" }
  },
  {
    id: "G",
    name: "General Audience",
    description: "All ages admitted",
    order: 1,
    badge: { text: "G", color: "bg-green-500" }
  },
  {
    id: "PG",
    name: "Parental Guidance",
    description: "Some material may not be suitable for children",
    order: 2,
    badge: { text: "PG", color: "bg-blue-500" }
  },
  {
    id: "PG-13",
    name: "Parents Strongly Cautioned",
    description: "Some material may be inappropriate for children under 13",
    order: 3,
    badge: { text: "PG-13", color: "bg-yellow-500" }
  },
  {
    id: "R",
    name: "Restricted",
    description: "Under 17 requires accompanying parent or guardian",
    order: 4,
    badge: { text: "R", color: "bg-orange-500" }
  },
  {
    id: "NC-17",
    name: "Adults Only",
    description: "No one 17 and under admitted",
    order: 5,
    badge: { text: "NC-17", color: "bg-red-500" }
  }
];
