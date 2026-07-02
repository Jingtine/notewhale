const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 22;
const DEFAULT_BLOCK_MINUTES = 60;
const STEP_MINUTES = 30;

export function generateStudyPlanBlocks({
  weekStart,
  fixedClasses = [],
  ddls = [],
  exams = [],
  courses = [],
  existingBlocks = [],
  options = {},
}) {
  const start = startOfWeek(weekStart || new Date());
  const blockMinutes = options.blockMinutes || DEFAULT_BLOCK_MINUTES;
  const maxBlocks = options.maxBlocks || 8;
  const tasks = buildStudyTasks(ddls, exams, courses, start).slice(0, maxBlocks);
  const occupiedByDay = buildOccupiedByDay({
    fixedClasses,
    ddls,
    existingBlocks,
    weekStart: start,
  });
  const blocks = [];

  tasks.forEach((task, index) => {
    const slot = findFreeSlot({
      occupiedByDay,
      deadline: task.deadline,
      weekStart: start,
      blockMinutes: task.blockMinutes || blockMinutes,
    });

    if (!slot) return;

    occupiedByDay.get(slot.day).push({
      start: slot.startMinutes,
      end: slot.endMinutes,
    });
    occupiedByDay
      .get(slot.day)
      .sort((a, b) => a.start - b.start);

    blocks.push({
      id: `study-plan-${start.getTime()}-${task.key}-${index}`,
      title: task.title,
      day: slot.day,
      date: formatDate(addDays(start, slot.day - 1)),
      startTime: minutesToTime(slot.startMinutes),
      endTime: minutesToTime(slot.endMinutes),
      courseId: task.courseId || "",
      courseName: task.courseName,
      location: task.location,
      source: "自动复习规划",
      locked: false,
      ddlId: task.ddlId || "",
      priority: task.priority,
    });
  });

  return blocks;
}

function buildStudyTasks(ddls, exams, courses, weekStart) {
  const courseNames = new Map(
    courses.map((course) => [String(course.id), course.title || course.name || "未命名课程"])
  );

  const ddlTasks = ddls
    .map((ddl) => ({
      ddl,
      deadline: parseDate(ddl.date),
    }))
    .filter(({ ddl, deadline }) => !ddl.completed && deadline && isWithinWeek(deadline, weekStart))
    .sort((a, b) => a.deadline - b.deadline)
    .flatMap(({ ddl, deadline }) => {
      const courseName =
        ddl.courseName ||
        courseNames.get(String(ddl.courseId)) ||
        "未归属课程";
      const base = {
        key: String(ddl.id || `${ddl.title}-${ddl.date}`),
        ddlId: ddl.id,
        courseId: ddl.courseId,
        courseName,
        deadline,
        blockMinutes: normalizeMinutes(ddl.estimatedMinutes || ddl.estimatedTime, DEFAULT_BLOCK_MINUTES),
        location: `${formatMonthDay(deadline)} 截止 · ${courseName}`,
      };
      const timeUntilDeadline = deadline.getTime() - Date.now();
      const urgent =
        timeUntilDeadline > 0 &&
        timeUntilDeadline < 3 * 24 * 60 * 60 * 1000;

      return [
        {
          ...base,
          title: `${courseName} 复习`,
          priority: urgent ? "high" : "normal",
        },
        ...(urgent
          ? [
              {
                ...base,
                key: `${base.key}-check`,
                title: `${courseName} 查漏补缺`,
                priority: "high",
              },
            ]
          : []),
      ];
    });

  const examTasks = exams
    .map((exam) => ({
      exam,
      deadline: parseDate(exam.date),
    }))
    .filter(({ exam, deadline }) => !exam.completed && deadline && isWithinWeek(deadline, weekStart))
    .sort((a, b) => {
      const importanceDiff = normalizeImportance(b.exam.importance) - normalizeImportance(a.exam.importance);
      return importanceDiff || a.deadline - b.deadline;
    })
    .map(({ exam, deadline }) => {
      const courseName = exam.subject || exam.courseName || "考试复习";
      const importance = normalizeImportance(exam.importance);

      return {
        key: `exam-${exam.id || `${courseName}-${exam.date}`}`,
        examId: exam.id,
        courseId: exam.courseId || "",
        courseName,
        deadline,
        blockMinutes: normalizeMinutes(exam.reviewMinutes, importance >= 4 ? 90 : 60),
        location: `${formatMonthDay(deadline)} 考试 · 重要度 ${importance}`,
        title: `${courseName} 考前复习`,
        priority: importance >= 4 ? "high" : "normal",
      };
    });

  return [...examTasks, ...ddlTasks].sort((a, b) => {
    const priorityDiff = priorityScore(b.priority) - priorityScore(a.priority);
    return priorityDiff || a.deadline - b.deadline;
  });
}

