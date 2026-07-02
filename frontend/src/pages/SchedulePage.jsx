import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { getDdls as getBackendDdls } from "../api/ddlApi";
import { getFolders as getBackendFolders } from "../api/folderApi";
import { mapBackendFolder } from "../data/courseFolderStore";
import { mapBackendDdl } from "../data/learningItemMappers";
import {
  NJU_AUTH_SCHEDULE_URL,
  NJU_PORTAL_SCHEDULE_ENTRY_URL,
  NJU_SCHEDULE_EXTRACTOR_SCRIPT,
  NJU_UNDERGRAD_SCHEDULE_TARGET_URL,
  mapNjuSchedulePayloadToFixedClasses,
} from "../data/njuScheduleExtractor";
import { parseScheduleImportText } from "../data/scheduleImport";
import {
  readStorageBoolean,
  readUserStorageArray,
  readUserStorageValue,
  writeStorageValue,
  writeUserStorageArray,
  writeUserStorageValue,
} from "../data/userStorage";
import { generateStudyPlanBlocks } from "../data/schedulePlanner";

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 20;
const SCHEDULE_STORAGE_KEY = "fixedClassSchedule";
const SCHEDULE_SEMESTER_START_KEY = "scheduleSemesterStartMonday";
const STUDY_PLAN_STORAGE_KEY = "studyPlanBlocks";
const EXAM_STORAGE_KEY = "scheduleExamItems";
const REMINDER_STORAGE_KEY = "scheduleReminderEnabled";
const NJU_TEACHING_DIRECT_URL = NJU_PORTAL_SCHEDULE_ENTRY_URL || NJU_AUTH_SCHEDULE_URL;
const NJU_TEACHING_PORTAL_URL =
  "https://jw.nju.edu.cn/24777/list.htm";

