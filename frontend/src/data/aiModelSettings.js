const AI_MODEL_SETTINGS_KEY = "notewhale_ai_model_settings";

export const DEFAULT_AI_MODEL_SETTINGS = {
  text: {
    enabled: false,
    apiUrl: "",
    apiKey: "",
    model: "",
  },
  vision: {
    enabled: false,
    apiUrl: "",
    apiKey: "",
    model: "",
  },
};

export function readAiModelSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AI_MODEL_SETTINGS_KEY) || "null");
    return normalizeAiModelSettings(parsed);
  } catch {
    return DEFAULT_AI_MODEL_SETTINGS;
  }
}

export function writeAiModelSettings(settings) {
  const normalized = normalizeAiModelSettings(settings);
  localStorage.setItem(AI_MODEL_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

export function normalizeAiModelSettings(settings) {
  return {
    text: normalizeProviderSettings(settings?.text),
    vision: normalizeProviderSettings(settings?.vision),
  };
}

export function getAiModelOverride(settings, provider) {
  const config = normalizeProviderSettings(settings?.[provider]);

  if (!config.enabled) return null;

  return {
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    model: config.model,
  };
}

export function hasCompleteAiModelOverride(settings, provider) {
  const config = normalizeProviderSettings(settings?.[provider]);
  return Boolean(config.enabled && config.apiUrl && config.apiKey && config.model);
}

function normalizeProviderSettings(config = {}) {
  return {
    enabled: Boolean(config.enabled),
    apiUrl: String(config.apiUrl || "").trim(),
    apiKey: String(config.apiKey || "").trim(),
    model: String(config.model || "").trim(),
  };
}
