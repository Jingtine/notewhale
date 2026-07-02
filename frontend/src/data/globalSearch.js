const DEFAULT_COURSE_TITLE = "未归属课程";

export function buildGlobalSearchItems({
  courses = [],
  notes = [],
  resources = [],
  ddls = [],
} = {}) {
  const courseTitleById = new Map(
    courses.map((course) => [String(course.id), course.title])
  );
  const courseIdByTitle = new Map(
    courses.map((course) => [course.title, course.id])
  );

  const courseItems = courses.map((course) => ({
    key: `course-${course.id}`,
    type: "course",
    typeLabel: "课程",
    title: course.title,
    subtitle: "课程空间 · 资料 / 笔记 / DDL",
    content: course.title,
    path: `/course/${course.id}`,
  }));

  const noteItems = notes.map((note) => {
    const courseId = note.courseId || courseIdByTitle.get(note.courseName);
    const courseTitle =
      note.courseName || courseTitleById.get(String(courseId)) || DEFAULT_COURSE_TITLE;

    return {
      key: `note-${note.id}`,
      type: "note",
      typeLabel: "笔记",
      title: note.title || "未命名笔记",
      subtitle: `${courseTitle} · ${createSearchSnippet(note.content) || "笔记正文"}`,
      content: `${note.title || ""} ${courseTitle} ${note.content || ""}`,
      path: courseId ? `/course/${courseId}/note/${note.id}` : "/",
    };
  });

  const resourceItems = resources.map((resource) => {
    const courseId = resource.courseId || courseIdByTitle.get(resource.courseName);
    const courseTitle =
      resource.courseName ||
      courseTitleById.get(String(courseId)) ||
      DEFAULT_COURSE_TITLE;

    return {
      key: `resource-${resource.id}`,
      type: "resource",
      typeLabel: "文件",
      title: resource.name || "未命名资料",
      subtitle: `${courseTitle} · ${resource.type || "资料"}`,
      content: `${resource.name || ""} ${courseTitle} ${resource.type || ""}`,
      path: courseId ? `/course/${courseId}` : "/",
    };
  });

  const ddlItems = ddls.map((ddl) => {
    const courseTitle = ddl.courseName || DEFAULT_COURSE_TITLE;

    return {
      key: `ddl-${ddl.id}`,
      type: "ddl",
      typeLabel: "DDL",
      title: ddl.title || "未命名 DDL",
      subtitle: `${courseTitle} · ${ddl.date || "未设置时间"}`,
      content: `${ddl.title || ""} ${courseTitle} ${ddl.date || ""} ${ddl.platform || ""} ${ddl.note || ""}`,
      path: "/ddl",
    };
  });

  return [...courseItems, ...noteItems, ...resourceItems, ...ddlItems];
}

export function createSearchSnippet(text = "", limit = 52) {
  return String(text)
    .replace(/[#>*_`$\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
