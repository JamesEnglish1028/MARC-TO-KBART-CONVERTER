import React, { useState } from 'react';

interface UrlInputFormProps {
  onConvert: (url: string) => void;
  isLoading: boolean;
}

const UrlInputForm: React.FC<UrlInputFormProps> = ({ onConvert, isLoading }) => {
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      setError('Please enter a URL.');
      return;
    }
    try {
      new URL(url);
      setError('');
      onConvert(url);
    } catch (_) {
      setError('Please enter a valid URL.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/records.mrc"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 placeholder-gray-400"
            disabled={isLoading}
          />
          {error && <p className="absolute text-red-400 text-sm mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Converting...
            </>
          ) : (
            'Convert'
          )}
        </button>
      </div>
       <p className="text-xs text-gray-500 mt-3 sm:mt-2">
            Note: Due to browser security (CORS), URL fetching can fail. If a URL doesn't work, please use the "Upload File" option.
        </p>
    </form>
  );
};

export default UrlInputForm;