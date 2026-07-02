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

  it("parses NJU teaching table rows with multiple time segments", () => {
    const result = parseScheduleImportText(`课程号\t课程名\t教师\t上课时间\t备注\t考试时间
MATH001\t高等数学\t张三\t周三 2-4节 14-18周 基础实验楼丙405,周五 5-6节 1-3周,10-13周 仙Ⅱ-304\t含习题课\t2026-01-10`);

    assert.equal(result.errors.length, 0);
    assert.equal(result.classes.length, 2);
    assert.equal(result.classes[0].title, "高等数学");
    assert.equal(result.classes[0].day, 3);
    assert.equal(result.classes[0].startTime, "08:55");
    assert.equal(result.classes[0].endTime, "11:40");
    assert.equal(result.classes[0].location, "基础实验楼丙405");
    assert.equal(result.classes[0].teacher, "张三");
    assert.equal(result.classes[0].classNumber, "MATH001");
    assert.deepEqual(result.classes[0].weeks, [14, 15, 16, 17, 18]);
    assert.equal(result.classes[1].day, 5);
    assert.equal(result.classes[1].startTime, "14:00");
    assert.equal(result.classes[1].endTime, "15:40");
    assert.equal(result.classes[1].location, "仙Ⅱ-304");
    assert.deepEqual(result.classes[1].weeks, [1, 2, 3, 10, 11, 12, 13]);
  });

  it("parses NJU odd and even week ranges", () => {
    const result = parseScheduleImportText(`课程号\t课程名\t教师\t上课时间
CS101\t数据结构\t李四\t周二 5-8节 2-18周(双) 仙1-216`);

    assert.equal(result.classes.length, 1);
    assert.deepEqual(result.classes[0].weeks, [2, 4, 6, 8, 10, 12, 14, 16, 18]);
  });

  it("returns helpful errors when rows cannot be recognized", () => {
    const result = parseScheduleImportText("只有课程名");

    assert.equal(result.classes.length, 0);
    assert.equal(result.errors.length, 1);
  });
});
