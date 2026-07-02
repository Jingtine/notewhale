import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseScheduleImportText } from "./scheduleImport.js";

describe("schedule import parser", () => {
  it("parses delimited rows exported from a teaching platform", () => {
    const result = parseScheduleImportText(`课程,星期,节次,地点
高等数学,周一,1-2节,仙林校区 教学楼101
大学英语,周三,08:00-09:40,鼓楼 教室202`);

    assert.equal(result.errors.length, 0);
    assert.deepEqual(result.classes.map((item) => item.title), ["高等数学", "大学英语"]);
    assert.equal(result.classes[0].day, 1);
    assert.equal(result.classes[0].startTime, "08:00");
    assert.equal(result.classes[0].endTime, "09:40");
    assert.equal(result.classes[1].day, 3);
    assert.equal(result.classes[1].location, "鼓楼 教室202");
  });

  it("parses loose copied schedule lines", () => {
    const result = parseScheduleImportText("数据结构 周五 第5-6节 仙林 逸夫楼B201");

    assert.equal(result.classes.length, 1);
    assert.equal(result.classes[0].title, "数据结构");
    assert.equal(result.classes[0].day, 5);
    assert.equal(result.classes[0].startTime, "14:00");
    assert.equal(result.classes[0].endTime, "15:40");
    assert.equal(result.classes[0].location, "仙林 逸夫楼B201");
  });

  it("returns helpful errors when rows cannot be recognized", () => {
    const result = parseScheduleImportText("只有课程名");

    assert.equal(result.classes.length, 0);
    assert.equal(result.errors.length, 1);
  });
});
