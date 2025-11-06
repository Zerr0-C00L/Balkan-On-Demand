import { useState, useEffect } from 'react'

const catalogs = [
  {
    id: 'tmdb_balkan_movies',
    name: '�🇦 Bosnian Movies',
    description: 'TMDB-powered Bosnian cinema',
    type: 'movie',
    source: 'tmdb'
  },
  {
    id: 'tmdb_croatian_movies',
    name: '�🇷 Croatian Movies',
    description: 'TMDB-powered Croatian cinema',
    type: 'movie',
    source: 'tmdb'
  },
  {
    id: 'tmdb_serbian_series',
    name: '�🇸 Serbian TV Series',
    description: 'TMDB-powered Serbian shows',
    type: 'series',
    source: 'tmdb'
  },
  {
    id: 'bilosta_direct_movies',
    name: '⭐ Direct HD Movies',
    description: 'Curated HD movie collection',
    type: 'movie',
    source: 'bilosta'
  },
  {
    id: 'bilosta_direct_series',
    name: '📺 Direct HD Series',
    description: 'Curated series collection',
    type: 'series',
    source: 'bilosta'
  }
]

// Sidebar Component
function Sidebar({ currentPage, setCurrentPage, isMobileOpen, setIsMobileOpen, selectedCatalogs, tmdbApiKey }) {
  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'catalogs', label: 'Catalogs', icon: '📚' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  const getManifestUrl = () => {
    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:7006'
      : 'https://balkan-on-demand-828b9dd653f6.herokuapp.com'

    const configParts = []
    
    // Add catalog selection - always include home parameter to indicate user configuration
    if (selectedCatalogs.length === 0) {
      // No catalogs selected for home - all will be Discover only
      configParts.push(`home=none`)
    } else if (selectedCatalogs.length > 0 && selectedCatalogs.length < catalogs.length) {
      configParts.push(`home=${selectedCatalogs.join(',')}`)
    } else if (selectedCatalogs.length === catalogs.length) {
      configParts.push(`home=${catalogs.map(c => c.id).join(',')}`)
    }
    
    // Add TMDB API key if set
    if (tmdbApiKey && tmdbApiKey !== '') {
      configParts.push(`tmdb=${encodeURIComponent(tmdbApiKey)}`)
    }
    
    if (configParts.length === 0) {
      return `${baseUrl}/manifest.json`
    }
    
    return `${baseUrl}/${configParts.join('&')}/manifest.json`
  }

  const handleInstall = () => {
    const manifestUrl = getManifestUrl()
    const stremioUrl = manifestUrl.replace('http://', 'stremio://').replace('https://', 'stremio://')
    window.location.href = stremioUrl
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0d253f] transform transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex flex-col h-full py-6">
          {/* Logo */}
          <div className="px-6 mb-10">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              <h1 className="text-xl font-bold text-white">Balkan HD Streams</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">v6.0.0</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setCurrentPage(item.id)
                      setIsMobileOpen(false)
                    }}
                    className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="mr-3 text-xl">{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Install Button */}
          <div className="px-6 mt-auto mb-3">
            <button
              onClick={handleInstall}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#00d4ff] hover:bg-[#00b8e6] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <span>📥</span>
              <span>Install Addon</span>
            </button>
          </div>

          {/* Ko-fi Button */}
          <div className="px-6">
            <a
              href="https://ko-fi.com/ZeroQ"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#FF5E5B] hover:bg-[#ff4845] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <span>☕</span>
              <span>Support me</span>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

