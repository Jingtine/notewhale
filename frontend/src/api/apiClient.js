const PROD_API_BASE_URL = "https://notewhale-backend.onrender.com";
const LOCAL_API_BASE_URL = "http://127.0.0.1:8000";
const DESKTOP_API_BASE_URL_KEY = "notewhale_desktop_api_base_url";

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
  if (typeof window !== "undefined") {
    const cachedDesktopUrl = normalizeApiUrl(
      localStorage.getItem(DESKTOP_API_BASE_URL_KEY),
    );

    if (cachedDesktopUrl) {
      return cachedDesktopUrl;
    }
  }

  return API_BASE_URL;
}

export async function getResolvedApiBaseUrl() {
  if (typeof window === "undefined") {
    return API_BASE_URL;
  }

  const bridge = window.notewhaleDesktop;

  if (typeof bridge?.getBackendStatus === "function") {
    try {
      const status = await bridge.getBackendStatus();
      const desktopUrl = normalizeApiUrl(status?.url);

      if (desktopUrl) {
        localStorage.setItem(DESKTOP_API_BASE_URL_KEY, desktopUrl);
        return desktopUrl;
      }
    } catch {
      // Fall back to the cached or default API URL.
    }
  }

  return getApiBaseUrl();
}

function getDesktopBridge() {
  return typeof window !== "undefined" ? window.notewhaleDesktop : null;
}

async function requestLocalApi(path, config) {
  const bridge = getDesktopBridge();

  if (typeof bridge?.localRequest !== "function") {
    return null;
  }

  const result = await bridge.localRequest({
    path,
    method: config.method || "GET",
    headers: config.headers || {},
    body: config.body || null,
  });

  if (!result?.handled) {
    return null;
  }

  return result;
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

  if (!isFormData) {
    const localResult = await requestLocalApi(path, {
      ...config,
      body:
        typeof config.body === "string"
          ? JSON.parse(config.body || "null")
          : config.body,
    });

    if (localResult) {
      if (localResult.status === 401) {
        clearAuthSession();
      }

      if (localResult.status < 200 || localResult.status >= 300) {
        const message =
          localResult.data?.detail ||
          localResult.data?.message ||
          `请求失败：${localResult.status}`;
        throw new Error(message);
      }

      return localResult.data;
    }
  }

  const apiBaseUrl = await getResolvedApiBaseUrl();
  const url = `${apiBaseUrl}${path}`;

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
      apiBaseUrl: getApiBaseUrl(),
    };
  }
}
