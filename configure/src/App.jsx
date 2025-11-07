import { useState, useEffect, useRef } from 'react'
import { ConfigProvider, useConfig } from './contexts/ConfigContext'
import { Home } from './pages/Home'
import { Catalogs } from './pages/Catalogs'
import { Settings } from './pages/Settings'
import { Others } from './pages/Others'

function Sidebar({ currentPage, setCurrentPage, isMobileOpen, setIsMobileOpen }) {
  const { getManifestUrl } = useConfig()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'catalogs', label: 'Catalogs', icon: '📚' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'others', label: 'Others', icon: '🔧' },
  ]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const handleInstall = () => {
    const manifestUrl = getManifestUrl()
    const stremioUrl = manifestUrl.replace('http://', 'stremio://').replace('https://', 'stremio://')
    window.location.href = stremioUrl
    setShowDropdown(false)
  }

  const handleInstallWeb = () => {
    const manifestUrl = getManifestUrl()
    window.open(manifestUrl, '_blank')
    setShowDropdown(false)
  }

  const handleCopyUrl = async () => {
    const manifestUrl = getManifestUrl()
    try {
      await navigator.clipboard.writeText(manifestUrl)
      alert('Manifest URL copied to clipboard!')
    } catch (err) {
      const textArea = document.createElement('textarea')
      textArea.value = manifestUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Manifest URL copied to clipboard!')
    }
    setShowDropdown(false)
  }

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0d253f] transform transition-transform duration-200 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex flex-col h-full py-6">
          <div className="px-6 mb-10">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              <h1 className="text-xl font-bold text-white">Balkan HD Streams</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">v6.0.1 TMDB</p>
          </div>
          <nav className="flex-1 px-3">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button onClick={() => { setCurrentPage(item.id); setIsMobileOpen(false); }} className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors ${currentPage === item.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                    <span className="mr-3 text-xl">{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="px-6 mt-auto mb-3 relative" ref={dropdownRef}>
            <div className="flex">
              <button 
                onClick={handleInstall} 
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#00d4ff] hover:bg-[#00b8e6] text-white font-semibold py-3 px-4 rounded-l-lg transition-all duration-200 shadow-lg"
              >
                <span>📥</span><span>Install</span>
              </button>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="bg-[#00d4ff] hover:bg-[#00b8e6] text-white font-semibold py-3 px-3 rounded-r-lg border-l border-white/20 transition-all duration-200 shadow-lg"
              >
                ▼
              </button>
            </div>
            
            {showDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                <button
                  onClick={handleInstall}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium flex items-center gap-2"
                >
                  <span>📥</span> Install
                </button>
                <button
                  onClick={handleInstallWeb}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium border-t border-gray-100 flex items-center gap-2"
                >
                  <span>🌐</span> Install Web
                </button>
                <button
                  onClick={handleCopyUrl}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium border-t border-gray-100 flex items-center gap-2"
                >
                  <span>📋</span> Copy URL
                </button>
              </div>
            )}
          </div>
          <div className="px-6">
            <a href="https://ko-fi.com/ZeroQ" target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 bg-[#FF5E5B] hover:bg-[#ff4845] text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 shadow-lg">
              <span>☕</span><span>Buy me a coffee</span>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home')
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { loadConfigFromUrl } = useConfig()

  useEffect(() => {
    loadConfigFromUrl()
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <Home />
      case 'catalogs': return <Catalogs />
      case 'settings': return <Settings />
      case 'others': return <Others />
      default: return <Home />
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <div className="md:pl-64 min-h-screen">
        {currentPage !== 'home' && (
          <header className="md:hidden bg-white p-4 shadow-sm sticky top-0 z-20">
            <button onClick={() => setIsMobileOpen(true)} className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
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

function App() {
  return (
    <ConfigProvider>
      <AppContent />
    </ConfigProvider>
  )
}

export default App
