const PROD_API_BASE_URL = "https://notewhale-backend.onrender.com";
const LOCAL_API_BASE_URL = "http://127.0.0.1:8000";

function normalizeApiUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function resolveApiBaseUrl() {
  const envUrl = normalizeApiUrl(import.meta.env.VITE_API_BASE_URL);

  if (envUrl) {
    return envUrl;
  }

  // Deployment fallback:
  // If Vercel did not inject VITE_API_BASE_URL correctly, still use the Render backend
  // when the site is running on a Vercel domain.
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname || "";

    if (hostname === "notewhale.vercel.app" || hostname.endsWith(".vercel.app")) {
      return PROD_API_BASE_URL;
    }
  }

  return LOCAL_API_BASE_URL;
}

const API_BASE_URL = resolveApiBaseUrl();

const TOKEN_STORAGE_KEY = "notewhale_token";
const USER_STORAGE_KEY = "notewhale_user";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

export function saveAuthSession(session) {
  if (session?.token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
  }

  saveUser(session?.user);
}

export function saveUser(user) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;
  const token = getAuthToken();

  const config = {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  };

  if (config.body && !isFormData && typeof config.body !== "string") {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  let data;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      data?.detail || data?.message || `请求失败：${response.status}`;

    if (response.status === 401) {
      clearAuthSession();
    }

    throw new Error(message);
  }

  return data;
}

export async function checkBackendHealth() {
  try {
    return await request("/health");
  } catch (error) {
    return {
      status: "offline",
      service: "notewhale-backend",
      message: error.message,
      apiBaseUrl: API_BASE_URL,
    };
  }
}
