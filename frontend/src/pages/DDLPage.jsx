import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";

function DDLPage() {
  const navigate = useNavigate();

  const [ddls, setDdls] = useState(() =>
    JSON.parse(localStorage.getItem("ddls") || "[]")
  );

  const folders = JSON.parse(localStorage.getItem("folders") || "[]");
  const courses = folders.flatMap((folder) => folder.courses || []);
  const darkMode = JSON.parse(localStorage.getItem("darkMode") || "false");

  const [tab, setTab] = useState("全部");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDDL, setEditingDDL] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCourseId, setEditCourseId] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCourseId, setNewCourseId] = useState("");

  function saveDdls(nextDdls) {
    setDdls(nextDdls);
    localStorage.setItem("ddls", JSON.stringify(nextDdls));
  }

  function parseDate(date) {
    if (!date) return new Date("");
    return new Date(date.replace(" ", "T"));
  }

  const filteredDdls = useMemo(() => {
    const now = new Date();

    const sorted = [...ddls].sort(
      (a, b) => parseDate(a.date) - parseDate(b.date)
    );

    switch (tab) {
      case "即将到期":
        return sorted.filter((ddl) => {
          const diff = parseDate(ddl.date) - now;
          return !ddl.completed && diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
        });

      case "已过期":
        return sorted.filter(
          (ddl) => !ddl.completed && parseDate(ddl.date) < now
        );

      case "已完成":
        return sorted.filter((ddl) => ddl.completed);

      default:
        return sorted.filter((ddl) => !ddl.completed);
    }
  }, [ddls, tab]);

  const colors = {
    bg: darkMode
      ? "linear-gradient(180deg,#0F172A 0%,#111827 100%)"
      : "#F5F8FC",
    card: darkMode ? "rgba(30,41,59,0.88)" : "rgba(255,255,255,0.88)",
    border: darkMode ? "rgba(148,163,184,0.14)" : "#E2E8F0",
    title: darkMode ? "#F8FAFC" : "#183B63",
    text: darkMode ? "#CBD5E1" : "#64748B",
    muted: darkMode ? "#94A3B8" : "#94A3B8",
    active: darkMode ? "#818CF8" : "#2563EB",
    buttonBg: darkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.82)",
  };

  function getStatus(ddl) {
    if (ddl.completed) {
      return { text: "已完成", color: "#10B981" };
    }

    const ddlDate = parseDate(ddl.date);
    const now = new Date();
    const diff = ddlDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (Number.isNaN(ddlDate.getTime())) {
      return { text: "时间未设置", color: colors.muted };
    }

    if (diff < 0) {
      return {
        text: `已过期 ${Math.abs(days)} 天`,
        color: "#EF4444",
      };
    }

    if (days === 0) {
      return { text: "今天截止", color: "#F59E0B" };
    }

    return { text: `剩余 ${days} 天`, color: "#10B981" };
  }

  function completeDDL(id) {
    const nextDdls = ddls.map((ddl) =>
      ddl.id === id ? { ...ddl, completed: true } : ddl
    );

    saveDdls(nextDdls);
  }

  function deleteDDL(id) {
    if (!window.confirm("确定要删除这个 DDL 吗？")) return;
    saveDdls(ddls.filter((ddl) => ddl.id !== id));
  }

  function addDDL() {
    if (!newTitle.trim() || !newDate.trim()) return;

    const selectedCourse = courses.find(
      (course) => String(course.id) === String(newCourseId)
    );

    const nextDDL = {
      id: Date.now(),
      title: newTitle.trim(),
      date: newDate.replace("T", " "),
      courseId: selectedCourse ? selectedCourse.id : null,
      courseName: selectedCourse ? selectedCourse.title : "未归属课程",
      completed: false,
    };

    saveDdls([...ddls, nextDDL]);

    setNewTitle("");
    setNewDate("");
    setNewCourseId("");
    setShowAddModal(false);
  }

  function openEditDDL(ddl) {
    setEditingDDL(ddl);
    setEditTitle(ddl.title || "");
    setEditDate((ddl.date || "").replace(" ", "T"));
    setEditCourseId(ddl.courseId || "");
    setShowEditModal(true);
  }

  function confirmEditDDL() {
    if (!editingDDL || !editTitle.trim() || !editDate.trim()) return;

    const selectedCourse = courses.find(
      (course) => String(course.id) === String(editCourseId)
    );

    const nextDdls = ddls.map((ddl) =>
      ddl.id === editingDDL.id
        ? {
            ...ddl,
            title: editTitle.trim(),
            date: editDate.replace("T", " "),
            courseId: selectedCourse ? selectedCourse.id : null,
            courseName: selectedCourse ? selectedCourse.title : "未归属课程",
          }
        : ddl
    );

    saveDdls(nextDdls);

    setShowEditModal(false);
    setEditingDDL(null);
    setEditTitle("");
    setEditDate("");
    setEditCourseId("");
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
      <main
        style={{
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
          flex: 1,
          overflowY: "auto",
          padding: "42px 36px 120px",
          boxSizing: "border-box",
          scrollbarWidth: "thin",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "28px",
          }}
        >
          <div>
            <button
              onClick={() => navigate("/")}
              style={{
                border: darkMode
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid #E5EAF3",
                cursor: "pointer",
                background: colors.buttonBg,
                color: colors.text,
                padding: "10px 16px",
                borderRadius: "14px",
                marginBottom: "18px",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "inherit",
              }}
            >
              ← 返回主页
            </button>

            <h1
              style={{
                margin: 0,
                fontSize: "42px",
                color: colors.title,
                fontWeight: 700,
                letterSpacing: "-0.04em",
              }}
            >
              DeadLine管理流通处
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: colors.text,
                fontSize: "15px",
              }}
            >
              共 {filteredDdls.length} 项
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              border: "none",
              cursor: "pointer",
              background: colors.active,
              color: "#FFFFFF",
              padding: "12px 20px",
              borderRadius: "16px",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "inherit",
              boxShadow: darkMode
                ? "0 16px 32px rgba(99,102,241,0.22)"
                : "0 14px 28px rgba(37,99,235,0.18)",
              marginTop: "42px",
            }}
          >
            ＋ 新建DDL
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          {["全部", "即将到期", "已过期", "已完成"].map((item) => {
            const active = tab === item;

            return (
              <button
                key={item}
                onClick={() => setTab(item)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 18px",
                  borderRadius: "12px",
                  background: active ? colors.active : colors.card,
                  color: active ? "#fff" : colors.text,
                  fontSize: "14px",
                  fontWeight: active ? 600 : 500,
                  fontFamily: "inherit",
                }}
              >
                {item}
              </button>
            );
          })}
        </div>

        {filteredDdls.length === 0 ? (
          <div
            style={{
              height: "180px",
              borderRadius: "18px",
              border: `1px dashed ${colors.border}`,
              background: colors.card,
              color: colors.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(20px)",
            }}
          >
            当前分类下暂无 DDL
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {filteredDdls.map((ddl) => {
              const status = getStatus(ddl);

              return (
                <div
                  key={ddl.id}
                  style={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    padding: "20px",
                    borderRadius: "18px",
                    minHeight: "180px",
                    backdropFilter: "blur(20px)",
                    boxShadow: darkMode
                      ? "0 12px 28px rgba(0,0,0,0.18)"
                      : "0 8px 24px rgba(15,42,74,0.04)",
                    opacity: ddl.completed ? 0.72 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "18px",
                      height: "100%",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          color: colors.title,
                          fontSize: "18px",
                          fontWeight: 600,
                          textDecoration: ddl.completed
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {ddl.title}
                      </h3>

                      <p
                        style={{
                          margin: "8px 0 0",
                          color: colors.text,
                          fontSize: "13px",
                        }}
                      >
                        {ddl.courseName || "未归属课程"}
                      </p>
                    </div>

                    <div>
                      <div
                        style={{
                          color: colors.text,
                          fontSize: "13px",
                        }}
                      >
                        {ddl.date}
                      </div>

                      <div
                        style={{
                          marginTop: "6px",
                          color: status.color,
                          fontWeight: 600,
                          fontSize: "14px",
                        }}
                      >
                        {status.text}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "14px",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => openEditDDL(ddl)}
                          style={smallButtonStyle(darkMode, "edit")}
                        >
                          编辑
                        </button>

                        {!ddl.completed && (
                          <button
                            onClick={() => completeDDL(ddl.id)}
                            style={smallButtonStyle(darkMode, "done")}
                          >
                            完成
                          </button>
                        )}

                        <button
                          onClick={() => deleteDDL(ddl.id)}
                          style={smallButtonStyle(darkMode, "delete")}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showAddModal && (
          <DDLModal
            title="新建 DDL"
            darkMode={darkMode}
            colors={colors}
            ddlTitle={newTitle}
            setDDLTitle={setNewTitle}
            ddlDate={newDate}
            setDDLDate={setNewDate}
            courseId={newCourseId}
            setCourseId={setNewCourseId}
            courses={courses}
            onCancel={() => {
              setShowAddModal(false);
              setNewTitle("");
              setNewDate("");
              setNewCourseId("");
            }}
            onConfirm={addDDL}
            confirmText="创建"
          />
        )}

        {showEditModal && (
          <DDLModal
            title="编辑 DDL"
            darkMode={darkMode}
            colors={colors}
            ddlTitle={editTitle}
            setDDLTitle={setEditTitle}
            ddlDate={editDate}
            setDDLDate={setEditDate}
            courseId={editCourseId}
            setCourseId={setEditCourseId}
            courses={courses}
            onCancel={() => {
              setShowEditModal(false);
              setEditingDDL(null);
            }}
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

function DDLModal({
  title,
  darkMode,
  colors,
  ddlTitle,
  setDDLTitle,
  ddlDate,
  setDDLDate,
  courseId,
  setCourseId,
  courses,
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
          width: "420px",
          background: darkMode ? "#1E293B" : "#FFFFFF",
          border: `1px solid ${colors.border}`,
          borderRadius: "20px",
          padding: "28px",
          boxShadow: darkMode
            ? "0 28px 60px rgba(0,0,0,0.45)"
            : "0 24px 48px rgba(15,42,74,0.16)",
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: "22px",
            color: colors.title,
            fontSize: "24px",
          }}
        >
          {title}
        </h2>

        <input
          value={ddlTitle}
          onChange={(e) => setDDLTitle(e.target.value)}
          placeholder="DDL 标题"
          style={modalInputStyle(darkMode)}
        />

        <input
          type="datetime-local"
          value={ddlDate}
          onChange={(e) => setDDLDate(e.target.value)}
          style={{
            ...modalInputStyle(darkMode),
            marginTop: "14px",
          }}
        />

        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          style={{
            ...modalInputStyle(darkMode),
            marginTop: "14px",
            cursor: "pointer",
          }}
        >
          <option value="">未归属课程</option>

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
            gap: "12px",
            marginTop: "24px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              border: `1px solid ${colors.border}`,
              background: darkMode ? "#0F172A" : "#FFFFFF",
              color: colors.text,
              borderRadius: "12px",
              padding: "10px 18px",
              cursor: "pointer",
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
              borderRadius: "12px",
              padding: "10px 18px",
              cursor: "pointer",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function modalInputStyle(darkMode) {
  return {
    width: "100%",
    height: "46px",
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
  };
}

function smallButtonStyle(darkMode, type) {
  if (type === "done") {
    return {
      border: "none",
      background: "#10B981",
      color: "#FFFFFF",
      borderRadius: "10px",
      padding: "6px 12px",
      cursor: "pointer",
      fontSize: "13px",
      fontFamily: "inherit",
    };
  }

  if (type === "delete") {
    return {
      border: "none",
      background: "#EF4444",
      color: "#FFFFFF",
      borderRadius: "10px",
      padding: "6px 12px",
      cursor: "pointer",
      fontSize: "13px",
      fontFamily: "inherit",
    };
  }

  return {
    border: "none",
    background: darkMode ? "#475569" : "#EAF1FF",
    color: darkMode ? "#E2E8F0" : "#2563EB",
    borderRadius: "10px",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "inherit",
  };
}

export default DDLPage;