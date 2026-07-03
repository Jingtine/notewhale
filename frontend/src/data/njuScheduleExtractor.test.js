import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  NJU_AUTH_SCHEDULE_URL,
  NJU_PORTAL_SCHEDULE_ENTRY_URL,
  NJU_SCHEDULE_EXTRACTOR_SCRIPT,
  NJU_UNDERGRAD_SCHEDULE_TARGET_URL,
  mapNjuSchedulePayloadToFixedClasses,
} from "./njuScheduleExtractor.js";

describe("NJU schedule extractor bridge", () => {
  it("exposes the auth URL and target URL used by the WebView importer", () => {
    assert.ok(NJU_AUTH_SCHEDULE_URL.includes("authserver.nju.edu.cn"));
    assert.ok(NJU_AUTH_SCHEDULE_URL.includes(encodeURIComponent(NJU_UNDERGRAD_SCHEDULE_TARGET_URL)));
    assert.ok(NJU_PORTAL_SCHEDULE_ENTRY_URL.includes("ehall.nju.edu.cn/portal/html/select_role.html"));
    assert.ok(NJU_PORTAL_SCHEDULE_ENTRY_URL.includes("appId=7170579276974719"));
  });

  it("keeps an injectable script that returns encoded schedule JSON", () => {
    assert.ok(NJU_SCHEDULE_EXTRACTOR_SCRIPT.includes("encodeURIComponent"));
    assert.ok(NJU_SCHEDULE_EXTRACTOR_SCRIPT.includes("querySelectorAll(\"table tbody tr\")"));
  });

  it("maps extracted NJU course payloads to fixed schedule classes", () => {
    const payload = encodeURIComponent(
      JSON.stringify({
        name: "2025-2026学年 第1学期",
        courses: [
          {
            name: "高等数学",
            classroom: "基础实验楼丙405",
            class_number: "MATH001",
            teacher: "张三",
            test_time: "2026-01-10",
            weeks: [14, 15, 16, 17, 18],
            week_time: 3,
            start_time: 2,
            time_count: 2,
            info: "含习题课",
          },
        ],
      })
    );

    const classes = mapNjuSchedulePayloadToFixedClasses(payload, { idPrefix: "test" });

    assert.equal(classes.length, 1);
    assert.equal(classes[0].id, "test-0");
    assert.equal(classes[0].title, "高等数学");
    assert.equal(classes[0].day, 3);
    assert.equal(classes[0].startTime, "09:00");
    assert.equal(classes[0].endTime, "12:00");
    assert.equal(classes[0].teacher, "张三");
    assert.equal(classes[0].classNumber, "MATH001");
    assert.deepEqual(classes[0].weeks, [14, 15, 16, 17, 18]);
  });
});
