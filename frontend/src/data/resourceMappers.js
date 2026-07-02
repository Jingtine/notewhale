const DEFAULT_RESOURCE_NAME = "课程资料";
const DEFAULT_COURSE_NAME = "未归属课程";

export function mapBackendResource(resource, options = {}) {
  const name =
    resource.name ||
    resource.filename ||
    resource.title ||
    DEFAULT_RESOURCE_NAME;
  const getFileUrl = options.getFileUrl || (() => "");

  return {
    id: `api-resource-${resource.id}`,
    backendId: resource.id,
    name,
    type: resource.type || getFileType(name),
    filePath: resource.filePath || "",
    url: resource.url || "",
    size: resource.size || 0,
    textReady: Boolean(resource.textReady),
    extractedTextLength: Number(resource.extractedTextLength || 0),
    mimeType: guessMimeType(name),
    objectUrl: getFileUrl(resource),
    courseId: resource.courseId ? `api-${resource.courseId}` : null,
    backendCourseId: resource.courseId || null,
    courseName: resource.courseName || DEFAULT_COURSE_NAME,
    createdAt: resource.createdAt || Date.now(),
    backendSynced: true,
  };
}

export function mapBackendResourceForHome(resource) {
  const name =
    resource.filename ||
    resource.title ||
    resource.name ||
    DEFAULT_RESOURCE_NAME;

  return {
    id: `api-resource-${resource.id}`,
    backendId: resource.id,
    title: resource.title || name,
    name,
    filename: name,
    courseId: resource.courseId ? `api-${resource.courseId}` : null,
    backendCourseId: resource.courseId || null,
    courseName: resource.courseName || "",
    filePath: resource.filePath || "",
    backendSynced: true,
    createdAt: resource.createdAt || Date.now(),
  };
}

export function createLocalResource(file, course, options = {}) {
  const now = options.now || Date.now;
  const createObjectUrl =
    options.createObjectUrl || ((targetFile) => URL.createObjectURL(targetFile));
  const createdAt = now();

  return {
    id: `${createdAt}-${file.name}`,
    name: file.name,
    type: getFileType(file.name),
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    objectUrl: createObjectUrl(file),
    courseId: course.id,
    courseName: course.title,
    createdAt,
    backendSynced: false,
  };
}

export function stripTransientResourceFields(resource) {
  const persistableResource = { ...resource };
  delete persistableResource.objectUrl;
  delete persistableResource.dataUrl;
  return persistableResource;
}

export function isResourceReadyForAi(resource) {
  return Boolean(isResourceSynced(resource) && resource?.textReady);
}

export function isResourceSynced(resource) {
  return Boolean(resource?.backendSynced && resource?.backendId);
}

export function getResourceTextStatus(resource) {
  if (!isResourceSynced(resource)) {
    return {
      label: "未同步",
      tone: "muted",
      detail: "重新上传后可解析正文",
    };
  }

  const textLength = Number(resource?.extractedTextLength || 0);

  if (resource?.textReady && textLength >= 20) {
    return {
      label: "已提取文字",
      tone: "success",
      detail: `${textLength} 字`,
    };
  }

  if (textLength > 0) {
    return {
      label: "文字较少",
      tone: "warning",
      detail: `${textLength} 字，可能影响笔记质量`,
    };
  }

  return {
    label: "未提取文字",
    tone: "warning",
    detail: "扫描版 PDF 或图片资料可能需要 OCR",
  };
}

export function guessMimeType(fileName = "") {
  const ext = String(fileName).split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  if (["doc", "docx"].includes(ext)) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (["ppt", "pptx"].includes(ext)) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (["mp3", "wav", "m4a"].includes(ext)) return "audio/mpeg";
  if (["txt", "md"].includes(ext)) return "text/plain";

  return "application/octet-stream";
}

export function getFileType(fileName = "") {
  const ext = String(fileName).split(".").pop()?.toLowerCase();
  if (["pdf"].includes(ext)) return "PDF";
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  if (["doc", "docx"].includes(ext)) return "Word";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "图片";
  if (["mp3", "wav", "m4a"].includes(ext)) return "录音";
  if (["txt", "md"].includes(ext)) return "文本";
  return "资料";
}
