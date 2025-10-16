<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1SL3Ytrye3qvTTjYHDcws83a87R3hVAYk

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

## Previous browser-based MARC parsing

> **Note:** All browser-based MARC parsing code and dependencies have been removed. All MARC21/MARCXML parsing is now handled by the backend for reliability and scalability.

---
