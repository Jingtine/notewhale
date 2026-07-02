import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  getAiModelOverride,
  hasCompleteAiModelOverride,
  readAiModelSettings,
  writeAiModelSettings,
} from "./aiModelSettings.js";

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
  };
}

describe("ai model settings", () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
  });

  it("normalizes and persists browser-local model settings", () => {
    writeAiModelSettings({
      text: {
        enabled: true,
        apiUrl: " https://api.example.com/chat ",
        apiKey: " key ",
        model: " model-a ",
      },
    });

    assert.deepEqual(readAiModelSettings().text, {
      enabled: true,
      apiUrl: "https://api.example.com/chat",
      apiKey: "key",
      model: "model-a",
    });
  });

  it("returns request overrides only when enabled", () => {
    const settings = {
      text: {
        enabled: true,
        apiUrl: "https://api.example.com/chat",
        apiKey: "key",
        model: "model-a",
      },
      vision: {
        enabled: false,
        apiUrl: "https://vision.example.com/chat",
        apiKey: "key",
        model: "vision-a",
      },
    };

    assert.deepEqual(getAiModelOverride(settings, "text"), {
      apiUrl: "https://api.example.com/chat",
      apiKey: "key",
      model: "model-a",
    });
    assert.equal(getAiModelOverride(settings, "vision"), null);
    assert.equal(hasCompleteAiModelOverride(settings, "text"), true);
  });
});
