const PERIOD_TIMES = {
  1: ["08:00", "08:45"],
  2: ["08:55", "09:40"],
  3: ["10:00", "10:45"],
  4: ["10:55", "11:40"],
  5: ["14:00", "14:45"],
  6: ["14:55", "15:40"],
  7: ["16:00", "16:45"],
  8: ["16:55", "17:40"],
  9: ["18:30", "19:15"],
  10: ["19:25", "20:10"],
  11: ["20:20", "21:05"],
};

export const NJU_UNDERGRAD_SCHEDULE_TARGET_URL =
  "https://ehallapp.nju.edu.cn/jwapp/sys/wdkb/*default/index.do#/xskcb";

export const NJU_AUTH_SCHEDULE_URL =
  "https://authserver.nju.edu.cn/authserver/login?service=https%3A%2F%2Fehallapp.nju.edu.cn%2Fjwapp%2Fsys%2Fwdkb%2F*default%2Findex.do%23%2Fxskcb";

export const NJU_SCHEDULE_EXTRACTOR_SCRIPT = String.raw`(() => {
  const WEEK_MAP = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7 };

  function readText(node) {
    return (node?.textContent || "").trim();
  }

  function parseWeeks(weekText) {
    const weeks = [];
    String(weekText || "")
      .replace(/\s+/g, "")
      .split(/[,，、]/)
      .filter(Boolean)
      .forEach((part) => {
        const isOdd = part.includes("(单)");
        const isEven = part.includes("(双)");
        const cleanPart = part
          .replace(/周/g, "")
          .replace(/\(单\)/g, "")
          .replace(/\(双\)/g, "");
        const range = cleanPart.match(/^(\d{1,2})-(\d{1,2})$/);
        const single = cleanPart.match(/^(\d{1,2})$/);

        if (range) {
          const start = Number(range[1]);
          const end = Number(range[2]);
          for (let week = start; week <= end; week += 1) {
            if (isOdd && week % 2 === 0) continue;
            if (isEven && week % 2 !== 0) continue;
            weeks.push(week);
          }
        } else if (single) {
          weeks.push(Number(single[1]));
        }
      });

    return [...new Set(weeks)].sort((a, b) => a - b);
  }

  function cleanLocation(value) {
    return String(value || "")
      .replace(/^[,，;；\s]+/, "")
      .replace(/[,，;；\s]+$/, "")
      .trim();
  }

  const name =
    readText(document.querySelector("#dqxnxqkclb")) ||
    readText(document.querySelector(".bh-headerBar-title")) ||
    document.title ||
    "南京大学课表";
  const courses = [];
  const rows = Array.from(document.querySelectorAll("table tbody tr"));
  const pattern =
    /(?:周|星期)?([一二三四五六日])\s*(\d{1,2})\s*(?:-|~|—|至|到)\s*(\d{1,2})节\s*([\d,，、\s-]+周?(?:\([单双]\))?(?:\s*[,，、]\s*[\d-]+周?(?:\([单双]\))?)*)\s*([\s\S]*?)(?=(?:[,，;；]\s*)?(?:周|星期)[一二三四五六日]\s*\d{1,2}\s*(?:-|~|—|至|到)\s*\d{1,2}节|$)/g;

  rows.forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll("td"));
    if (cells.length < 7) return;

    const classNumber = readText(cells[1]);
    const courseName = readText(cells[2]);
    const teacher = readText(cells[4]);
    const timeLocationText = readText(cells[6]);
    const info = readText(cells[8]) || null;
    const testTime = readText(cells[10]) || null;

    if (!courseName || !timeLocationText) return;

    let match = pattern.exec(timeLocationText);
    while (match) {
      const start = Number(match[2]);
      const end = Number(match[3]);
      courses.push({
        name: courseName,
        classroom: cleanLocation(match[5]) || null,
        class_number: classNumber,
        teacher,
        test_time: testTime,
        test_location: null,
        link: null,
        weeks: parseWeeks(match[4]),
        week_time: WEEK_MAP[match[1]],
        start_time: start,
        time_count: end - start,
        import_type: 1,
        info,
        data: null,
      });
      match = pattern.exec(timeLocationText);
    }
  });

  return encodeURIComponent(JSON.stringify({ name, courses }));
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
    ? course.weeks
    : Array.isArray(course.week)
      ? course.week
      : [];

  return {
    id,
    title,
    day,
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
