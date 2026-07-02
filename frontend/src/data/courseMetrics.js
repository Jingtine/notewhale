export function countLinkedItemsForCourse(course, items = [], options = {}) {
  const courseIdText = String(course?.id || "");
  const backendIdText = course?.backendId ? String(course.backendId) : "";
  const localKeyFields = options.localKeyFields || ["id", "title", "createdAt"];
  const seen = new Set();

  return items.filter((item) => {
    const itemKey = item.backendId
      ? `backend-${item.backendId}`
      : `local-${getFirstValue(item, localKeyFields)}`;

    if (seen.has(itemKey)) return false;

    const itemCourseId = String(item.courseId || "");
    const itemBackendCourseId = item.backendCourseId
      ? String(item.backendCourseId)
      : "";

    if (backendIdText) {
      const matched = itemBackendCourseId === backendIdText;
      if (matched) seen.add(itemKey);
      return matched;
    }

    const matched = itemCourseId === courseIdText;
    if (matched) seen.add(itemKey);
    return matched;
  }).length;
}

export function countActiveDdlsForCourse(course, ddls = []) {
  const courseIdText = String(course?.id || "");
  const backendIdText = course?.backendId ? String(course.backendId) : "";
  const courseTitleText = String(course?.title || "");

  return ddls.filter((ddl) => {
    if (ddl.completed) return false;

    return (
      String(ddl.courseId || "") === courseIdText ||
      (backendIdText && String(ddl.courseId || "") === backendIdText) ||
      (backendIdText && String(ddl.backendCourseId || "") === backendIdText) ||
      (courseTitleText && String(ddl.courseName || "") === courseTitleText)
    );
  }).length;
}

export function addCourseStatsToFolders({
  folders = [],
  notes = [],
  resources = [],
  ddls = [],
} = {}) {
  return folders.map((folder) => ({
    ...folder,
    courses: (folder.courses || []).map((course) => ({
      ...course,
      noteCount: countLinkedItemsForCourse(course, notes, {
        localKeyFields: ["id", "title", "createdAt"],
      }),
      ddlCount: countActiveDdlsForCourse(course, ddls),
      resourceCount: countLinkedItemsForCourse(course, resources, {
        localKeyFields: ["id", "filename", "name", "createdAt"],
      }),
    })),
  }));
}

function getFirstValue(item, fields) {
  for (const field of fields) {
    if (item[field]) return item[field];
  }

  return "";
}
