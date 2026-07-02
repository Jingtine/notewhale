import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addCourseStatsToFolders,
  countActiveDdlsForCourse,
  countLinkedItemsForCourse,
} from "./courseMetrics.js";

describe("course metrics", () => {
  it("counts backend-linked items by backend course id and deduplicates them", () => {
    const course = { id: "api-3", backendId: 3, title: "ML" };
    const items = [
      { id: "api-note-1", backendId: 1, backendCourseId: 3 },
      { id: "api-note-1-copy", backendId: 1, backendCourseId: 3 },
      { id: "local-cache", courseId: "api-3" },
      { id: "other", backendId: 2, backendCourseId: 4 },
    ];

    assert.equal(countLinkedItemsForCourse(course, items), 1);
  });

  it("counts local-linked items by local course id and deduplicates them", () => {
    const course = { id: "local-course", title: "Draft" };
    const items = [
      { id: "note-1", courseId: "local-course" },
      { id: "note-1", courseId: "local-course" },
      { id: "note-2", courseId: "other-course" },
    ];

    assert.equal(countLinkedItemsForCourse(course, items), 1);
  });

  it("counts active DDLs without matching blank backend ids", () => {
    const course = { id: "local-course", title: "Writing" };
    const ddls = [
      { id: 1, courseId: "local-course", completed: false },
      { id: 2, courseId: "other-course", completed: false },
      { id: 3, courseName: "Writing", completed: false },
      { id: 4, courseId: "local-course", completed: true },
      { id: 5, backendCourseId: null, completed: false },
    ];

    assert.equal(countActiveDdlsForCourse(course, ddls), 2);
  });

  it("counts backend DDLs by backend id", () => {
    const course = { id: "api-9", backendId: 9, title: "Databases" };
    const ddls = [
      { id: 1, backendCourseId: 9, completed: false },
      { id: 2, courseId: 9, completed: false },
      { id: 3, backendCourseId: 9, completed: true },
      { id: 4, backendCourseId: null, completed: false },
    ];

    assert.equal(countActiveDdlsForCourse(course, ddls), 2);
  });

  it("adds note, DDL, and resource stats to visible folders", () => {
    const folders = [
      {
        id: "folder-1",
        title: "Active",
        courses: [
          { id: "api-3", backendId: 3, title: "ML" },
          { id: "local-course", title: "Writing" },
        ],
      },
    ];
    const notes = [
      { id: "note-1", backendId: 10, backendCourseId: 3 },
      { id: "note-2", courseId: "local-course" },
    ];
    const resources = [
      { id: "res-1", backendId: 20, backendCourseId: 3 },
      { id: "res-2", courseId: "local-course" },
      { id: "res-2", courseId: "local-course" },
    ];
    const ddls = [
      { id: "ddl-1", backendCourseId: 3, completed: false },
      { id: "ddl-2", courseId: "local-course", completed: false },
      { id: "ddl-3", courseId: "local-course", completed: true },
    ];

    const [folder] = addCourseStatsToFolders({
      folders,
      notes,
      resources,
      ddls,
    });

    assert.deepEqual(
      folder.courses.map((course) => ({
        id: course.id,
        noteCount: course.noteCount,
        ddlCount: course.ddlCount,
        resourceCount: course.resourceCount,
      })),
      [
        { id: "api-3", noteCount: 1, ddlCount: 1, resourceCount: 1 },
        { id: "local-course", noteCount: 1, ddlCount: 1, resourceCount: 1 },
      ]
    );
  });
});
