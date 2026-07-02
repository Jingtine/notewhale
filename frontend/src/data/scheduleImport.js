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
  title: ["课程", "课程名称", "名称", "科目"],
  day: ["星期", "周次", "周几", "上课星期"],
  time: ["时间", "上课时间", "课程时间"],
  period: ["节次", "课节", "上课节次"],
  startTime: ["开始", "开始时间", "上课开始"],
  endTime: ["结束", "结束时间", "下课时间"],
  location: ["地点", "教室", "上课地点", "校区"],
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

    if (!parsed) {
      errors.push(`第 ${index + (header ? 2 : 1)} 行未识别：${line}`);
      return;
    }

    classes.push(parsed);
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

  return fields.title !== undefined && fields.day !== undefined ? fields : null;
}

function parseWithHeader(line, header) {
  const columns = splitColumns(line);
  const title = getColumn(columns, header.title);
  const day = normalizeWeekday(getColumn(columns, header.day));
  const timeRange =
    parseTimeRange(getColumn(columns, header.time)) ||
    parseTimeRange(`${getColumn(columns, header.startTime)}-${getColumn(columns, header.endTime)}`) ||
    parseTimeRange(getColumn(columns, header.period)) ||
    parsePeriodRange(getColumn(columns, header.period)) ||
    parsePeriodRange(getColumn(columns, header.time));

  if (!title || !day || !timeRange) return null;

  return buildClassItem({
    title,
    day,
    startTime: timeRange.startTime,
    endTime: timeRange.endTime,
    location: getColumn(columns, header.location),
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
  return String(line || "")
    .split(/\t|,|，|;|；/)
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
  };
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

function buildClassItem({ title, day, startTime, endTime, location }) {
  const cleanTitle = String(title || "").trim();

  return {
    title: cleanTitle,
    day,
    startTime,
    endTime,
    location: String(location || "").trim(),
    courseId: "",
    courseName: cleanTitle,
    locked: true,
    source: "南京大学教服平台导入",
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

function timeToMinutes(value) {
  const [hourText = "0", minuteText = "0"] = String(value || "").split(":");
  return Number(hourText) * 60 + Number(minuteText);
}
