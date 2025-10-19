import React, { useState, useEffect } from 'react';
import { KbartRow, Status } from './types';
import { convertUrlToKbart, convertFileToKbart } from './services/marcService';
import StatusDisplay from './components/StatusDisplay';
import KbartTable from './components/KbartTable';
import InputArea from './components/InputArea';
import GlobalLoader from './components/GlobalLoader';
import ErrorBoundary from './components/ErrorBoundary';


const API_URL = (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : (process.env.VITE_API_URL || '');

const App: React.FC = () => {
  const [kbartData, setKbartData] = useState<KbartRow[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [currentTab, setCurrentTab] = useState<'palace' | 'manual'>('palace');
  type CacheEntry = { data: KbartRow[]; label?: string; status?: Status | null; ts?: string };
  const [tabCache, setTabCache] = useState<Record<string, CacheEntry>>(() => {
    // Try to load from localStorage
    try {
      const raw = localStorage.getItem('marc_kbart_tab_cache');
      if (raw) {
        return JSON.parse(raw) as Record<string, CacheEntry>;
      }
    } catch (e) {
      // ignore
    }
    return {
      palace: { data: [], label: undefined, status: null, ts: undefined },
      manual: { data: [], label: undefined, status: null, ts: undefined }
    };
  });

  // Persist cache to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('marc_kbart_tab_cache', JSON.stringify(tabCache));
    } catch (e) {
      // ignore
    }
  }, [tabCache]);

  const [showSettings, setShowSettings] = useState(false);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const clearCachedResults = () => {
    // Clear local and persistent cache
    const empty: Record<string, CacheEntry> = {
      palace: { data: [], label: undefined, status: null, ts: undefined },
      manual: { data: [], label: undefined, status: null, ts: undefined }
    };
    setTabCache(empty);
    try {
      localStorage.removeItem('marc_kbart_tab_cache');
    } catch (e) {
      // ignore
    }
    // Also clear current view
    setKbartData([]);
    setSelectedLabel(undefined);
    setStatus(null);
    setSettingsMessage('Cached results cleared');
    setTimeout(() => setSettingsMessage(null), 2500);
  };
  // Health check on app load
  useEffect(() => {
    const checkApi = async () => {
      try {
        const resp = await fetch(`${API_URL}/api/convert`, { method: 'HEAD' });
        if (resp.ok || resp.status === 405 || resp.status === 404) {
          setApiAvailable(true);
        } else {
          setApiAvailable(false);
        }
      } catch (e) {
        setApiAvailable(false);
      }
    };
    checkApi();
  }, []);

  const handleUrlConvert = async (url: string, label?: string) => {
    setIsLoading(true);
    setKbartData([]);
    setStatus(null);
    setSelectedLabel(label);

    try {
      const data = await convertUrlToKbart(url, setStatus);
      setKbartData(data);
    } catch (error: any) {
      setStatus({ message: error.message || 'An unknown error occurred.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileConvert = async (file: File) => {
    setIsLoading(true);
    setKbartData([]);
    setStatus(null);

    try {
      const data = await convertFileToKbart(file, setStatus);
      setKbartData(data);
    } catch (error: any) {
      setStatus({ message: error.message || 'An unknown error occurred.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <GlobalLoader isLoading={isLoading} />
  <main className="w-full max-w-7xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2">
            MARC to <span className="text-blue-400">KBART</span> Converter
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-2">
            Convert a MARC file into a KBART-formatted table by providing a URL or uploading the file directly.
          </p>
          <hr className="border-gray-700 mb-4" />
          <div className="w-full flex justify-center mb-2">
            <button className="px-3 py-1 rounded bg-gray-800 border border-gray-700 text-gray-200" onClick={() => setShowSettings(true)}>Settings</button>
          </div>
        </header>

        {apiAvailable === false && (
          <div className="mb-4 p-4 bg-red-900 text-red-200 rounded-lg border border-red-700 text-center">
            <strong>Backend API is not available.</strong> Please try again later.
          </div>
        )}

        <ErrorBoundary>
          <div className="w-full flex flex-col md:flex-row gap-8 items-start">
            {/* Left column: InputArea */}
            <section className="w-full md:w-1/2 bg-gray-800/50 shadow-2xl p-6 sm:p-8 mb-8 md:mb-0">
              <InputArea 
                onUrlConvert={handleUrlConvert}
                onFileConvert={(file: File, label?: string) => { setSelectedLabel(label); handleFileConvert(file); }}
                onActiveTabChange={(newTab) => {
                  setTabCache(prev => {
                    const ts = new Date().toISOString();
                    const updated = {
                      ...prev,
                      [currentTab]: { data: kbartData, label: selectedLabel, status, ts }
                    };
                    const entry = updated[newTab] || { data: [], label: undefined, status: null, ts: undefined };
                    setKbartData(entry.data);
                    setSelectedLabel(entry.label);
                    setStatus(entry.status ?? null);
                    setCurrentTab(newTab);
                    return updated;
                  });
                }}
                isLoading={isLoading}
                disabled={apiAvailable === false}
              />
              {(isLoading || (status && apiAvailable !== false)) && <StatusDisplay status={status} />}
            </section>
            {/* Right column: Results */}
            <section className="w-full md:w-1/2">
              {/* Results info above results card */}
              {kbartData.length > 0 && (
                <div className="mb-2 flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Showing results from:</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${currentTab === 'palace' ? 'bg-indigo-700 text-indigo-100' : 'bg-emerald-700 text-emerald-100'}`}>{currentTab === 'palace' ? 'Palace' : 'Manual upload'}</span>
                    {tabCache[currentTab]?.ts && <span className="text-sm text-gray-400">as of <span className="font-mono text-gray-200">{new Date(tabCache[currentTab]?.ts ?? '').toLocaleString()}</span></span>}
                  </div>
                  <div className="text-xl font-bold text-gray-100 mt-1">Conversion Results{selectedLabel ? ` — ${selectedLabel}` : ''}</div>
                </div>
              )}
              <KbartTable data={kbartData} label={selectedLabel} currentTab={currentTab} ts={tabCache[currentTab]?.ts} />
            </section>
          </div>
        </ErrorBoundary>
        {/* Settings modal */}
        {showSettings && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowSettings(false)} />
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 z-10 w-full max-w-md">
              <h4 className="text-lg font-semibold mb-2 text-white">Settings</h4>
              <div className="mb-4">
                <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={() => setShowClearCacheConfirm(true)}>Clear cached results</button>
                {settingsMessage && <div className="text-sm text-green-300 mt-2">{settingsMessage}</div>}
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-2 rounded bg-gray-700 text-gray-200" onClick={() => setShowSettings(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Clear cache confirmation modal */}
        {showClearCacheConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-60">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowClearCacheConfirm(false)} />
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 z-10 w-full max-w-md">
              <h4 className="text-lg font-semibold mb-2 text-white">Confirm clear cached results</h4>
              <p className="text-sm text-gray-300 mb-4">This will permanently remove cached conversion results from local storage.</p>
              <div className="flex justify-end gap-2">
                <button className="px-3 py-2 rounded bg-gray-700 text-gray-200" onClick={() => setShowClearCacheConfirm(false)}>Cancel</button>
                <button className="px-3 py-2 rounded bg-red-600 text-white" onClick={() => { clearCachedResults(); setShowClearCacheConfirm(false); setShowSettings(false); }}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="w-full max-w-5xl mx-auto text-center mt-12 pb-4">
        <p className="text-sm text-gray-500">A static web application built with React, TypeScript, and Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;