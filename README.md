## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## MARC to KBART Converter (React + Flask)

This app converts MARC bibliographic files (from URL or upload) into NISO-compliant KBART tables for download or copy.

### How it works
- **Frontend:** React (TypeScript), Vite, Tailwind CSS. All UI logic is client-side.
- **Backend:** Flask + PyMARC (hosted separately, e.g. on Render). Handles all MARC parsing and conversion to KBART.
- **Integration:** The frontend uploads files to the backend `/api/convert` endpoint. The backend returns parsed KBART data as JSON.

### Environment Configuration
- Set the backend API endpoint in `.env`:
  ```
  VITE_API_URL=https://your-flask-api.onrender.com
  ```
- The frontend will use this URL for all MARC file conversions.

### Development
1. Install dependencies:
   ```sh
   npm install
   ```
2. Set the API URL in `.env` (see above).
3. Run the app:
   ```sh
   npm run dev
   ```

### Deployment
- Deploy the React app to your preferred static host (e.g. Vercel, Netlify, Render static).
- Deploy the Flask backend to a service like Render or Fly.io.
- Update `.env` with your backend URL before building for production.

---

## API Integration Notes (as of v1.1.0)

- The app now supports all fields returned by the backend API at `/api/convert?format=json`.
- The table and TSV export will include all columns present in the backend JSON response, including new or custom fields.
- The backend response fields include (but are not limited to):
  - title_id, publication_title, title_url, first_author, online_identifier, publisher_name, publication_type, date_monograph_published_online, first_editor, access_type, source_id, source_id_type
- The frontend automatically adapts to new fields added by the backend.

---

## Previous browser-based MARC parsing

> **Note:** All browser-based MARC parsing code and dependencies have been removed. All MARC21/MARCXML parsing is now handled by the backend for reliability and scalability.

---

## Bug fix: Palace CM / AllOrigins binary payload handling (2025-10-16)

We discovered an edge case where the `AllOrigins` proxy sometimes returns MARC files as a `data:` URI or raw base64 string inside the JSON `contents` field. The frontend used to treat that string literally, which resulted in the backend receiving the `data:...` text instead of the raw MARC binary bytes. This caused intermittent 500 errors on the backend when parsing certain files.

Fix implemented:
- The frontend now detects `data:` URIs and raw base64 payloads returned by proxies and decodes them into raw bytes (Uint8Array).
- All downloaded file data (Blob or Uint8Array) is normalized to a Blob and wrapped in a `File` with MIME type `application/marc` before uploading to the backend.
- Additional hex-byte debug logging was added to help verify end-to-end byte equality between browser uploads and `curl` uploads. These logs print the first 32 bytes in hex for comparison.

How to test manually:
1. Use the Palace CM flow in the app to fetch a MARC file link.
2. Observe browser console logs for two lines:
   - `Debug: downloaded file first bytes (hex): ...` (from `InputArea.tsx`)
   - `Debug: upload file first bytes (hex): ...` (from `services/marcService.ts`)
3. Run a curl upload of the same file locally and inspect the first 32 bytes:

```sh
xxd -l 32 -ps OAPENSample.mrc
curl -F "file=@OAPENSample.mrc" "${VITE_API_URL}/api/convert?format=json" -H "Authorization: Bearer <token>"
```

If the hex bytes match and the backend still fails, investigate server-side parsing. If they don't match, the frontend may still be converting the payload incorrectly (unlikely after this fix).

Note: Remove or disable verbose debug logging before shipping to production.


## Smoke test

There is a small smoke test script to verify the MARC upload/convert endpoint quickly from your development machine.

Run the packaged script which uploads the included `sample.mrc` to your backend:

```bash
# basic (assumes local backend at http://localhost:5000)
npm run smoke:upload

# target a deployed backend and provide a token
SMOKE_API_URL="https://marc-json.onrender.com/api/convert?format=json" VITE_API_TOKEN="<token>" npm run smoke:upload
```

Notes:
- The script requires Node 18+ (global fetch/FormData/Blob available).
- The script prints response status and body. It exits non-zero on HTTP errors so it can be used in CI.

