const PERIOD_TIMES = {
  1: ["08:00", "08:50"],
  2: ["09:00", "09:50"],
  3: ["10:10", "11:00"],
  4: ["11:10", "12:00"],
  5: ["14:00", "14:50"],
  6: ["15:00", "15:50"],
  7: ["16:10", "17:00"],
  8: ["17:10", "18:00"],
  9: ["18:30", "19:20"],
  10: ["19:30", "20:20"],
  11: ["20:30", "21:20"],
  12: ["21:30", "22:20"],
};

export const NJU_UNDERGRAD_SCHEDULE_TARGET_URL =
  "https://ehallapp.nju.edu.cn/jwapp/sys/wdkb/";

export const NJU_PORTAL_SCHEDULE_ENTRY_URL =
  "https://ehall.nju.edu.cn/portal/html/select_role.html?appId=7170579276974719";

export const NJU_AUTH_SCHEDULE_URL =
  "https://authserver.nju.edu.cn/authserver/login?service=https%3A%2F%2Fehallapp.nju.edu.cn%2Fjwapp%2Fsys%2Fwdkb%2F*default%2Findex.do%23%2Fxskcb";

export const NJU_SCHEDULE_EXTRACTOR_SCRIPT = String.raw`(() => {
  const WEEK_MAP = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };

  function text(node) {
    return String(node?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function pick(object, keys) {
    for (const key of keys) {
      const value = object?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
    return "";
  }

  function dayNumber(value) {
    const raw = String(value || "").trim();
    const direct = Number(raw);
    if (direct >= 1 && direct <= 7) return direct;
    const match = raw.match(/(?:周|星期)?([一二三四五六日天])/);
    return match ? WEEK_MAP[match[1]] : null;
  }

  function parseWeeks(value) {
    const raw = Array.isArray(value) ? value.join(",") : String(value || "");
    const weeks = [];

    raw
      .replace(/\s+/g, "")
      .split(/[,，、;]/)
      .filter(Boolean)
      .forEach((part) => {
        const isOdd = /单/.test(part);
        const isEven = /双/.test(part);
        const clean = part
          .replace(/第|周|\(|\)|（|）|单|双/g, "")
          .replace(/~/g, "-");
        const range = clean.match(/(\d{1,2})-(\d{1,2})/);
        const single = clean.match(/^(\d{1,2})$/);

        if (range) {
          for (let week = Number(range[1]); week <= Number(range[2]); week += 1) {
            if (isOdd && week % 2 === 0) continue;
            if (isEven && week % 2 !== 0) continue;
            weeks.push(week);
          }
        } else if (single) {
          weeks.push(Number(single[1]));
        }
      });

    return [...new Set(weeks)].filter((week) => week > 0 && week <= 30).sort((a, b) => a - b);
  }

  function parsePeriodText(value) {
    const raw = String(value || "");
    const range = raw.match(/(?:第)?\s*(\d{1,2})\s*(?:-|~|—|至|到)\s*(\d{1,2})\s*节?/);
    const single = raw.match(/(?:第)?\s*(\d{1,2})\s*节/);
    const start = Number(range?.[1] || single?.[1]);
    const end = Number(range?.[2] || single?.[1]);

    if (!start || !end || start > 12 || end > 12 || end < start) return null;
    return { start, end };
  }

  function courseFromObject(object) {
    if (!object || typeof object !== "object" || Array.isArray(object)) return null;

    const name = String(pick(object, [
      "KCMC", "KCM", "kcmc", "kcm", "courseName", "course_name", "name", "title"
    ]) || "").trim();
    const day = dayNumber(pick(object, [
      "XQJ", "SKXQ", "xqj", "week_time", "weekDay", "weekday", "day"
    ]));

    let start = Number(pick(object, [
      "KSJC", "QSJC", "ksjc", "start_time", "startPeriod", "startUnit"
    ]));
    let end = Number(pick(object, [
      "JSJC", "ZZJC", "jsjc", "end_time", "endPeriod", "endUnit"
    ]));

    if ((!start || !end) && pick(object, ["JC", "JCS", "SKJC", "period", "sections"])) {
      const period = parsePeriodText(pick(object, ["JC", "JCS", "SKJC", "period", "sections"]));
      start = period?.start || start;
      end = period?.end || end;
    }

    if (!name || !day || !start || !end || start > 12 || end > 12 || end < start) {
      return null;
    }

    const teacher = String(pick(object, ["SKJS", "JSXM", "XM", "teacher", "teacherName"]) || "").trim();
    const classroom = String(pick(object, ["JASMC", "CDMC", "JSMC", "classroom", "location"]) || "").trim();
    const classNumber = String(pick(object, ["KCH", "KXH", "BJH", "class_number", "courseCode"]) || "").trim();
    const weekRaw = pick(object, ["ZCMC", "SKZC", "ZC", "weeks", "weekText", "week"]);
    const weeks = Array.isArray(weekRaw)
      ? weekRaw.map(Number).filter(Boolean)
      : parseWeeks(weekRaw);

    return {
      name,
      classroom,
      class_number: classNumber,
      teacher,
      test_time: String(pick(object, ["KSSJ", "test_time", "examTime"]) || "").trim() || null,
      test_location: null,
      link: null,
      weeks,
      week_time: day,
      start_time: start,
      time_count: end - start,
      import_type: 1,
      info: String(pick(object, ["BZ", "KCXZMC", "info", "note"]) || "").trim() || null,
      data: null,
    };
  }

  function scanObject(root, output, seen, depth = 0) {
    if (!root || depth > 7 || output.length > 300) return;
    if (typeof root !== "object") return;
    if (seen.has(root)) return;
    seen.add(root);

    const course = courseFromObject(root);
    if (course) output.push(course);

    if (Array.isArray(root)) {
      root.forEach((item) => scanObject(item, output, seen, depth + 1));
      return;
    }

    Object.keys(root).slice(0, 200).forEach((key) => {
      try {
        scanObject(root[key], output, seen, depth + 1);
      } catch {
        // Ignore inaccessible values.
      }
    });
  }

  function parseSegments(value) {
    const raw = String(value || "").replace(/\s+/g, " ").trim();
    const results = [];
    const pattern =
      /(?:周|星期)?([一二三四五六日天])\s*(?:第)?\s*(\d{1,2})\s*(?:-|~|—|至|到)\s*(\d{1,2})\s*节(?:次)?\s*([\d,，、\s\-~周单双()（）]*)([\s\S]*?)(?=(?:周|星期)[一二三四五六日天]\s*(?:第)?\s*\d{1,2}\s*(?:-|~|—|至|到)\s*\d{1,2}\s*节|$)/g;

    let match = pattern.exec(raw);
    while (match) {
      results.push({
        day: dayNumber(match[1]),
        start: Number(match[2]),
        end: Number(match[3]),
        weeks: parseWeeks(match[4]),
        location: String(match[5] || "").replace(/^[,，;；\s]+|[,，;；\s]+$/g, "").trim(),
      });
      match = pattern.exec(raw);
    }

    return results;
  }

  function extractFromTables() {
    const courses = [];

    document.querySelectorAll("table tbody tr").forEach((row) => {
      const cells = Array.from(row.querySelectorAll("td")).map(text);
      if (cells.length < 3) return;

      const joined = cells.join(" ");
      const timeCell = cells.find((cell) => /(?:周|星期)[一二三四五六日天].*\d{1,2}.*节/.test(cell)) || joined;
      const segments = parseSegments(timeCell);
      if (!segments.length) return;

      const name =
        cells.find((cell) =>
          cell.length >= 2 &&
          cell.length <= 60 &&
          !/(?:周|星期)[一二三四五六日天]|节|校区|教室|教师|学分/.test(cell)
        ) || "";

      if (!name) return;

      segments.forEach((segment) => {
        courses.push({
          name,
          classroom: segment.location,
          class_number: "",
          teacher: "",
          test_time: null,
          test_location: null,
          link: null,
          weeks: segment.weeks,
          week_time: segment.day,
          start_time: segment.start,
          time_count: segment.end - segment.start,
          import_type: 1,
          info: null,
          data: null,
        });
      });
    });

    return courses;
  }

  function extractFromCards() {
    const courses = [];
    const selectors = [
      ".kbcontent",
      ".course-item",
      ".schedule-item",
      ".kcb-item",
      "[class*='courseItem']",
      "[class*='scheduleItem']",
      "[class*='kb-item']",
      "[class*='kcb']",
    ];

    document.querySelectorAll(selectors.join(",")).forEach((node) => {
      const raw = text(node);
      const segments = parseSegments(raw);
      if (!segments.length) return;

      const lines = String(node.innerText || raw)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      const name =
        lines.find((line) =>
          line.length >= 2 &&
          line.length <= 60 &&
          !/(?:周|星期)[一二三四五六日天]|第?\d+.*节|校区|教室|教师/.test(line)
        ) || "";

      if (!name) return;

      segments.forEach((segment) => {
        courses.push({
          name,
          classroom: segment.location,
          class_number: "",
          teacher: "",
          test_time: null,
          test_location: null,
          link: null,
          weeks: segment.weeks,
          week_time: segment.day,
          start_time: segment.start,
          time_count: segment.end - segment.start,
          import_type: 1,
          info: null,
          data: null,
        });
      });
    });

    return courses;
  }

  function extractFromStorage() {
    const output = [];
    const seen = new WeakSet();

    [window.localStorage, window.sessionStorage].forEach((storage) => {
      if (!storage) return;
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key || !/(kb|kcb|course|schedule|wdkb|课表)/i.test(key)) continue;
        try {
          scanObject(JSON.parse(storage.getItem(key)), output, seen);
        } catch {
          // Ignore non-JSON storage entries.
        }
      }
    });

    Object.keys(window)
      .filter((key) => /(kb|kcb|course|schedule|wdkb)/i.test(key))
      .slice(0, 40)
      .forEach((key) => {
        try {
          scanObject(window[key], output, seen);
        } catch {
          // Ignore cross-origin/proxy values.
        }
      });

    return output;
  }

  const courses = [
    ...extractFromStorage(),
    ...extractFromTables(),
    ...extractFromCards(),
  ];

  const unique = [];
  const seenKeys = new Set();
  courses.forEach((course) => {
    const key = [
      course.name,
      course.week_time,
      course.start_time,
      course.time_count,
      course.classroom,
      course.weeks.join(","),
    ].join("|");
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    unique.push(course);
  });

  const name =
    text(document.querySelector("#dqxnxqkclb")) ||
    text(document.querySelector(".bh-headerBar-title")) ||
    document.title ||
    "南京大学课表";

  return encodeURIComponent(JSON.stringify({
    name,
    courses: unique,
    pageUrl: location.href,
    ready: unique.length > 0,
  }));
})();`;

