import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import {
  getDdls as getBackendDdls,
  createDdl as createBackendDdl,
  updateDdl as updateBackendDdl,
  deleteDdl as deleteBackendDdl,
  recognizeDdlWithVisionAgent,
} from "../api/ddlApi";
import { getFolders as getBackendFolders } from "../api/folderApi";
import {
  readFirstStorageArray,
  readStorageArray,
  readStorageBoolean,
  writeStorageArray,
  writeStorageValue,
} from "../data/userStorage";
import { mapBackendDdl } from "../data/learningItemMappers";


function toDatetimeLocalValue(value) {
  if (!value) return "";

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    return text.slice(0, 16);
  }

  const normalized = text
    .replace(/\//g, "-")
    .replace(" ", "T")
    .replace("：", ":");

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
    return normalized.slice(0, 16);
  }

  return "";
}

function DDLPage({ user = null, onLogout } = {}) {
  const navigate = useNavigate();

  const [backendOnline, setBackendOnline] = useState(false);
  const [syncMessage, setSyncMessage] = useState("正在同步 DDL");

  const [ddls, setDdls] = useState(() =>
    readStorageArray("ddls", [])
  );

  const [folders, setFolders] = useState(() =>
    readFirstStorageArray(["courseFolders", "folders"], [])
  );

  const [darkMode, setDarkMode] = useState(() =>
    readStorageBoolean("darkMode", false)
  );

  const [tab, setTab] = useState("全部");
  const [searchText, setSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDDL, setEditingDDL] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [editPlatform, setEditPlatform] = useState("");
  const [editNote, setEditNote] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newPreview, setNewPreview] = useState("");

  const courses = folders.flatMap(
    (folder) => folder.courses || folder.items || []
  );

  const currentUser = user || {
    name: "鲸记用户",
    role: "学生",
    account: "本地体验账号",
    avatar: "鲸",
  };

  useEffect(() => {
    writeStorageValue("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    let alive = true;

    async function loadBackendData() {
      try {
        const [folderData, ddlData] = await Promise.all([
          getBackendFolders(),
          getBackendDdls(),
        ]);

        if (!alive) return;

        const nextFolders = Array.isArray(folderData)
          ? folderData.map(mapBackendFolder)
          : [];

        const nextDdls = Array.isArray(ddlData)
          ? ddlData.map(mapBackendDdl)
          : [];

        setFolders(nextFolders);
        setDdls(nextDdls);
        setBackendOnline(true);
        setSyncMessage(`已同步 ${nextDdls.length} 条 DDL`);
      } catch {
        if (!alive) return;

        setBackendOnline(false);
        setSyncMessage("后端暂不可用，当前使用本地 DDL");
      }
    }

    loadBackendData();

    return () => {
      alive = false;
    };
  }, []);

  function saveDdls(nextDdls) {
    setDdls(nextDdls);

    const localOnlyDdls = nextDdls.filter((ddl) => !ddl.backendSynced);
    writeStorageArray("ddls", localOnlyDdls);
  }

  function parseDate(date) {
    if (!date) return new Date("");
    return new Date(String(date).replace(" ", "T"));
  }

  const colors = {
    bg: darkMode
      ? "linear-gradient(180deg,#0F172A 0%,#111827 100%)"
      : "linear-gradient(180deg,#F5F9FF 0%,#EEF6FF 100%)",
    shell: darkMode ? "rgba(15,23,42,0.78)" : "rgba(255,255,255,0.74)",
    card: darkMode ? "rgba(30,41,59,0.88)" : "rgba(255,255,255,0.88)",
    panel: darkMode ? "#1E293B" : "#FFFFFF",
    border: darkMode ? "rgba(148,163,184,0.16)" : "#E2E8F0",
    title: darkMode ? "#F8FAFC" : "#183B63",
    text: darkMode ? "#CBD5E1" : "#64748B",
    muted: darkMode ? "#94A3B8" : "#94A3B8",
    active: darkMode ? "#818CF8" : "#2563EB",
    soft: darkMode ? "rgba(148,163,184,0.12)" : "#F8FAFC",
    softer: darkMode ? "rgba(129,140,248,0.12)" : "#EEF5FF",
    buttonBg: darkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.82)",
  };

  const getStatus = useCallback((ddl) => {
    if (ddl.completed) {
      return { text: "已完成", color: "#10B981", type: "done" };
    }

    const ddlDate = parseDate(ddl.date);
    const now = new Date();
    const diff = ddlDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (Number.isNaN(ddlDate.getTime())) {
      return { text: "时间未设置", color: colors.muted, type: "unset" };
    }

    if (diff < 0) {
      return {
        text: `已过期 ${Math.abs(days)} 天`,
        color: "#EF4444",
        type: "overdue",
      };
    }

    if (days === 0) {
      return { text: "今天截止", color: "#F59E0B", type: "today" };
    }

    if (days <= 7) {
      return { text: `剩余 ${days} 天`, color: "#F59E0B", type: "upcoming" };
    }

    return { text: `剩余 ${days} 天`, color: "#10B981", type: "normal" };
  }, [colors.muted]);

  const sortedDdls = useMemo(
    () => [...ddls].sort((a, b) => parseDate(a.date) - parseDate(b.date)),
    [ddls]
  );

  const stats = useMemo(() => {
    const now = new Date();

    const active = ddls.filter((ddl) => !ddl.completed);
    const upcoming = active.filter((ddl) => {
      const diff = parseDate(ddl.date) - now;
      return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    });
    const overdue = active.filter((ddl) => parseDate(ddl.date) < now);
    const done = ddls.filter((ddl) => ddl.completed);

    return {
      active: active.length,
      upcoming: upcoming.length,
      overdue: overdue.length,
      done: done.length,
      total: ddls.length,
    };
  }, [ddls]);

  const filteredByTab = useMemo(() => {
    const now = new Date();

    switch (tab) {
      case "即将到期":
        return sortedDdls.filter((ddl) => {
          const diff = parseDate(ddl.date) - now;
          return !ddl.completed && diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
        });

      case "已过期":
        return sortedDdls.filter(
          (ddl) => !ddl.completed && parseDate(ddl.date) < now
        );

      case "已完成":
        return sortedDdls.filter((ddl) => ddl.completed);

      default:
        return sortedDdls.filter((ddl) => !ddl.completed);
    }
  }, [sortedDdls, tab]);

  const searchResults = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return [];

    return sortedDdls.filter((ddl) => {
      const haystack = [
        ddl.title,
        ddl.courseName,
        ddl.date,
        ddl.platform,
        ddl.note,
        ddl.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [sortedDdls, searchText]);

  const visibleDdls = searchText.trim() ? searchResults : filteredByTab;

  const upcomingDdls = useMemo(
    () =>
      sortedDdls.filter((ddl) => {
        const status = getStatus(ddl);
        return status.type === "today" || status.type === "upcoming";
      }),
    [sortedDdls, getStatus]
  );

  async function completeDDL(id) {
    const target = ddls.find((ddl) => String(ddl.id) === String(id));
    if (!target) return;

    if (target.backendSynced && target.backendId) {
      try {
        const updated = await updateBackendDdl(target.backendId, {
          completed: true,
        });

        saveDdls(
          ddls.map((ddl) =>
            String(ddl.id) === String(id) ? mapBackendDdl(updated) : ddl
          )
        );
        setSyncMessage("DDL 状态已同步到数据库");
        return;
      } catch (error) {
        alert(error.message || "后端 DDL 更新失败");
        return;
      }
    }

    saveDdls(
      ddls.map((ddl) =>
        String(ddl.id) === String(id) ? { ...ddl, completed: true } : ddl
      )
    );
  }

  async function deleteDDL(id) {
    if (!window.confirm("确定要删除这个 DDL 吗？")) return;

    const target = ddls.find((ddl) => String(ddl.id) === String(id));
    if (!target) return;

    if (target.backendSynced && target.backendId) {
      try {
        await deleteBackendDdl(target.backendId);
        setSyncMessage("DDL 已从数据库删除");
      } catch (error) {
        alert(error.message || "后端 DDL 删除失败");
        return;
      }
    }

    saveDdls(ddls.filter((ddl) => String(ddl.id) !== String(id)));
  }

  async function addDDL() {
    if (!newTitle.trim() || !newDate.trim()) return;

    const selectedCourse = courses.find(
      (course) => String(course.id) === String(newCourseId)
    );

    const baseDDL = {
      title: newTitle.trim(),
      date: newDate.replace("T", " "),
      platform: newPlatform.trim(),
      note: newNote.trim(),
      courseId: selectedCourse ? selectedCourse.id : null,
      courseName: selectedCourse ? selectedCourse.title : "未归属课程",
      completed: false,
      source: newPreview ? "图片识别" : "手动新建",
    };

    if (backendOnline) {
      try {
        const saved = await createBackendDdl({
          ...baseDDL,
          courseId: selectedCourse?.backendSynced ? selectedCourse.backendId : null,
          courseName: baseDDL.courseName,
        });

        saveDdls([mapBackendDdl(saved), ...ddls]);
        setSyncMessage("DDL 已保存到数据库");
        resetAddDDLModal();
        return;
      } catch (error) {
        alert(error.message || "后端 DDL 创建失败，已改为本地保存");
      }
    }

    const nextDDL = {
      id: Date.now(),
      ...baseDDL,
    };

    saveDdls([...ddls, nextDDL]);
    resetAddDDLModal();
  }

  async function uploadAddDDLImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setNewPreview(URL.createObjectURL(file));

    const selectedCourse =
      courses.find((course) => String(course.id) === String(newCourseId)) ||
      courses[0] ||
      null;

    if (selectedCourse && !newCourseId) {
      setNewCourseId(String(selectedCourse.id));
    }

    try {
      const result = await recognizeDdlWithVisionAgent({
        file,
        courseId: selectedCourse?.backendSynced
          ? selectedCourse.backendId
          : null,
        courseName: selectedCourse?.title || "未归属课程",
      });

      setNewTitle(result.title || "");
      setNewDate(toDatetimeLocalValue(result.date) || "");
      setNewPlatform(result.platform || "");
      setNewNote(result.note || "");
    } catch (error) {
      alert(error.message || "视觉模型识别失败，请检查智能体配置");
    } finally {
      event.target.value = "";
    }
  }

  function resetAddDDLModal() {
    setShowAddModal(false);
    setNewTitle("");
    setNewDate("");
    setNewCourseId("");
    setNewPlatform("");
    setNewNote("");
    setNewPreview("");
  }

  function openEditDDL(ddl) {
    setEditingDDL(ddl);
    setEditTitle(ddl.title || "");
    setEditDate((ddl.date || "").replace(" ", "T"));
    setEditCourseId(ddl.courseId || "");
    setEditPlatform(ddl.platform || "");
    setEditNote(ddl.note || "");
    setShowEditModal(true);
  }

  async function confirmEditDDL() {
    if (!editingDDL || !editTitle.trim() || !editDate.trim()) return;

    const selectedCourse = courses.find(
      (course) => String(course.id) === String(editCourseId)
    );

    const nextPayload = {
      title: editTitle.trim(),
      date: editDate.replace("T", " "),
      courseId: selectedCourse ? selectedCourse.id : null,
      courseName: selectedCourse ? selectedCourse.title : "未归属课程",
      platform: editPlatform.trim(),
      note: editNote.trim(),
    };

    if (editingDDL.backendSynced && editingDDL.backendId) {
      try {
        const updated = await updateBackendDdl(editingDDL.backendId, {
          ...nextPayload,
          courseId: selectedCourse?.backendSynced ? selectedCourse.backendId : null,
          courseName: nextPayload.courseName,
        });

        saveDdls(
          ddls.map((ddl) =>
            String(ddl.id) === String(editingDDL.id) ? mapBackendDdl(updated) : ddl
          )
        );
        setSyncMessage("DDL 修改已同步到数据库");
        closeEditModal();
        return;
      } catch (error) {
        alert(error.message || "后端 DDL 修改失败");
        return;
      }
    }

    const nextDdls = ddls.map((ddl) =>
      String(ddl.id) === String(editingDDL.id)
        ? {
            ...ddl,
            ...nextPayload,
          }
        : ddl
    );

    saveDdls(nextDdls);
    closeEditModal();
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingDDL(null);
    setEditTitle("");
    setEditDate("");
    setEditCourseId("");
    setEditPlatform("");
    setEditNote("");
  }

  function handleSearchResultClick(ddl) {
    setSearchFocused(false);
    setSearchText("");
    openEditDDL(ddl);
  }

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        background: colors.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DDLTopBar
        colors={colors}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        searchText={searchText}
        setSearchText={setSearchText}
        searchFocused={searchFocused}
        setSearchFocused={setSearchFocused}
        searchResults={searchResults}
        onSearchResultClick={handleSearchResultClick}
        upcomingCount={upcomingDdls.length}
        user={currentUser}
        onLogout={onLogout}
        onBack={() => navigate("/")}
      />

      <main
        style={{
          width: "100%",
          maxWidth: "1120px",
          margin: "0 auto",
          flex: 1,
          overflowY: "auto",
          padding: "26px 28px 116px",
          boxSizing: "border-box",
          scrollbarWidth: "thin",
        }}
      >

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 284px",
            gap: "16px",
            alignItems: "stretch",
            marginBottom: "26px",
          }}
        >
          <div
            style={{
              background: colors.shell,
              border: `1px solid ${colors.border}`,
              borderRadius: "24px",
              padding: "24px 26px",
              boxShadow: darkMode
                ? "0 18px 42px rgba(0,0,0,0.18)"
                : "0 16px 36px rgba(15,42,74,0.06)",
              backdropFilter: "blur(22px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "18px" }}>
              <div>
                <div
                  style={{
                    color: colors.active,
                    fontSize: "13px",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "10px",
                  }}
                >
                  Deadline Center
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: "36px",
                    color: colors.title,
                    fontWeight: 850,
                    letterSpacing: "-0.05em",
                    lineHeight: 1.1,
                  }}
                >
                  DDL 管理
                </h1>

                <p
                  style={{
                    margin: "12px 0 0",
                    color: colors.text,
                    fontSize: "15px",
                    lineHeight: 1.8,
                    maxWidth: "560px",
                  }}
                >
                  统一管理课程截止事项：按状态查看、快速搜索、编辑归属课程，并同步保存到数据库。
                </p>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
                  <StatusPill
                    colors={colors}
                    tone={backendOnline ? "#10B981" : "#F59E0B"}
                    text={backendOnline ? "● 数据库同步" : "○ 本地模式"}
                  />
                  <StatusPill colors={colors} text={syncMessage} />
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  background: colors.active,
                  color: "#FFFFFF",
                  padding: "13px 20px",
                  borderRadius: "16px",
                  fontSize: "15px",
                  fontWeight: 800,
                  fontFamily: "inherit",
                  boxShadow: darkMode
                    ? "0 16px 32px rgba(99,102,241,0.22)"
                    : "0 14px 28px rgba(37,99,235,0.18)",
                  whiteSpace: "nowrap",
                }}
              >
                ＋ 新建日程
              </button>
            </div>
          </div>

          <div
            style={{
              background: colors.shell,
              border: `1px solid ${colors.border}`,
              borderRadius: "24px",
              padding: "20px",
              boxShadow: darkMode
                ? "0 18px 42px rgba(0,0,0,0.18)"
                : "0 16px 36px rgba(15,42,74,0.06)",
              backdropFilter: "blur(22px)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <StatCard colors={colors} label="待完成" value={stats.active} />
            <StatCard colors={colors} label="近 7 天" value={stats.upcoming} accent="#F59E0B" />
            <StatCard colors={colors} label="已过期" value={stats.overdue} accent="#EF4444" />
            <StatCard colors={colors} label="已完成" value={stats.done} accent="#10B981" />
          </div>
        </section>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "20px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {[
            ["全部", stats.active],
            ["即将到期", stats.upcoming],
            ["已过期", stats.overdue],
            ["已完成", stats.done],
          ].map(([item, count]) => {
            const active = tab === item && !searchText.trim();

            return (
              <button
                key={item}
                onClick={() => {
                  setTab(item);
                  setSearchText("");
                }}
                style={{
                  border: `1px solid ${active ? colors.active : colors.border}`,
                  cursor: "pointer",
                  padding: "10px 16px",
                  borderRadius: "999px",
                  background: active ? colors.active : colors.card,
                  color: active ? "#fff" : colors.text,
                  fontSize: "14px",
                  fontWeight: active ? 800 : 650,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {item}
                <span
                  style={{
                    minWidth: "24px",
                    height: "22px",
                    borderRadius: "999px",
                    background: active ? "rgba(255,255,255,0.2)" : colors.soft,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 900,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {searchText.trim() ? (
            <div
              style={{
                color: colors.text,
                fontSize: "14px",
                marginLeft: "4px",
              }}
            >
              正在全局搜索：找到 <b style={{ color: colors.active }}>{visibleDdls.length}</b> 条结果
            </div>
          ) : null}
        </div>

        {visibleDdls.length === 0 ? (
          <div
            style={{
              height: "210px",
              borderRadius: "24px",
              border: `1px dashed ${colors.border}`,
              background: colors.card,
              color: colors.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(20px)",
              fontWeight: 700,
            }}
          >
            {searchText.trim() ? "没有找到匹配的 DDL" : "当前分类下暂无 DDL"}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
              gap: "18px",
            }}
          >
            {visibleDdls.map((ddl) => (
              <DDLCard
                key={ddl.id}
                ddl={ddl}
                colors={colors}
                darkMode={darkMode}
                status={getStatus(ddl)}
                onEdit={() => openEditDDL(ddl)}
                onComplete={() => completeDDL(ddl.id)}
                onDelete={() => deleteDDL(ddl.id)}
              />
            ))}
          </div>
        )}

        {showAddModal && (
          <DDLModal
            title="新建日程"
            darkMode={darkMode}
            colors={colors}
            ddlTitle={newTitle}
            setDDLTitle={setNewTitle}
            ddlDate={newDate}
            setDDLDate={setNewDate}
            platform={newPlatform}
            setPlatform={setNewPlatform}
            note={newNote}
            setNote={setNewNote}
            courseId={newCourseId}
            setCourseId={setNewCourseId}
            courses={courses}
            preview={newPreview}
            onUploadImage={uploadAddDDLImage}
            onCancel={resetAddDDLModal}
            onConfirm={addDDL}
            confirmText="保存日程"
            showImageUpload
          />
        )}

        {showEditModal && (
          <DDLModal
            title="编辑日程"
            darkMode={darkMode}
            colors={colors}
            ddlTitle={editTitle}
            setDDLTitle={setEditTitle}
            ddlDate={editDate}
            setDDLDate={setEditDate}
            platform={editPlatform}
            setPlatform={setEditPlatform}
            note={editNote}
            setNote={setEditNote}
            courseId={editCourseId}
            setCourseId={setEditCourseId}
            courses={courses}
            onCancel={closeEditModal}
            onConfirm={confirmEditDDL}
            confirmText="保存修改"
          />
        )}
      </main>

      <Footer
        darkMode={darkMode}
        courseCount={courses.length}
        ddlCount={ddls.length}
      />
    </div>
  );
}

function DDLTopBar({
  darkMode,
  setDarkMode,
  searchText,
  setSearchText,
  searchFocused,
  setSearchFocused,
  searchResults,
  onSearchResultClick,
  upcomingCount,
  user = null,
  onLogout,
  onBack,
}) {
  const inputRef = useRef(null);
  const searchBoxRef = useRef(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const theme = darkMode
    ? {
        bg: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(148,163,184,0.08)",
        strongBorder: "1px solid rgba(148,163,184,0.18)",
        card: "rgba(30,41,59,0.85)",
        input: "rgba(30,41,59,0.78)",
        text: "#F8FAFC",
        subText: "#94A3B8",
        accent: "#818CF8",
        panel: "#1E293B",
        item: "#0F172A",
        soft: "rgba(148,163,184,0.12)",
      }
    : {
        bg: "rgba(255,255,255,0.86)",
        border: "1px solid rgba(226,232,240,0.9)",
        strongBorder: "1px solid #E2E8F0",
        card: "rgba(255,255,255,0.9)",
        input: "#FFFFFF",
        text: "#183B63",
        subText: "#64748B",
        accent: "#2563EB",
        panel: "#FFFFFF",
        item: "#F8FAFC",
        soft: "#F1F6FF",
      };

  const displayName = user?.name || "体验用户";
  const avatarText = user?.avatar || displayName.slice(0, 1) || "体";
  const roleText = user?.role || "学生";
  const accountText = user?.account || user?.email || "本地体验账号";

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchFocused(true);
      }

      if (e.key === "Escape") {
        setSearchFocused(false);
        inputRef.current?.blur();
      }

      if (e.key === "Enter" && searchResults.length > 0 && searchFocused) {
        e.preventDefault();
        onSearchResultClick(searchResults[0]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchResultClick, searchFocused, searchResults, setSearchFocused]);

  useEffect(() => {
    function handlePointerDown(e) {
      if (!searchBoxRef.current?.contains(e.target)) {
        setSearchFocused(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [setSearchFocused]);

  return (
    <header
      style={{
        height: "74px",
        padding: "0 26px",
        display: "grid",
        gridTemplateColumns: "240px minmax(360px, 540px) 1fr",
        alignItems: "center",
        columnGap: "28px",
        borderBottom: theme.border,
        background: theme.bg,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        position: "relative",
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          minWidth: 0,
        }}
      >
        <button
          onClick={onBack}
          title="返回主页"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "12px",
            border: theme.border,
            background: theme.card,
            color: theme.subText,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "18px",
            fontFamily: "inherit",
            flexShrink: 0,
          }}
        >
          ←
        </button>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: theme.text,
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            DDL 管理
          </div>

          <div
            style={{
              marginTop: "5px",
              color: theme.subText,
              fontSize: "12px",
              fontWeight: 650,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            鲸记 NoteWhale · 截止事项中心
          </div>
        </div>
      </div>

      <div ref={searchBoxRef} style={{ position: "relative", zIndex: 1000 }}>
        <div
          style={{
            width: "min(540px, 46vw)",
            height: "46px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderRadius: "14px",
            background: theme.input,
            border: theme.border,
            padding: "0 18px",
            boxSizing: "border-box",
          }}
        >
          <span style={{ color: theme.subText }}>⌕</span>

          <input
            ref={inputRef}
            value={searchText}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchFocused(false);
                inputRef.current?.blur();
              }

              if (e.key === "Enter" && searchResults.length > 0) {
                e.preventDefault();
                onSearchResultClick(searchResults[0]);
              }
            }}
            onChange={(e) => {
              setSearchText(e.target.value);
              setSearchFocused(true);
            }}
            placeholder="搜索 DDL 标题、课程、平台、备注"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: theme.text,
              fontSize: "14px",
              fontFamily: "inherit",
              minWidth: 0,
            }}
          />

          <span
            style={{
              color: theme.subText,
              fontSize: "12px",
              background: theme.soft,
              borderRadius: "8px",
              padding: "4px 7px",
              whiteSpace: "nowrap",
            }}
          >
            Ctrl K
          </span>
        </div>

        {searchFocused && (
          <DDLSearchDropdown
            theme={theme}
            darkMode={darkMode}
            keyword={(searchText || "").trim()}
            items={searchResults}
            onOpen={onSearchResultClick}
          />
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "14px",
        }}
      >
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={headerIconButtonStyle(theme)}
          title="切换日夜间模式"
        >
          {darkMode ? "☾" : "☼"}
        </button>

        <button
          style={{
            ...headerIconButtonStyle(theme),
            position: "relative",
          }}
          title="DDL提醒"
        >
          <BellIcon />

          {upcomingCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "7px",
                right: "7px",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#EF4444",
              }}
            />
          )}
        </button>

        <div
          onClick={() => setShowUserMenu((value) => !value)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            height: "46px",
            padding: "0 14px 0 6px",
            borderRadius: "999px",
            background: theme.card,
            border: theme.border,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "linear-gradient(135deg,#6366F1,#2563EB)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            {avatarText}
          </div>

          <span style={{ color: theme.text, fontSize: "14px", fontWeight: 700 }}>
            {displayName}
          </span>
          <span style={{ color: theme.subText, fontSize: "12px" }}>⌄</span>
        </div>
      </div>

      {showUserMenu && (
        <div
          style={{
            position: "absolute",
            top: "66px",
            right: "26px",
            width: "260px",
            background: theme.panel,
            border: theme.strongBorder,
            borderRadius: "16px",
            padding: "12px",
            boxShadow: darkMode
              ? "0 18px 36px rgba(0,0,0,0.28)"
              : "0 18px 36px rgba(15,42,74,0.12)",
            zIndex: 999,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              padding: "8px 8px 14px",
              borderBottom: theme.strongBorder,
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "linear-gradient(135deg,#6366F1,#2563EB)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
              }}
            >
              {avatarText}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: theme.text,
                  fontSize: "15px",
                  fontWeight: 800,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </div>

              <div
                style={{
                  color: theme.subText,
                  fontSize: "12px",
                  marginTop: "4px",
                }}
              >
                {roleText} · {accountText}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowUserMenu(false);
              setSearchFocused(false);
            }}
            style={ddlMenuItemStyle(theme)}
          >
            当前页面：DDL 管理
          </button>

          <button
            onClick={() => {
              setShowUserMenu(false);
              onBack();
            }}
            style={ddlMenuItemStyle(theme)}
          >
            返回主页
          </button>

          <button
            disabled
            style={{
              ...ddlMenuItemStyle(theme),
              color: theme.subText,
              cursor: "default",
            }}
          >
            账号设置 · 后续接入
          </button>

          <button
            onClick={() => {
              setShowUserMenu(false);
              if (onLogout) {
                onLogout();
              } else {
                onBack();
              }
            }}
            style={{
              width: "100%",
              marginTop: "8px",
              border: "none",
              borderRadius: "10px",
              padding: "11px 12px",
              background: darkMode ? "rgba(239,68,68,0.12)" : "#FEF2F2",
              color: "#DC2626",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            退出登录
          </button>
        </div>
      )}
    </header>
  );
}

function DDLSearchDropdown({ theme, darkMode, keyword, items, onOpen }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "56px",
        left: 0,
        width: "min(620px, 58vw)",
        background: theme.panel,
        border: theme.strongBorder,
        borderRadius: "16px",
        padding: "12px",
        boxShadow: darkMode
          ? "0 24px 50px rgba(0,0,0,0.38)"
          : "0 20px 46px rgba(15,42,74,0.14)",
      }}
    >
      <div
        style={{
          color: theme.subText,
          fontSize: "12px",
          padding: "4px 6px 10px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <span>DDL 搜索</span>
        <span>{keyword ? `${items.length} 条结果` : "标题 / 课程 / 平台 / 备注"}</span>
      </div>

      {!keyword && (
        <div
          style={{
            padding: "18px 14px",
            borderRadius: "12px",
            background: theme.item,
            color: theme.subText,
            fontSize: "14px",
            lineHeight: 1.7,
            border: theme.border,
          }}
        >
          输入关键词后，可搜索 DDL 标题、课程名、平台和备注。按 Enter 可打开第一条结果。
        </div>
      )}

      {keyword && items.length === 0 && (
        <div
          style={{
            padding: "18px 14px",
            borderRadius: "12px",
            background: theme.item,
            color: theme.subText,
            fontSize: "14px",
            border: theme.border,
          }}
        >
          没有找到相关 DDL。
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: "grid", gap: "8px", maxHeight: "430px", overflowY: "auto" }}>
          {items.map((ddl) => (
            <button
              key={ddl.id}
              onClick={() => onOpen(ddl)}
              style={{
                width: "100%",
                border: "none",
                background: theme.item,
                borderRadius: "12px",
                padding: "12px",
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "64px minmax(0, 1fr) auto",
                alignItems: "center",
                gap: "12px",
                textAlign: "left",
                fontFamily: "inherit",
                color: theme.text,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "54px",
                  height: "28px",
                  borderRadius: "999px",
                  background: theme.soft,
                  color: theme.accent,
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                DDL
              </span>

              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    color: theme.text,
                    fontSize: "14px",
                    fontWeight: 800,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ddl.title || "未命名 DDL"}
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color: theme.subText,
                    fontSize: "12px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ddl.courseName || "未归属课程"} · {ddl.date || "未设置时间"}
                </span>
              </span>

              <span style={{ color: theme.subText, fontSize: "13px" }}>↵</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ddlMenuItemStyle(theme) {
  return {
    width: "100%",
    border: "none",
    background: "transparent",
    color: theme.text,
    borderRadius: "10px",
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: "14px",
    textAlign: "left",
    fontFamily: "inherit",
  };
}

function headerIconButtonStyle(theme) {
  return {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    border: "none",
    background: "transparent",
    color: theme.subText,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  };
}

function BellIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}


function StatusPill({ colors, text, tone }) {
  return (
    <span
      style={{
        color: tone || colors.text,
        background: colors.soft,
        border: `1px solid ${colors.border}`,
        borderRadius: "999px",
        padding: "7px 11px",
        fontSize: "12px",
        fontWeight: 800,
      }}
    >
      {text}
    </span>
  );
}

function StatCard({ colors, label, value, accent }) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: "18px",
        padding: "16px 14px",
      }}
    >
      <div
        style={{
          color: accent || colors.active,
          fontSize: "26px",
          fontWeight: 950,
          letterSpacing: "-0.05em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: colors.muted,
          fontSize: "12px",
          marginTop: "5px",
          fontWeight: 750,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function DDLCard({ ddl, colors, darkMode, status, onEdit, onComplete, onDelete }) {
  return (
    <article
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        padding: "20px",
        borderRadius: "22px",
        minHeight: "210px",
        backdropFilter: "blur(20px)",
        boxShadow: darkMode
          ? "0 12px 28px rgba(0,0,0,0.18)"
          : "0 8px 24px rgba(15,42,74,0.04)",
        opacity: ddl.completed ? 0.74 : 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <h3
            style={{
              margin: 0,
              color: colors.title,
              fontSize: "18px",
              fontWeight: 850,
              lineHeight: 1.35,
              textDecoration: ddl.completed ? "line-through" : "none",
            }}
          >
            {ddl.title || "未命名 DDL"}
          </h3>

          <span
            style={{
              flexShrink: 0,
              color: status.color,
              background: `${status.color}16`,
              borderRadius: "999px",
              padding: "5px 9px",
              fontSize: "12px",
              fontWeight: 900,
            }}
          >
            {status.text}
          </span>
        </div>

        <div
          style={{
            marginTop: "12px",
            color: colors.text,
            fontSize: "13px",
            display: "grid",
            gap: "8px",
          }}
        >
          <InfoRow label="课程" value={ddl.courseName || "未归属课程"} colors={colors} />
          <InfoRow label="时间" value={ddl.date || "未设置"} colors={colors} />
          {ddl.platform ? <InfoRow label="平台" value={ddl.platform} colors={colors} /> : null}
          {ddl.note ? <InfoRow label="备注" value={ddl.note} colors={colors} /> : null}
        </div>

        {ddl.source ? (
          <div
            style={{
              display: "inline-flex",
              marginTop: "12px",
              color: colors.muted,
              background: colors.soft,
              borderRadius: "999px",
              padding: "6px 10px",
              fontSize: "12px",
              fontWeight: 750,
            }}
          >
            {ddl.source}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginTop: "18px",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button onClick={onEdit} style={smallButtonStyle(darkMode, "edit")}>
          编辑
        </button>

        {!ddl.completed && (
          <button onClick={onComplete} style={smallButtonStyle(darkMode, "done")}>
            完成
          </button>
        )}

        <button onClick={onDelete} style={smallButtonStyle(darkMode, "delete")}>
          删除
        </button>
      </div>
    </article>
  );
}

function InfoRow({ label, value, colors }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr",
        gap: "10px",
        alignItems: "start",
      }}
    >
      <span style={{ color: colors.muted, fontWeight: 750 }}>{label}</span>
      <span
        style={{
          color: colors.text,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: label === "备注" ? "normal" : "nowrap",
          lineHeight: 1.6,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DDLModal({
  title,
  darkMode,
  colors,
  ddlTitle,
  setDDLTitle,
  ddlDate,
  setDDLDate,
  platform = "",
  setPlatform = () => {},
  note = "",
  setNote = () => {},
  courseId,
  setCourseId,
  courses,
  preview = "",
  onUploadImage,
  showImageUpload = false,
  onCancel,
  onConfirm,
  confirmText,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: darkMode ? "rgba(0,0,0,0.52)" : "rgba(15,42,74,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
    >
      <div
        style={{
          width: showImageUpload ? "900px" : "520px",
          maxWidth: "calc(100vw - 40px)",
          background: darkMode ? "#1E293B" : "#FFFFFF",
          border: `1px solid ${colors.border}`,
          borderRadius: "22px",
          padding: "32px 36px",
          boxShadow: darkMode
            ? "0 28px 60px rgba(0,0,0,0.45)"
            : "0 24px 48px rgba(15,42,74,0.16)",
        }}
      >
        <h2
          style={{
            margin: "0 0 26px",
            color: colors.title,
            fontSize: "28px",
            fontWeight: 850,
          }}
        >
          {title}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: showImageUpload ? "300px 1fr" : "1fr",
            gap: "28px",
          }}
        >
          {showImageUpload && (
            <div
              style={{
                background: darkMode ? "rgba(148,163,184,0.12)" : "#F8FAFC",
                border: `1px dashed ${colors.border}`,
                borderRadius: "18px",
                minHeight: "360px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "18px",
                boxSizing: "border-box",
              }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="DDL截图预览"
                  style={{
                    width: "100%",
                    maxHeight: "220px",
                    objectFit: "cover",
                    borderRadius: "14px",
                    marginBottom: "18px",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "180px",
                    height: "160px",
                    borderRadius: "16px",
                    background: darkMode ? "#0F172A" : "#E5EAF4",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: colors.muted,
                    fontSize: "13px",
                  }}
                >
                  可选图片
                </div>
              )}

              <label
                style={{
                  border: `1px solid ${colors.active}`,
                  color: colors.active,
                  background: darkMode ? "rgba(129,140,248,0.08)" : "#FFFFFF",
                  padding: "10px 24px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                上传图片识别（可选）
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUploadImage}
                  style={{ display: "none" }}
                />
              </label>

              <p
                style={{
                  color: colors.muted,
                  fontSize: "13px",
                  marginTop: "14px",
                  textAlign: "center",
                  lineHeight: 1.6,
                }}
              >
                支持截图、照片等格式；
                <br />
                不上传也可以手动填写
              </p>
            </div>
          )}

          <div>
            <SmallLabel colors={colors}>标题</SmallLabel>
            <input
              value={ddlTitle}
              onChange={(e) => setDDLTitle(e.target.value)}
              placeholder="请输入日程标题"
              style={modalInputStyle(darkMode)}
            />

            <SmallLabel colors={colors}>截止时间</SmallLabel>
            <input
              type="datetime-local"
              value={ddlDate}
              onChange={(e) => setDDLDate(e.target.value)}
              style={modalInputStyle(darkMode)}
            />

            <SmallLabel colors={colors}>平台 / 地点</SmallLabel>
            <input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="例如：在线提交 / 教学平台 / 线下提交"
              style={modalInputStyle(darkMode)}
            />

            <SmallLabel colors={colors}>备注</SmallLabel>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="请输入备注（可选）"
              style={modalInputStyle(darkMode)}
            />

            <SmallLabel colors={colors}>归属课程</SmallLabel>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{
                ...modalInputStyle(darkMode),
                cursor: "pointer",
              }}
            >
              <option value="">不归属任何课程</option>

              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "18px",
                marginTop: "32px",
              }}
            >
              <button
                onClick={onCancel}
                style={{
                  border: "none",
                  background: darkMode ? "#0F172A" : "#F1F5F9",
                  color: colors.title,
                  borderRadius: "14px",
                  padding: "14px 44px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 800,
                  fontFamily: "inherit",
                }}
              >
                取消
              </button>

              <button
                onClick={onConfirm}
                style={{
                  border: "none",
                  background: colors.active,
                  color: "#FFFFFF",
                  borderRadius: "14px",
                  padding: "14px 44px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 800,
                  fontFamily: "inherit",
                  boxShadow: "0 14px 28px rgba(29,78,216,0.22)",
                }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapBackendFolder(folder) {
  return {
    id:
      folder.id === null || folder.id === undefined
        ? "__unassigned"
        : `api-folder-${folder.id}`,
    backendId: folder.id,
    title: folder.title || "未归属课程",
    backendSynced: folder.id !== null && folder.id !== undefined,
    courses: Array.isArray(folder.courses)
      ? folder.courses.map(mapBackendCourse)
      : [],
  };
}

function mapBackendCourse(course) {
  return {
    id: `api-${course.id}`,
    backendId: course.id,
    title: course.title,
    starred: Boolean(course.starred),
    folderId: course.folderId ? `api-folder-${course.folderId}` : "__unassigned",
    backendFolderId: course.folderId || null,
    folderName: course.folderName || "",
    noteCount: 0,
    ddlCount: 0,
    backendSynced: true,
  };
}

function SmallLabel({ colors, children }) {
  return (
    <div
      style={{
        color: colors.text,
        fontSize: "13px",
        fontWeight: 800,
        margin: "12px 0 8px",
      }}
    >
      {children}
    </div>
  );
}

function modalInputStyle(darkMode) {
  return {
    width: "100%",
    height: "52px",
    borderRadius: "12px",
    border: darkMode
      ? "1px solid rgba(148,163,184,0.22)"
      : "1px solid #D6E0EF",
    background: darkMode ? "#0F172A" : "#FFFFFF",
    color: darkMode ? "#F8FAFC" : "#183B63",
    padding: "0 14px",
    boxSizing: "border-box",
    fontSize: "15px",
    outline: "none",
    fontFamily: "inherit",
    colorScheme: darkMode ? "dark" : "light",
  };
}

function smallButtonStyle(darkMode, type) {
  if (type === "done") {
    return {
      border: "none",
      background: "#10B981",
      color: "#FFFFFF",
      borderRadius: "10px",
      padding: "7px 13px",
      cursor: "pointer",
      fontSize: "13px",
      fontFamily: "inherit",
      fontWeight: 800,
    };
  }

  if (type === "delete") {
    return {
      border: "none",
      background: "#EF4444",
      color: "#FFFFFF",
      borderRadius: "10px",
      padding: "7px 13px",
      cursor: "pointer",
      fontSize: "13px",
      fontFamily: "inherit",
      fontWeight: 800,
    };
  }

  return {
    border: "none",
    background: darkMode ? "#475569" : "#EAF1FF",
    color: darkMode ? "#E2E8F0" : "#2563EB",
    borderRadius: "10px",
    padding: "7px 13px",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "inherit",
    fontWeight: 800,
  };
}

export default DDLPage;
