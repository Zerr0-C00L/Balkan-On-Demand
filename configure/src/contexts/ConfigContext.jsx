import { createContext, useContext, useState, useEffect } from 'react';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { tmdbCatalogs, baseCatalogs, balkanCatalogs } from '../data/catalogs';

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
  // Catalog configuration - combine all catalogs
  const allCatalogs = [...tmdbCatalogs, ...baseCatalogs, ...balkanCatalogs];
  const [catalogs, setCatalogs] = useState(
    allCatalogs.map(cat => ({
      ...cat,
      enabled: true,
      showInHome: false
    }))
  );
  
  // TMDB settings
  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [tmdbPrefix, setTmdbPrefix] = useState(false);
  
  // Content settings
  const [includeAdult, setIncludeAdult] = useState(false);
  const [ageRating, setAgeRating] = useState(undefined);
  
  // Age rating display
  const [enableAgeRating, setEnableAgeRating] = useState(false);
  const [showAgeRatingInGenres, setShowAgeRatingInGenres] = useState(true);
  const [showAgeRatingWithImdbRating, setShowAgeRatingWithImdbRating] = useState(false);

  // Load TMDB API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('tmdb_api_key');
    if (savedKey) {
      setTmdbApiKey(savedKey);
    }
  }, []);

  // Save TMDB API key to localStorage when it changes
  useEffect(() => {
    if (tmdbApiKey) {
      localStorage.setItem('tmdb_api_key', tmdbApiKey);
    } else {
      localStorage.removeItem('tmdb_api_key');
    }
  }, [tmdbApiKey]);

  // Load configuration from URL
  const loadConfigFromUrl = () => {
    try {
      const path = window.location.pathname.split('/')[1];
      if (!path || path === 'configure') return;

      const decompressed = decompressFromEncodedURIComponent(path);
      if (!decompressed) return;

      const config = JSON.parse(decompressed);

      // Apply configuration
      if (config.tmdbPrefix !== undefined) setTmdbPrefix(config.tmdbPrefix);
      if (config.includeAdult !== undefined) setIncludeAdult(config.includeAdult);
      if (config.ageRating) setAgeRating(config.ageRating);
      if (config.enableAgeRating !== undefined) setEnableAgeRating(config.enableAgeRating);
      if (config.showAgeRatingInGenres !== undefined) setShowAgeRatingInGenres(config.showAgeRatingInGenres);
      if (config.showAgeRatingWithImdbRating !== undefined) setShowAgeRatingWithImdbRating(config.showAgeRatingWithImdbRating);

      // Load catalog configuration
      if (config.catalogs && Array.isArray(config.catalogs)) {
        setCatalogs(prevCatalogs => {
          return prevCatalogs.map(catalog => {
            const savedCatalog = config.catalogs.find(
              c => c.id === catalog.id && c.type === catalog.type
            );
            
            if (savedCatalog) {
              return {
                ...catalog,
                enabled: savedCatalog.enabled || false,
                showInHome: savedCatalog.showInHome || false
              };
            }
            
            return catalog;
          });
        });
      }

      // Clear URL after loading
      window.history.replaceState({}, '', '/configure');
    } catch (error) {
      console.error('Error loading config from URL:', error);
    }
  };

  // Generate compressed configuration string
  const generateConfig = () => {
    const config = {
      catalogs: catalogs
        .filter(c => c.enabled)
        .map(c => ({
          id: c.id,
          type: c.type,
          showInHome: c.showInHome
          // NOTE: No need to send 'enabled' - already filtered by .filter(c => c.enabled)
        }))
    };

    // Only include optional settings if they differ from defaults
    if (tmdbApiKey) config.tmdbApiKey = tmdbApiKey;
    if (ageRating && ageRating !== 'NONE') config.ageRating = ageRating;
    
    // Convert booleans to strings for better compression (following mrcanelas pattern)
    if (tmdbPrefix === true) config.tmdbPrefix = "true";
    if (includeAdult === true) config.includeAdult = "true";
    if (hideEpisodeThumbnails === true) config.hideEpisodeThumbnails = "true";
    if (hideInCinemaTag === true) config.hideInCinemaTag = "true";
    if (searchEnabled === false) config.searchEnabled = "false"; // Only if disabled
    // Convert booleans to strings for better compression (following mrcanelas pattern)
    if (tmdbPrefix === true) config.tmdbPrefix = "true";
    if (includeAdult === true) config.includeAdult = "true";
    if (enableAgeRating === true) config.enableAgeRating = "true";
    if (showAgeRatingInGenres === false) config.showAgeRatingInGenres = "false";
    if (showAgeRatingWithImdbRating === true) config.showAgeRatingWithImdbRating = "true";
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:7006'
      : 'https://balkan-on-demand-828b9dd653f6.herokuapp.com';

    const configString = generateConfig();
    return `${baseUrl}/${configString}/manifest.json`;
  };

  const value = {
    // Catalogs
    catalogs,
    setCatalogs,
    
    // TMDB
    tmdbApiKey,
    setTmdbApiKey,
    tmdbPrefix,
    setTmdbPrefix,
    
    // Content
    includeAdult,
    setIncludeAdult,
    ageRating,
    setAgeRating,
    
    // Age rating display
    enableAgeRating,
    setEnableAgeRating,
    showAgeRatingInGenres,
    setShowAgeRatingInGenres,
    showAgeRatingWithImdbRating,
    setShowAgeRatingWithImdbRating,
    
    // Utilities
    loadConfigFromUrl,
    generateConfig,
    getManifestUrl
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
