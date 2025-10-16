import React, { useState, useEffect, useRef } from 'react';
import UrlInputForm from './UrlInputForm';
import UppyCore from '@uppy/core';
import { Dashboard } from '@uppy/react';
import Url from '@uppy/url';
// No core style import needed for Uppy v3+ (only dashboard)
// Uppy Dashboard CSS is loaded via CDN in index.html

// No core style import needed for Uppy v3+ (only dashboard)

interface InputAreaProps {
  onUrlConvert: (url: string) => void;
  onFileConvert: (file: File) => void;
  isLoading: boolean;
}


const ALLOWED_EXTENSIONS = ['.mrc', '.marc', '.xml'];
const ALLOWED_MIME_TYPES = [
  'application/marc',
  'application/xml',
  'text/xml',
  'application/octet-stream', // Some browsers use this for .mrc
];

const InputArea: React.FC<InputAreaProps> = ({ onUrlConvert, onFileConvert, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');
  const [fileError, setFileError] = useState<string | null>(null);
  const uppyRef = useRef<UppyCore | null>(null);

  useEffect(() => {
    if (!uppyRef.current) {
      const uppy = new UppyCore({
        restrictions: {
          maxNumberOfFiles: 1,
          allowedFileTypes: [
            ...ALLOWED_EXTENSIONS,
            ...ALLOWED_MIME_TYPES
          ]
        },
        autoProceed: true
      })
        .use(Url, { companionUrl: 'https://companion.uppy.io' });

      uppy.on('file-added', (file) => {
        // Validate extension and MIME type
        const ext = file.extension ? `.${file.extension}` : '';
        const validExt = ALLOWED_EXTENSIONS.includes(ext.toLowerCase());
        const validMime = ALLOWED_MIME_TYPES.includes(file.type);
        if (!validExt && !validMime) {
          setFileError('Only MARC 21 (.mrc, .marc) or MARC XML (.xml) files are allowed.');
          uppy.removeFile(file.id);
        } else {
          setFileError(null);
        }
      });

      uppy.on('complete', (result) => {
        if (result.successful && result.successful.length > 0) {
          const file = result.successful[0].data;
          // Uppy returns a Blob/File for both local and remote
          setFileError(null);
          onFileConvert(file);
        }
      });
      uppyRef.current = uppy;
    }
    return () => {
      uppyRef.current?.destroy();
      uppyRef.current = null;
    };
  }, [onFileConvert]);

  const TABS = [
    { id: 'url', label: 'From URL' },
    { id: 'file', label: 'Upload File' },
  ];

  return (
    <div className="w-full">
      <div className="flex border-b border-gray-700 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'url' | 'file')}
            disabled={isLoading}
            className={`px-6 py-3 text-sm font-medium transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed ${
              activeTab === tab.id
                ? 'border-b-2 border-cyan-500 text-white'
                : 'text-gray-400 hover:text-gray-200 disabled:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'url' && (
        <UrlInputForm onConvert={onUrlConvert} isLoading={isLoading} />
      )}

      {activeTab === 'file' && (
        <div className="w-full">
          <Dashboard
            uppy={uppyRef.current!}
            plugins={['Url']}
            hideUploadButton={true}
            proudlyDisplayPoweredByUppy={false}
            note="Upload or paste a URL to a MARC 21 (.mrc, .marc) or MARC XML (.xml) file."
            height={350}
            disabled={isLoading}
          />
          {fileError && (
            <div className="mt-2 text-red-400 text-sm font-medium">{fileError}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default InputArea;
