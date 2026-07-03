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

const WEEKDAY_MAP = new Map([
  ["一", 1],
  ["1", 1],
  ["二", 2],
  ["2", 2],
  ["三", 3],
  ["3", 3],
  ["四", 4],
  ["4", 4],
  ["五", 5],
  ["5", 5],
  ["六", 6],
  ["6", 6],
  ["日", 7],
  ["天", 7],
  ["7", 7],
]);

const HEADER_ALIASES = {
  title: ["课程", "课程名", "课程名称", "名称", "科目"],
  day: ["星期", "周次", "周几", "上课星期"],
  time: ["时间", "上课时间", "课程时间"],
  classNumber: ["课程号", "课程编号", "课号"],
  period: ["节次", "课节", "上课节次"],
  startTime: ["开始", "开始时间", "上课开始"],
  endTime: ["结束", "结束时间", "下课时间"],
  location: ["地点", "教室", "上课地点", "校区"],
  teacher: ["教师", "任课教师", "老师"],
  info: ["备注", "课程详情", "说明"],
  testTime: ["考试时间", "期末考试", "考试"],
};

export function parseScheduleImportText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const errors = [];

  if (lines.length === 0) {
    return { classes: [], errors: ["请先粘贴或导入课表内容。"] };
  }

  const header = detectHeader(lines[0]);
  const dataLines = header ? lines.slice(1) : lines;
  const classes = [];

  dataLines.forEach((line, index) => {
    const parsed = header
      ? parseWithHeader(line, header)
      : parseLooseLine(line);
    const parsedClasses = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];

    if (parsedClasses.length === 0) {
      errors.push(`第 ${index + (header ? 2 : 1)} 行未识别：${line}`);
      return;
    }

    classes.push(...parsedClasses);
  });

  return {
    classes: dedupeClasses(classes),
    errors,
  };
}

function detectHeader(line) {
  const columns = splitColumns(line);
  const normalized = columns.map((item) => item.replace(/\s/g, ""));
  const fields = {};

  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    const index = normalized.findIndex((column) => aliases.includes(column));
    if (index >= 0) {
      fields[field] = index;
    }
  });

  return fields.title !== undefined && (fields.day !== undefined || fields.time !== undefined)
    ? fields
    : null;
}

function parseWithHeader(line, header) {
  const columns = splitColumns(line);
  const title = getColumn(columns, header.title);
  const timeText = getColumn(columns, header.time);
  const njuClasses = parseNjuTeachingSchedule({
    title,
    timeText,
    location: getColumn(columns, header.location),
    teacher: getColumn(columns, header.teacher),
    classNumber: getColumn(columns, header.classNumber),
    info: getColumn(columns, header.info),
    testTime: getColumn(columns, header.testTime),
  });

  if (njuClasses.length > 0) {
    return njuClasses;
  }

  const day = normalizeWeekday(getColumn(columns, header.day));
  const timeRange =
    parseTimeRange(timeText) ||
    parseTimeRange(`${getColumn(columns, header.startTime)}-${getColumn(columns, header.endTime)}`) ||
    parseTimeRange(getColumn(columns, header.period)) ||
    parsePeriodRange(getColumn(columns, header.period)) ||
    parsePeriodRange(timeText);

  if (!title || !day || !timeRange) return null;

  return buildClassItem({
    title,
    day,
    startTime: timeRange.startTime,
    endTime: timeRange.endTime,
    location: getColumn(columns, header.location),
    teacher: getColumn(columns, header.teacher),
    classNumber: getColumn(columns, header.classNumber),
    info: getColumn(columns, header.info),
    testTime: getColumn(columns, header.testTime),
  });
}

