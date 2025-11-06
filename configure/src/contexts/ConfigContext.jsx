import { createContext, useContext, useState, useEffect } from 'react';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { baseCatalogs, balkanCatalogs } from '../data/catalogs';

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
  // Language setting
  const [language, setLanguage] = useState('en-US');
  
  // Catalog configuration - combine all catalogs
  const allCatalogs = [...baseCatalogs, ...balkanCatalogs];
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
  
  // Display settings
  const [hideEpisodeThumbnails, setHideEpisodeThumbnails] = useState(false);
  const [hideInCinemaTag, setHideInCinemaTag] = useState(false);
  const [castCount, setCastCount] = useState(5);
  
  // Feature toggles
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [provideImdbId, setProvideImdbId] = useState(false);
  const [returnImdbId, setReturnImdbId] = useState(false);
  
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
      if (config.language) setLanguage(config.language);
      if (config.tmdbPrefix !== undefined) setTmdbPrefix(config.tmdbPrefix);
      if (config.includeAdult !== undefined) setIncludeAdult(config.includeAdult);
      if (config.ageRating) setAgeRating(config.ageRating);
      if (config.hideEpisodeThumbnails !== undefined) setHideEpisodeThumbnails(config.hideEpisodeThumbnails);
      if (config.hideInCinemaTag !== undefined) setHideInCinemaTag(config.hideInCinemaTag);
      if (config.castCount !== undefined) setCastCount(config.castCount === 'Unlimited' ? undefined : config.castCount);
      if (config.searchEnabled !== undefined) setSearchEnabled(config.searchEnabled);
      if (config.provideImdbId !== undefined) setProvideImdbId(config.provideImdbId);
      if (config.returnImdbId !== undefined) setReturnImdbId(config.returnImdbId);
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
      language,
      tmdbPrefix,
      includeAdult,
      hideEpisodeThumbnails,
      hideInCinemaTag,
      castCount: castCount === undefined ? 'Unlimited' : castCount,
      searchEnabled,
      provideImdbId,
      returnImdbId,
      enableAgeRating,
      showAgeRatingInGenres,
      showAgeRatingWithImdbRating,
      catalogs: catalogs
        .filter(c => c.enabled)
        .map(c => ({
          id: c.id,
          type: c.type,
          enabled: c.enabled,
          showInHome: c.showInHome
        }))
    };

    if (ageRating && ageRating !== 'NONE') {
      config.ageRating = ageRating;
    }

    return compressToEncodedURIComponent(JSON.stringify(config));
  };

  // Generate manifest URL
  const getManifestUrl = () => {
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:7006'
      : 'https://balkan-on-demand-828b9dd653f6.herokuapp.com';

    const configString = generateConfig();
    return `${baseUrl}/${configString}/manifest.json`;
  };

  const value = {
    // Language
    language,
    setLanguage,
    
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
    
    // Display
    hideEpisodeThumbnails,
    setHideEpisodeThumbnails,
    hideInCinemaTag,
    setHideInCinemaTag,
    castCount,
    setCastCount,
    
    // Features
    searchEnabled,
    setSearchEnabled,
    provideImdbId,
    setProvideImdbId,
    returnImdbId,
    setReturnImdbId,
    
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
