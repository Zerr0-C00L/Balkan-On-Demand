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
                  Allow searching for movies and TV shows in Stremio Discover
                </p>
              </div>
              <Toggle checked={searchEnabled} onChange={setSearchEnabled} />
            </div>
          </div>

          {/* Adult Content Toggle */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Include Adult Content</h3>
                <p className="text-sm text-gray-600">
                  Include adult content in search results and catalogs
                </p>
              </div>
              <Toggle checked={includeAdult} onChange={setIncludeAdult} />
            </div>
          </div>

          {/* IMDb ID Options */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Provide IMDb IDs</h3>
                  <p className="text-sm text-gray-600">
                    Include items with IMDb IDs when handling metadata requests
                  </p>
                </div>
                <Toggle checked={provideImdbId} onChange={setProvideImdbId} />
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Return IMDb IDs Only</h3>
                  <p className="text-sm text-gray-600">
                    Return only items with IMDb IDs in catalogues for better integration
                  </p>
                </div>
                <Toggle checked={returnImdbId} onChange={setReturnImdbId} />
              </div>
            </div>
          </div>

          {/* TMDB Prefix Toggle */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Use TMDB Prefix</h3>
                <p className="text-sm text-gray-600">
                  Add "TMDB -" prefix to all catalog names for better organization
                </p>
              </div>
              <Toggle checked={tmdbPrefix} onChange={setTmdbPrefix} />
            </div>
          </div>

          {/* Hide Episode Thumbnails */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Hide Episode Thumbnails</h3>
                <p className="text-sm text-gray-600">
                  Avoid spoilers by hiding episode preview images
                </p>
              </div>
              <Toggle checked={hideEpisodeThumbnails} onChange={setHideEpisodeThumbnails} />
            </div>
          </div>

          {/* Hide In Cinema Tag */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Hide 'In Cinema' Tag</h3>
                <p className="text-sm text-gray-600">
                  Hide the "In Cinema" tag from posters for cleaner look
                </p>
              </div>
              <Toggle checked={hideInCinemaTag} onChange={setHideInCinemaTag} />
            </div>
          </div>

          {/* Cast Count */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Cast Count</h3>
              <p className="text-sm text-gray-600 mb-4">
                Number of cast members to display (minimum 5, maximum 15, or Unlimited)
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

          {/* Age Rating Selection */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Age Rating Filter</h3>
                <div className="flex items-center text-xs text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Not available for trending catalogs
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Filter content by age rating (US certification system)
              </p>
              <select
                value={ageRating || 'NONE'}
                onChange={(e) => setAgeRating(e.target.value === 'NONE' ? undefined : e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent outline-none"
              >
                {ageRatings.map((rating) => (
                  <option key={rating.id} value={rating.id}>
                    {rating.badge.text} - {rating.name}
                  </option>
                ))}
              </select>
              {selectedRating && (
                <p className="mt-2 text-xs text-gray-600">
                  {selectedRating.description}
                </p>
              )}
            </div>
          </div>

          {/* Age Rating Display Options */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Enable Age Rating Display</h3>
                  <p className="text-sm text-gray-600">
                    Fetch and attach the content rating to metadata
                  </p>
                </div>
                <Toggle checked={enableAgeRating} onChange={setEnableAgeRating} />
              </div>

              {/* Conditional sub-options */}
              {enableAgeRating && (
                <>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <h3 className="text-base font-medium text-gray-800 mb-1">Show in Genres</h3>
                      <p className="text-sm text-gray-600">
                        Insert the age rating as the first genre entry
                      </p>
                    </div>
                    <Toggle checked={showAgeRatingInGenres} onChange={setShowAgeRatingInGenres} />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <h3 className="text-base font-medium text-gray-800 mb-1">Show with IMDb Rating</h3>
                      <p className="text-sm text-gray-600">
                        Append the age rating next to the IMDb score
                      </p>
                    </div>
                    <Toggle checked={showAgeRatingWithImdbRating} onChange={setShowAgeRatingWithImdbRating} />
                  </div>
                </>
              )}
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
              <strong>Age Rating:</strong> Based on US MPAA ratings. Filters content at the TMDB API level.
            </p>
            <p>
              <strong>IMDb IDs:</strong> Useful for integrating with other addons that rely on IMDb identifiers.
            </p>
            <p>
              <strong>Cast Count:</strong> Controls how many actors appear in the metadata. "Unlimited" shows all available cast members.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
