import { request } from "./apiClient";

export async function getCourses() {
  return request("/api/courses");
}

export async function createCourse({
  title,
  starred = false,
  folderId = null,
  folderName = "",
}) {
  return request("/api/courses", {
    method: "POST",
    body: {
      title,
      starred,
      folderId,
      folderName,
    },
  });
}

export async function updateCourse(courseId, payload) {
  return request(`/api/courses/${courseId}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteCourse(courseId) {
  return request(`/api/courses/${courseId}`, {
    method: "DELETE",
  });
}

export async function getDeletedCourses() {
  return request("/api/trash/courses");
}

export async function restoreDeletedCourse(courseId, payload = {}) {
  return request(`/api/trash/courses/${courseId}/restore`, {
    method: "POST",
    body: payload,
  });
}

export async function permanentlyDeleteCourse(courseId) {
  return request(`/api/trash/courses/${courseId}/permanent`, {
    method: "DELETE",
  });
}