# Copilot Instructions for MARC to KBART Converter

## Project Overview
- **Purpose:** Converts MARC bibliographic files (from URL or upload) into NISO-compliant KBART tables for download or copy.
- **Stack:** React (TypeScript), Vite, Tailwind CSS. No backend; all logic runs client-side in the browser.
- **Entry Point:** `App.tsx` orchestrates UI, state, and data flow.

## Architecture & Data Flow
- **UI Components:**
  - `InputArea` (tabbed: URL or file upload)
  - `UrlInputForm` (URL input, validation, CORS warning)
  - `KbartTable` (renders, copies, downloads KBART TSV)
  - `StatusDisplay`, `GlobalLoader`, `ErrorBoundary` (UX feedback)
- **Service Layer:**
  - `services/marcService.ts` handles MARC parsing (via `marcjs` from CDN), field extraction, and KBART row mapping.
  - All parsing and conversion is synchronous except for file/URL fetches.
- **Types & Constants:**
  - `types.ts` defines `KbartRow` and `Status` types.
  - `constants.ts` defines KBART column order (`APP_KBART_HEADERS`).

## Key Patterns & Conventions
- **Component Structure:**
  - All UI logic is in `/components`. Icons are in `/components/icons`.
  - Use functional components and React hooks only.
  - All user actions update status via `setStatus` (see `StatusDisplay`).
- **MARC Parsing:**
  - Uses `marcjs` via ESM CDN import (no local dependency).
  - CORS proxy (`api.allorigins.win`) is used for URL fetches; failures prompt user to upload file instead.
- **Error Handling:**
  - All async actions (file/URL conversion) are wrapped in try/catch and update status.
  - `ErrorBoundary` catches React render errors and prompts reload.
- **Styling:**
  - Tailwind CSS is loaded via CDN in `index.html`.
  - No CSS modules or styled-components.

## Developer Workflows
- **Install:** `npm install`
- **Run Dev Server:** `npm run dev` (Vite, port 3000)
- **Build:** `npm run build`
- **Preview Build:** `npm run preview`
- **API Keys:** Set `GEMINI_API_KEY` in `.env.local` if needed (see `vite.config.ts`).
- **No tests or linter config present.**

## Integration & Extensibility
- **No backend or server code.**
- **No persistent storage.**
- **All external MARC parsing is via CDN ESM import.**
- **To add new KBART fields:**
  - Update `KbartRow` in `types.ts` and `APP_KBART_HEADERS` in `constants.ts`.
  - Update mapping logic in `marcService.ts`.

## Examples
- See `App.tsx` for top-level data flow and error handling.
- See `services/marcService.ts` for MARC-to-KBART mapping logic.
- See `components/KbartTable.tsx` for TSV export/copy logic.

---

If you are unsure about a pattern, check the referenced files for examples. When adding new features, follow the conventions in the most similar existing component or service.
