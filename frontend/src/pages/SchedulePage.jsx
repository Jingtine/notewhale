import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { getDdls as getBackendDdls } from "../api/ddlApi";
import { getFolders as getBackendFolders } from "../api/folderApi";
import { mapBackendFolder } from "../data/courseFolderStore";
import { mapBackendDdl } from "../data/learningItemMappers";
import { parseScheduleImportText } from "../data/scheduleImport";
import {
  readStorageBoolean,
  readUserStorageArray,
  writeStorageValue,
  writeUserStorageArray,
} from "../data/userStorage";

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 64;
const SCHEDULE_STORAGE_KEY = "fixedClassSchedule";
const NJU_TEACHING_PORTAL_URL =
  "https://jw.nju.edu.cn/24777/list.htm";

function SchedulePage({ user = null, onLogout } = {}) {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => readStorageBoolean("darkMode", false));
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date()));
  const [fixedClasses, setFixedClasses] = useState(() =>
    readUserStorageArray(user, SCHEDULE_STORAGE_KEY, [])
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
  const [scheduleImportText, setScheduleImportText] = useState("");
  const [scheduleImportPreview, setScheduleImportPreview] = useState([]);
  const [scheduleImportErrors, setScheduleImportErrors] = useState([]);
  const [scheduleImportMessage, setScheduleImportMessage] = useState(
    "不保存账号密码，仅解析你粘贴或导出的课表内容。"
  );
  const [selectedFolder, setSelectedFolder] = useState("学习日程");
  const [searchText, setSearchText] = useState("");

  const colors = buildColors(darkMode);
  const weekDays = useMemo(() => buildWeekDays(currentWeek), [currentWeek]);
  const courses = useMemo(
    () => folders.flatMap((folder) => folder.courses || folder.items || []),
    [folders]
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

  const classBlocksByDay = useMemo(() => {
    const result = new Map(WEEKDAYS.map((_, index) => [index + 1, []]));

    fixedClasses.forEach((item) => {
      const day = Number(item.day);
      if (!result.has(day)) return;

      result.get(day).push(item);
    });

    result.forEach((items) => {
      items.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    });

    return result;
  }, [fixedClasses]);

  const ddlBlocksByDay = useMemo(() => {
    const result = new Map(WEEKDAYS.map((_, index) => [index + 1, []]));

    weekDdls.forEach((item) => {
      const day = getIsoDay(item.date);
      result.get(day)?.push(item);
    });

    return result;
  }, [weekDdls]);

  useEffect(() => {
    writeStorageValue("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    writeUserStorageArray(user, SCHEDULE_STORAGE_KEY, fixedClasses);
  }, [fixedClasses, user]);

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

  function openNjuTeachingPortal() {
    window.open(NJU_TEACHING_PORTAL_URL, "_blank", "noopener,noreferrer");
    setScheduleImportMessage("已打开南京大学本科生院官方入口。若校外访问失败，先连接学校 VPN，再进入教服平台复制或导出课表。");
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
  const lockedHours = fixedClasses.reduce((sum, item) => {
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
              固定课表锁定上课时间，DDL 和复习规划会围绕空余时间安排。
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
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setCurrentWeek(addDays(currentWeek, -7))} style={outlineButtonStyle(colors)}>
                上一周
              </button>
              <button type="button" onClick={() => setCurrentWeek(startOfWeek(new Date()))} style={primaryButtonStyle(colors)}>
                本周
              </button>
              <button type="button" onClick={() => setCurrentWeek(addDays(currentWeek, 7))} style={outlineButtonStyle(colors)}>
                下一周
              </button>
            </div>
          </div>

          <div style={statsGridStyle}>
            <StatCard label="固定课程" value={fixedClassCount} detail="锁定上课时间" colors={colors} />
            <StatCard label="本周 DDL" value={weekDdls.length} detail="待处理截止项" colors={colors} />
            <StatCard label="已锁定时间" value={lockedHours.toFixed(1)} detail="小时 / 每周" colors={colors} />
            <StatCard label="当前账号" value={currentUser.name} detail={currentUser.account || "本地体验账号"} colors={colors} />
          </div>

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

                    {classBlocks.length === 0 && ddlBlocks.length === 0 && (
                      <div style={emptyDayStyle(colors)}>空余</div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </section>

        <aside style={sidePanelStyle(colors)}>
          <section style={panelCardStyle(colors)}>
            <h2 style={panelTitleStyle(colors)}>南京大学课表导入</h2>
            <p style={panelTextStyle(colors)}>
              打开本科生院官方入口后进入教服平台，NoteWhale 不接触也不保存账号密码。
            </p>
            <div style={importActionRowStyle}>
              <button type="button" onClick={openNjuTeachingPortal} style={primaryButtonStyle(colors)}>
                打开官方入口
              </button>
              <button type="button" onClick={previewImportedSchedule} style={outlineButtonStyle(colors)}>
                解析预览
              </button>
            </div>
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
                    <span>{item.location || "未填写地点"}</span>
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
              线下课程会被标记为锁定时间，后续自动复习规划不会覆盖这些时段。
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
            <h2 style={panelTitleStyle(colors)}>规划准备度</h2>
            <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
              <PlanningLine colors={colors} active={fixedClasses.length > 0} text="已录入固定课表" />
              <PlanningLine colors={colors} active={weekDdls.length > 0} text="已有 DDL 截止时间" />
              <PlanningLine colors={colors} active={false} text="下一步：按空余时间生成复习块" />
              <PlanningLine colors={colors} active={false} text="下一步：拖拽调整日程" />
            </div>
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

function ScheduleBlock({ item, colors, type, onDelete }) {
  const start = clampStartMinutes(timeToMinutes(item.startTime));
  const end = clampMinutes(timeToMinutes(item.endTime));
  const top = ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(38, ((end - start) / 60) * HOUR_HEIGHT);
  const isDdl = type === "ddl";

  return (
    <div
      style={{
        position: "absolute",
        left: "6px",
        right: "6px",
        top,
        minHeight: height,
        borderRadius: "12px",
        padding: "9px 10px",
        boxSizing: "border-box",
        background: isDdl ? colors.ddlBg : colors.classBg,
        border: `1px solid ${isDdl ? colors.warningBorder : colors.activeBorder}`,
        color: isDdl ? colors.warningText : colors.activeText,
        overflow: "hidden",
        zIndex: isDdl ? 3 : 2,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
        <strong style={{ fontSize: "13px", lineHeight: 1.25 }}>{item.title}</strong>
        {onDelete && (
          <button type="button" onClick={onDelete} style={blockDeleteStyle(colors)}>
            ×
          </button>
        )}
      </div>
      <div style={{ fontSize: "11px", marginTop: "5px", opacity: 0.86 }}>
        {item.startTime} - {item.endTime}
      </div>
      <div style={{ fontSize: "11px", marginTop: "4px", opacity: 0.78 }}>
        {item.location || item.courseName || "固定时间"}
      </div>
    </div>
  );
}

function StatCard({ label, value, detail, colors }) {
  return (
    <div style={statCardStyle(colors)}>
      <span style={{ color: colors.muted, fontSize: "12px", fontWeight: 900 }}>{label}</span>
      <strong style={{ color: colors.title, fontSize: "21px", marginTop: "8px" }}>{value}</strong>
      <span style={{ color: colors.text, fontSize: "12px", marginTop: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
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

function parseScheduleDate(value) {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function timeToMinutes(value) {
  const [hourText = "0", minuteText = "0"] = String(value || "").split(":");
  return Number(hourText) * 60 + Number(minuteText);
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

const pageGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 340px",
  gap: "22px",
  padding: "0 28px 32px",
};

const calendarHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "18px",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const calendarScrollStyle = {
  overflowX: "auto",
  paddingBottom: "4px",
};

function scheduleContentStyle(colors) {
  return {
    flex: 1,
    overflowY: "auto",
    padding: "30px 32px 36px",
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
    paddingBottom: "18px",
    marginBottom: "22px",
  };
}

function calendarShellStyle(colors) {
  return {
    minWidth: 0,
    background: colors.shell,
    border: `1px solid ${colors.border}`,
    borderRadius: "22px",
    padding: "20px",
    boxShadow: "0 18px 46px rgba(15,42,74,0.08)",
  };
}

function sidePanelStyle(colors) {
  return {
    display: "grid",
    gap: "16px",
    alignContent: "start",
    position: "sticky",
    top: "18px",
    color: colors.title,
  };
}

function panelCardStyle(colors) {
  return {
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: "18px",
    padding: "18px",
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
    gridTemplateColumns: "62px repeat(7, minmax(112px, 1fr))",
    minWidth: "940px",
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
    fontSize: "11px",
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
    height: "48px",
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
    borderRadius: "14px",
    padding: "14px",
    minWidth: 0,
  };
}

function emptyDayStyle(colors) {
  return {
    position: "absolute",
    top: "12px",
    left: "10px",
    color: colors.muted,
    fontSize: "12px",
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
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "14px",
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

function ddlMiniCardStyle(colors) {
  return {
    display: "grid",
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    padding: "11px",
  };
}

export default SchedulePage;
