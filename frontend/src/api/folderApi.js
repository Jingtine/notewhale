import { request } from "./apiClient";

export async function getFolders() {
  return request("/api/folders");
}

export async function createFolder({ title }) {
  return request("/api/folders", {
    method: "POST",
    body: { title },
  });
}

export async function updateFolder(folderId, payload) {
  return request(`/api/folders/${folderId}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteFolder(folderId, { deleteCourses = true } = {}) {
  // Use a POST compatibility endpoint instead of DELETE.
  // This avoids browser / proxy issues where DELETE preflight requests may fail in production.
  return request(`/api/folders/${folderId}/delete?deleteCourses=${deleteCourses}`, {
    method: "POST",
  });
}