export function mapNjuSchedulePayloadToFixedClasses(payload, options = {}) {
  const courseTable = normalizePayload(payload);
  const courses = normalizeCourses(courseTable?.courses);
  const idPrefix = options.idPrefix || "nju-auto";

  return courses
    .map((course, index) => mapNjuCourseToFixedClass(course, `${idPrefix}-${index}`))
    .filter(Boolean);
}

function normalizePayload(payload) {
  if (!payload) return null;
  if (typeof payload === "object") return payload;

  const decoded = decodeURIComponent(String(payload).replace(/^"|"$/g, ""));
  return JSON.parse(decoded);
}

function normalizeCourses(courses) {
  if (Array.isArray(courses)) return courses;
  if (!courses) return [];

  const parsed = JSON.parse(courses);
  return Array.isArray(parsed) ? parsed : [];
}

function mapNjuCourseToFixedClass(course, id) {
  const day = Number(course.week_time);
  const startPeriod = Number(course.start_time);
  const endPeriod = startPeriod + Math.max(0, Number(course.time_count || 0));
  const timeRange = getPeriodTimeRange(startPeriod, endPeriod);
  const title = String(course.name || "").trim();

  if (!title || !day || !timeRange) return null;

  const weeks = Array.isArray(course.weeks)
    ? course.weeks.map(Number).filter(Boolean)
    : Array.isArray(course.week)
      ? course.week.map(Number).filter(Boolean)
      : [];

  return {
    id,
    title,
    day,
    startPeriod,
    endPeriod,
    startTime: timeRange.startTime,
    endTime: timeRange.endTime,
    location: String(course.classroom || "").trim(),
    courseId: "",
    courseName: title,
    locked: true,
    source: "南京大学教服平台自动读取",
    teacher: String(course.teacher || "").trim(),
    classNumber: String(course.class_number || "").trim(),
    info: String(course.info || "").trim(),
    testTime: String(course.test_time || "").trim(),
    weeks,
    weekText: formatWeekText(weeks),
  };
}

function getPeriodTimeRange(startPeriod, endPeriod) {
  if (!PERIOD_TIMES[startPeriod] || !PERIOD_TIMES[endPeriod] || endPeriod < startPeriod) {
    return null;
  }

  return {
    startTime: PERIOD_TIMES[startPeriod][0],
    endTime: PERIOD_TIMES[endPeriod][1],
  };
}

function formatWeekText(weeks) {
  if (!Array.isArray(weeks) || weeks.length === 0) return "";
  return `${weeks.join(",")}周`;
}