function buildOccupiedByDay({ fixedClasses, ddls, existingBlocks, weekStart }) {
  const occupiedByDay = new Map(Array.from({ length: 7 }, (_, index) => [index + 1, []]));

  fixedClasses.forEach((item) => {
    addOccupied(occupiedByDay, Number(item.day), item.startTime, item.endTime);
  });

  existingBlocks
    .filter((item) => isWithinWeek(parseDate(item.date), weekStart))
    .forEach((item) => {
      addOccupied(occupiedByDay, Number(item.day), item.startTime, item.endTime);
    });

  ddls.forEach((ddl) => {
    const date = parseDate(ddl.date);
    if (!date || !isWithinWeek(date, weekStart)) return;

    const startMinutes = date.getHours() * 60 + date.getMinutes();
    const endMinutes = Math.min(startMinutes + 45, DEFAULT_END_HOUR * 60);
    occupiedByDay.get(getIsoDay(date))?.push({
      start: startMinutes,
      end: endMinutes,
    });
  });

  occupiedByDay.forEach((items) => {
    items.sort((a, b) => a.start - b.start);
  });

  return occupiedByDay;
}

function addOccupied(occupiedByDay, day, startTime, endTime) {
  if (!occupiedByDay.has(day)) return;

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (endMinutes <= startMinutes) return;

  occupiedByDay.get(day).push({
    start: startMinutes,
    end: endMinutes,
  });
}

function findFreeSlot({ occupiedByDay, deadline, weekStart, blockMinutes }) {
  const deadlineDay = getIsoDay(deadline);

  for (let offset = 0; offset < 7; offset += 1) {
    const day = Math.max(1, deadlineDay - offset);
    const date = addDays(weekStart, day - 1);
    const latestEnd =
      isSameDate(date, deadline) && deadline.getHours() >= DEFAULT_START_HOUR
        ? Math.max(DEFAULT_START_HOUR * 60, timeToMinutes(formatTime(deadline)) - 60)
        : DEFAULT_END_HOUR * 60;
    const slot = findSlotInDay(occupiedByDay.get(day) || [], blockMinutes, latestEnd);

    if (slot) {
      return { day, ...slot };
    }
  }

  return null;
}

function normalizeMinutes(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(180, Math.max(30, Math.round(number / 15) * 15));
}

function normalizeImportance(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 3;
  return Math.min(5, Math.max(1, number));
}

function priorityScore(priority) {
  return priority === "high" ? 2 : priority === "normal" ? 1 : 0;
}

function findSlotInDay(occupied, blockMinutes, latestEnd) {
  const dayStart = DEFAULT_START_HOUR * 60;
  const dayEnd = Math.min(DEFAULT_END_HOUR * 60, latestEnd);

  for (let start = dayStart; start + blockMinutes <= dayEnd; start += STEP_MINUTES) {
    const end = start + blockMinutes;
    const overlaps = occupied.some((item) => start < item.end && end > item.start);

    if (!overlaps) {
      return { startMinutes: start, endMinutes: end };
    }
  }

  return null;
}

function parseDate(value) {
  if (!value) return null;

  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = getIsoDay(next);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function isWithinWeek(date, weekStart) {
  if (!date) return false;

  const end = addDays(weekStart, 7);
  return date >= weekStart && date < end;
}

function getIsoDay(date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDate(left, right) {
  return left.toDateString() === right.toDateString();
}

function timeToMinutes(value) {
  const [hourText = "0", minuteText = "0"] = String(value || "").split(":");
  return Number(hourText) * 60 + Number(minuteText);
}

function minutesToTime(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
