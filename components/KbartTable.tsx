import React, { useState, useCallback } from 'react';
import { KbartRow } from '../types';
import { APP_KBART_HEADERS } from '../constants';
import DownloadIcon from './icons/DownloadIcon';
import ClipboardIcon from './icons/ClipboardIcon';

interface KbartTableProps {
  data: KbartRow[];
  label?: string;
  currentTab?: 'palace' | 'manual';
  ts?: string | undefined;
}
const KbartTable: React.FC<KbartTableProps> = ({ data, label, currentTab, ts }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null);

  const generateTsv = useCallback(() => {
    const headers = APP_KBART_HEADERS.join('\t');
    const rows = data.map(row => 
      APP_KBART_HEADERS.map(header => `"${(row[header] ?? '').replace(/"/g, '""')}"`).join('\t')
    );
    return [headers, ...rows].join('\n');
  }, [data]);

  const sanitize = (s: string) => s.replace(/[^a-z0-9_\-\.]/gi, '_').slice(0, 64);

  const handleDownload = useCallback(() => {
    const tsvContent = generateTsv();
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const base = label ? sanitize(label) : 'kbart_export';
    link.setAttribute('download', `${base}.tsv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [generateTsv]);

  const handleCopy = useCallback(async () => {
    const tsvContent = generateTsv();
    const base = label ? sanitize(label) : 'kbart_export';
    const filename = `${base}.tsv`;
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });

    // Try to write a ClipboardItem with a File (modern browsers like Chromium support this)
    try {
      // @ts-ignore - ClipboardItem may not be defined in all TS libs
      const file = new File([blob], filename, { type: blob.type });
      // @ts-ignore
      const clipboardItem = new ClipboardItem({ [blob.type]: file });
      // @ts-ignore
      await navigator.clipboard.write([clipboardItem]);
      setCopiedFilename(filename);
      setCopyStatus('copied');
      setTimeout(() => { setCopyStatus('idle'); setCopiedFilename(null); }, 2000);
      return;
    } catch (err) {
      // Fallback: write text
    }

    try {
      await navigator.clipboard.writeText(tsvContent);
      setCopiedFilename(filename);
      setCopyStatus('copied');
      setTimeout(() => { setCopyStatus('idle'); setCopiedFilename(null); }, 2000);
    } catch (err) {
      console.error('Clipboard write failed', err);
    }
  }, [generateTsv, label]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 sm:p-6">
      {currentTab && (
        <div className="mb-2 flex items-center gap-3">
          <div className="text-sm text-gray-400">Showing results from:</div>
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${currentTab === 'palace' ? 'bg-indigo-700 text-indigo-100' : 'bg-emerald-700 text-emerald-100'}`}>{currentTab === 'palace' ? 'Palace' : 'Manual upload'}</div>
          {ts && <div className="text-sm text-gray-400">as of <span className="font-mono text-gray-200">{new Date(ts).toLocaleString()}</span></div>}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
  <h3 className="text-xl font-bold text-gray-100">Conversion Results {label ? `— ${label}` : ''}</h3>
        <div className="flex gap-2 mt-3 sm:mt-0">
          <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-200">
            <ClipboardIcon className="w-5 h-5" />
            {copyStatus === 'idle' ? 'Copy TSV' : 'Copied!'}
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200">
            <DownloadIcon className="w-5 h-5" />
            Download .tsv
          </button>
        </div>
        {/* Ephemeral confirmation for copied filename */}
        {copiedFilename && copyStatus === 'copied' && (
          <div className="mt-2 text-sm text-green-300" aria-live="polite">
            Copied: <span className="font-mono">{copiedFilename}</span>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-gray-300 uppercase bg-gray-700">
            <tr>
              {APP_KBART_HEADERS.map(header => (
                <th key={header} scope="col" className="px-4 py-3">
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                {APP_KBART_HEADERS.map(header => (
                  <td key={`${header}-${index}`} className="px-4 py-3 font-mono text-xs">
                    {row[header] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KbartTable;
