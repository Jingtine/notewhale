import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGlobalSearchItems,
  createSearchSnippet,
} from "./globalSearch.js";

describe("global search", () => {
  it("builds course, note, resource, and DDL search items in display order", () => {
    const items = buildGlobalSearchItems({
      courses: [{ id: "course-1", title: "Algorithms" }],
      notes: [{ id: "note-1", title: "Greedy", courseId: "course-1" }],
      resources: [{ id: "res-1", name: "slides.pdf", courseId: "course-1" }],
      ddls: [{ id: "ddl-1", title: "Homework", courseName: "Algorithms" }],
    });

    assert.deepEqual(
      items.map((item) => item.type),
      ["course", "note", "resource", "ddl"]
    );
    assert.equal(items[0].path, "/course/course-1");
    assert.equal(items[1].path, "/course/course-1/note/note-1");
    assert.equal(items[2].path, "/course/course-1");
    assert.equal(items[3].path, "/ddl");
  });

  it("links notes and resources to courses by course name when ids are missing", () => {
    const items = buildGlobalSearchItems({
      courses: [{ id: "course-2", title: "Databases" }],
      notes: [{ id: "note-2", title: "Index", courseName: "Databases" }],
      resources: [{ id: "res-2", name: "schema.png", courseName: "Databases" }],
    });

    assert.equal(items[1].path, "/course/course-2/note/note-2");
    assert.equal(items[2].path, "/course/course-2");
  });

  it("uses fallback text for unassigned and untitled items", () => {
    const items = buildGlobalSearchItems({
      notes: [{ id: "note-3", content: "" }],
      resources: [{ id: "res-3" }],
      ddls: [{ id: "ddl-3" }],
    });

    assert.equal(items[0].title, "未命名笔记");
    assert.equal(items[0].subtitle, "未归属课程 · 笔记正文");
    assert.equal(items[1].title, "未命名资料");
    assert.equal(items[2].title, "未命名 DDL");
  });

  it("creates plain snippets from markdown-ish content", () => {
    assert.equal(createSearchSnippet("# Title **important** $x$"), "Title important x");
  });
});
