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
  const { catalogs, setCatalogs } = useConfig();

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
            <strong className="text-green-700">✅ Working Now:</strong> Direct HD catalogs (3,848 movies, 37 series) work immediately with direct streaming.
          </p>
          <p>
            <strong className="text-yellow-700">🚧 Coming Soon:</strong> TMDB catalogs (Popular, Year, Language, Trending) require API integration - in development.
          </p>
          <p className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
            <strong className="text-purple-900">💡 After changing settings:</strong> Click <strong>"📥 Install"</strong> in the sidebar to update your addon!
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
    </div>
  );
}
