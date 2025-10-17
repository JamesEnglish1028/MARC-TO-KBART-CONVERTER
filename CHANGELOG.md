# Changelog

All notable changes to this project are documented in this file.

## [v1.0.0] - 2025-10-16

### Fixed
- Preserve MARC binary payloads when fetching via CORS proxies (AllOrigins, corsproxy.io). Added detection and decoding for data: URIs and raw base64, and normalized bytes to Blob/File before uploading.
- Ensure uploads use FormData with binary File objects and do not manually set Content-Type so the backend receives identical bytes.
- Added binary debug logging (hex of first 32 bytes) for upload/download verification (configurable via VITE_UPLOAD_DEBUG).

### Changed
- Uppy integration: pass original filename as label, handle file-added/complete events, and make the Dashboard styled consistently.
- Added an Upload icon for Manual uploads and improved accessibility (ARIA/title) and icon sizing.

### Reverted
- Reverted an experimental theming/refactor that introduced CSS regressions. Restored original Tailwind utility classes and removed the experimental semantic theme CSS.

### Misc
- Small UX additions: per-tab caching for results, settings modal with clear-cache action, abort/cancel handling for fetches and uploads.

----

For details and specific file changes, see the git history.
