


import { KbartRow, Status } from '../types';

// Get API URL from environment variable or fallback to relative path
const API_URL = import.meta.env.VITE_API_URL || '';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

// POST a file to the Flask backend for MARC parsing
export const convertFileToKbart = async (file: File, setStatus: (status: Status) => void): Promise<KbartRow[]> => {
    // Always force MIME type to application/marc for backend compatibility
    const marcFile = new File([file], file.name, { type: 'application/marc' });
    console.log('Debug: File upload attempt:', { name: marcFile.name, size: marcFile.size, type: marcFile.type });
    if (marcFile.size === 0) {
        setStatus({ message: `Selected file \"${marcFile.name}\" is empty. Please choose a valid MARC file.`, type: 'error' });
        throw new Error('File is empty.');
    }
    setStatus({ message: `Uploading file: ${marcFile.name}...`, type: 'info' });

    // Binary debug: read and log first 32 bytes of the file to compare with backend
    try {
        const slice = await marcFile.slice(0, 32).arrayBuffer();
        const view = new Uint8Array(slice);
        const hex = Array.from(view).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log('Debug: upload file first bytes (hex):', hex);
    } catch (e) {
        console.warn('Could not read file slice for debug.', e);
    }

    const formData = new FormData();
    formData.append('file', marcFile);
    // Log FormData contents
    for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`FormData field: ${key}, File name: ${value.name}, size: ${value.size}, type: ${value.type}`);
        } else {
            console.log(`FormData field: ${key}, Value:`, value);
        }
    }
    let response: Response;
    const headers: Record<string, string> = {};
    if (API_TOKEN) {
        headers['Authorization'] = `Bearer ${API_TOKEN}`;
    }
    try {
        console.log('Sending request to:', `${API_URL}/api/convert?format=json`);
        response = await fetch(`${API_URL}/api/convert?format=json`, {
            method: 'POST',
            body: formData,
            headers,
        });
        console.log('Response status:', response.status, response.statusText);
    } catch (fetchError) {
        console.error('Network error uploading file to backend:', fetchError);
        throw new Error('Network error uploading file to backend.');
    }
    if (!response.ok) {
        let errorText = '';
        try {
            errorText = await response.text();
        } catch {}
        console.error('Backend error:', response.status, response.statusText, errorText);
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }
    let json;
    try {
        json = await response.json();
        console.log('Response JSON:', json);
    } catch (e) {
        console.error('Failed to parse backend response as JSON.', e);
        throw new Error('Failed to parse backend response as JSON.');
    }
    if (!Array.isArray(json)) {
        console.error('Unexpected backend response format:', json);
        throw new Error('Unexpected backend response format.');
    }
    setStatus({ message: `Successfully converted ${json.length} records.`, type: 'success' });
    // Pass through all fields from backend response
    return json.map((rec: any) => ({ ...rec }));
};


// For URL, download file in browser, then POST to backend
export const convertUrlToKbart = async (url: string, setStatus: (status: Status) => void): Promise<KbartRow[]> => {
    setStatus({ message: 'Fetching MARC file via proxy...', type: 'info' });
    // Use corsproxy.io for CORS bypass
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
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
    if (blob.size === 0) {
        setStatus({ message: 'Downloaded MARC file from URL is empty. Please check the source or try another URL.', type: 'error' });
        throw new Error('Downloaded file is empty.');
    }
    // Force MIME type to application/marc for backend compatibility
    const file = new File([blob], 'remote.mrc', { type: 'application/marc' });
    return convertFileToKbart(file, setStatus);
};


