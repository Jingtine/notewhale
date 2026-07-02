import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateStudyPlanBlocks } from "./schedulePlanner.js";

describe("schedule planner", () => {
  it("generates study blocks before DDL deadlines while avoiding fixed classes", () => {
    const blocks = generateStudyPlanBlocks({
      weekStart: new Date("2026-03-02T00:00:00"),
      fixedClasses: [
        {
          day: 3,
          startTime: "08:00",
          endTime: "11:40",
        },
      ],
      ddls: [
        {
          id: "ddl-1",
          title: "Problem Set",
          courseName: "高等数学",
          date: "2026-03-04T18:00:00",
          completed: false,
        },
      ],
    });

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].day, 3);
    assert.equal(blocks[0].courseName, "高等数学");
    assert.notEqual(blocks[0].startTime, "08:00");
    assert.equal(blocks[0].source, "自动复习规划");
  });

  it("adds an extra check block for urgent DDLs", () => {
    const blocks = generateStudyPlanBlocks({
      weekStart: new Date(),
      ddls: [
        {
          id: "urgent-ddl",
          title: "Final review",
          courseName: "线性代数",
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          completed: false,
        },
      ],
    });

    assert.equal(blocks.length, 2);
    assert.equal(blocks[1].title, "线性代数 查漏补缺");
  });

  it("does not generate blocks for completed or out-of-week DDLs", () => {
    const blocks = generateStudyPlanBlocks({
      weekStart: new Date("2026-03-02T00:00:00"),
      ddls: [
        {
          id: "done",
          title: "Done",
          courseName: "英语",
          date: "2026-03-03T10:00:00",
          completed: true,
        },
        {
          id: "later",
          title: "Later",
          courseName: "物理",
          date: "2026-04-03T10:00:00",
          completed: false,
        },
      ],
    });

    assert.deepEqual(blocks, []);
  });
});
