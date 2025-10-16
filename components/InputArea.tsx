import React, { useEffect, useState } from 'react';
// For HTML parsing
// No external dependency: use DOMParser in browser
import UppyCore from '@uppy/core';
import { Dashboard } from '@uppy/react';
import Url from '@uppy/url';
// No core style import needed for Uppy v3+ (only dashboard)
// Uppy Dashboard CSS is loaded via CDN in index.html

// No core style import needed for Uppy v3+ (only dashboard)

interface InputAreaProps {
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


const InputArea: React.FC<InputAreaProps> = ({ onFileConvert, isLoading }) => {
  const [fileError, setFileError] = useState<string | null>(null);
  const [uppy, setUppy] = useState<UppyCore | null>(null);
  // New state for MARC URL and results
  const [marcUrl, setMarcUrl] = useState('');
  const [marcLinks, setMarcLinks] = useState<{headings: string[], links: {href: string, text: string}[]}[]>([]);
  const [marcLoading, setMarcLoading] = useState(false);
  const [marcError, setMarcError] = useState<string | null>(null);
  // Fetch and parse MARC links from a given HTML page
  const [marcFileLoading, setMarcFileLoading] = useState<string | null>(null); // href of loading file
  const [marcFileError, setMarcFileError] = useState<string | null>(null);
  // Tab state
  const [activeTab, setActiveTab] = useState<'palace' | 'manual'>('palace');

  const handleMarcUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMarcError(null);
    setMarcLinks([]);
    if (!marcUrl) return;
    setMarcLoading(true);
    // Try multiple proxies in order
    const proxies = [
      {
        name: 'AllOrigins',
        url: (target: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,
        extract: (data: any) => data.contents
      },
      {
        name: 'corsproxy.io',
        url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
        extract: (data: any) => typeof data === 'string' ? data : null
      }
    ];
    let lastError = '';
    let html = null;
    for (const proxy of proxies) {
      try {
        const resp = await fetch(proxy.url(marcUrl));
        if (!resp.ok) throw new Error(`Proxy ${proxy.name} failed. Status: ${resp.status}`);
        let data;
        // AllOrigins returns JSON, corsproxy.io returns HTML string
        if (proxy.name === 'AllOrigins') {
          data = await resp.json();
        } else {
          data = await resp.text();
        }
        html = proxy.extract(data);
        if (html) break;
      } catch (err: any) {
        lastError = `${proxy.name}: ${err?.message || err}`;
      }
    }
    if (!html) {
      setMarcError(
        'Could not fetch or parse the page from any proxy.\n' +
        (lastError ? `Last error: ${lastError}` : '') +
        '\nThis is likely a CORS or proxy issue. Try uploading the file directly if possible.'
      );
      setMarcLoading(false);
      return;
    }
    try {
      // Parse HTML
      const doc = new window.DOMParser().parseFromString(html, 'text/html');
      // Group links by full heading hierarchy (h2 > h3 > h4, etc.)
      // Group links by <section> and <h3> title within each section
      type Link = { href: string, text: string };
      type SectionGroup = {
        sectionTitle: string;
        h3Title: string;
        links: Link[];
      };
      const groups: SectionGroup[] = [];
      const body = doc.body;
      if (body) {
        const sections = Array.from(body.querySelectorAll('section'));
        for (const section of sections) {
          // Find the first h3 in this section
          const h3 = section.querySelector('h3');
          const h3Title = h3 ? h3.textContent?.trim() || '' : '';
          // Find the closest previous h2 before this section (for section title)
          let sectionTitle = '';
          let prev = section.previousElementSibling;
          while (prev) {
            if (prev.tagName === 'H2') {
              sectionTitle = prev.textContent?.trim() || '';
              break;
            }
            prev = prev.previousElementSibling;
          }
          // Find all links in this section
          const links = Array.from(section.querySelectorAll('a')).map(a => ({
            href: a.getAttribute('href') || '',
            text: a.textContent?.trim() || ''
          }));
          if (links.length > 0) {
            groups.push({ sectionTitle, h3Title, links });
          }
        }
      }
      setMarcLinks(groups.map(g => ({ headings: [g.sectionTitle, g.h3Title], links: g.links })));
    } catch (err: any) {
      setMarcError(`Fetched page but could not parse HTML: ${err?.message || err}`);
    } finally {
      setMarcLoading(false);
    }
  };

  useEffect(() => {
    const instance = new UppyCore({
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: [
          ...ALLOWED_EXTENSIONS,
          ...ALLOWED_MIME_TYPES
        ]
      },
      autoProceed: true
    }).use(Url, { companionUrl: 'https://companion.uppy.io' });

    instance.on('file-added', (file) => {
      const ext = file.extension ? `.${file.extension}` : '';
      const validExt = ALLOWED_EXTENSIONS.includes(ext.toLowerCase());
      const validMime = ALLOWED_MIME_TYPES.includes(file.type);
      if (!validExt && !validMime) {
        setFileError('Only MARC 21 (.mrc, .marc) or MARC XML (.xml) files are allowed.');
        instance.removeFile(file.id);
      } else {
        setFileError(null);
      }
    });

    instance.on('complete', (result) => {
      if (result.successful && result.successful.length > 0) {
        const file = result.successful[0].data;
        setFileError(null);
        onFileConvert(file);
      }
    });

    setUppy(instance);
    return () => {
      instance?.destroy();
    };
  }, [onFileConvert]);

