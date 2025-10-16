import React, { useState, useCallback } from 'react';
import { KbartRow } from '../types';
import { APP_KBART_HEADERS } from '../constants';
import DownloadIcon from './icons/DownloadIcon';
import ClipboardIcon from './icons/ClipboardIcon';

interface KbartTableProps {
  data: KbartRow[];
}

const KbartTable: React.FC<KbartTableProps> = ({ data }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const generateTsv = useCallback(() => {
    const headers = APP_KBART_HEADERS.join('\t');
    const rows = data.map(row => 
      APP_KBART_HEADERS.map(header => `"${(row[header] ?? '').replace(/"/g, '""')}"`).join('\t')
    );
    return [headers, ...rows].join('\n');
  }, [data]);

  const handleDownload = useCallback(() => {
    const tsvContent = generateTsv();
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'kbart_export.tsv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [generateTsv]);

  const handleCopy = useCallback(() => {
    const tsvContent = generateTsv();
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  }, [generateTsv]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-6 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-100">Conversion Results</h3>
        <div className="flex gap-2 mt-3 sm:mt-0">
          <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-200">
            <ClipboardIcon className="w-5 h-5" />
            {copyStatus === 'idle' ? 'Copy TSV' : 'Copied!'}
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors duration-200">
            <DownloadIcon className="w-5 h-5" />
            Download .tsv
          </button>
        </div>
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
