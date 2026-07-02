import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapBackendDdl, mapBackendNote } from "./learningItemMappers.js";

describe("learning item mappers", () => {
  it("maps backend DDL ids and course references for frontend state", () => {
    const ddl = mapBackendDdl({
      id: 42,
      title: "Essay",
      courseId: 7,
      courseName: "Writing",
      platform: "Canvas",
      note: "Upload pdf",
      completed: 1,
      source: "manual",
    });

    assert.equal(ddl.id, "api-ddl-42");
    assert.equal(ddl.backendId, 42);
    assert.equal(ddl.courseId, "api-7");
    assert.equal(ddl.backendCourseId, 7);
    assert.equal(ddl.courseName, "Writing");
    assert.equal(ddl.completed, true);
    assert.equal(ddl.backendSynced, true);
  });

  it("maps backend notes with editor-compatible metadata", () => {
    const note = mapBackendNote({
      id: 9,
      title: "Week 1",
      content: "# Intro",
      courseId: 3,
      courseName: "AI",
      source: "slides.pdf",
      aiGenerated: true,
      createdAt: 1000,
      updatedAt: 2000,
    });

    assert.equal(note.id, "api-note-9");
    assert.equal(note.backendId, 9);
    assert.equal(note.syntaxMode, "markdown");
    assert.equal(note.courseId, "api-3");
    assert.equal(note.backendCourseId, 3);
    assert.equal(note.sourceResourceName, "slides.pdf");
    assert.equal(note.sourceResourceType, "AI笔记");
    assert.equal(note.createdAt, 1000);
    assert.equal(note.updatedAt, 2000);
    assert.equal(note.backendSynced, true);
  });
});
