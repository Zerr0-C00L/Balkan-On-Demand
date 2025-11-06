import { useEffect, useState, useRef } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { 
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors 
} from '@dnd-kit/core';
import { 
  SortableContext,
  verticalListSortingStrategy,
  arrayMove 
} from '@dnd-kit/sortable';
import { SortableCatalogCard } from '../components/SortableCatalogCard';

export function Catalogs() {
  const { catalogs, setCatalogs, tmdbApiKey, getManifestUrl } = useConfig();
  const [installedUrl, setInstalledUrl] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleCatalogChange = (catalogId, type, enabled, showInHome) => {
    setCatalogs((prev) =>
      prev.map((c) =>
        c.id === catalogId && c.type === type
          ? { ...c, enabled, showInHome }
          : c
      )
    );
  };

  const handleDragEnd = (type) => (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCatalogs((prev) => {
      const typeCatalogs = prev.filter(c => c.type === type);
      const otherCatalogs = prev.filter(c => c.type !== type);
      
      const oldIndex = typeCatalogs.findIndex((c) => `${c.id}-${c.type}` === active.id);
      const newIndex = typeCatalogs.findIndex((c) => `${c.id}-${c.type}` === over.id);
      
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(typeCatalogs, oldIndex, newIndex);
      return [...reordered, ...otherCatalogs];
    });
  };

  const handleInstall = () => {
    const manifestUrl = getManifestUrl();
    const stremioUrl = manifestUrl.replace('http://', 'stremio://').replace('https://', 'stremio://');
    setInstalledUrl(manifestUrl);
    window.location.href = stremioUrl;
    setShowDropdown(false);
  };

  const handleInstallWeb = () => {
    const manifestUrl = getManifestUrl();
    setInstalledUrl(manifestUrl);
    window.open(manifestUrl, '_blank');
    setShowDropdown(false);
  };

  const handleCopyUrl = async () => {
    const manifestUrl = getManifestUrl();
    setInstalledUrl(manifestUrl);
    try {
      await navigator.clipboard.writeText(manifestUrl);
      alert('Manifest URL copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = manifestUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Manifest URL copied to clipboard!');
    }
    setShowDropdown(false);
  };

  const movieCatalogs = catalogs.filter(c => c.type === 'movie');
  const seriesCatalogs = catalogs.filter(c => c.type === 'series');

  const catalogConfigs = catalogs.reduce((acc, config) => {
    const key = `${config.id}-${config.type}`;
    acc[key] = {
      enabled: config.enabled,
      showInHome: config.showInHome,
    };
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-12 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Catalogs</h1>
        <p className="text-gray-600">Drag to reorder • Toggle to enable • Control home screen visibility</p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-[#00d4ff] rounded-lg p-4 mb-8">
        <h4 className="font-semibold text-gray-800 mb-2">📖 How Catalogs Work</h4>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Enable:</strong> Makes the catalog available in Discover (search). All enabled catalogs are searchable.
          </p>
          <p>
            <strong>Home:</strong> Shows the catalog on your Stremio home screen for quick browsing.
          </p>
          <p>
            <strong>TMDB Catalogs:</strong> Dynamic content from TMDB API - Popular, Year, Language, Trending, plus regional Balkan catalogs.
          </p>
          <p>
            <strong>Direct Catalogs:</strong> Our curated 3,800+ movies/series with instant HD streams from Bilosta CDN.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            💡 Drag catalogs to reorder them - your preferred order will appear in Stremio
          </p>
        </div>
      </div>

      {/* Catalog Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Movies Column */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <span>🎬</span> Movies
          </h2>
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd('movie')}
          >
            <SortableContext
              items={movieCatalogs.map((c) => `${c.id}-${c.type}`)}
              strategy={verticalListSortingStrategy}
            >
              {movieCatalogs.map((catalog) => (
                <SortableCatalogCard
                  key={`${catalog.id}-${catalog.type}`}
                  uniqueId={`${catalog.id}-${catalog.type}`}
                  catalog={catalog}
                  config={catalogConfigs[`${catalog.id}-${catalog.type}`]}
                  onChange={handleCatalogChange}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Series Column */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <span>📺</span> TV Shows
          </h2>
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd('series')}
          >
            <SortableContext
              items={seriesCatalogs.map((c) => `${c.id}-${c.type}`)}
              strategy={verticalListSortingStrategy}
            >
              {seriesCatalogs.map((catalog) => (
                <SortableCatalogCard
                  key={`${catalog.id}-${catalog.type}`}
                  uniqueId={`${catalog.id}-${catalog.type}`}
                  catalog={catalog}
                  config={catalogConfigs[`${catalog.id}-${catalog.type}`]}
                  onChange={handleCatalogChange}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Install Button */}
      <div className="mt-8 max-w-4xl mx-auto">
        {tmdbApiKey && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm">
            <span className="text-green-600">✓</span>
            <span className="text-green-800">TMDB API key configured - Enhanced metadata enabled</span>
          </div>
        )}
        
        <div className="relative" ref={dropdownRef}>
          <div className="flex">
            <button
              onClick={handleInstall}
              className="flex-1 bg-[#00d4ff] hover:bg-[#00b8e6] text-white font-bold py-4 px-6 rounded-l-lg text-lg transition-all duration-200 shadow-lg"
            >
              📥 Install
            </button>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="bg-[#00d4ff] hover:bg-[#00b8e6] text-white font-bold py-4 px-4 rounded-r-lg border-l border-white/20 transition-all duration-200 shadow-lg"
            >
              ▼
            </button>
          </div>

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-10">
              <button
                onClick={handleInstall}
                className="w-full text-left px-6 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium"
              >
                📥 Install
              </button>
              <button
                onClick={handleInstallWeb}
                className="w-full text-left px-6 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium border-t border-gray-100"
              >
                🌐 Install Web
              </button>
              <button
                onClick={handleCopyUrl}
                className="w-full text-left px-6 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium border-t border-gray-100"
              >
                📋 Copy URL
              </button>
            </div>
          )}
        </div>

        {installedUrl && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow">
            <p className="text-xs text-gray-600 mb-2">Manifest URL:</p>
            <p className="text-sm font-mono text-[#00d4ff] break-all">{installedUrl}</p>
            <p className="text-xs text-gray-500 mt-2">
              This URL contains your compressed configuration. You can bookmark it or share it.
            </p>
          </div>
        )}

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>
            💡 Your configuration is compressed and embedded in the install URL.<br />
            All enabled catalogs are searchable; "Home" catalogs appear on your home screen.
          </p>
        </div>
      </div>
    </div>
  );
}
