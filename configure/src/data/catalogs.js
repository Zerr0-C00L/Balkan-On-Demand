// TMDB dynamic catalogs - REMOVED (not needed)
export const tmdbCatalogs = [];

// Direct HD catalogs - simplified to 2 main catalogs
export const baseCatalogs = [
  { id: "bilosta.movies", name: "� Filmovi", type: "movie" },
  { id: "bilosta.series", name: "📺 Serije", type: "series" },
];

// No need for separate balkanCatalogs - bilosta IDs map to balkan_ catalogs in backend
export const balkanCatalogs = [];

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
