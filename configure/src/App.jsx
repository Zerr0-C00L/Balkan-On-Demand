import { useState, useEffect } from 'react'

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

// Sidebar Component
function Sidebar({ currentPage, setCurrentPage, isMobileOpen, setIsMobileOpen }) {
  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'catalogs', label: 'Catalogs', icon: '📚' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]

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
              <h1 className="text-xl font-bold text-white">Balkan On Demand</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">v5.2.0</p>
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

          {/* Ko-fi Button */}
          <div className="px-6 mt-6">
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
    movies: 1364,
    foreign: 1076,
    kids: 374,
    series: 37
  })

  // Fetch real-time stats from server
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Failed to load stats:', err))
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
          Balkan On Demand
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          Explore a vast catalog of movies and TV shows from Serbia, Croatia & Bosnia.
        </p>
        <p className="text-lg text-gray-400 mb-12">
          Version 5.2.0
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="text-3xl font-bold text-[#00d4ff] mb-2">{stats.movies.toLocaleString()}</div>
            <div className="text-sm text-gray-300">Ex-YU Movies</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="text-3xl font-bold text-[#00d4ff] mb-2">{stats.foreign.toLocaleString()}</div>
            <div className="text-sm text-gray-300">Foreign Movies</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="text-3xl font-bold text-[#00d4ff] mb-2">{stats.kids.toLocaleString()}</div>
            <div className="text-sm text-gray-300">Cartoons</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="text-3xl font-bold text-[#00d4ff] mb-2">{stats.series.toLocaleString()}</div>
            <div className="text-sm text-gray-300">Series</div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-left">
            <h3 className="text-xl font-semibold text-white mb-2">Movies</h3>
            <p className="text-gray-300">
              Access detailed information about thousands of movies from the Balkans and beyond.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-left">
            <h3 className="text-xl font-semibold text-white mb-2">TV Shows</h3>
            <p className="text-gray-300">
              Explore TV series, seasons, episodes, and stay up to date with your favorite shows.
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
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleSave = () => {
    setTmdbApiKey(localKey)
    localStorage.setItem('tmdb_api_key', localKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleTest = async () => {
    if (!localKey || localKey === 'YOUR_TMDB_API_KEY_HERE') {
      setTestResult({ success: false, message: 'Please enter a valid API key' })
      return
    }

    setTestResult({ success: null, message: 'Testing...' })
    
    try {
      const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${localKey}`)
      const data = await response.json()
      
      if (response.ok) {
        setTestResult({ 
          success: true, 
          message: '✅ API key is valid! Your TMDB integration is working.' 
        })
      } else {
        setTestResult({ 
          success: false, 
          message: `❌ ${data.status_message || 'Invalid API key'}` 
        })
      }
    } catch (error) {
      setTestResult({ 
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
                  {saved ? '✓ Saved!' : 'Save'}
                </button>
                <button
                  onClick={handleTest}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                >
                  Test Key
                </button>
              </div>

              {testResult && (
                <div className={`p-4 rounded-lg ${
                  testResult.success === null ? 'bg-blue-50 text-blue-800' :
                  testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {testResult.message}
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
              <p className="text-sm text-gray-700 mb-2">Once you've saved your API key, run the metadata scraper:</p>
              <code className="block bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                export TMDB_API_KEY="{localKey || 'your_key_here'}"<br/>
                node scrape-tmdb-metadata.js
              </code>
              <p className="text-xs text-gray-600 mt-2">
                The scraper will use the environment variable to authenticate with TMDB.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50 border-l-4 border-[#00d4ff] rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">💡 What does this do?</h4>
          <p className="text-sm text-gray-700">
            The TMDB scraper will search TMDB for all your titles and extract metadata like descriptions, 
            cast, genres, and ratings. This data is saved locally and used to enhance your addon's content 
            without making API calls during runtime.
          </p>
        </div>
      </div>
    </div>
  )
}

// Catalogs Page
function CatalogsPage({ selectedCatalogs, setSelectedCatalogs }) {
  const [installedUrl, setInstalledUrl] = useState('')
  const [stats, setStats] = useState({
    movies: 1364,
    foreign: 1076,
    kids: 374,
    series: 37
  })

  // Fetch real-time stats from server
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Failed to load stats:', err))
  }, [])

  // Update catalog descriptions with real stats
  const catalogsWithStats = catalogs.map(cat => {
    let description = cat.description
    switch(cat.id) {
      case 'balkan_movies':
        description = `${stats.movies.toLocaleString()} Ex-YU movies`
        break
      case 'balkan_foreign_movies':
        description = `${stats.foreign.toLocaleString()} International films`
        break
      case 'balkan_kids':
        description = `${stats.kids.toLocaleString()} Animated films`
        break
      case 'balkan_series':
        description = `${stats.series.toLocaleString()} TV series`
        break
    }
    return { ...cat, description }
  })

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
      return `${baseUrl}/home=${catalogs.map(c => c.id).join(',')}/manifest.json`
    }

    const config = `home=${selectedCatalogs.join(',')}`
    return `${baseUrl}/${config}/manifest.json`
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
        <h4 className="font-semibold text-gray-800 mb-2">🏠 Home vs Discover</h4>
        <div className="text-sm text-gray-700">
          <p><strong>Selected (✓):</strong> Catalog appears on your Stremio home screen with browsable content</p>
          <p><strong>Unselected:</strong> Catalog only available through search (Discover section)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
    catalogs.map(cat => cat.id)
  )
  const [tmdbApiKey, setTmdbApiKey] = useState(
    localStorage.getItem('tmdb_api_key') || ''
  )

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'catalogs':
        return <CatalogsPage selectedCatalogs={selectedCatalogs} setSelectedCatalogs={setSelectedCatalogs} />
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