function parseLooseLine(line) {
  const columns = splitColumns(line);

  if (columns.length >= 4) {
    const [title, dayText, timeText, ...rest] = columns;
    const day = normalizeWeekday(dayText);
    const timeRange = parseTimeRange(timeText) || parsePeriodRange(timeText);

    if (title && day && timeRange) {
      return buildClassItem({
        title,
        day,
        startTime: timeRange.startTime,
        endTime: timeRange.endTime,
        location: rest.join(" "),
      });
    }
  }

  const njuLooseClasses = parseNjuTeachingSchedule({
    title: inferTitle(line),
    timeText: line,
    location: inferLocation(line, inferTitle(line) || ""),
  });

  if (njuLooseClasses.length > 0) {
    return njuLooseClasses;
  }

  const day = normalizeWeekday(line);
  const timeRange = parseTimeRange(line) || parsePeriodRange(line);
  const title = inferTitle(line);

  if (!title || !day || !timeRange) return null;

  return buildClassItem({
    title,
    day,
    startTime: timeRange.startTime,
    endTime: timeRange.endTime,
    location: inferLocation(line, title),
  });
}

function splitColumns(line) {
  const text = String(line || "");
  const separator = text.includes("\t") ? /\t/ : /,|，|;|；/;

  return text
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getColumn(columns, index) {
  return index === undefined ? "" : String(columns[index] || "").trim();
}

function normalizeWeekday(value) {
  const match = String(value || "").match(/(?:周|星期|礼拜)?([一二三四五六日天1-7])/);
  return match ? WEEKDAY_MAP.get(match[1]) : null;
}

function parseTimeRange(value) {
  const match = String(value || "").match(/(\d{1,2})[:：](\d{2})\s*(?:-|~|—|至|到)\s*(\d{1,2})[:：](\d{2})/);
  if (!match) return null;

  const startTime = formatClock(match[1], match[2]);
  const endTime = formatClock(match[3], match[4]);

  return timeToMinutes(endTime) > timeToMinutes(startTime) ? { startTime, endTime } : null;
}

function parsePeriodRange(value) {
  const text = String(value || "");
  const range = text.match(/(?:第)?\s*(\d{1,2})\s*(?:-|~|—|至|到)\s*(\d{1,2})\s*节?/);
  const single = text.match(/(?:第)?\s*(\d{1,2})\s*节/);
  const startPeriod = Number(range?.[1] || single?.[1]);
  const endPeriod = Number(range?.[2] || single?.[1]);

  if (!PERIOD_TIMES[startPeriod] || !PERIOD_TIMES[endPeriod] || endPeriod < startPeriod) {
    return null;
  }

  return {
    startTime: PERIOD_TIMES[startPeriod][0],
    endTime: PERIOD_TIMES[endPeriod][1],
    startPeriod,
    endPeriod,
  };
}

function parseNjuTeachingSchedule({
  title,
  timeText,
  location = "",
  teacher = "",
  classNumber = "",
  info = "",
  testTime = "",
}) {
  const courseTitle = String(title || "").trim();
  const text = String(timeText || "").trim();
  if (!courseTitle || !text.includes("节")) return [];

  const pattern =
    /(?:周|星期)?([一二三四五六日])\s*(\d{1,2})\s*(?:-|~|—|至|到)\s*(\d{1,2})节\s*([\d,，、\s-]+周?(?:\([单双]\))?(?:\s*[,，、]\s*[\d-]+周?(?:\([单双]\))?)*)\s*([\s\S]*?)(?=(?:[,，;；]\s*)?(?:周|星期)[一二三四五六日]\s*\d{1,2}\s*(?:-|~|—|至|到)\s*\d{1,2}节|$)/g;
  const classes = [];
  let match = pattern.exec(text);

  while (match) {
    const day = WEEKDAY_MAP.get(match[1]);
    const startPeriod = Number(match[2]);
    const endPeriod = Number(match[3]);
    const timeRange = parsePeriodRange(`${startPeriod}-${endPeriod}节`);
    const segmentLocation = cleanNjuLocation(match[5]) || location;

    if (day && timeRange) {
      classes.push(
        buildClassItem({
          title: courseTitle,
          day,
          startTime: timeRange.startTime,
          endTime: timeRange.endTime,
          startPeriod: timeRange.startPeriod,
          endPeriod: timeRange.endPeriod,
          location: segmentLocation,
          teacher,
          classNumber,
          info,
          testTime,
          weeks: parseNjuWeeks(match[4]),
          weekText: normalizeNjuWeekText(match[4]),
        })
      );
    }

    match = pattern.exec(text);
  }

  return classes;
}

function parseNjuWeeks(weekText) {
  const weeks = [];

  normalizeNjuWeekText(weekText)
    .split(/[,，、]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const isOdd = part.includes("(单)");
      const isEven = part.includes("(双)");
      const cleanPart = part
        .replace(/周/g, "")
        .replace(/\(单\)/g, "")
        .replace(/\(双\)/g, "")
        .trim();
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

function normalizeNjuWeekText(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/([单双])\)/g, "$1)")
    .replace(/([单双])$/g, "($1)")
    .trim();
}

function cleanNjuLocation(value) {
  return String(value || "")
    .replace(/^[,，;；\s]+/, "")
    .replace(/[,，;；\s]+$/, "")
    .trim();
}

function formatClock(hour, minute) {
  return `${String(Number(hour)).padStart(2, "0")}:${minute}`;
}

function inferTitle(line) {
  return String(line || "")
    .replace(/(?:周|星期|礼拜)[一二三四五六日天]/g, "")
    .replace(/\d{1,2}[:：]\d{2}\s*(?:-|~|—|至|到)\s*\d{1,2}[:：]\d{2}/g, "")
    .replace(/(?:第)?\s*\d{1,2}\s*(?:-|~|—|至|到)\s*\d{1,2}\s*节?/g, "")
    .replace(/(?:第)?\s*\d{1,2}\s*节/g, "")
    .split(/\s{2,}|\t|,|，|;|；/)
    .map((item) => item.trim())
    .filter(Boolean)[0];
}

function inferLocation(line, title) {
  return String(line || "")
    .replace(title, "")
    .replace(/(?:周|星期|礼拜)[一二三四五六日天]/g, "")
    .replace(/\d{1,2}[:：]\d{2}\s*(?:-|~|—|至|到)\s*\d{1,2}[:：]\d{2}/g, "")
    .replace(/(?:第)?\s*\d{1,2}\s*(?:-|~|—|至|到)\s*\d{1,2}\s*节?/g, "")
    .replace(/(?:第)?\s*\d{1,2}\s*节/g, "")
    .trim();
}

function buildClassItem({
  title,
  day,
  startTime,
  endTime,
  startPeriod = null,
  endPeriod = null,
  location,
  teacher = "",
  classNumber = "",
  info = "",
  testTime = "",
  weeks = [],
  weekText = "",
}) {
  const cleanTitle = String(title || "").trim();

  return {
    title: cleanTitle,
    day,
    startTime,
    endTime,
    startPeriod: startPeriod || inferPeriod(startTime, "start"),
    endPeriod: endPeriod || inferPeriod(endTime, "end"),
    location: String(location || "").trim(),
    courseId: "",
    courseName: cleanTitle,
    locked: true,
    source: "南京大学教服平台导入",
    teacher: String(teacher || "").trim(),
    classNumber: String(classNumber || "").trim(),
    info: String(info || "").trim(),
    testTime: String(testTime || "").trim(),
    weeks,
    weekText,
  };
}

function dedupeClasses(classes) {
  const seen = new Set();

  return classes.filter((item) => {
    const key = [
      item.title,
      item.day,
      item.startTime,
      item.endTime,
      item.location,
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferPeriod(value, edge) {
  const target = String(value || "");
  const entry = Object.entries(PERIOD_TIMES).find(([, range]) =>
    edge === "end" ? range[1] === target : range[0] === target
  );
  return entry ? Number(entry[0]) : null;
}

function timeToMinutes(value) {
  const [hourText = "0", minuteText = "0"] = String(value || "").split(":");
  return Number(hourText) * 60 + Number(minuteText);
}
