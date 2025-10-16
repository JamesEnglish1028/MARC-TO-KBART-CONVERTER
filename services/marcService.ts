


import { KbartRow, Status } from '../types';

// Get API URL from environment variable or fallback to relative path
const API_URL = import.meta.env.VITE_API_URL || '';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

// POST a file to the Flask backend for MARC parsing
export const convertFileToKbart = async (file: File, setStatus: (status: Status) => void): Promise<KbartRow[]> => {
    setStatus({ message: `Uploading file: ${file.name}...`, type: 'info' });
    const formData = new FormData();
    formData.append('file', file);
    let response: Response;
    const headers: Record<string, string> = {};
    if (API_TOKEN) {
        headers['Authorization'] = `Bearer ${API_TOKEN}`;
    }
    try {
    response = await fetch(`${API_URL}/api/convert?format=json`, {
            method: 'POST',
            body: formData,
            headers,
        });
    } catch (fetchError) {
        throw new Error('Network error uploading file to backend.');
    }
    if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }
    let json;
    try {
        json = await response.json();
    } catch (e) {
        throw new Error('Failed to parse backend response as JSON.');
    }
    if (!Array.isArray(json)) {
        throw new Error('Unexpected backend response format.');
    }
    setStatus({ message: `Successfully converted ${json.length} records.`, type: 'success' });
    // Pass through all fields from backend response
    return json.map((rec: any) => ({ ...rec }));
};


// For URL, download file in browser, then POST to backend
export const convertUrlToKbart = async (url: string, setStatus: (status: Status) => void): Promise<KbartRow[]> => {
    setStatus({ message: 'Fetching MARC file via proxy...', type: 'info' });
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    let response: Response;
    try {
        response = await fetch(proxyUrl);
    } catch (fetchError) {
        throw new Error(`Network error fetching file. The CORS proxy may be down or the URL is incorrect.`);
    }
    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}. The server may be blocking requests from the proxy. Please try downloading the file and uploading it directly.`);
    }
    const blob = await response.blob();
    // Use the same backend endpoint as file upload
    const file = new File([blob], 'remote.mrc', { type: blob.type });
    return convertFileToKbart(file, setStatus);
};


