const USER_STORAGE_PREFIX = "notewhale_user";
const CURRENT_USER_ID_KEY = "notewhale_current_user_id";

export function getUserStorageKey(user, key) {
  const rawUserId =
    user?.id ||
    user?.account ||
    user?.email ||
    localStorage.getItem(CURRENT_USER_ID_KEY) ||
    "guest";

  const safeUserId = String(rawUserId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${USER_STORAGE_PREFIX}_${safeUserId}_${key}`;
}

export function readUserStorageArray(user, key, fallback = [], options = {}) {
  const scopedValue = readArrayFromStorage(getUserStorageKey(user, key), null);

  if (scopedValue) {
    return scopedValue;
  }

  if (options.legacyKey) {
    return readArrayFromStorage(options.legacyKey, fallback);
  }

  return fallback;
}

export function writeUserStorageArray(user, key, value) {
  localStorage.setItem(getUserStorageKey(user, key), JSON.stringify(value));
}

export function readUserStorageValue(user, key, fallback = null) {
  try {
    const value = localStorage.getItem(getUserStorageKey(user, key));
    if (value === null) return fallback;

    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function writeUserStorageValue(user, key, value) {
  localStorage.setItem(getUserStorageKey(user, key), JSON.stringify(value));
}

export function readStorageArray(key, fallback = []) {
  return readArrayFromStorage(key, fallback);
}

export function readFirstStorageArray(keys, fallback = []) {
  for (const key of keys) {
    const value = readArrayFromStorage(key, null);

    if (value) {
      return value;
    }
  }

  return fallback;
}

export function writeStorageArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readStorageBoolean(key, fallback = false) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;

    return JSON.parse(value) === true;
  } catch {
    return fallback;
  }
}

export function writeStorageValue(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readArrayFromStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;

    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
