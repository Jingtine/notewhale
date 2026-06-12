import { request } from "./apiClient";

export async function getDdls() {
  return request("/api/ddls");
}

export async function createDdl({
  title,
  date,
  courseId = null,
  courseName = "未归属课程",
  platform = "",
  note = "",
  completed = false,
  source = "手动新建",
}) {
  return request("/api/ddls", {
    method: "POST",
    body: {
      title,
      date,
      courseId,
      courseName,
      platform,
      note,
      completed,
      source,
    },
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
} = {}) {
  return request("/api/ddls/recognize", {
    method: "POST",
    body: {
      courseId,
      courseName,
    },
  });
}