// Home Page
function HomePage() {
  const [stats, setStats] = useState({
    tmdbCatalogs: 3,
    directMovies: 3848,
    directSeries: 37,
    totalContent: 'Unlimited via TMDB'
  })

  // Fetch real-time stats from server (if available)
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        // Update stats if API returns data
        if (data) {
          setStats({
            tmdbCatalogs: 3, // Fixed: 3 TMDB catalogs
            directMovies: data.movies || 3848,
            directSeries: data.series || 37,
            totalContent: 'Unlimited'
          })
        }
      })
      .catch(err => {
        // Use default stats if API fails
        console.log('Using default stats (API not available)')
      })
  }, [])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.metahub.space/background/medium/tt0816692/img)',
          filter: 'brightness(0.3)'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
          Balkan HD Streams
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          TMDB-powered catalogs with Direct HD streams for Balkan content
        </p>
        <p className="text-lg text-gray-400 mb-12">
          Version 6.0.0
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="text-3xl font-bold text-[#00d4ff] mb-2">{stats.tmdbCatalogs}</div>
            <div className="text-sm text-gray-300">TMDB Catalogs</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="text-3xl font-bold text-[#00d4ff] mb-2">{stats.directMovies.toLocaleString()}</div>
            <div className="text-sm text-gray-300">Direct HD Movies</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="text-3xl font-bold text-[#00d4ff] mb-2">{stats.directSeries}</div>
            <div className="text-sm text-gray-300">Direct HD Series</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="text-3xl font-bold text-[#00d4ff] mb-2">∞</div>
            <div className="text-sm text-gray-300">Via TMDB</div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-left">
            <h3 className="text-xl font-semibold text-white mb-2">🎬 TMDB-Powered Catalogs</h3>
            <p className="text-gray-300">
              Browse Bosnian, Croatian, and Serbian content with full TMDB metadata: ratings, cast, trailers, and more.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-left">
            <h3 className="text-xl font-semibold text-white mb-2">⭐ Direct HD Streams</h3>
            <p className="text-gray-300">
              Instant playback with direct CDN links. No torrents, no waiting - just pure streaming quality.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Settings Page
