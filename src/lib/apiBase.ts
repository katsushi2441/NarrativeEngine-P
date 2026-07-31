/**
 * API base URL — protocol-aware for Electron production builds, and
 * path-aware for reverse-proxy deployments (kgm fork).
 *
 * In dev:    Vite proxies relative `/api/...` calls to http://localhost:3001
 * In prod:   The React app is loaded via Electron's loadFile() (file:// protocol).
 *            Relative paths won't reach Express, so we use an absolute URL instead.
 * Behind a proxy: kgm serves the app through a path-prefixing reverse proxy
 *            (https://kurage.exbridge.jp/kgm.php/...). Absolute `/api` would
 *            escape the proxy path and 404, so detect the `/<entry>.php`
 *            prefix from the current location at runtime and keep every API
 *            and asset URL underneath it.
 */
const PROXY_BASE =
    typeof window !== 'undefined'
        ? (window.location.pathname.match(/^\/[^/]+\.php(?=\/|$)/)?.[0] ?? '')
        : '';

export const API_BASE =
    typeof window !== 'undefined' && window.location.protocol === 'file:'
        ? 'http://localhost:3001/api'
        : `${PROXY_BASE}/api`;

/**
 * Asset base URL for portrait images served by Express.
 * Same logic: relative paths break under file://, so use absolute in production.
 */
export const ASSET_BASE =
    typeof window !== 'undefined' && window.location.protocol === 'file:'
        ? 'http://localhost:3001'
        : PROXY_BASE;
