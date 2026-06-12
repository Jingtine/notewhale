import { request } from "./apiClient";

export async function getFolders() {
  return request("/api/folders");
}

export async function createFolder({ title }) {
  return request("/api/folders", {
    method: "POST",
    body: {
      title,
    },
  });
}

export async function updateFolder(folderId, payload) {
  return request(`/api/folders/${folderId}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteFolder(folderId, { deleteCourses = false } = {}) {
  return request(`/api/folders/${folderId}?deleteCourses=${deleteCourses}`, {
    method: "DELETE",
  });
}