import { request } from "./apiClient";

export async function getNotes() {
  return request("/api/notes");
}

export async function createNote({
  title,
  content = "",
  courseId = null,
  courseName = "",
  source = "手动记录",
  aiGenerated = false,
}) {
  return request("/api/notes", {
    method: "POST",
    body: {
      title,
      content,
      courseId,
      courseName,
      source,
      aiGenerated,
    },
  });
}

export async function updateNote(noteId, payload) {
  return request(`/api/notes/${noteId}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteNote(noteId) {
  return request(`/api/notes/${noteId}`, {
    method: "DELETE",
  });
}

export async function generateNote({
  courseId = null,
  courseName = "课程",
  resourceName = "课程资料",
  resourceId = null,
  rawText = "",
  noteStyle = "复习型",
}) {
  return request("/api/notes/generate", {
    method: "POST",
    body: {
      courseId,
      courseName,
      resourceName,
      resourceId,
      rawText,
      noteStyle,
    },
  });
}