import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableCatalogCard({ catalog, config, onChange, uniqueId }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: uniqueId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isEnabled = config?.enabled || false;
  const showInHome = config?.showInHome || false;

  // Determine icon based on catalog source
  const getIcon = () => {
    if (catalog.id.startsWith('tmdb.bosnian')) return '🇧🇦';
    if (catalog.id.startsWith('tmdb.croatian')) return '🇭🇷';
    if (catalog.id.startsWith('tmdb.serbian')) return '🇷🇸';
    if (catalog.id.startsWith('tmdb.')) return '🎬';
    if (catalog.id.startsWith('bilosta.')) return '⭐';
    return '📺';
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <div className={`
        p-4 rounded-lg border-2 transition-all duration-200
        ${isEnabled 
          ? 'bg-[#00d4ff]/10 border-[#00d4ff] shadow-md' 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow'
        }
      `}>
        <div className="flex items-center justify-between">
          {/* Left side: Drag handle + Info */}
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </button>

            {/* Icon */}
            <div className="text-2xl">{getIcon()}</div>

            {/* Catalog Info */}
            <div>
              <div className="font-semibold text-gray-800 flex items-center gap-2">
                {catalog.name}
                <span className={`text-xs px-2 py-0.5 rounded ${
                  catalog.type === 'movie' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {catalog.type === 'movie' ? 'Movie' : 'Series'}
                </span>
              </div>
              {catalog.description && (
                <div className="text-sm text-gray-600">{catalog.description}</div>
              )}
            </div>
          </div>

          {/* Right side: Toggles */}
          <div className="flex items-center gap-4">
            {/* Enable Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Enable</span>
              <button
                onClick={() => onChange(catalog.id, catalog.type, !isEnabled, showInHome && !isEnabled ? false : showInHome)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${isEnabled ? 'bg-[#00d4ff]' : 'bg-gray-300'}
                `}
              >
                <span className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
                `} />
              </button>
            </div>

            {/* Show in Home Toggle */}
            <div className="flex items-center gap-2">
              <span className={`text-sm ${!isEnabled ? 'text-gray-400' : 'text-gray-600'}`}>Home</span>
              <button
                onClick={() => onChange(catalog.id, catalog.type, isEnabled, !showInHome)}
                disabled={!isEnabled}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${!isEnabled ? 'bg-gray-200 cursor-not-allowed' : showInHome ? 'bg-[#00d4ff]' : 'bg-gray-300'}
                `}
              >
                <span className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${showInHome && isEnabled ? 'translate-x-6' : 'translate-x-1'}
                `} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
