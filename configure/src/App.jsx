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

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'catalogs':
        return <CatalogsPage selectedCatalogs={selectedCatalogs} setSelectedCatalogs={setSelectedCatalogs} />
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
