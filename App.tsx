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
  const [status, setStatus] = useState<Status | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
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

  const handleUrlConvert = async (url: string) => {
    setIsLoading(true);
    setKbartData([]);
    setStatus(null);

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
      <main className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-2">
            MARC to <span className="text-blue-400">KBART</span> Converter
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Convert a MARC file into a KBART-formatted table by providing a URL or uploading the file directly.
          </p>
        </header>

        {apiAvailable === false && (
          <div className="mb-4 p-4 bg-red-900 text-red-200 rounded-lg border border-red-700 text-center">
            <strong>Backend API is not available.</strong> Please try again later.
          </div>
        )}

        <ErrorBoundary>
          <section className="w-full bg-gray-800/50 border border-gray-700 rounded-xl shadow-2xl p-6 sm:p-8">
            <InputArea 
              onUrlConvert={handleUrlConvert}
              onFileConvert={handleFileConvert}
              isLoading={isLoading}
              disabled={apiAvailable === false}
            />
            {(isLoading || (status && apiAvailable !== false)) && <StatusDisplay status={status} />}
          </section>

          <section className="w-full">
              <KbartTable data={kbartData} />
          </section>
        </ErrorBoundary>
      </main>
      <footer className="w-full max-w-5xl mx-auto text-center mt-12 pb-4">
        <p className="text-sm text-gray-500">A static web application built with React, TypeScript, and Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;