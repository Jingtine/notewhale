import { request } from "./apiClient";

export async function getDdls() {
  return request("/api/ddls");
}

export async function createDdl(payload) {
  return request("/api/ddls", {
    method: "POST",
    body: payload,
  });
}

export async function updateDdl(ddlId, payload) {
  return request(`/api/ddls/${ddlId}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteDdl(ddlId) {
  return request(`/api/ddls/${ddlId}`, {
    method: "DELETE",
  });
}

export async function recognizeDdlFromImage({
  courseId = null,
  courseName = "未归属课程",
  imageName = "",
  rawText = "",
} = {}) {
  return request("/api/ddls/recognize", {
    method: "POST",
    body: {
      courseId,
      courseName,
      imageName,
      rawText,
    },
  });
}

export async function recognizeDdlWithVisionAgent({
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

  return request(`/api/ddls/recognize-agent?${params.toString()}`, {
    method: "POST",
    body: formData,
  });
}