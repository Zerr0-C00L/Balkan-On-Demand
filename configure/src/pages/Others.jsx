import { useConfig } from '../contexts/ConfigContext';
import { ageRatings } from '../data/catalogs';

export function Others() {
  const {
    searchEnabled, setSearchEnabled,
    includeAdult, setIncludeAdult,
    provideImdbId, setProvideImdbId,
    returnImdbId, setReturnImdbId,
    tmdbPrefix, setTmdbPrefix,
    hideEpisodeThumbnails, setHideEpisodeThumbnails,
    hideInCinemaTag, setHideInCinemaTag,
    castCount, setCastCount,
    ageRating, setAgeRating,
    enableAgeRating, setEnableAgeRating,
    showAgeRatingInGenres, setShowAgeRatingInGenres,
    showAgeRatingWithImdbRating, setShowAgeRatingWithImdbRating
  } = useConfig();

  const selectedRating = ageRatings.find(rating => rating.id === ageRating);

  const Toggle = ({ checked, onChange, disabled = false }) => (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${disabled ? 'bg-gray-200 cursor-not-allowed' : checked ? 'bg-[#00d4ff]' : 'bg-gray-300'}
      `}
    >
      <span className={`
        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
        ${checked && !disabled ? 'translate-x-6' : 'translate-x-1'}
      `} />
    </button>
  );

  return (
    <div className="p-6 md:p-12 bg-gray-50 min-h-screen">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Other Settings</h1>
        <p className="text-gray-600 mb-8">Advanced configuration options</p>

        <div className="space-y-4">
          {/* Search Toggle */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Enable Search</h3>
                <p className="text-sm text-gray-600">
                  Allow searching for Ex-Yu movies and series in Stremio Discover
                </p>
              </div>
              <Toggle checked={searchEnabled} onChange={setSearchEnabled} />
            </div>
          </div>

          {/* Hide Episode Thumbnails */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Hide Episode Thumbnails</h3>
                <p className="text-sm text-gray-600">
                  Avoid spoilers by hiding episode preview images for series
                </p>
              </div>
              <Toggle checked={hideEpisodeThumbnails} onChange={setHideEpisodeThumbnails} />
            </div>
          </div>

          {/* Cast Count */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Cast Count</h3>
              <p className="text-sm text-gray-600 mb-4">
                Number of cast members to display in metadata (minimum 5, maximum 15, or Unlimited)
              </p>
              <select
                value={castCount === undefined ? 'Unlimited' : castCount}
                onChange={(e) => setCastCount(e.target.value === 'Unlimited' ? undefined : Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value="Unlimited">Unlimited</option>
              </select>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-[#00d4ff] rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">💡 About These Settings</h4>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              These settings are embedded in your addon configuration URL. When you install
              the addon from the Catalogs page, all your preferences will be preserved.
            </p>
            <p>
              <strong>Search:</strong> Enables searching through 681 Ex-Yu movies and 37 series directly in Stremio.
            </p>
            <p>
              <strong>Episode Thumbnails:</strong> Hide thumbnails to avoid spoilers for series episodes.
            </p>
            <p>
              <strong>Cast Count:</strong> Controls how many actors appear in the movie/series metadata. "Unlimited" shows all available cast members from Cinemeta enrichment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
