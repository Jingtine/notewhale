import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  getUserStorageKey,
  readFirstStorageArray,
  readStorageArray,
  readStorageBoolean,
  readUserStorageArray,
  readUserStorageValue,
  writeStorageArray,
  writeStorageValue,
  writeUserStorageArray,
  writeUserStorageValue,
} from "./userStorage.js";

function createMemoryStorage() {
  const store = new Map();

  return {
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
  };
}

describe("user storage", () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
  });

  it("builds safe user-scoped storage keys", () => {
    assert.equal(
      getUserStorageKey({ account: "student@example.com" }, "folders"),
      "notewhale_user_student_example_com_folders"
    );
  });

  it("falls back to the persisted current user id for scoped keys", () => {
    localStorage.setItem("notewhale_current_user_id", "user:42");

    assert.equal(
      getUserStorageKey(null, "ddls"),
      "notewhale_user_user_42_ddls"
    );
  });

  it("writes and reads user-scoped arrays", () => {
    const notes = [{ id: "note-1", title: "Linear Algebra" }];

    writeUserStorageArray({ id: "student-1" }, "notes", notes);

    assert.deepEqual(
      readUserStorageArray({ id: "student-1" }, "notes"),
      notes
    );
  });

  it("writes and reads user-scoped values", () => {
    writeUserStorageValue({ id: "student-1" }, "semesterStartMonday", "2026-03-02");

    assert.equal(
      readUserStorageValue({ id: "student-1" }, "semesterStartMonday", ""),
      "2026-03-02"
    );
    assert.equal(
      readUserStorageValue({ id: "student-2" }, "semesterStartMonday", "unset"),
      "unset"
    );
  });

  it("uses legacy arrays only when scoped storage is empty", () => {
    writeStorageArray("legacy_notes", [{ id: "legacy" }]);

    assert.deepEqual(
      readUserStorageArray(
        { id: "student-1" },
        "notes",
        [],
        { legacyKey: "legacy_notes" }
      ),
      [{ id: "legacy" }]
    );

    writeUserStorageArray({ id: "student-1" }, "notes", [{ id: "scoped" }]);

    assert.deepEqual(
      readUserStorageArray(
        { id: "student-1" },
        "notes",
        [],
        { legacyKey: "legacy_notes" }
      ),
      [{ id: "scoped" }]
    );
  });

  it("reads the first valid array from a list of storage keys", () => {
    localStorage.setItem("bad", JSON.stringify({ id: "not-an-array" }));
    writeStorageArray("folders", [{ id: "folder-1" }]);

    assert.deepEqual(
      readFirstStorageArray(["missing", "bad", "folders"], []),
      [{ id: "folder-1" }]
    );
  });

  it("returns fallbacks for invalid arrays", () => {
    localStorage.setItem("notes", "{");

    assert.deepEqual(readStorageArray("notes", [{ id: "fallback" }]), [
      { id: "fallback" },
    ]);
  });

  it("reads boolean values with fallbacks", () => {
    assert.equal(readStorageBoolean("flag", true), true);

    writeStorageValue("flag", true);
    assert.equal(readStorageBoolean("flag"), true);

    writeStorageValue("flag", false);
    assert.equal(readStorageBoolean("flag", true), false);

    localStorage.setItem("flag", "{");
    assert.equal(readStorageBoolean("flag", true), true);
  });
});
