import { useState } from 'react'
import { compressToEncodedURIComponent } from 'lz-string'

// Ko-fi Button Component
const KoFiButton = ({ username }) => {
  return (
    <a
      href={`https://ko-fi.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-[#FF5E5B] hover:bg-[#ff4845] text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 whitespace-nowrap shadow-lg"
    >
      <span>☕</span>
      <span>Support</span>
    </a>
  )
}

const catalogs = [
  {
    id: 'balkan_movies',
    name: '🎬 Filmovi',
    description: '1,364 Ex-YU movies',
    type: 'movie'
  },
  {
    id: 'balkan_foreign_movies',
    name: '🌍 Strani Filmovi',
    description: '1,076 International films',
    type: 'movie'
  },
  {
    id: 'balkan_kids',
    name: '🎨 Crtani Filmovi',
    description: '374 Animated films',
    type: 'movie'
  },
  {
    id: 'balkan_series',
    name: '📺 Serije',
    description: '37 TV series',
    type: 'series'
  }
]

function App() {
  const [selectedCatalogs, setSelectedCatalogs] = useState(
    catalogs.map(cat => cat.id)
  )
  const [installedUrl, setInstalledUrl] = useState('')

  const toggleCatalog = (catalogId) => {
    setSelectedCatalogs(prev => 
      prev.includes(catalogId)
        ? prev.filter(id => id !== catalogId)
        : [...prev, catalogId]
    )
  }

  const getManifestUrl = () => {
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:7005'
      : 'https://balkan-on-demand-828b9dd653f6.herokuapp.com'

    if (selectedCatalogs.length === 0) {
      return `${baseUrl}/manifest.json`
    }

    if (selectedCatalogs.length === catalogs.length) {
      // All catalogs selected - use simple format
      return `${baseUrl}/home=${catalogs.map(c => c.id).join(',')}/manifest.json`
    }

    // Custom selection
    const config = `home=${selectedCatalogs.join(',')}`
    return `${baseUrl}/${config}/manifest.json`
  }

  const handleInstall = () => {
    const manifestUrl = getManifestUrl()
    const stremioUrl = manifestUrl.replace('http://', 'stremio://').replace('https://', 'stremio://')
    setInstalledUrl(manifestUrl)
    window.location.href = stremioUrl
  }

  return (
    <div className="min-h-screen text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-3">
            🎬 Balkan On Demand
          </h1>
          <p className="text-xl text-gray-300 mb-2">v5.2.0</p>
          <p className="text-gray-400">
            Movies & Series from Serbia, Croatia & Bosnia
          </p>
        </div>

        {/* Stats */}
        <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-6 mb-8 text-center">
          <h3 className="text-lg font-semibold mb-3 text-primary">📊 Content Library</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-primary">1,364</div>
              <div className="text-sm text-gray-400">Ex-YU Movies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">1,076</div>
              <div className="text-sm text-gray-400">Foreign Movies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">374</div>
              <div className="text-sm text-gray-400">Cartoons</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">37</div>
              <div className="text-sm text-gray-400">Series</div>
            </div>
          </div>
        </div>

        {/* Ko-fi Support Banner */}
        <a 
          href="https://ko-fi.com/ZeroQ" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block mb-8 rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-200 shadow-2xl"
        >
          <img 
            src="/kofi-banner.jpg" 
            alt="Support ZeroQ on Ko-fi" 
            className="w-full h-auto"
          />
        </a>

        {/* Main Configuration */}
        <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-2">Configure Catalogs</h2>
              <p className="text-gray-400 text-sm">
                Select which catalogs to show on your Stremio home screen
              </p>
            </div>
            <KoFiButton username="ZeroQ" />
          </div>

          {/* Info Box */}
          <div className="bg-background/50 border-l-4 border-primary rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-primary mb-2">🏠 What's the difference?</h4>
            <div className="text-sm text-gray-300 space-y-1">
              <p><strong>Selected (✓):</strong> Catalog appears on your Stremio home screen with browsable content</p>
              <p><strong>Unselected:</strong> Catalog only available through search (Discover section)</p>
            </div>
          </div>

          {/* Catalog List */}
          <div className="space-y-3 mb-6">
            {catalogs.map((catalog) => {
              const isSelected = selectedCatalogs.includes(catalog.id)
              
              return (
                <div
                  key={catalog.id}
                  onClick={() => toggleCatalog(catalog.id)}
                  className={`
                    flex items-center justify-between p-4 rounded-lg cursor-pointer
                    transition-all duration-200 hover:scale-[1.02]
                    ${isSelected 
                      ? 'bg-primary/20 border-2 border-primary' 
                      : 'bg-background/50 border-2 border-gray-600 hover:border-gray-500'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-6 h-6 rounded border-2 flex items-center justify-center
                      ${isSelected ? 'bg-primary border-primary' : 'border-gray-500'}
                    `}>
                      {isSelected && (
                        <svg className="w-4 h-4 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{catalog.name}</div>
                      <div className="text-sm text-gray-400">{catalog.description}</div>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Install Button */}
          <button
            onClick={handleInstall}
            className="w-full bg-primary hover:bg-primary/90 text-background font-bold py-4 px-6 rounded-lg text-lg transition-all duration-200 hover:scale-[1.02] shadow-lg"
          >
            📥 Install Addon
          </button>

          {/* Manifest URL */}
          {installedUrl && (
            <div className="mt-4 p-4 bg-background/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">Manifest URL:</p>
              <p className="text-sm font-mono text-primary break-all">{installedUrl}</p>
            </div>
          )}

          {/* Note */}
          <div className="mt-6 text-center text-sm text-gray-400">
            <p>
              💡 All catalogs are always searchable in Discover.<br />
              This only controls what appears on your home screen.
            </p>
          </div>
        </div>

        {/* Quick Install */}
        <div className="bg-secondary/30 backdrop-blur-sm rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold mb-3 text-primary">⚡ Quick Install</h3>
          <p className="text-gray-400 mb-4 text-sm">
            Want everything on your home screen?
          </p>
          <a
            href={`stremio://${getManifestUrl().replace('http://', '').replace('https://', '')}`}
            className="inline-block bg-accent hover:bg-accent/80 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-[1.02]"
          >
            📺 Install All Catalogs
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="bg-secondary/30 backdrop-blur-sm rounded-xl p-6 mb-4">
            <p className="text-gray-300 mb-4">
              Made with ❤️ for the Balkan community
            </p>
            <a 
              href="https://ko-fi.com/ZeroQ" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#FF5E5B] hover:bg-[#ff4845] text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <span className="text-2xl">☕</span>
              <span>Support on Ko-fi</span>
            </a>
          </div>
          <p className="text-sm text-gray-500">
            v5.2.0 • Free & Open Source
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