function SettingsPage({ tmdbApiKey, setTmdbApiKey }) {
  const [localKey, setLocalKey] = useState(tmdbApiKey)
  const [tmdbSaved, setTmdbSaved] = useState(false)
  const [tmdbTestResult, setTmdbTestResult] = useState(null)

  const handleSave = () => {
    setTmdbApiKey(localKey)
    setTmdbSaved(true)
    setTimeout(() => setTmdbSaved(false), 2000)
  }

  const handleTest = async () => {
    if (!localKey) {
      setTmdbTestResult({ 
        success: false, 
        message: '❌ Please enter an API key first' 
      })
      return
    }

    setTmdbTestResult({ 
      success: null, 
      message: '🔄 Testing...' 
    })

    try {
      const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${localKey}`)
      
      if (response.ok) {
        setTmdbTestResult({ 
          success: true, 
          message: '✅ API key is valid!' 
        })
      } else {
        setTmdbTestResult({ 
          success: false, 
          message: '❌ Invalid API key' 
        })
      }
    } catch (error) {
      setTmdbTestResult({ 
        success: false, 
        message: `❌ Error: ${error.message}` 
      })
    }
  }

  return (
    <div className="p-6 md:p-12 bg-gray-50 min-h-screen">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Settings</h1>
        <p className="text-gray-600 mb-8">Configure your addon settings and API keys</p>

        {/* TMDB API Key Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🎬 TMDB API Key</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Add your TMDB API key to enable metadata scraping for better descriptions, cast info, and ratings.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder="Enter your TMDB API key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-[#00d4ff] hover:bg-[#00b8e6] text-white font-semibold rounded-lg transition-colors"
                >
                  {tmdbSaved ? '✓ Saved!' : 'Save'}
                </button>
                <button
                  onClick={handleTest}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                >
                  Test Key
                </button>
              </div>

              {tmdbTestResult && (
                <div className={`p-4 rounded-lg ${
                  tmdbTestResult.success === null ? 'bg-blue-50 text-blue-800' :
                  tmdbTestResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {tmdbTestResult.message}
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">📖 How to get your TMDB API key:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>
                Go to{' '}
                <a 
                  href="https://www.themoviedb.org/signup" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#00d4ff] hover:underline"
                >
                  themoviedb.org/signup
                </a>
                {' '}and create a free account
              </li>
              <li>
                Navigate to Settings → API → Request an API Key
              </li>
              <li>Choose "Developer" option and fill out the form</li>
              <li>Copy your API key (v3 auth) and paste it above</li>
              <li>Click "Test Key" to verify it works</li>
            </ol>
          </div>

          {/* Usage Instructions */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">🚀 Usage:</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">Set your TMDB API key as an environment variable for the server:</p>
              <code className="block bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                export TMDB_API_KEY="{localKey || 'your_key_here'}"<br/>
                node addon-tmdb-catalogs.js
              </code>
              <p className="text-xs text-gray-600 mt-2">
                The addon will use TMDB API to fetch Balkan content catalogs in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50 border-l-4 border-[#00d4ff] rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">💡 How it works</h4>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              Your TMDB API key can be embedded in the addon installation URL. When you install 
              the addon from the Catalogs page, your key will be included automatically.
            </p>
            <p>
              <strong>Note:</strong> The key is stored in your browser and embedded in your personal 
              addon URL. You can run the metadata scraper separately to enrich content.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Catalogs Page
function CatalogsPage({ selectedCatalogs, setSelectedCatalogs, tmdbApiKey }) {
  const [installedUrl, setInstalledUrl] = useState('')
  
  const catalogsWithStats = catalogs

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

    const configParts = []
    
    // Add catalog selection - always include home parameter to indicate user configuration
    if (selectedCatalogs.length === 0) {
      // No catalogs selected for home - all will be Discover only
      configParts.push(`home=none`)
    } else if (selectedCatalogs.length > 0 && selectedCatalogs.length < catalogs.length) {
      configParts.push(`home=${selectedCatalogs.join(',')}`)
    } else if (selectedCatalogs.length === catalogs.length) {
      configParts.push(`home=${catalogs.map(c => c.id).join(',')}`)
    }
    
    // Add TMDB API key if set
    if (tmdbApiKey && tmdbApiKey !== '') {
      configParts.push(`tmdb=${encodeURIComponent(tmdbApiKey)}`)
    }
    
    if (configParts.length === 0) {
      return `${baseUrl}/manifest.json`
    }
    
    return `${baseUrl}/${configParts.join('&')}/manifest.json`
  }

  const handleInstall = () => {
    const manifestUrl = getManifestUrl()
    const stremioUrl = manifestUrl.replace('http://', 'stremio://').replace('https://', 'stremio://')
    setInstalledUrl(manifestUrl)
    window.location.href = stremioUrl
  }

  const movieCatalogs = catalogsWithStats.filter(c => c.type === 'movie')
  const seriesCatalogs = catalogsWithStats.filter(c => c.type === 'series')

  return (
    <div className="p-6 md:p-12 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Catalogs</h1>
        <p className="text-gray-600">Select which catalogs to show on your Stremio home screen</p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-[#00d4ff] rounded-lg p-4 mb-8">
        <h4 className="font-semibold text-gray-800 mb-2">🎬 How it Works</h4>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>TMDB Catalogs:</strong> Browse Bosnian, Croatian & Serbian content with full metadata from TMDB.</p>
          <p><strong>Direct Catalogs:</strong> Our curated HD collection with instant streaming links.</p>
          <p><strong>Smart Matching:</strong> When you watch Balkan content from any addon, we automatically provide Direct HD streams if available.</p>
          <p className="text-xs text-gray-600 mt-2">
            ⚠️ Note: TMDB API key required for TMDB-powered catalogs. Set it in Settings.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* TMDB Catalogs Section */}
        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">🎬 TMDB-Powered Catalogs</h2>
          <p className="text-sm text-gray-600 mb-4">Full metadata from TMDB with smart stream matching</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {catalogsWithStats.filter(c => c.source === 'tmdb').map((catalog) => {
              const isSelected = selectedCatalogs.includes(catalog.id)
              
              return (
                <div
                  key={catalog.id}
                  onClick={() => toggleCatalog(catalog.id)}
                  className={`
                    p-4 rounded-lg cursor-pointer transition-all duration-200 border-2
                    ${isSelected 
                      ? 'bg-[#00d4ff]/10 border-[#00d4ff] shadow-md' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-6 h-6 rounded border-2 flex items-center justify-center
                        ${isSelected ? 'bg-[#00d4ff] border-[#00d4ff]' : 'border-gray-400'}
                      `}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{catalog.name}</div>
                        <div className="text-sm text-gray-600">{catalog.description}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Direct HD Catalogs Section */}
        <div>
          <h2 className="text-xl font-semibold mb-2 text-gray-800">⭐ Direct HD Catalogs</h2>
          <p className="text-sm text-gray-600 mb-4">Curated collection with instant streaming</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {catalogsWithStats.filter(c => c.source === 'bilosta').map((catalog) => {
              const isSelected = selectedCatalogs.includes(catalog.id)
              
              return (
                <div
                  key={catalog.id}
                  onClick={() => toggleCatalog(catalog.id)}
                  className={`
                    p-4 rounded-lg cursor-pointer transition-all duration-200 border-2
                    ${isSelected 
                      ? 'bg-[#00d4ff]/10 border-[#00d4ff] shadow-md' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-6 h-6 rounded border-2 flex items-center justify-center
                        ${isSelected ? 'bg-[#00d4ff] border-[#00d4ff]' : 'border-gray-400'}
                      `}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{catalog.name}</div>
                        <div className="text-sm text-gray-600">{catalog.description}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legacy two-column layout (hidden) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 hidden">
        {/* Movies Column */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Movies</h2>
          <div className="space-y-3">
            {movieCatalogs.map((catalog) => {
              const isSelected = selectedCatalogs.includes(catalog.id)
              
              return (
                <div
                  key={catalog.id}
                  onClick={() => toggleCatalog(catalog.id)}
                  className={`
                    p-4 rounded-lg cursor-pointer transition-all duration-200 border-2
                    ${isSelected 
                      ? 'bg-[#00d4ff]/10 border-[#00d4ff] shadow-md' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-6 h-6 rounded border-2 flex items-center justify-center
                        ${isSelected ? 'bg-[#00d4ff] border-[#00d4ff]' : 'border-gray-400'}
                      `}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{catalog.name}</div>
                        <div className="text-sm text-gray-600">{catalog.description}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Series Column */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">TV Shows</h2>
          <div className="space-y-3">
            {seriesCatalogs.map((catalog) => {
              const isSelected = selectedCatalogs.includes(catalog.id)
              
              return (
                <div
                  key={catalog.id}
                  onClick={() => toggleCatalog(catalog.id)}
                  className={`
                    p-4 rounded-lg cursor-pointer transition-all duration-200 border-2
                    ${isSelected 
                      ? 'bg-[#00d4ff]/10 border-[#00d4ff] shadow-md' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-6 h-6 rounded border-2 flex items-center justify-center
                        ${isSelected ? 'bg-[#00d4ff] border-[#00d4ff]' : 'border-gray-400'}
                      `}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{catalog.name}</div>
                        <div className="text-sm text-gray-600">{catalog.description}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
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
        
        <button
          onClick={handleInstall}
          className="w-full bg-[#00d4ff] hover:bg-[#00b8e6] text-white font-bold py-4 px-6 rounded-lg text-lg transition-all duration-200 hover:scale-[1.02] shadow-lg"
        >
          📥 Install Addon
        </button>

        {installedUrl && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow">
            <p className="text-xs text-gray-600 mb-2">Manifest URL:</p>
            <p className="text-sm font-mono text-[#00d4ff] break-all">{installedUrl}</p>
          </div>
        )}

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>
            💡 All catalogs are always searchable in Discover.<br />
            This only controls what appears on your home screen.
          </p>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [selectedCatalogs, setSelectedCatalogs] = useState(
    [] // Empty by default - catalogs disabled, users enable if they want
  )
  const [tmdbApiKey, setTmdbApiKey] = useState(
    localStorage.getItem('tmdb_api_key') || ''
  )

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'catalogs':
        return <CatalogsPage selectedCatalogs={selectedCatalogs} setSelectedCatalogs={setSelectedCatalogs} tmdbApiKey={tmdbApiKey} />
      case 'settings':
        return <SettingsPage tmdbApiKey={tmdbApiKey} setTmdbApiKey={setTmdbApiKey} />
      default:
        return <HomePage />
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        selectedCatalogs={selectedCatalogs}
        tmdbApiKey={tmdbApiKey}
      />
      
      <div className="md:pl-64 min-h-screen">
        {/* Mobile Header */}
        {currentPage !== 'home' && (
          <header className="md:hidden bg-white p-4 shadow-sm sticky top-0 z-20">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </header>
        )}
        
        {renderPage()}
      </div>
    </div>
  )
}

export default App
