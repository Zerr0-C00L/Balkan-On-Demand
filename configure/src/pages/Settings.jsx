import { useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';

export function Settings() {
  const { tmdbApiKey, setTmdbApiKey } = useConfig();
  const [localKey, setLocalKey] = useState(tmdbApiKey);
  const [tmdbSaved, setTmdbSaved] = useState(false);
  const [tmdbTestResult, setTmdbTestResult] = useState(null);

  const handleSave = () => {
    setTmdbApiKey(localKey);
    setTmdbSaved(true);
    setTimeout(() => setTmdbSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!localKey) {
      setTmdbTestResult({ 
        success: false, 
        message: '❌ Please enter an API key first' 
      });
      return;
    }

    setTmdbTestResult({ 
      success: null, 
      message: '🔄 Testing...' 
    });

    try {
      const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${localKey}`);
      
      if (response.ok) {
        setTmdbTestResult({ 
          success: true, 
          message: '✅ API key is valid!' 
        });
      } else {
        setTmdbTestResult({ 
          success: false, 
          message: '❌ Invalid API key' 
        });
      }
    } catch (error) {
      setTmdbTestResult({ 
        success: false, 
        message: `❌ Error: ${error.message}` 
      });
    }
  };

  return (
    <div className="p-6 md:p-12 bg-gray-50 min-h-screen">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Settings</h1>
        <p className="text-gray-600 mb-8">Configure your addon API keys and preferences</p>

        {/* TMDB API Key Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🎬 TMDB API Key</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Required for TMDB-powered catalogs. This key enables dynamic content discovery and rich metadata.
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
                  placeholder="Enter your TMDB API key (v3)"
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
              <li>Copy your <strong>API Key (v3 auth)</strong> and paste it above</li>
              <li>Click "Test Key" to verify it works, then "Save"</li>
            </ol>
          </div>

          {/* Server Usage */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">🖥️ For Server Deployment:</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">Set your TMDB API key as an environment variable:</p>
              <code className="block bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                export TMDB_API_KEY="{localKey || 'your_key_here'}"<br/>
                node addon-tmdb-catalogs.js
              </code>
              <p className="text-xs text-gray-600 mt-3">
                For Heroku: <code className="bg-gray-200 px-1 py-0.5 rounded">heroku config:set TMDB_API_KEY=your_key</code>
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Info */}
        <div className="bg-blue-50 border-l-4 border-[#00d4ff] rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-2">💾 Configuration Storage</h4>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              Your TMDB API key is stored locally in your browser (localStorage). It's never
              sent to any server except TMDB's official API for validation.
            </p>
            <p>
              When you install the addon, your key is <strong>not</strong> included in the
              configuration URL for security. The server must have its own TMDB_API_KEY set.
            </p>
            <p>
              This key in settings is only used for testing and as a reference. The actual
              addon uses the server's environment variable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
