const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;

  const config = {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  };

  if (config.body && !isFormData && typeof config.body !== "string") {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  let data = null;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      data?.detail || data?.message || `请求失败：${response.status}`;
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
    };
  }
}