import { request, getApiBaseUrl } from "./apiClient";

export async function getResources() {
  return request("/api/resources");
}

export async function uploadResource({
  file,
  courseId = null,
  courseName = "未归属课程",
}) {
  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams();

  if (courseId !== null && courseId !== undefined && courseId !== "") {
    const rawCourseId = String(courseId).startsWith("api-")
      ? String(courseId).replace(/^api-/, "")
      : String(courseId);

    params.set("courseId", rawCourseId);
  }

  params.set("courseName", courseName || "未归属课程");

  return request(`/api/resources/upload?${params.toString()}`, {
    method: "POST",
    body: formData,
  });
}

export async function deleteResource(resourceId) {
  const rawResourceId = String(resourceId).startsWith("api-resource-")
    ? String(resourceId).replace(/^api-resource-/, "")
    : String(resourceId);

  return request(`/api/resources/${rawResourceId}`, {
    method: "DELETE",
  });
}

export function getResourceFileUrl(resource) {
  const baseUrl = getApiBaseUrl();

  if (resource?.url) {
    return String(resource.url).startsWith("http")
      ? resource.url
      : `${baseUrl}${resource.url}`;
  }

  if (!resource?.filePath) return "";

  if (String(resource.filePath).startsWith("http")) {
    return resource.filePath;
  }

  const path = String(resource.filePath).startsWith("/")
    ? resource.filePath
    : `/${resource.filePath}`;

  return `${baseUrl}${path}`;
}