function SchedulePage({ user = null, onLogout } = {}) {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => readStorageBoolean("darkMode", false));
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date()));
  const [viewMode, setViewMode] = useState("week");
  const [fixedClasses, setFixedClasses] = useState(() =>
    readUserStorageArray(user, SCHEDULE_STORAGE_KEY, [])
  );
  const [semesterStartMonday, setSemesterStartMonday] = useState(() =>
    readUserStorageValue(user, SCHEDULE_SEMESTER_START_KEY, "")
  );
  const [studyPlanBlocks, setStudyPlanBlocks] = useState(() =>
    readUserStorageArray(user, STUDY_PLAN_STORAGE_KEY, [])
  );
  const [exams, setExams] = useState(() =>
    readUserStorageArray(user, EXAM_STORAGE_KEY, [])
  );
  const [remindersEnabled, setRemindersEnabled] = useState(() =>
    readStorageBoolean(REMINDER_STORAGE_KEY, false)
  );
  const [folders, setFolders] = useState(() =>
    readUserStorageArray(user, "folders", [], { legacyKey: "folders" })
  );
  const [ddls, setDdls] = useState(() =>
    readUserStorageArray(user, "ddls", [], { legacyKey: "ddls" })
  );
  const [syncMessage, setSyncMessage] = useState("本地课表已载入");
  const [classTitle, setClassTitle] = useState("");
  const [classDay, setClassDay] = useState("1");
  const [classStart, setClassStart] = useState("08:00");
  const [classEnd, setClassEnd] = useState("09:40");
  const [classLocation, setClassLocation] = useState("");
  const [classCourseId, setClassCourseId] = useState("");
  const [examSubject, setExamSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examGoal, setExamGoal] = useState("");
  const [examImportance, setExamImportance] = useState("4");
  const [examReviewMinutes, setExamReviewMinutes] = useState("90");
  const [scheduleImportText, setScheduleImportText] = useState("");
  const [scheduleImportPreview, setScheduleImportPreview] = useState([]);
  const [scheduleImportErrors, setScheduleImportErrors] = useState([]);
  const [njuImporting, setNjuImporting] = useState(false);
  const [scheduleImportMessage, setScheduleImportMessage] = useState(
    "桌面端可认证读取；也可粘贴导入。"
  );
  const [studyBlockDraft, setStudyBlockDraft] = useState(null);
  const [studyPlanMessage, setStudyPlanMessage] = useState("可选中复习块微调。");
  const [selectedFolder, setSelectedFolder] = useState("学习日程");
  const [searchText, setSearchText] = useState("");

  const colors = buildColors(darkMode);
  const hasDesktopScheduleBridge = hasNjuScheduleBridge();
  const weekDays = useMemo(() => buildWeekDays(currentWeek), [currentWeek]);
  const monthDays = useMemo(() => buildMonthDays(currentWeek), [currentWeek]);
  const courses = useMemo(
    () => folders.flatMap((folder) => folder.courses || folder.items || []),
    [folders]
  );
  const teachingWeek = useMemo(
    () => getTeachingWeek(currentWeek, semesterStartMonday),
    [currentWeek, semesterStartMonday]
  );
  const visibleFixedClasses = useMemo(
    () =>
      fixedClasses.filter((item) => isClassVisibleInTeachingWeek(item, teachingWeek)),
    [fixedClasses, teachingWeek]
  );
  const weekStudyPlanBlocks = useMemo(
    () =>
      studyPlanBlocks
        .filter((item) => isWithinWeek(parseScheduleDate(item.date), currentWeek))
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
    [studyPlanBlocks, currentWeek]
  );
  const weekDdls = useMemo(
    () =>
      ddls
        .filter((ddl) => !ddl.completed)
        .map((ddl) => ({ ddl, date: parseScheduleDate(ddl.date) }))
        .filter(({ date }) => date && isWithinWeek(date, currentWeek))
        .sort((a, b) => a.date - b.date),
    [ddls, currentWeek]
  );
  const weekExams = useMemo(
    () =>
      exams
        .filter((exam) => !exam.completed)
        .map((exam) => ({ exam, date: parseScheduleDate(exam.date) }))
        .filter(({ date }) => date && isWithinWeek(date, currentWeek))
        .sort((a, b) => a.date - b.date),
    [exams, currentWeek]
  );
  const scheduleConflicts = useMemo(
    () =>
      detectScheduleConflicts({
        fixedClasses: visibleFixedClasses,
        studyBlocks: weekStudyPlanBlocks,
        exams: weekExams.map(({ exam }) => exam),
        weekStart: currentWeek,
      }),
    [visibleFixedClasses, weekStudyPlanBlocks, weekExams, currentWeek]
  );
  const upcomingReminderEvents = useMemo(
    () =>
      buildUpcomingReminderEvents({
        ddls,
        exams,
        studyBlocks: studyPlanBlocks,
      }),
    [ddls, exams, studyPlanBlocks]
  );

  const classBlocksByDay = useMemo(() => {
    const result = new Map(WEEKDAYS.map((_, index) => [index + 1, []]));

    visibleFixedClasses.forEach((item) => {
      const day = Number(item.day);
      if (!result.has(day)) return;

      result.get(day).push(item);
    });

    result.forEach((items) => {
      items.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    });

    return result;
  }, [visibleFixedClasses]);

  const ddlBlocksByDay = useMemo(() => {
    const result = new Map(WEEKDAYS.map((_, index) => [index + 1, []]));

    weekDdls.forEach((item) => {
      const day = getIsoDay(item.date);
      result.get(day)?.push(item);
    });

    return result;
  }, [weekDdls]);

  const studyBlocksByDay = useMemo(() => {
    const result = new Map(WEEKDAYS.map((_, index) => [index + 1, []]));

    weekStudyPlanBlocks.forEach((item) => {
      const day = Number(item.day);
      if (!result.has(day)) return;

      result.get(day).push(item);
    });

    return result;
  }, [weekStudyPlanBlocks]);

  const examBlocksByDay = useMemo(() => {
    const result = new Map(WEEKDAYS.map((_, index) => [index + 1, []]));

    weekExams.forEach((item) => {
      const day = getIsoDay(item.date);
      result.get(day)?.push(item);
    });

    return result;
  }, [weekExams]);

  useEffect(() => {
    writeStorageValue("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    writeUserStorageArray(user, SCHEDULE_STORAGE_KEY, fixedClasses);
  }, [fixedClasses, user]);

  useEffect(() => {
    writeUserStorageArray(user, STUDY_PLAN_STORAGE_KEY, studyPlanBlocks);
  }, [studyPlanBlocks, user]);

  useEffect(() => {
    writeUserStorageArray(user, EXAM_STORAGE_KEY, exams);
  }, [exams, user]);

  useEffect(() => {
    writeUserStorageValue(user, SCHEDULE_SEMESTER_START_KEY, semesterStartMonday);
  }, [semesterStartMonday, user]);

  useEffect(() => {
    writeStorageValue(REMINDER_STORAGE_KEY, remindersEnabled);
  }, [remindersEnabled]);

  useEffect(() => {
    if (!remindersEnabled || typeof window === "undefined" || !("Notification" in window)) return undefined;
    if (Notification.permission !== "granted") return undefined;

    const timers = upcomingReminderEvents
      .map((event) => {
        const delay = event.date.getTime() - Date.now() - 30 * 60 * 1000;
        if (delay < 0 || delay > 24 * 60 * 60 * 1000) return null;

        return window.setTimeout(() => {
          new Notification(event.title, {
            body: event.detail,
          });
        }, delay);
      })
      .filter(Boolean);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [remindersEnabled, upcomingReminderEvents]);

  useEffect(() => {
    let alive = true;

    async function loadBackendScheduleContext() {
      try {
        const [folderData, ddlData] = await Promise.all([
          getBackendFolders(),
          getBackendDdls(),
        ]);

        if (!alive) return;

        const nextFolders = Array.isArray(folderData)
          ? folderData.map(mapBackendFolder)
          : [];
        const nextDdls = Array.isArray(ddlData) ? ddlData.map(mapBackendDdl) : [];

        setFolders(nextFolders);
        setDdls(nextDdls);
        setSyncMessage(`已同步 ${nextDdls.length} 条 DDL，固定课表保存在当前账号`);
      } catch {
        if (!alive) return;
        setSyncMessage("后端暂不可用，当前使用本地 DDL 与固定课表");
      }
    }

    loadBackendScheduleContext();

    return () => {
      alive = false;
    };
  }, []);

  function addFixedClass(event) {
    event.preventDefault();

    const title = classTitle.trim();
    if (!title) return;

    const startMinutes = timeToMinutes(classStart);
    const endMinutes = timeToMinutes(classEnd);

    if (endMinutes <= startMinutes) {
      alert("结束时间需要晚于开始时间");
      return;
    }

    const selectedCourse = courses.find((course) => String(course.id) === String(classCourseId));

    setFixedClasses((prev) => [
      ...prev,
      {
        id: `class-${Date.now()}`,
        title,
        day: Number(classDay),
        startTime: classStart,
        endTime: classEnd,
        location: classLocation.trim(),
        courseId: classCourseId || "",
        courseName: selectedCourse?.title || title,
        locked: true,
      },
    ]);

    setClassTitle("");
    setClassLocation("");
  }

  function deleteFixedClass(classId) {
    setFixedClasses((prev) => prev.filter((item) => item.id !== classId));
  }

  function deleteStudyPlanBlock(blockId) {
    setStudyPlanBlocks((prev) => prev.filter((item) => item.id !== blockId));
    if (studyBlockDraft?.id === blockId) {
      setStudyBlockDraft(null);
    }
  }

  function toggleStudyPlanBlockDone(blockId) {
    setStudyPlanBlocks((prev) =>
      prev.map((item) =>
        item.id === blockId
          ? {
              ...item,
              completedAt: item.completedAt ? "" : new Date().toISOString(),
            }
          : item
      )
    );
  }

  function addExam(event) {
    event.preventDefault();

    const subject = examSubject.trim();
    if (!subject || !examDate) return;

    setExams((prev) => [
      ...prev,
      {
        id: `exam-${Date.now()}`,
        subject,
        date: examDate.replace("T", " "),
        goal: examGoal.trim(),
        importance: Number(examImportance),
        reviewMinutes: Number(examReviewMinutes),
        completed: false,
      },
    ]);

    setExamSubject("");
    setExamGoal("");
  }

  function deleteExam(examId) {
    setExams((prev) => prev.filter((item) => item.id !== examId));
  }

  function toggleExamDone(examId) {
    setExams((prev) =>
      prev.map((item) =>
        item.id === examId
          ? {
              ...item,
              completed: !item.completed,
            }
          : item
      )
    );
  }

  function postponeUnfinishedStudyBlocks() {
    const now = new Date();
    let movedCount = 0;

    setStudyPlanBlocks((prev) =>
      prev.map((item) => {
        const itemDate = parseScheduleDate(`${item.date}T${item.endTime}`);
        if (!itemDate || itemDate >= now || item.completedAt) return item;

        const nextDate = addDays(parseScheduleDate(item.date) || currentWeek, 1);
        movedCount += 1;

        return {
          ...item,
          day: getIsoDay(nextDate),
          date: formatDateInput(nextDate),
          source: "未完成自动顺延",
          postponed: true,
        };
      })
    );

    setStudyPlanMessage(
      movedCount > 0
        ? `已顺延 ${movedCount} 个未完成复习块。`
        : "没有需要顺延的未完成复习块。"
    );
  }

  async function enableScheduleReminders() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStudyPlanMessage("当前环境不支持系统通知。");
      return;
    }

    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

    if (permission === "granted") {
      setRemindersEnabled(true);
      setStudyPlanMessage("提醒已开启：页面打开时会为 24 小时内事项安排提前 30 分钟提醒。");
    } else {
      setStudyPlanMessage("未获得通知权限，暂时无法推送提醒。");
    }
  }

  function generateWeeklyStudyPlan() {
    const generatedBlocks = generateStudyPlanBlocks({
      weekStart: currentWeek,
      fixedClasses: visibleFixedClasses,
      ddls,
      exams,
      courses,
      existingBlocks: [],
    });

    setStudyPlanBlocks((prev) => [
      ...prev.filter((item) => !isWithinWeek(parseScheduleDate(item.date), currentWeek)),
      ...generatedBlocks,
    ]);
    setStudyBlockDraft(generatedBlocks[0] ? createStudyBlockDraft(generatedBlocks[0]) : null);
    setStudyPlanMessage(
      generatedBlocks.length > 0
        ? `已生成 ${generatedBlocks.length} 个复习块，可以继续微调。`
        : "没有找到可安排的本周 DDL 或空余时间。"
    );
  }

  function clearWeeklyStudyPlan() {
    setStudyPlanBlocks((prev) =>
      prev.filter((item) => !isWithinWeek(parseScheduleDate(item.date), currentWeek))
    );
    setStudyBlockDraft(null);
    setStudyPlanMessage("已清空本周复习规划。");
  }

  function selectStudyPlanBlock(block) {
    setStudyBlockDraft(createStudyBlockDraft(block));
    setStudyPlanMessage(`正在调整：${block.title}`);
  }

  function updateStudyBlockDraft(changes) {
    setStudyBlockDraft((prev) => (prev ? { ...prev, ...changes } : prev));
  }

  function saveStudyBlockDraft(event) {
    event.preventDefault();
    if (!studyBlockDraft) return;

    if (timeToMinutes(studyBlockDraft.endTime) <= timeToMinutes(studyBlockDraft.startTime)) {
      setStudyPlanMessage("结束时间需要晚于开始时间。");
      return;
    }

    const day = Number(studyBlockDraft.day);
    const nextDate = formatDateInput(addDays(currentWeek, day - 1));
    setStudyPlanBlocks((prev) =>
      prev.map((item) =>
        item.id === studyBlockDraft.id
          ? {
              ...item,
              title: studyBlockDraft.title.trim() || item.title,
              day,
              date: nextDate,
              startTime: studyBlockDraft.startTime,
              endTime: studyBlockDraft.endTime,
              source: "手动调整复习规划",
              manuallyAdjusted: true,
            }
          : item
      )
    );
    setStudyBlockDraft((prev) => (prev ? { ...prev, day, date: nextDate } : prev));
    setStudyPlanMessage("调整已保存。");
  }

  function openNjuTeachingPortal(url = NJU_TEACHING_PORTAL_URL, direct = false) {
    window.open(url, "_blank", "noopener,noreferrer");
    setScheduleImportMessage(
      direct
        ? "已打开南京大学统一认证课表入口。当前网页版无法读取另一个域名页面；桌面版会在认证后自动注入脚本读取。"
        : "已打开南京大学本科生院官方入口。若校外访问失败，先连接学校 VPN，再进入教服平台复制或导出课表。"
    );
  }

  async function autoImportNjuSchedule() {
    if (njuImporting) return;

    if (!hasNjuScheduleBridge()) {
      openNjuTeachingPortal(NJU_TEACHING_DIRECT_URL, true);
      setScheduleImportMessage(
        "已打开南京大学统一认证。纯网页受浏览器同源限制，不能自动读取课表；后续桌面版会在这个步骤后自动回填。"
      );
      return;
    }

    try {
      setScheduleImportMessage("正在等待南京大学统一认证完成并读取课表...");
      setNjuImporting(true);
      setScheduleImportErrors([]);
      const payload = await window.notewhaleDesktop.importNjuSchedule({
        initialUrl: NJU_TEACHING_DIRECT_URL,
        targetUrl: NJU_UNDERGRAD_SCHEDULE_TARGET_URL,
        extractorScript: NJU_SCHEDULE_EXTRACTOR_SCRIPT,
      });
      const stamp = Date.now();
      const importedClasses = mapNjuSchedulePayloadToFixedClasses(payload, {
        idPrefix: `nju-auto-${stamp}`,
      });

      if (importedClasses.length === 0) {
        setScheduleImportPreview([]);
        setScheduleImportErrors(["未从南大课表页面读取到课程。"]);
        setScheduleImportMessage("没有读取到课程，请确认已进入“我的课表”页面。");
        return;
      }

      setScheduleImportPreview(importedClasses);
      setScheduleImportErrors([]);
      setFixedClasses((prev) => [...prev, ...importedClasses]);
      setScheduleImportMessage(`已自动读取并导入 ${importedClasses.length} 个上课时间块。`);
    } catch (error) {
      setScheduleImportErrors([error?.message || "自动读取失败"]);
      setScheduleImportMessage("自动读取失败，可以先使用粘贴导入。");
    } finally {
      setNjuImporting(false);
    }
  }

  function readScheduleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setScheduleImportText(String(reader.result || ""));
      setScheduleImportMessage(`已读取 ${file.name}，可以先解析预览。`);
    };
    reader.onerror = () => {
      setScheduleImportMessage("文件读取失败，可以直接复制课表文本粘贴。");
    };
    reader.readAsText(file, "utf-8");
  }

  function previewImportedSchedule() {
    const result = parseScheduleImportText(scheduleImportText);
    setScheduleImportPreview(result.classes);
    setScheduleImportErrors(result.errors);
    setScheduleImportMessage(
      result.classes.length > 0
        ? `已识别 ${result.classes.length} 门固定课程。`
        : "还没有识别到课程，请检查课表内容是否包含课程、星期、时间或节次。"
    );
  }

  function importScheduleClasses() {
    const result = parseScheduleImportText(scheduleImportText);
    setScheduleImportPreview(result.classes);
    setScheduleImportErrors(result.errors);

    if (result.classes.length === 0) {
      setScheduleImportMessage("没有可导入的课程。");
      return;
    }

    const stamp = Date.now();
    setFixedClasses((prev) => [
      ...prev,
      ...result.classes.map((item, index) => ({
        ...item,
        id: `nju-import-${stamp}-${index}`,
      })),
    ]);
    setScheduleImportMessage(`已导入 ${result.classes.length} 门课程到固定课表。`);
  }

  const fixedClassCount = fixedClasses.length;
  const visibleFixedClassCount = visibleFixedClasses.length;
  const plannedHours = weekStudyPlanBlocks.reduce((sum, item) => {
    const duration = Math.max(0, timeToMinutes(item.endTime) - timeToMinutes(item.startTime));
    return sum + duration / 60;
  }, 0);
  const lockedHours = visibleFixedClasses.reduce((sum, item) => {
    const duration = Math.max(0, timeToMinutes(item.endTime) - timeToMinutes(item.startTime));
    return sum + duration / 60;
  }, 0);
  const currentUser = user || { name: "鲸记用户", account: "本地体验账号" };
  const scheduleSearchItems = useMemo(
    () =>
      ddls.map((ddl) => ({
        key: `ddl-${ddl.id}`,
        type: "ddl",
        typeLabel: "DDL",
        title: ddl.title || "未命名 DDL",
        subtitle: `${ddl.courseName || "未归属课程"} · ${ddl.date || "未设置时间"}`,
        content: `${ddl.title || ""} ${ddl.courseName || ""} ${ddl.date || ""} ${ddl.platform || ""} ${ddl.note || ""}`,
        path: "/ddl",
      })),
    [ddls]
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: colors.bg, color: colors.title }}>
      <Sidebar
        folders={folders}
        selectedFolder={selectedFolder}
        setSelectedFolder={setSelectedFolder}
        setShowFolderModal={() => navigate("/")}
        setShowCourseModal={() => navigate("/")}
        darkMode={darkMode}
        onOpenSettings={() => navigate("/", { state: { openSettingsSection: "account" } })}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header
          searchText={searchText}
          setSearchText={setSearchText}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          upcomingDdls={ddls}
          user={currentUser}
          onLogout={onLogout}
          onOpenDataStatus={(section = "account") =>
            navigate("/", { state: { openSettingsSection: section } })
          }
          searchItems={scheduleSearchItems}
        />

      <main style={scheduleContentStyle(colors)}>
        <section style={scheduleHeroStyle(colors)}>
          <div>
            <h1 style={{ margin: 0, fontSize: "30px", letterSpacing: 0 }}>
              学习日程
            </h1>
            <p style={{ margin: "8px 0 0", color: colors.text, fontSize: "14px", lineHeight: 1.7 }}>
              锁定课程，安排 DDL 与复习。
            </p>
          </div>
          <button type="button" onClick={() => navigate("/")} style={outlineButtonStyle(colors)}>
            返回主页
          </button>
        </section>

        <div style={pageGridStyle}>
        <section style={calendarShellStyle(colors)}>
          <div style={calendarHeaderStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px" }}>
                {formatWeekRange(currentWeek)}
              </h2>
              <p style={{ margin: "6px 0 0", color: colors.text, fontSize: "13px" }}>
                {syncMessage}
                {teachingWeek ? ` · 当前第 ${teachingWeek} 教学周` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setCurrentWeek(viewMode === "month" ? startOfWeek(addMonths(currentWeek, -1)) : addDays(currentWeek, -7))} style={outlineButtonStyle(colors)}>
                {viewMode === "month" ? "上一月" : "上一周"}
              </button>
              <button type="button" onClick={() => setCurrentWeek(startOfWeek(new Date()))} style={primaryButtonStyle(colors)}>
                {viewMode === "month" ? "本月" : "本周"}
              </button>
              <button type="button" onClick={() => setCurrentWeek(viewMode === "month" ? startOfWeek(addMonths(currentWeek, 1)) : addDays(currentWeek, 7))} style={outlineButtonStyle(colors)}>
                {viewMode === "month" ? "下一月" : "下一周"}
              </button>
            </div>
          </div>

          <div style={statsGridStyle}>
            <StatCard label="本周课程" value={visibleFixedClassCount} detail={`固定课表共 ${fixedClassCount} 项 / ${lockedHours.toFixed(1)} 小时`} colors={colors} />
            <StatCard label="本周 DDL" value={weekDdls.length} detail="待处理截止项" colors={colors} />
            <StatCard label="本周考试" value={weekExams.length} detail="考试和复习目标" colors={colors} />
            <StatCard label="复习规划" value={weekStudyPlanBlocks.length} detail={`${plannedHours.toFixed(1)} 小时已安排`} colors={colors} />
            <StatCard label="冲突检测" value={scheduleConflicts.length} detail={scheduleConflicts.length ? "需要手动调整" : "暂无冲突"} colors={colors} />
            <StatCard label="当前账号" value={currentUser.name} detail={currentUser.account || "本地体验账号"} colors={colors} />
          </div>

          <div style={viewToggleStyle(colors)}>
            <button type="button" onClick={() => setViewMode("week")} style={viewToggleButtonStyle(colors, viewMode === "week")}>
              周视图
            </button>
            <button type="button" onClick={() => setViewMode("month")} style={viewToggleButtonStyle(colors, viewMode === "month")}>
              月视图
            </button>
          </div>

          {viewMode === "month" ? (
            <MonthCalendar
              colors={colors}
              monthDays={monthDays}
              currentWeek={currentWeek}
              fixedClasses={visibleFixedClasses}
              ddls={ddls}
              exams={exams}
              studyBlocks={studyPlanBlocks}
            />
          ) : (
          <div style={calendarScrollStyle}>
            <div style={weekGridStyle(colors)}>
            <div style={timeColumnStyle(colors)}>
              <div style={{ height: "48px" }} />
              {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => (
                <div key={index} style={timeLabelStyle(colors)}>
                  {String(START_HOUR + index).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {weekDays.map((day, index) => {
              const isoDay = index + 1;
              const classBlocks = classBlocksByDay.get(isoDay) || [];
              const ddlBlocks = ddlBlocksByDay.get(isoDay) || [];
              const studyBlocks = studyBlocksByDay.get(isoDay) || [];
              const examBlocks = examBlocksByDay.get(isoDay) || [];

              return (
                <div key={day.key} style={dayColumnStyle(colors)}>
                  <div style={dayHeaderStyle(colors, isToday(day.date))}>
                    <strong>{WEEKDAYS[index]}</strong>
                    <span>{formatMonthDay(day.date)}</span>
                  </div>
                  <div style={dayBodyStyle(colors)}>
                    {Array.from({ length: END_HOUR - START_HOUR }, (_, row) => (
                      <div key={row} style={hourLineStyle(colors)} />
                    ))}

                    {classBlocks.map((item) => (
                      <ScheduleBlock
                        key={item.id}
                        item={item}
                        colors={colors}
                        type="class"
                        onDelete={() => deleteFixedClass(item.id)}
                      />
                    ))}

                    {studyBlocks.map((item) => (
                      <ScheduleBlock
                        key={item.id}
                        item={item}
                        colors={colors}
                        type="study"
                        onSelect={() => selectStudyPlanBlock(item)}
                        onDelete={() => deleteStudyPlanBlock(item.id)}
                        onToggleDone={() => toggleStudyPlanBlockDone(item.id)}
                      />
                    ))}

                    {examBlocks.map(({ exam, date }) => (
                      <ScheduleBlock
                        key={exam.id}
                        item={{
                          title: exam.subject || "考试",
                          startTime: formatTime(date),
                          endTime: formatTime(addMinutes(date, 90)),
                          courseName: exam.subject,
                          location: exam.goal || `重要度 ${exam.importance || 3}`,
                          completedAt: exam.completed ? "done" : "",
                        }}
                        colors={colors}
                        type="exam"
                        onDelete={() => deleteExam(exam.id)}
                      />
                    ))}

                    {ddlBlocks.map(({ ddl, date }) => (
                      <ScheduleBlock
                        key={ddl.id}
                        item={{
                          title: ddl.title || "未命名 DDL",
                          startTime: formatTime(date),
                          endTime: formatTime(addMinutes(date, 45)),
                          courseName: ddl.courseName || "未归属课程",
                          location: ddl.platform || ddl.note || "截止时间",
                        }}
                        colors={colors}
                        type="ddl"
                      />
                    ))}

                    {classBlocks.length === 0 && studyBlocks.length === 0 && ddlBlocks.length === 0 && examBlocks.length === 0 && (
                      <div style={emptyDayStyle(colors)}>空余</div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
          )}
        </section>

        <aside style={sidePanelStyle(colors)}>
          <section style={panelCardStyle(colors)}>
            <h2 style={panelTitleStyle(colors)}>南京大学课表导入</h2>
            <p style={panelTextStyle(colors)}>
              认证后读取课表；不保存账号密码。
            </p>
            <div style={importActionRowStyle}>
              <button
                type="button"
                onClick={autoImportNjuSchedule}
                disabled={njuImporting}
                style={primaryButtonStyle(colors, njuImporting)}
              >
                认证并自动读取
              </button>
              <button
                type="button"
                onClick={() => openNjuTeachingPortal()}
                style={outlineButtonStyle(colors)}
              >
                官方入口
              </button>
              <button type="button" onClick={previewImportedSchedule} style={outlineButtonStyle(colors)}>
                解析预览
              </button>
            </div>
            <p style={importMessageStyle(colors)}>
              {hasDesktopScheduleBridge
                ? "桌面读取已可用。"
                : "网页模式可粘贴导入。"}
            </p>
            <label style={{ ...fieldStyle(colors), marginTop: "14px" }}>
              <span>本学期第 1 周周一</span>
              <div style={semesterInputRowStyle}>
                <input
                  type="date"
                  value={semesterStartMonday}
                  onChange={(event) => setSemesterStartMonday(event.target.value)}
                  style={inputStyle(colors)}
                />
                <button
                  type="button"
                  onClick={() => setSemesterStartMonday(formatDateInput(currentWeek))}
                  style={outlineButtonStyle(colors)}
                >
                  设为本周
                </button>
              </div>
            </label>
            <p style={importMessageStyle(colors)}>
              {teachingWeek
                ? `第 ${teachingWeek} 教学周`
                : "未设置教学周"}
            </p>
            <label style={{ ...fieldStyle(colors), marginTop: "14px" }}>
              <span>粘贴课表 / 导入 CSV、TXT</span>
              <input
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={readScheduleImportFile}
                style={fileInputStyle(colors)}
              />
              <textarea
                value={scheduleImportText}
                onChange={(event) => setScheduleImportText(event.target.value)}
                placeholder="示例：高等数学,周一,1-2节,仙林校区 教学楼101"
                style={textareaStyle(colors)}
              />
            </label>
            <p style={importMessageStyle(colors)}>{scheduleImportMessage}</p>
            {scheduleImportPreview.length > 0 && (
              <div style={importPreviewStyle(colors)}>
                {scheduleImportPreview.slice(0, 4).map((item, index) => (
                  <div key={`${item.title}-${item.day}-${index}`} style={importPreviewItemStyle(colors)}>
                    <strong>{item.title}</strong>
                    <span>
                      {WEEKDAYS[item.day - 1]} {item.startTime}-{item.endTime}
                    </span>
                    <span>{buildClassMetaText(item) || item.location || "未填写地点"}</span>
                  </div>
                ))}
              </div>
            )}
            {scheduleImportErrors.length > 0 && (
              <p style={importErrorStyle(colors)}>
                {scheduleImportErrors.slice(0, 2).join("；")}
              </p>
            )}
            <button
              type="button"
              onClick={importScheduleClasses}
              disabled={scheduleImportText.trim().length === 0}
              style={primaryButtonStyle(colors, scheduleImportText.trim().length === 0)}
            >
              导入到固定课表
            </button>
          </section>

          <section style={panelCardStyle(colors)}>
            <h2 style={panelTitleStyle(colors)}>录入固定课表</h2>
            <p style={panelTextStyle(colors)}>
              锁定上课时间，规划自动避开。
            </p>
            <form onSubmit={addFixedClass} style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
              <label style={fieldStyle(colors)}>
                <span>课程名称</span>
                <input
                  value={classTitle}
                  onChange={(event) => setClassTitle(event.target.value)}
                  placeholder="例如：高等数学"
                  style={inputStyle(colors)}
                />
              </label>
              <label style={fieldStyle(colors)}>
                <span>关联课程</span>
                <select
                  value={classCourseId}
                  onChange={(event) => setClassCourseId(event.target.value)}
                  style={inputStyle(colors)}
                >
                  <option value="">不关联课程</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label style={fieldStyle(colors)}>
                  <span>星期</span>
                  <select value={classDay} onChange={(event) => setClassDay(event.target.value)} style={inputStyle(colors)}>
                    {WEEKDAYS.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={fieldStyle(colors)}>
                  <span>地点</span>
                  <input
                    value={classLocation}
                    onChange={(event) => setClassLocation(event.target.value)}
                    placeholder="教学楼 / 教室"
                    style={inputStyle(colors)}
                  />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label style={fieldStyle(colors)}>
                  <span>开始</span>
                  <input type="time" value={classStart} onChange={(event) => setClassStart(event.target.value)} style={inputStyle(colors)} />
                </label>
                <label style={fieldStyle(colors)}>
                  <span>结束</span>
                  <input type="time" value={classEnd} onChange={(event) => setClassEnd(event.target.value)} style={inputStyle(colors)} />
                </label>
              </div>
              <button type="submit" style={primaryButtonStyle(colors)}>
                保存固定课程
              </button>
            </form>
          </section>

          <section style={panelCardStyle(colors)}>
            <h2 style={panelTitleStyle(colors)}>录入考试</h2>
            <p style={panelTextStyle(colors)}>
              用于月视图和复习权重。
            </p>
            <form onSubmit={addExam} style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
              <label style={fieldStyle(colors)}>
                <span>科目</span>
                <input
                  value={examSubject}
                  onChange={(event) => setExamSubject(event.target.value)}
                  placeholder="例如：高等数学期末"
                  style={inputStyle(colors)}
                />
              </label>
              <label style={fieldStyle(colors)}>
                <span>考试时间</span>
                <input
                  type="datetime-local"
                  value={examDate}
                  onChange={(event) => setExamDate(event.target.value)}
                  style={inputStyle(colors)}
                />
              </label>
              <label style={fieldStyle(colors)}>
                <span>复习目标</span>
                <input
                  value={examGoal}
                  onChange={(event) => setExamGoal(event.target.value)}
                  placeholder="例如：完成错题回看和公式整理"
                  style={inputStyle(colors)}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label style={fieldStyle(colors)}>
                  <span>重要度</span>
                  <select value={examImportance} onChange={(event) => setExamImportance(event.target.value)} style={inputStyle(colors)}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={fieldStyle(colors)}>
                  <span>复习块时长</span>
                  <select value={examReviewMinutes} onChange={(event) => setExamReviewMinutes(event.target.value)} style={inputStyle(colors)}>
                    <option value="30">30 分钟</option>
                    <option value="60">60 分钟</option>
                    <option value="90">90 分钟</option>
                    <option value="120">120 分钟</option>
                  </select>
                </label>
              </div>
              <button type="submit" style={primaryButtonStyle(colors)}>
                保存考试
              </button>
            </form>
            {exams.length > 0 && (
              <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                {exams.slice(0, 4).map((exam) => (
                  <div key={exam.id} style={examMiniCardStyle(colors, exam.completed)}>
                    <strong>{exam.subject}</strong>
                    <span>{exam.date} · 重要度 {exam.importance}</span>
                    {exam.goal && <span>{exam.goal}</span>}
                    <div style={miniActionRowStyle}>
                      <button type="button" onClick={() => toggleExamDone(exam.id)} style={miniButtonStyle(colors)}>
                        {exam.completed ? "取消完成" : "完成"}
                      </button>
                      <button type="button" onClick={() => deleteExam(exam.id)} style={miniButtonStyle(colors)}>
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={panelCardStyle(colors)}>
            <h2 style={panelTitleStyle(colors)}>规划准备度</h2>
            <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
              <PlanningLine colors={colors} active={fixedClasses.length > 0} text="已录入固定课表" />
              <PlanningLine colors={colors} active={Boolean(semesterStartMonday)} text="已设置教学周过滤" />
              <PlanningLine colors={colors} active={weekDdls.length > 0} text="已有 DDL 截止时间" />
              <PlanningLine colors={colors} active={weekExams.length > 0} text="已有考试信息" />
              <PlanningLine colors={colors} active={weekStudyPlanBlocks.length > 0} text="已生成本周复习块" />
              <PlanningLine colors={colors} active={scheduleConflicts.length === 0} text="冲突检测通过" />
            </div>
            {scheduleConflicts.length > 0 && (
              <div style={conflictListStyle}>
                {scheduleConflicts.slice(0, 4).map((conflict) => (
                  <div key={conflict.key} style={conflictItemStyle(colors)}>
                    {conflict.text}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={panelCardStyle(colors)}>
            <h2 style={panelTitleStyle(colors)}>自动复习规划</h2>
            <p style={panelTextStyle(colors)}>
              优先安排截止前的空余时间。
            </p>
            <div style={importActionRowStyle}>
              <button type="button" onClick={generateWeeklyStudyPlan} style={primaryButtonStyle(colors)}>
                生成本周规划
              </button>
              <button type="button" onClick={clearWeeklyStudyPlan} style={outlineButtonStyle(colors)}>
                清空本周
              </button>
              <button type="button" onClick={postponeUnfinishedStudyBlocks} style={outlineButtonStyle(colors)}>
                顺延未完成
              </button>
              <button type="button" onClick={enableScheduleReminders} style={outlineButtonStyle(colors)}>
                {remindersEnabled ? "提醒已开" : "开启提醒"}
              </button>
            </div>
            {weekStudyPlanBlocks.length === 0 ? (
              <p style={panelTextStyle(colors)}>本周还没有复习块。</p>
            ) : (
              <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                {weekStudyPlanBlocks.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectStudyPlanBlock(item)}
                    style={selectableMiniCardStyle(colors, studyBlockDraft?.id === item.id)}
                  >
                    <strong style={{ color: colors.title, fontSize: "13px" }}>{item.title}</strong>
                    <span style={{ color: colors.text, fontSize: "12px", marginTop: "4px" }}>
                      {WEEKDAYS[item.day - 1]} {item.startTime}-{item.endTime} · {item.courseName}
                    </span>
                    <span style={{ color: item.completedAt ? colors.success : colors.text, fontSize: "12px", marginTop: "4px" }}>
                      {item.completedAt ? "已完成" : "未完成"}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {studyBlockDraft && (
              <form onSubmit={saveStudyBlockDraft} style={studyEditFormStyle(colors)}>
                <label style={fieldStyle(colors)}>
                  <span>复习块标题</span>
                  <input
                    value={studyBlockDraft.title}
                    onChange={(event) => updateStudyBlockDraft({ title: event.target.value })}
                    style={inputStyle(colors)}
                  />
                </label>
                <label style={fieldStyle(colors)}>
                  <span>星期</span>
                  <select
                    value={studyBlockDraft.day}
                    onChange={(event) => updateStudyBlockDraft({ day: event.target.value })}
                    style={inputStyle(colors)}
                  >
                    {WEEKDAYS.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label style={fieldStyle(colors)}>
                    <span>开始</span>
                    <input
                      type="time"
                      value={studyBlockDraft.startTime}
                      onChange={(event) => updateStudyBlockDraft({ startTime: event.target.value })}
                      style={inputStyle(colors)}
                    />
                  </label>
                  <label style={fieldStyle(colors)}>
                    <span>结束</span>
                    <input
                      type="time"
                      value={studyBlockDraft.endTime}
                      onChange={(event) => updateStudyBlockDraft({ endTime: event.target.value })}
                      style={inputStyle(colors)}
                    />
                  </label>
                </div>
                <div style={importActionRowStyle}>
                  <button type="submit" style={primaryButtonStyle(colors)}>
                    保存调整
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteStudyPlanBlock(studyBlockDraft.id)}
                    style={outlineButtonStyle(colors)}
                  >
                    删除
                  </button>
                </div>
              </form>
            )}
            <p style={importMessageStyle(colors)}>{studyPlanMessage}</p>
          </section>

          <section style={panelCardStyle(colors)}>
            <h2 style={panelTitleStyle(colors)}>本周 DDL</h2>
            {weekDdls.length === 0 ? (
              <p style={panelTextStyle(colors)}>本周暂无待处理 DDL。</p>
            ) : (
              <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
                {weekDdls.slice(0, 6).map(({ ddl, date }) => (
                  <div key={ddl.id} style={ddlMiniCardStyle(colors)}>
                    <strong style={{ color: colors.title, fontSize: "13px" }}>{ddl.title}</strong>
                    <span style={{ color: colors.text, fontSize: "12px", marginTop: "4px" }}>
                      {formatMonthDay(date)} {formatTime(date)} · {ddl.courseName || "未归属课程"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
        </div>
      </main>
      </div>
    </div>
  );
}

function ScheduleBlock({ item, colors, type, onDelete, onSelect, onToggleDone }) {
  const start = clampStartMinutes(timeToMinutes(item.startTime));
  const end = clampMinutes(timeToMinutes(item.endTime));
  const top = ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(24, ((end - start) / 60) * HOUR_HEIGHT);
  const isDdl = type === "ddl";
  const isStudy = type === "study";
  const isExam = type === "exam";
  const isDone = Boolean(item.completedAt);
  const blockBg = isDdl ? colors.ddlBg : isExam ? colors.examBg : isStudy ? colors.studyBg : colors.classBg;
  const blockBorder = isDdl
    ? colors.warningBorder
    : isExam
      ? colors.examBorder
    : isStudy
      ? colors.studyBorder
      : colors.activeBorder;
  const blockText = isDdl ? colors.warningText : isExam ? colors.examText : isStudy ? colors.studyText : colors.activeText;

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      style={{
        position: "absolute",
        left: "4px",
        right: "4px",
        top,
        minHeight: height,
        borderRadius: "9px",
        padding: "4px 6px",
        boxSizing: "border-box",
        background: blockBg,
        border: `1px solid ${blockBorder}`,
        color: blockText,
        overflow: "hidden",
        cursor: onSelect ? "pointer" : "default",
        zIndex: isDdl ? 4 : isStudy ? 3 : 2,
        opacity: isDone ? 0.68 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "6px" }}>
        <strong style={{ fontSize: "11px", lineHeight: 1.2, textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</strong>
        {onToggleDone && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleDone();
            }}
            style={blockDoneStyle(colors, isDone)}
          >
            {isDone ? "✓" : "○"}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            style={blockDeleteStyle(colors)}
          >
            ×
          </button>
        )}
      </div>
      <div style={{ fontSize: "10px", marginTop: "3px", opacity: 0.86, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.startTime} - {item.endTime}
      </div>
      <div style={{ fontSize: "10px", marginTop: "2px", opacity: 0.78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.location || item.courseName || "固定时间"}
      </div>
      {buildClassMetaText(item, { includeLocation: false }) && (
        <div style={{ fontSize: "10px", marginTop: "2px", opacity: 0.72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {buildClassMetaText(item, { includeLocation: false })}
        </div>
      )}
    </div>
  );
}

function MonthCalendar({ colors, monthDays, currentWeek, fixedClasses, ddls, exams, studyBlocks }) {
  const month = currentWeek.getMonth();

  return (
    <div style={monthGridStyle(colors)}>
      {WEEKDAYS.map((label) => (
        <div key={label} style={monthWeekdayStyle(colors)}>
          {label}
        </div>
      ))}
      {monthDays.map((day) => {
        const items = buildMonthDayItems({
          date: day.date,
          fixedClasses,
          ddls,
          exams,
          studyBlocks,
        });
        const muted = day.date.getMonth() !== month;

        return (
          <div key={day.key} style={monthDayStyle(colors, muted, isToday(day.date))}>
            <div style={monthDayNumberStyle(colors, muted)}>
              {day.date.getDate()}
            </div>
            <div style={{ display: "grid", gap: "5px", marginTop: "8px" }}>
              {items.slice(0, 4).map((item) => (
                <div key={item.key} style={monthItemStyle(colors, item.type)}>
                  {item.text}
                </div>
              ))}
              {items.length > 4 && (
                <div style={monthMoreStyle(colors)}>+{items.length - 4} 项</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildMonthDayItems({ date, fixedClasses, ddls, exams, studyBlocks }) {
  const isoDay = getIsoDay(date);
  const items = [];

  fixedClasses
    .filter((item) => Number(item.day) === isoDay)
    .forEach((item) => {
      items.push({
        key: `class-${item.id}-${date.toISOString()}`,
        type: "class",
        text: `${item.startTime} ${item.title}`,
      });
    });

  ddls
    .map((ddl) => ({ ddl, date: parseScheduleDate(ddl.date) }))
    .filter(({ ddl, date: ddlDate }) => !ddl.completed && ddlDate && isSameDate(ddlDate, date))
    .forEach(({ ddl, date: ddlDate }) => {
      items.push({
        key: `ddl-${ddl.id}`,
        type: "ddl",
        text: `${formatTime(ddlDate)} ${ddl.title || "DDL"}`,
      });
    });

  exams
    .map((exam) => ({ exam, date: parseScheduleDate(exam.date) }))
    .filter(({ exam, date: examDate }) => !exam.completed && examDate && isSameDate(examDate, date))
    .forEach(({ exam, date: examDate }) => {
      items.push({
        key: `exam-${exam.id}`,
        type: "exam",
        text: `${formatTime(examDate)} ${exam.subject || "考试"}`,
      });
    });

  studyBlocks
    .filter((item) => isSameDate(parseScheduleDate(item.date), date))
    .forEach((item) => {
      items.push({
        key: `study-${item.id}`,
        type: "study",
        text: `${item.startTime} ${item.title}`,
      });
    });

  return items.sort((a, b) => extractLeadingMinutes(a.text) - extractLeadingMinutes(b.text));
}

function StatCard({ label, value, detail, colors }) {
  return (
    <div style={statCardStyle(colors)}>
      <span style={{ color: colors.muted, fontSize: "11px", fontWeight: 900 }}>{label}</span>
      <strong style={{ color: colors.title, fontSize: "17px", marginTop: "4px" }}>{value}</strong>
      <span style={{ color: colors.text, fontSize: "11px", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {detail}
      </span>
    </div>
  );
}

function PlanningLine({ colors, active, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "9px", color: active ? colors.title : colors.text, fontSize: "13px", fontWeight: 800 }}>
      <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: active ? colors.success : colors.muted }} />
      {text}
    </div>
  );
}

function buildColors(darkMode) {
  return {
    bg: darkMode ? "#0F172A" : "#F5F9FF",
    shell: darkMode ? "rgba(15,23,42,0.86)" : "rgba(255,255,255,0.82)",
    panel: darkMode ? "#111827" : "#FFFFFF",
    card: darkMode ? "rgba(30,41,59,0.76)" : "#F8FBFF",
    border: darkMode ? "rgba(148,163,184,0.18)" : "#E2EAF5",
    title: darkMode ? "#F8FAFC" : "#173B63",
    text: darkMode ? "#CBD5E1" : "#64748B",
    muted: darkMode ? "#94A3B8" : "#94A3B8",
    active: darkMode ? "#93C5FD" : "#2563EB",
    activeText: darkMode ? "#DBEAFE" : "#1D4ED8",
    activeBorder: darkMode ? "rgba(147,197,253,0.34)" : "rgba(37,99,235,0.22)",
    classBg: darkMode ? "rgba(37,99,235,0.20)" : "#EEF5FF",
    ddlBg: darkMode ? "rgba(245,158,11,0.18)" : "#FFF7ED",
    examBg: darkMode ? "rgba(168,85,247,0.18)" : "#F5F3FF",
    examText: darkMode ? "#DDD6FE" : "#6D28D9",
    examBorder: darkMode ? "rgba(168,85,247,0.34)" : "rgba(124,58,237,0.28)",
    studyBg: darkMode ? "rgba(16,185,129,0.18)" : "#ECFDF5",
    studyText: darkMode ? "#A7F3D0" : "#047857",
    studyBorder: darkMode ? "rgba(16,185,129,0.34)" : "rgba(16,185,129,0.30)",
    warningText: darkMode ? "#FCD34D" : "#B45309",
    warningBorder: darkMode ? "rgba(245,158,11,0.34)" : "rgba(245,158,11,0.30)",
    success: "#10B981",
  };
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = getIsoDay(next);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day + 1);
  return next;
}

function buildWeekDays(weekStart) {
  return WEEKDAYS.map((_, index) => {
    const date = addDays(weekStart, index);
    return {
      key: date.toISOString(),
      date,
    };
  });
}

function buildMonthDays(anchorDate) {
  const firstOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      key: date.toISOString(),
      date,
    };
  });
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addMinutes(date, minutes) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

function getIsoDay(date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function isWithinWeek(date, weekStart) {
  const end = addDays(weekStart, 7);
  return date >= weekStart && date < end;
}

function isToday(date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isSameDate(left, right) {
  if (!left || !right) return false;
  return left.toDateString() === right.toDateString();
}

function getTeachingWeek(weekStart, semesterStartMonday) {
  const start = parseDateInput(semesterStartMonday);
  if (!start) return null;

  const normalizedStart = startOfWeek(start);
  const diff = weekStart.getTime() - normalizedStart.getTime();
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;

  return week > 0 ? week : null;
}

function isClassVisibleInTeachingWeek(item, teachingWeek) {
  if (!Array.isArray(item.weeks) || item.weeks.length === 0) return true;
  if (!teachingWeek) return true;

  return item.weeks.includes(teachingWeek);
}

function parseScheduleDate(value) {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function detectScheduleConflicts({ fixedClasses, studyBlocks, exams, weekStart }) {
  const events = [];

  fixedClasses.forEach((item) => {
    events.push({
      key: `class-${item.id}`,
      kind: "固定课",
      title: item.title,
      day: Number(item.day),
      start: timeToMinutes(item.startTime),
      end: timeToMinutes(item.endTime),
      locked: true,
    });
  });

  studyBlocks
    .filter((item) => isWithinWeek(parseScheduleDate(item.date), weekStart))
    .forEach((item) => {
      events.push({
        key: `study-${item.id}`,
        kind: "复习",
        title: item.title,
        day: Number(item.day),
        start: timeToMinutes(item.startTime),
        end: timeToMinutes(item.endTime),
      });
    });

  exams
    .map((exam) => ({ exam, date: parseScheduleDate(exam.date) }))
    .filter(({ date }) => date && isWithinWeek(date, weekStart))
    .forEach(({ exam, date }) => {
      const start = date.getHours() * 60 + date.getMinutes();
      events.push({
        key: `exam-${exam.id}`,
        kind: "考试",
        title: exam.subject,
        day: getIsoDay(date),
        start,
        end: start + 90,
      });
    });

  const conflicts = [];

  for (let i = 0; i < events.length; i += 1) {
    for (let j = i + 1; j < events.length; j += 1) {
      const left = events[i];
      const right = events[j];
      if (left.day !== right.day) continue;
      if (left.start >= right.end || right.start >= left.end) continue;

      conflicts.push({
        key: `${left.key}-${right.key}`,
        text: `${WEEKDAYS[left.day - 1]} ${minutesToTime(Math.max(left.start, right.start))}：${left.kind}「${left.title}」与${right.kind}「${right.title}」冲突`,
      });
    }
  }

  return conflicts;
}

function buildUpcomingReminderEvents({ ddls, exams, studyBlocks }) {
  const now = new Date();
  const end = addDays(now, 7);
  const events = [];

  ddls.forEach((ddl) => {
    const date = parseScheduleDate(ddl.date);
    if (!date || ddl.completed || date < now || date > end) return;
    events.push({
      title: `DDL 提醒：${ddl.title || "未命名任务"}`,
      detail: `${ddl.courseName || "未归属课程"} 将在 ${formatMonthDay(date)} ${formatTime(date)} 截止`,
      date,
    });
  });

  exams.forEach((exam) => {
    const date = parseScheduleDate(exam.date);
    if (!date || exam.completed || date < now || date > end) return;
    events.push({
      title: `考试提醒：${exam.subject || "考试"}`,
      detail: exam.goal || `重要度 ${exam.importance || 3}`,
      date,
    });
  });

  studyBlocks.forEach((item) => {
    const date = parseScheduleDate(`${item.date}T${item.startTime}`);
    if (!date || item.completedAt || date < now || date > end) return;
    events.push({
      title: `复习提醒：${item.title}`,
      detail: `${formatMonthDay(date)} ${item.startTime}-${item.endTime}`,
      date,
    });
  });

  return events.sort((a, b) => a.date - b.date);
}

function parseDateInput(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function timeToMinutes(value) {
  const [hourText = "0", minuteText = "0"] = String(value || "").split(":");
  return Number(hourText) * 60 + Number(minuteText);
}

function minutesToTime(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function extractLeadingMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 9999;
}

function clampMinutes(value) {
  return Math.min(Math.max(value, START_HOUR * 60), END_HOUR * 60);
}

function clampStartMinutes(value) {
  return Math.min(Math.max(value, START_HOUR * 60), END_HOUR * 60 - 45);
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatWeekRange(weekStart) {
  const end = addDays(weekStart, 6);
  return `${weekStart.getFullYear()} 年 ${formatMonthDay(weekStart)} - ${formatMonthDay(end)}`;
}

function formatDateInput(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildClassMetaText(item, options = {}) {
  const includeLocation = options.includeLocation !== false;
  const parts = [
    includeLocation ? item.location : "",
    item.teacher ? `教师 ${item.teacher}` : "",
    item.weekText || formatWeeks(item.weeks),
    item.classNumber ? `课号 ${item.classNumber}` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function formatWeeks(weeks) {
  if (!Array.isArray(weeks) || weeks.length === 0) return "";

  return `${weeks.join(",")}周`;
}

function createStudyBlockDraft(block) {
  return {
    id: block.id,
    title: block.title || "",
    day: String(block.day || 1),
    date: block.date || "",
    startTime: block.startTime || "08:00",
    endTime: block.endTime || "09:00",
  };
}

function hasNjuScheduleBridge() {
  return (
    typeof window !== "undefined" &&
    typeof window.notewhaleDesktop?.importNjuSchedule === "function"
  );
}

const pageGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "14px",
  padding: "0 22px 28px",
};

const calendarHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  marginBottom: "10px",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
  gap: "8px",
  marginBottom: "10px",
};

function viewToggleStyle(colors) {
  return {
    display: "inline-grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4px",
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    padding: "4px",
    marginBottom: "10px",
  };
}

function viewToggleButtonStyle(colors, active) {
  return {
    border: "none",
    borderRadius: "9px",
    background: active ? colors.active : "transparent",
    color: active ? "#FFFFFF" : colors.title,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 900,
    padding: "8px 14px",
    fontFamily: "inherit",
  };
}

const calendarScrollStyle = {
  overflowX: "visible",
  paddingBottom: "4px",
};

function scheduleContentStyle(colors) {
  return {
    flex: 1,
    overflowY: "auto",
    padding: "18px 24px 30px",
    boxSizing: "border-box",
    background: colors.bg,
  };
}

function scheduleHeroStyle(colors) {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    borderBottom: `1px solid ${colors.border}`,
    paddingBottom: "12px",
    marginBottom: "14px",
  };
}

function calendarShellStyle(colors) {
  return {
    minWidth: 0,
    background: colors.shell,
    border: `1px solid ${colors.border}`,
    borderRadius: "18px",
    padding: "14px",
    boxShadow: "0 14px 34px rgba(15,42,74,0.07)",
  };
}

function sidePanelStyle(colors) {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
    alignContent: "start",
    color: colors.title,
  };
}

function panelCardStyle(colors) {
  return {
    minWidth: 0,
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: "16px",
    padding: "16px",
  };
}

function panelTitleStyle(colors) {
  return { margin: 0, color: colors.title, fontSize: "17px", fontWeight: 900 };
}

function panelTextStyle(colors) {
  return { margin: "8px 0 0", color: colors.text, fontSize: "13px", lineHeight: 1.7 };
}

function weekGridStyle(colors) {
  return {
    display: "grid",
    gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))",
    minWidth: 0,
    border: `1px solid ${colors.border}`,
    borderRadius: "18px",
    overflow: "hidden",
    background: colors.panel,
  };
}

function timeColumnStyle(colors) {
  return {
    background: colors.card,
    borderRight: `1px solid ${colors.border}`,
  };
}

function timeLabelStyle(colors) {
  return {
    height: `${HOUR_HEIGHT}px`,
    color: colors.muted,
    fontSize: "9px",
    textAlign: "center",
    boxSizing: "border-box",
    paddingTop: "4px",
  };
}

function dayColumnStyle(colors) {
  return {
    minWidth: 0,
    borderRight: `1px solid ${colors.border}`,
  };
}

function dayHeaderStyle(colors, active) {
  return {
    height: "34px",
    display: "grid",
    placeItems: "center",
    gap: "2px",
    background: active ? colors.classBg : colors.card,
    color: active ? colors.activeText : colors.title,
    borderBottom: `1px solid ${colors.border}`,
    fontSize: "12px",
  };
}

function dayBodyStyle(colors) {
  return {
    position: "relative",
    minHeight: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px`,
    background: colors.panel,
  };
}

function hourLineStyle(colors) {
  return {
    height: `${HOUR_HEIGHT}px`,
    borderBottom: `1px solid ${colors.border}`,
    boxSizing: "border-box",
  };
}

function statCardStyle(colors) {
  return {
    display: "grid",
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    padding: "10px 12px",
    minWidth: 0,
  };
}

function emptyDayStyle(colors) {
  return {
    position: "absolute",
    top: "8px",
    left: "8px",
    color: colors.muted,
    fontSize: "11px",
  };
}

function fieldStyle(colors) {
  return {
    display: "grid",
    gap: "7px",
    color: colors.text,
    fontSize: "12px",
    fontWeight: 900,
  };
}

function inputStyle(colors) {
  return {
    height: "40px",
    border: `1px solid ${colors.border}`,
    borderRadius: "10px",
    background: colors.panel,
    color: colors.title,
    padding: "0 11px",
    fontFamily: "inherit",
    outline: "none",
  };
}

const importActionRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(94px, 1fr))",
  gap: "10px",
  marginTop: "14px",
};

const semesterInputRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "10px",
};

function fileInputStyle(colors) {
  return {
    border: `1px dashed ${colors.border}`,
    borderRadius: "10px",
    background: colors.card,
    color: colors.text,
    padding: "10px",
    fontFamily: "inherit",
    fontSize: "12px",
  };
}

function textareaStyle(colors) {
  return {
    minHeight: "98px",
    border: `1px solid ${colors.border}`,
    borderRadius: "10px",
    background: colors.panel,
    color: colors.title,
    padding: "10px 11px",
    fontFamily: "inherit",
    fontSize: "13px",
    lineHeight: 1.55,
    outline: "none",
    resize: "vertical",
  };
}

function importMessageStyle(colors) {
  return {
    margin: "10px 0 0",
    color: colors.text,
    fontSize: "12px",
    lineHeight: 1.6,
  };
}

function importErrorStyle(colors) {
  return {
    margin: "8px 0 12px",
    color: colors.warningText,
    fontSize: "12px",
    lineHeight: 1.6,
  };
}

function importPreviewStyle(colors) {
  return {
    display: "grid",
    gap: "8px",
    margin: "12px 0",
    borderTop: `1px solid ${colors.border}`,
    paddingTop: "12px",
  };
}

function importPreviewItemStyle(colors) {
  return {
    display: "grid",
    gap: "4px",
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    padding: "10px",
    color: colors.text,
    fontSize: "12px",
  };
}

function primaryButtonStyle(colors, disabled = false) {
  return {
    height: "40px",
    border: "none",
    borderRadius: "10px",
    background: colors.active,
    color: "#FFFFFF",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 900,
    fontFamily: "inherit",
    padding: "0 14px",
    opacity: disabled ? 0.55 : 1,
  };
}

function outlineButtonStyle(colors) {
  return {
    height: "40px",
    border: `1px solid ${colors.border}`,
    borderRadius: "10px",
    background: colors.panel,
    color: colors.title,
    cursor: "pointer",
    fontWeight: 800,
    fontFamily: "inherit",
    padding: "0 14px",
  };
}

function blockDeleteStyle(colors) {
  return {
    border: "none",
    background: "transparent",
    color: colors.activeText,
    cursor: "pointer",
    fontSize: "15px",
    lineHeight: 1,
    padding: 0,
  };
}

function blockDoneStyle(colors, done) {
  return {
    border: `1px solid ${done ? colors.success : colors.border}`,
    background: done ? `${colors.success}22` : "transparent",
    color: done ? colors.success : colors.text,
    cursor: "pointer",
    borderRadius: "999px",
    width: "20px",
    height: "20px",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    fontSize: "12px",
    lineHeight: 1,
    padding: 0,
  };
}

function ddlMiniCardStyle(colors) {
  return {
    display: "grid",
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    padding: "11px",
  };
}

function examMiniCardStyle(colors, completed) {
  return {
    display: "grid",
    gap: "5px",
    background: colors.examBg,
    border: `1px solid ${colors.examBorder}`,
    borderRadius: "12px",
    padding: "11px",
    color: completed ? colors.text : colors.examText,
    opacity: completed ? 0.64 : 1,
    fontSize: "12px",
  };
}

const miniActionRowStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "6px",
};

function miniButtonStyle(colors) {
  return {
    height: "28px",
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    background: colors.panel,
    color: colors.title,
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 800,
    padding: "0 10px",
  };
}

const conflictListStyle = {
  display: "grid",
  gap: "8px",
  marginTop: "12px",
};

function conflictItemStyle(colors) {
  return {
    color: colors.warningText,
    background: colors.ddlBg,
    border: `1px solid ${colors.warningBorder}`,
    borderRadius: "10px",
    padding: "9px 10px",
    fontSize: "12px",
    lineHeight: 1.5,
  };
}

function monthGridStyle(colors) {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    border: `1px solid ${colors.border}`,
    borderRadius: "18px",
    overflow: "hidden",
    background: colors.panel,
  };
}

function monthWeekdayStyle(colors) {
  return {
    background: colors.card,
    color: colors.text,
    borderRight: `1px solid ${colors.border}`,
    borderBottom: `1px solid ${colors.border}`,
    padding: "10px",
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 900,
  };
}

function monthDayStyle(colors, muted, active) {
  return {
    minHeight: "116px",
    padding: "10px",
    borderRight: `1px solid ${colors.border}`,
    borderBottom: `1px solid ${colors.border}`,
    background: active ? colors.classBg : colors.panel,
    opacity: muted ? 0.58 : 1,
    minWidth: 0,
  };
}

function monthDayNumberStyle(colors, muted) {
  return {
    color: muted ? colors.muted : colors.title,
    fontSize: "13px",
    fontWeight: 900,
  };
}

function monthItemStyle(colors, type) {
  const palette =
    type === "ddl"
      ? { bg: colors.ddlBg, border: colors.warningBorder, text: colors.warningText }
      : type === "exam"
        ? { bg: colors.examBg, border: colors.examBorder, text: colors.examText }
        : type === "study"
          ? { bg: colors.studyBg, border: colors.studyBorder, text: colors.studyText }
          : { bg: colors.classBg, border: colors.activeBorder, text: colors.activeText };

  return {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    background: palette.bg,
    border: `1px solid ${palette.border}`,
    color: palette.text,
    borderRadius: "8px",
    padding: "5px 7px",
    fontSize: "11px",
    fontWeight: 800,
  };
}

function monthMoreStyle(colors) {
  return {
    color: colors.muted,
    fontSize: "11px",
    fontWeight: 800,
  };
}

function selectableMiniCardStyle(colors, active) {
  return {
    ...ddlMiniCardStyle(colors),
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
    border: `1px solid ${active ? colors.studyBorder : colors.border}`,
    boxShadow: active ? "0 0 0 3px rgba(16,185,129,0.12)" : "none",
  };
}

function studyEditFormStyle(colors) {
  return {
    display: "grid",
    gap: "12px",
    marginTop: "14px",
    paddingTop: "14px",
    borderTop: `1px solid ${colors.border}`,
  };
}

export default SchedulePage;
