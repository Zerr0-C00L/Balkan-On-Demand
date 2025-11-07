import { useState, useEffect } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { languages } from '../data/languages';
import { motion } from 'framer-motion';

export function Home() {
  const { language, setLanguage } = useConfig();
  const [stats, setStats] = useState({
    tmdbCatalogs: 0,
    directMovies: 0,
    directSeries: 0,
    totalContent: 'Loading...'
  });
  const [backgroundUrl, setBackgroundUrl] = useState('https://images.metahub.space/background/medium/tt0816692/img');

  // Fetch live stats from API
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats({
          tmdbCatalogs: 0, // No TMDB catalogs anymore
          directMovies: data.movies || 0,
          directSeries: data.series || 0,
          totalContent: (data.movies + data.series).toLocaleString()
        });
      })
      .catch(() => {
        // Fallback to defaults if API fails
        setStats({
          tmdbCatalogs: 0,
          directMovies: 3848,
          directSeries: 37,
          totalContent: '3,885'
        });
      });
  }, []);

  // Fetch random background
  useEffect(() => {
    fetch('https://cinemeta-catalogs.strem.io/top/catalog/movie/top.json')
      .then(res => res.json())
      .then(data => {
        const moviesWithId = data.metas.filter(m => m.imdb_id);
        if (moviesWithId.length > 0) {
          const random = moviesWithId[Math.floor(Math.random() * moviesWithId.length)];
          setBackgroundUrl(`https://images.metahub.space/background/medium/${random.imdb_id}/img`);
        }
      })
      .catch(() => {});
  }, []);

  // Separate Balkan languages for prominent display
  const balkanLanguages = languages.filter(lang => lang.highlighted);
  const otherLanguages = languages.filter(lang => !lang.highlighted && !lang.divider);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${backgroundUrl})`,
          filter: 'brightness(0.3) blur(2px)'
        }}
      />
      
      {/* Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center px-4 py-12 max-w-4xl"
      >
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
          Balkan HD Streams
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-6">
          TMDB-powered catalogs with Direct HD streams
        </p>
        <p className="text-lg text-gray-400 mb-8">
          Version 6.0.0 TMDB Edition
        </p>

        {/* Language Selector */}
        <div className="mb-12 max-w-md mx-auto">
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            Select Metadata Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg backdrop-blur-sm focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent outline-none"
          >
            <optgroup label="🌍 Balkan Region">
              {balkanLanguages.map((lang) => (
                <option key={lang.value} value={lang.value} className="bg-gray-800">
                  {lang.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="🌎 Other Languages">
              {otherLanguages.map((lang) => (
                <option key={lang.value} value={lang.value} className="bg-gray-800">
                  {lang.label}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="mt-2 text-xs text-gray-400">
            This sets the language for TMDB metadata (descriptions, cast, etc.)
          </p>
        </div>

        {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-pink-500/10 backdrop-blur-sm rounded-xl p-6 border border-pink-500/20"
            >
              <div className="text-4xl font-bold text-pink-400 mb-2">
                {stats.directMovies.toLocaleString()}
              </div>
              <div className="text-gray-300">Direct HD Movies</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-cyan-500/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/20"
            >
              <div className="text-4xl font-bold text-cyan-400 mb-2">
                {stats.directSeries}
              </div>
              <div className="text-gray-300">Direct HD Series</div>
            </motion.div>
          </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-left"
          >
            <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              <span>🎬</span> Dynamic TMDB Catalogs
            </h3>
            <p className="text-gray-300 text-sm">
              Browse by Popular, Year, Language, Trending with full metadata from TMDB. Includes dedicated Bosnian, Croatian, and Serbian catalogs.
            </p>
          </motion.div>
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-left"
          >
            <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              <span>⭐</span> Direct HD Streams
            </h3>
            <p className="text-gray-300 text-sm">
              3,800+ curated movies and series with instant playback via direct CDN links. No torrents, no waiting.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
