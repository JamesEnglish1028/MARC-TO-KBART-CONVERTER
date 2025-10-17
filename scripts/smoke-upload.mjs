#!/usr/bin/env node
/*
  Simple smoke test: POST sample.mrc to the backend convert endpoint as multipart/form-data.

  Usage:
    SMOKE_API_URL="https://api.example.com/api/convert?format=json" VITE_API_TOKEN="token" node ./scripts/smoke-upload.mjs

  Environment variables used (in order):
    SMOKE_API_URL - explicit URL for the smoke test
    VITE_API_URL  - base API url (the script will append /api/convert?format=json if needed)
    VITE_API_TOKEN - optional bearer token for Authorization header

  Notes: This script uses Node's global fetch/FormData/Blob APIs (Node 18+). If you get errors about
  missing FormData/Blob, run the script with Node 18+.
*/

import fs from 'fs/promises';

async function main() {
  const samplePath = new URL('../sample.mrc', import.meta.url).pathname;
  const apiFromEnv = process.env.SMOKE_API_URL || process.env.VITE_API_URL || '';
  let apiUrl = apiFromEnv;
  if (apiUrl && !apiUrl.includes('/api/convert')) {
    apiUrl = apiUrl.replace(/\/$/, '') + '/api/convert?format=json';
  }
  if (!apiUrl) apiUrl = 'http://localhost:5000/api/convert?format=json';

  console.log(`Using API URL: ${apiUrl}`);

  try {
    const buffer = await fs.readFile(samplePath);

    // Ensure runtime supports FormData & Blob
    if (typeof FormData === 'undefined' || typeof Blob === 'undefined' || typeof fetch === 'undefined') {
      console.error('This script requires Node 18+ (global fetch/FormData/Blob).');
      process.exit(2);
    }

    const form = new FormData();
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    form.append('file', blob, 'sample.mrc');

    const headers = {};
    const token = process.env.VITE_API_TOKEN;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    console.log('Uploading sample.mrc...');
    const resp = await fetch(apiUrl, { method: 'POST', body: form, headers });
    const text = await resp.text();
    console.log('Response status:', resp.status);
    console.log('Response body:');
    console.log(text);
    if (!resp.ok) process.exit(1);
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(3);
  }
}

main();
