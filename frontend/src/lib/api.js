import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

// Endpoints that don't require auth — let them through even without a token.
const PUBLIC_PREFIXES = ["/auth/", "/public/"];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cv_token");
  const url = config.url || "";
  const isPublic = PUBLIC_PREFIXES.some((p) => url.startsWith(p));

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  // No token + protected endpoint → cancel the request before it hits the network.
  // This prevents stray 401 errors and the axios-blob "responseText" DOMException
  // from in-flight image/blob requests after logout.
  if (!isPublic) {
    const controller = new AbortController();
    controller.abort();
    config.signal = controller.signal;
  }
  return config;
});

// Centralized error handler:
// 1) silence axios's known blob-responseType "responseText" DOMException on 401
// 2) on auth failure, drop the stale token so the next render redirects cleanly
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      try { localStorage.removeItem("cv_token"); } catch (_) { /* noop */ }
    }
    return Promise.reject(err);
  }
);

export default api;
