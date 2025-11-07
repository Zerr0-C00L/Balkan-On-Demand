import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Home() {
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

  // Fetch random background from Ex-Yu movies
  useEffect(() => {
    fetch('/catalog/movie/balkan_movies.json')
      .then(res => res.json())
      .then(data => {
        const moviesWithBackground = data.metas.filter(m => m.background);
        if (moviesWithBackground.length > 0) {
          const random = moviesWithBackground[Math.floor(Math.random() * moviesWithBackground.length)];
          setBackgroundUrl(random.background);
        }
      })
      .catch(() => {});
  }, []);

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
          Version 6.0.1 TMDB Edition
        </p>

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
              <span>🎬</span> Ex-Yu Content Only
            </h3>
            <p className="text-gray-300 text-sm">
              681 carefully curated Ex-Yu movies and 37 series (2,320 episodes) with instant playback via direct CDN links. 100% Balkan content.
            </p>
          </motion.div>
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-left"
          >
            <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              <span>⭐</span> No Foreign Movies
            </h3>
            <p className="text-gray-300 text-sm">
              Filtered to only Serbian, Croatian, and Bosnian content. No Hollywood, no foreign classics. Pure Ex-Yu entertainment.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
