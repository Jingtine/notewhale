export function mapBackendDdl(ddl) {
  return {
    ...ddl,
    id: `api-ddl-${ddl.id}`,
    backendId: ddl.id,
    courseId: ddl.courseId ? `api-${ddl.courseId}` : null,
    backendCourseId: ddl.courseId || null,
    courseName: ddl.courseName || "未归属课程",
    platform: ddl.platform || "",
    note: ddl.note || "",
    completed: Boolean(ddl.completed),
    source: ddl.source || "后端同步",
    backendSynced: true,
  };
}

export function mapBackendNote(note) {
  const source = note.source || "手动记录";

  return {
    id: `api-note-${note.id}`,
    backendId: note.id,
    title: note.title || "未命名笔记",
    content: note.content || "",
    syntaxMode: "markdown",
    courseId: note.courseId ? `api-${note.courseId}` : null,
    backendCourseId: note.courseId || null,
    courseName: note.courseName || "",
    source,
    sourceResourceId: null,
    sourceResourceName: source,
    sourceResourceType: note.aiGenerated ? "AI笔记" : "笔记",
    aiGenerated: Boolean(note.aiGenerated),
    backendSynced: true,
    createdAt: note.createdAt || Date.now(),
    updatedAt: note.updatedAt || note.createdAt || Date.now(),
  };
}