  const DEBUG = (import.meta.env.VITE_UPLOAD_DEBUG === 'true') || (process.env.VITE_UPLOAD_DEBUG === 'true');
  const FORCE_MIME = (typeof import.meta.env.VITE_FORCE_MIME !== 'undefined' ? import.meta.env.VITE_FORCE_MIME : process.env.VITE_FORCE_MIME) !== 'false';

  // Handle selecting a MARC file link: fetch and convert
  const handleMarcFileSelect = async (href: string) => {
    setMarcFileError(null);
    setMarcFileLoading(href);
    // Use same proxy logic as scraping
    const proxies = [
      {
        name: 'AllOrigins',
        url: (target: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,
        extract: async (resp: Response) => {
            const data = await resp.json();
            // AllOrigins returns 'contents' which may be a data: URI (e.g. data:application/marc;base64,....)
            if (data.contents && typeof data.contents === 'string') {
              const contents: string = data.contents;
              try {
                // If contents is a data URI with base64 payload, strip prefix and decode
                if (contents.startsWith('data:')) {
                  const idx = contents.indexOf('base64,');
                  if (idx !== -1) {
                    const b64 = contents.substring(idx + 7);
                    const byteCharacters = atob(b64);
                    const byteNumbers = new Uint8Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    return byteNumbers;
                  }
                }
                // Otherwise, try to detect if contents itself is raw base64 (no data: prefix)
                const sample = contents.slice(0, 100).replace(/\s+/g, '');
                if (/^[A-Za-z0-9+/=]+$/.test(sample)) {
                  const byteCharacters = atob(contents);
                  const byteNumbers = new Uint8Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  return byteNumbers;
                }
              } catch (e) {
                // fall through to treat as text
              }
              // Fallback: treat as text
              return new TextEncoder().encode(contents);
            }
            return null;
        }
      },
      {
        name: 'corsproxy.io',
        url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
        extract: async (resp: Response) => {
          const blob = await resp.blob();
          return blob;
        }
      }
    ];
    let lastError = '';
    let fileData: Blob | Uint8Array | null = null;
    let filename = href.split('/').pop() || 'marcfile.mrc';
    for (const proxy of proxies) {
      try {
        const resp = await fetch(proxy.url(href));
        if (!resp.ok) throw new Error(`Proxy ${proxy.name} failed. Status: ${resp.status}`);
        const result = await proxy.extract(resp);
        if (result) {
          fileData = result;
          break;
        }
      } catch (err: any) {
        lastError = `${proxy.name}: ${err?.message || err}`;
      }
    }
    if (!fileData) {
      setMarcFileError(
        'Could not download the MARC file from any proxy.\n' +
        (lastError ? `Last error: ${lastError}` : '') +
        '\nThis is likely a CORS or proxy issue. Try downloading the file manually and uploading it in the Manual or URL uploads tab.'
      );
      setMarcFileLoading(null);
      return;
    }
    try {
      // Normalize to a Blob while preserving raw bytes
      let blobToUse: Blob;
      if (fileData instanceof Blob) {
        blobToUse = fileData;
      } else if (fileData instanceof Uint8Array) {
        // Copy into a new ArrayBuffer to avoid SharedArrayBuffer/Detached issues
        const copied = new Uint8Array(fileData.length);
        copied.set(fileData);
        blobToUse = new Blob([copied.buffer], { type: FORCE_MIME ? 'application/marc' : 'application/octet-stream' });
      } else {
        // Fallback: treat as text
        blobToUse = new Blob([fileData as any], { type: FORCE_MIME ? 'application/marc' : 'application/octet-stream' });
      }

      // Create File, honoring FORCE_MIME flag
      const mimeToUse = FORCE_MIME ? 'application/marc' : (blobToUse.type || 'application/octet-stream');
      const file = new File([blobToUse], filename, { type: mimeToUse });

      // Binary debug: log first 32 bytes as hex for comparison with backend
      if (DEBUG) {
        try {
          const slice = await blobToUse.slice(0, 32).arrayBuffer();
          const view = new Uint8Array(slice);
          const hex = Array.from(view).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log('Debug: downloaded file first bytes (hex):', hex);
        } catch (e) {
          console.warn('Could not read blob slice for debug.', e);
        }
      }

      onFileConvert(file);
    } catch (err: any) {
      setMarcFileError('Could not process the downloaded MARC file.');
    } finally {
      setMarcFileLoading(null);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Tab controls */}
      <div className="w-full max-w-2xl flex justify-center mb-6">
        <nav className="flex rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
          <button
            type="button"
            className={`flex-1 px-6 py-3 font-semibold text-lg focus:outline-none transition-colors duration-150 ${activeTab === 'palace' ? 'bg-gray-800 text-blue-300 border-b-2 border-blue-500' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'}`}
            onClick={() => setActiveTab('palace')}
            // aria-selected removed; not valid for <button>
            aria-controls="tab-palace"
            tabIndex={0}
          >
            Palace CM
          </button>
          <button
            type="button"
            className={`flex-1 px-6 py-3 font-semibold text-lg focus:outline-none transition-colors duration-150 ${activeTab === 'manual' ? 'bg-gray-800 text-blue-300 border-b-2 border-blue-500' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'}`}
            onClick={() => setActiveTab('manual')}
            // aria-selected removed; not valid for <button>
            aria-controls="tab-manual"
            tabIndex={0}
          >
            Manual or URL uploads
          </button>
        </nav>
      </div>
      {/* Tab panels */}
      <div className="w-full">
        {/* Palace CM tab */}
        {activeTab === 'palace' && (
          <div id="tab-palace" className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-xl shadow-md p-6 mx-auto mb-6">
            <form onSubmit={handleMarcUrlSubmit} className="flex flex-col gap-3">
              <label htmlFor="marc-url" className="text-blue-200 font-semibold">Select Records from Palace CM</label>
              <div className="flex gap-2">
                <input
                  id="marc-url"
                  type="url"
                  className="flex-1 rounded-lg border border-blue-400 bg-gray-800 text-blue-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter URL to MARC record page..."
                  value={marcUrl}
                  onChange={e => setMarcUrl(e.target.value)}
                  disabled={marcLoading}
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
                  disabled={marcLoading}
                >
                  {marcLoading ? 'Loading...' : 'Scrape'}
                </button>
              </div>
              {marcError && <div className="text-red-400 text-sm">{marcError}</div>}
            </form>
            {/* Results list */}
            {marcLinks.length > 0 && (
              <div className="mt-4">
                <div className="text-blue-200 font-medium mb-2">Found MARC File Links:</div>
                <ul className="space-y-4">
                  {marcLinks.map((group, i) => (
                    <li key={i}>
                      {/* Render only the h3 (second heading in array) */}
                      {group.headings && group.headings[1] && (
                        <div className="font-semibold text-white mb-1 ml-2">{group.headings[1]}</div>
                      )}
                      <ul className="ml-4 list-disc">
                        {group.links.map((link, j) => (
                          <li key={j}>
                            <button
                              type="button"
                              className={`text-blue-400 underline hover:text-blue-200 focus:outline-none ${marcFileLoading === link.href ? 'opacity-60 pointer-events-none' : ''}`}
                              onClick={() => handleMarcFileSelect(link.href)}
                              disabled={!!marcFileLoading}
                            >
                              {marcFileLoading === link.href ? 'Loading…' : (link.text || link.href)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
                {marcFileError && <div className="text-red-400 text-sm mt-2">{marcFileError}</div>}
              </div>
            )}
          </div>
        )}
        {/* Manual/URL uploads tab */}
        {activeTab === 'manual' && (
          <div id="tab-manual" className="w-full max-w-xl bg-gray-800 border border-gray-600 rounded-xl shadow-lg p-6 mx-auto">
            {uppy && (
              <Dashboard
                uppy={uppy}
                plugins={['Url']}
                hideUploadButton={true}
                proudlyDisplayPoweredByUppy={false}
                note="Upload or paste a URL to a MARC 21 (.mrc, .marc) or MARC XML (.xml) file."
                height={340}
                width="100%"
                disabled={isLoading}
                className="uppy-dashboard-custom"
                metaFields={[]}
              />
            )}
            {fileError && (
              <div className="mt-2 text-red-400 text-sm font-medium">{fileError}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InputArea;
