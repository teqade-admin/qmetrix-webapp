// On GitHub Pages the app is served from a sub-path (/qmetrix-webapp/), which
// Vite exposes as import.meta.env.BASE_URL ('/' in dev). Absolute redirects
// must include it, otherwise they land on the host root and 404.

// '/login' -> '/qmetrix-webapp/login' in production, '/login' in dev.
export const appPath = (path = '') =>
  `${import.meta.env.BASE_URL}${String(path).replace(/^\//, '')}`;

// Same, but fully qualified — for values handed to Supabase (redirectTo).
export const appUrl = (path = '') => `${window.location.origin}${appPath(path)}`;
