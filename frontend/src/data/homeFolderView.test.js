import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildHomeFolderView } from "./homeFolderView.js";

const folders = [
  {
    id: "folder-1",
    title: "数学",
    courses: [
      { id: "course-1", title: "Linear Algebra", starred: true },
      { id: "course-2", title: "Calculus", starred: false },
    ],
  },
  {
    id: "folder-2",
    title: "计算机",
    courses: [{ id: "course-3", title: "Algorithms", starred: true }],
  },
];

describe("home folder view", () => {
  it("returns all folders by default and flattens all courses", () => {
    const view = buildHomeFolderView({ folders });

    assert.equal(view.allCourses.length, 3);
    assert.deepEqual(
      view.visibleFolders.map((folder) => folder.id),
      ["folder-1", "folder-2"]
    );
  });

  it("filters folders and courses by search text", () => {
    const view = buildHomeFolderView({ folders, searchText: "algo" });

    assert.deepEqual(view.visibleFolders, [
      {
        id: "folder-2",
        title: "计算机",
        courses: [{ id: "course-3", title: "Algorithms", starred: true }],
      },
    ]);
  });

  it("builds virtual all-course and starred folders", () => {
    const allCourses = buildHomeFolderView({
      folders,
      selectedFolder: "全部课程",
      searchText: "a",
    });
    const starred = buildHomeFolderView({
      folders,
      selectedFolder: "收藏夹",
    });

    assert.equal(allCourses.visibleFolders[0].id, "all");
    assert.deepEqual(
      allCourses.visibleFolders[0].courses.map((course) => course.id),
      ["course-1", "course-2", "course-3"]
    );
    assert.deepEqual(
      starred.visibleFolders[0].courses.map((course) => course.id),
      ["course-1", "course-3"]
    );
  });

  it("builds trash and recent virtual folders", () => {
    const deletedCourses = [{ id: "deleted-1", title: "Archived" }];
    const trash = buildHomeFolderView({
      folders,
      selectedFolder: "回收站",
      deletedCourses,
    });
    const recent = buildHomeFolderView({
      folders,
      selectedFolder: "最近使用",
      recentLimit: 2,
    });

    assert.deepEqual(trash.visibleFolders[0].courses, deletedCourses);
    assert.deepEqual(
      recent.visibleFolders[0].courses.map((course) => course.id),
      ["course-1", "course-2"]
    );
  });

  it("filters a specifically selected folder", () => {
    const view = buildHomeFolderView({
      folders,
      selectedFolder: "数学",
      searchText: "calc",
    });

    assert.deepEqual(view.visibleFolders[0].courses, [
      { id: "course-2", title: "Calculus", starred: false },
    ]);
  });
});
