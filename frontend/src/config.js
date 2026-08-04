// Central source of truth for the backend origin (API base + Socket.IO target).
// Resolves via VITE_API_URL in production; falls back to localhost for local dev
// so nothing breaks when the env var is unset.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
