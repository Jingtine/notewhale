import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "../components/Footer";

function CoursePage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const darkMode = JSON.parse(localStorage.getItem("darkMode") || "false");

  const [ddls, setDdls] = useState(() =>
    JSON.parse(localStorage.getItem("ddls") || "[]")
  );

  const folders = JSON.parse(localStorage.getItem("courseFolders") ||localStorage.getItem("folders") ||"[]");
  const allCourses = folders.flatMap((folder) =>folder.courses ||folder.items ||[]);

  const course = allCourses.find(
    (course) => String(course.id) === String(id)
  );

  const [showAddDDLModal, setShowAddDDLModal] = useState(false);
  const [newDDLTitle, setNewDDLTitle] = useState("");
  const [newDDLDate, setNewDDLDate] = useState("");

  const courseDdls = useMemo(() => {
    return ddls
      .filter((ddl) => String(ddl.courseId) === String(id))
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));
  }, [ddls, id]);

  const activeDdls = courseDdls.filter((ddl) => !ddl.completed);
  const completedDdls = courseDdls.filter((ddl) => ddl.completed);

  const colors = {
    bg: darkMode
      ? "linear-gradient(180deg,#0F172A 0%,#111827 100%)"
      : "linear-gradient(180deg,#F5F9FF 0%,#EEF6FF 100%)",
    card: darkMode ? "rgba(30,41,59,0.88)" : "rgba(255,255,255,0.86)",
    soft: darkMode ? "rgba(148,163,184,0.12)" : "#F8FAFC",
    border: darkMode ? "rgba(148,163,184,0.16)" : "#E2E8F0",
    title: darkMode ? "#F8FAFC" : "#183B63",
    text: darkMode ? "#CBD5E1" : "#64748B",
    muted: darkMode ? "#94A3B8" : "#94A3B8",
    active: darkMode ? "#818CF8" : "#2563EB",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
  };

  function saveDdls(nextDdls) {
    setDdls(nextDdls);
    localStorage.setItem("ddls", JSON.stringify(nextDdls));
  }

  function addDDL() {
    if (!newDDLTitle.trim() || !newDDLDate.trim() || !course) return;

    const newDDL = {
      id: Date.now(),
      title: newDDLTitle.trim(),
      date: newDDLDate.replace("T", " "),
      courseId: course.id,
      courseName: course.title,
      completed: false,
    };

    saveDdls([...ddls, newDDL]);

    setNewDDLTitle("");
    setNewDDLDate("");
    setShowAddDDLModal(false);
  }

  function completeDDL(ddlId) {
    saveDdls(
      ddls.map((ddl) =>
        ddl.id === ddlId ? { ...ddl, completed: true } : ddl
      )
    );
  }

  function deleteDDL(ddlId) {
    if (!window.confirm("确定删除这个 DDL 吗？")) return;

    saveDdls(ddls.filter((ddl) => ddl.id !== ddlId));
  }

  if (!course) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.text,
        }}
      >
        未找到该课程
      </div>
    );
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
          flex: 1,
          overflowY: "auto",
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "42px 36px 120px",
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            border: `1px solid ${colors.border}`,
            background: darkMode
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.82)",
            color: colors.text,
            padding: "10px 16px",
            borderRadius: "14px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
            fontFamily: "inherit",
            marginBottom: "18px",
          }}
        >
          ← 返回主页
        </button>

        <section
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: "22px",
            padding: "28px",
            marginBottom: "28px",
            backdropFilter: "blur(22px)",
            boxShadow: darkMode
              ? "0 18px 36px rgba(0,0,0,0.2)"
              : "0 14px 30px rgba(15,42,74,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "24px",
              alignItems: "flex-start",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 8px",
                  color: colors.muted,
                  fontSize: "14px",
                }}
              >
                Course Overview
              </p>

              <h1
                style={{
                  margin: 0,
                  color: colors.title,
                  fontSize: "42px",
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                }}
              >
                {course.title}
              </h1>

              <p
                style={{
                  margin: "10px 0 0",
                  color: colors.text,
                  fontSize: "15px",
                }}
              >
                当前课程共有 {course.noteCount ?? 0} 条笔记，{activeDdls.length} 个未完成 DDL。
              </p>
            </div>

            <button
              onClick={() => setShowAddDDLModal(true)}
              style={{
                border: "none",
                background: colors.active,
                color: "white",
                borderRadius: "16px",
                padding: "12px 20px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: 600,
                fontFamily: "inherit",
                boxShadow: darkMode
                  ? "0 16px 32px rgba(99,102,241,0.22)"
                  : "0 14px 28px rgba(37,99,235,0.18)",
                flexShrink: 0,
              }}
            >
              ＋ 新建 DDL
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: "16px",
              marginTop: "28px",
            }}
          >
            <StatCard
              label="未完成 DDL"
              value={activeDdls.length}
              colors={colors}
            />
            <StatCard
              label="已完成 DDL"
              value={completedDdls.length}
              colors={colors}
            />
            <StatCard
              label="课程笔记"
              value={course.noteCount ?? 0}
              colors={colors}
            />
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: "24px",
          }}
        >
          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: "22px",
              padding: "24px",
              backdropFilter: "blur(22px)",
            }}
          >
            <h2
              style={{
                margin: "0 0 18px",
                color: colors.title,
                fontSize: "22px",
              }}
            >
              本课程 DDL
            </h2>

            {courseDdls.length === 0 ? (
              <EmptyState colors={colors} text="这门课程暂无 DDL" />
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {courseDdls.map((ddl) => (
                  <DDLItem
                    key={ddl.id}
                    ddl={ddl}
                    colors={colors}
                    onComplete={completeDDL}
                    onDelete={deleteDDL}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: "22px",
              padding: "24px",
              backdropFilter: "blur(22px)",
            }}
          >
            <h2
              style={{
                margin: "0 0 18px",
                color: colors.title,
                fontSize: "22px",
              }}
            >
              笔记区域
            </h2>

            <EmptyState
              colors={colors}
              text="笔记功能后续接入，这里先作为课程资料区占位。"
            />
          </div>
        </section>

        {showAddDDLModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: darkMode
                ? "rgba(0,0,0,0.52)"
                : "rgba(15,42,74,0.18)",
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
                  margin: "0 0 22px",
                  color: colors.title,
                  fontSize: "24px",
                }}
              >
                新建课程 DDL
              </h2>

              <input
                value={newDDLTitle}
                onChange={(e) => setNewDDLTitle(e.target.value)}
                placeholder="DDL 标题"
                style={inputStyle(darkMode)}
              />

              <input
                type="datetime-local"
                value={newDDLDate}
                onChange={(e) => setNewDDLDate(e.target.value)}
                style={{
                  ...inputStyle(darkMode),
                  marginTop: "14px",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "24px",
                }}
              >
                <button
                  onClick={() => {
                    setShowAddDDLModal(false);
                    setNewDDLTitle("");
                    setNewDDLDate("");
                  }}
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
                  onClick={addDDL}
                  style={{
                    border: "none",
                    background: colors.active,
                    color: "#FFFFFF",
                    borderRadius: "12px",
                    padding: "10px 18px",
                    cursor: "pointer",
                  }}
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer
        darkMode={darkMode}
        courseCount={allCourses.length}
        ddlCount={ddls.length}
      />
    </div>
  );
}

