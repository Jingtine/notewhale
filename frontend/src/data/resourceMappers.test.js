import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createLocalResource,
  getFileType,
  getResourceTextStatus,
  guessMimeType,
  isResourceReadyForAi,
  isResourceSynced,
  mapBackendResource,
  mapBackendResourceForHome,
  stripTransientResourceFields,
} from "./resourceMappers.js";

describe("resource mappers", () => {
  it("maps backend resources for course pages", () => {
    const mapped = mapBackendResource(
      {
        id: 8,
        filename: "slides.pdf",
        size: 2048,
        textReady: true,
        extractedTextLength: 1200,
        courseId: 3,
        courseName: "Machine Learning",
        filePath: "/uploads/slides.pdf",
        createdAt: 1000,
      },
      { getFileUrl: (resource) => `https://files.test${resource.filePath}` }
    );

    assert.deepEqual(mapped, {
      id: "api-resource-8",
      backendId: 8,
      name: "slides.pdf",
      type: "PDF",
      filePath: "/uploads/slides.pdf",
      url: "",
      size: 2048,
      textReady: true,
      extractedTextLength: 1200,
      mimeType: "application/pdf",
      objectUrl: "https://files.test/uploads/slides.pdf",
      courseId: "api-3",
      backendCourseId: 3,
      courseName: "Machine Learning",
      createdAt: 1000,
      backendSynced: true,
    });
  });

  it("maps backend resources for the home search index", () => {
    assert.deepEqual(
      mapBackendResourceForHome({
        id: 9,
        title: "Week 1",
        filename: "week-1.docx",
        courseId: 4,
        courseName: "Writing",
        createdAt: 2000,
      }),
      {
        id: "api-resource-9",
        backendId: 9,
        title: "Week 1",
        name: "week-1.docx",
        filename: "week-1.docx",
        courseId: "api-4",
        backendCourseId: 4,
        courseName: "Writing",
        filePath: "",
        backendSynced: true,
        createdAt: 2000,
      }
    );
  });

  it("creates local-only resources with preview URLs", () => {
    const file = {
      name: "voice.m4a",
      size: 4096,
      type: "audio/mp4",
    };

    assert.deepEqual(
      createLocalResource(
        file,
        { id: "course-1", title: "Listening" },
        {
          now: () => 3000,
          createObjectUrl: (targetFile) => `blob://${targetFile.name}`,
        }
      ),
      {
        id: "3000-voice.m4a",
        name: "voice.m4a",
        type: "录音",
        size: 4096,
        mimeType: "audio/mp4",
        objectUrl: "blob://voice.m4a",
        courseId: "course-1",
        courseName: "Listening",
        createdAt: 3000,
        backendSynced: false,
      }
    );
  });

  it("strips transient preview data before local persistence", () => {
    assert.deepEqual(
      stripTransientResourceFields({
        id: "local-1",
        name: "image.png",
        objectUrl: "blob://image",
        dataUrl: "data:image/png",
      }),
      {
        id: "local-1",
        name: "image.png",
      }
    );
  });

  it("reports resource AI readiness and text extraction status", () => {
    const local = { backendSynced: false };
    const syncedReady = {
      backendSynced: true,
      backendId: 12,
      textReady: true,
      extractedTextLength: 32,
    };
    const syncedShort = {
      backendSynced: true,
      backendId: 13,
      textReady: false,
      extractedTextLength: 4,
    };

    assert.equal(isResourceSynced(local), false);
    assert.equal(isResourceReadyForAi(local), false);
    assert.equal(isResourceReadyForAi(syncedReady), true);
    assert.equal(getResourceTextStatus(local).label, "未同步");
    assert.equal(getResourceTextStatus(syncedReady).label, "已提取文字");
    assert.equal(getResourceTextStatus(syncedShort).label, "文字较少");
  });

  it("infers display file types and mime types", () => {
    assert.equal(getFileType("slides.pptx"), "PPT");
    assert.equal(getFileType("notes.md"), "文本");
    assert.equal(getFileType("archive.zip"), "资料");
    assert.equal(guessMimeType("photo.webp"), "image/webp");
    assert.equal(guessMimeType("unknown.bin"), "application/octet-stream");
  });
});
