import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addCourseToUnassignedFolder,
  isRealFolder,
  loadBackendFolderSnapshot,
  mapBackendCourse,
  mapBackendFolder,
  placeRestoredBackendCourse,
} from "./courseFolderStore.js";

describe("course folder store", () => {
  it("maps backend folders and nested courses", () => {
    const folder = mapBackendFolder({
      id: 5,
      title: "Machine Learning",
      createdAt: 1234,
      courses: [
        {
          id: 8,
          title: "Neural Nets",
          starred: true,
          folderId: 5,
          folderName: "Machine Learning",
        },
      ],
    });

    assert.equal(folder.id, "api-folder-5");
    assert.equal(folder.backendId, 5);
    assert.equal(folder.courses.length, 1);
    assert.deepEqual(folder.courses[0], {
      id: "api-8",
      backendId: 8,
      title: "Neural Nets",
      starred: true,
      noteCount: 0,
      ddlCount: 0,
      folderId: "api-folder-5",
      backendFolderId: 5,
      folderName: "Machine Learning",
      backendSynced: true,
    });
  });

  it("loads a backend folder snapshot and hides deleted folders", async () => {
    const snapshot = await loadBackendFolderSnapshot({
      deletedFolderIds: [2],
      getFolders: async () => [
        { id: 1, title: "Visible", courses: [{ id: 10, title: "A" }] },
        { id: 2, title: "Hidden", courses: [{ id: 20, title: "B" }] },
        { id: null, title: "Loose", courses: [{ id: 30, title: "C" }] },
      ],
    });

    assert.equal(snapshot.folderCount, 2);
    assert.equal(snapshot.courseCount, 2);
    assert.deepEqual(
      snapshot.folders.map((folder) => folder.id),
      ["api-folder-1", "__unassigned"]
    );
  });

  it("adds local-only courses to an existing unassigned folder", () => {
    const course = { id: "local-1", title: "Draft" };
    const folders = addCourseToUnassignedFolder(
      [{ id: "__unassigned", title: "Loose", courses: [] }],
      course
    );

    assert.equal(folders.length, 1);
    assert.deepEqual(folders[0].courses, [course]);
  });

  it("places restored backend courses back into their original folder", () => {
    const restored = {
      ...mapBackendCourse({
        id: 12,
        title: "Recovered",
        folderId: 4,
        folderName: "Archive",
      }),
      folderName: "Archive",
    };

    const folders = placeRestoredBackendCourse([], restored);

    assert.equal(folders.length, 1);
    assert.equal(folders[0].id, "api-folder-4");
    assert.equal(folders[0].title, "Archive");
    assert.equal(folders[0].courses[0].id, "api-12");
  });

  it("distinguishes real folders from virtual navigation folders", () => {
    assert.equal(isRealFolder({ id: "api-folder-1" }), true);
    assert.equal(isRealFolder({ id: "trash" }), false);
    assert.equal(isRealFolder({ id: "__unassigned" }), false);
  });
});