function parseDate(date) {
  if (!date) return new Date("");
  return new Date(date.replace(" ", "T"));
}

function getDDLStatus(ddl) {
  if (ddl.completed) {
    return {
      text: "已完成",
      color: "#10B981",
    };
  }

  const ddlDate = parseDate(ddl.date);
  const now = new Date();
  const diff = ddlDate - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (Number.isNaN(ddlDate.getTime())) {
    return {
      text: "时间未设置",
      color: "#94A3B8",
    };
  }

  if (diff < 0) {
    return {
      text: `已过期 ${Math.abs(days)} 天`,
      color: "#EF4444",
    };
  }

  if (days === 0) {
    return {
      text: "今天截止",
      color: "#F59E0B",
    };
  }

  return {
    text: `剩余 ${days} 天`,
    color: "#10B981",
  };
}

function StatCard({ label, value, colors }) {
  return (
    <div
      style={{
        background: colors.soft,
        border: `1px solid ${colors.border}`,
        borderRadius: "16px",
        padding: "18px",
      }}
    >
      <div
        style={{
          color: colors.text,
          fontSize: "13px",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: colors.title,
          fontSize: "28px",
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DDLItem({ ddl, colors, onComplete, onDelete }) {
  const status = getDDLStatus(ddl);

  return (
    <div
      style={{
        background: colors.soft,
        border: `1px solid ${colors.border}`,
        borderRadius: "16px",
        padding: "16px",
        opacity: ddl.completed ? 0.7 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "18px",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: colors.title,
              fontSize: "16px",
              textDecoration: ddl.completed ? "line-through" : "none",
            }}
          >
            {ddl.title}
          </h3>

          <p
            style={{
              margin: "6px 0 0",
              color: colors.text,
              fontSize: "13px",
            }}
          >
            {ddl.date}
          </p>
        </div>

        <span
          style={{
            color: status.color,
            fontSize: "13px",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {status.text}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
          marginTop: "12px",
        }}
      >
        {!ddl.completed && (
          <button
            onClick={() => onComplete(ddl.id)}
            style={miniButton("#10B981")}
          >
            完成
          </button>
        )}

        <button onClick={() => onDelete(ddl.id)} style={miniButton("#EF4444")}>
          删除
        </button>
      </div>
    </div>
  );
}

function EmptyState({ colors, text }) {
  return (
    <div
      style={{
        height: "180px",
        border: `1px dashed ${colors.border}`,
        borderRadius: "18px",
        color: colors.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colors.soft,
        fontSize: "14px",
        textAlign: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      {text}
    </div>
  );
}

function inputStyle(darkMode) {
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

function miniButton(background) {
  return {
    border: "none",
    background,
    color: "#FFFFFF",
    borderRadius: "10px",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "inherit",
  };
}

export default CoursePage;