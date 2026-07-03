import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

function CourseCard({
  id,
  title,
  starred,
  noteCount,
  ddlCount,
  resourceCount,
  onStar,
  onDelete,
  onRestore,
  onRename,
  onPermanentDelete,
  isTrash = false,
  darkMode = false,
}) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const displayNoteCount = Number(noteCount || 0);
  const displayDdlCount = Number(ddlCount || 0);
  const displayResourceCount = Number(resourceCount || 0);
  const courseInitial = String(title || "课").trim().slice(0, 1) || "课";

  useEffect(() => {
    if (!showMenu) return;

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setShowMenu(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMenu]);

  function handleOpenCourse(e) {
    if (isTrash) return;
    e.stopPropagation();
    navigate(`/course/${String(id)}`);
  }

  const theme = darkMode
    ? {
        card: "rgba(30,41,59,0.88)",
        border: "rgba(148,163,184,0.18)",
        shadow: "0 12px 30px rgba(0,0,0,0.22)",
        hoverShadow: "0 20px 44px rgba(0,0,0,0.32)",
        title: "#F8FAFC",
        text: "#CBD5E1",
        softBg: "rgba(148,163,184,0.12)",
        star: "#FACC15",
        delete: "#94A3B8",
        hoverBorder: "rgba(129,140,248,0.35)",
        menuBg: "#1E293B",
        menuBorder: "rgba(148,163,184,0.18)",
      }
    : {
        card: "rgba(255,255,255,0.82)",
        border: "rgba(226,232,240,0.88)",
        shadow: "0 8px 24px rgba(15,42,74,0.05)",
        hoverShadow: "0 14px 30px rgba(15,42,74,0.08)",
        title: "#183B63",
        text: "#64748B",
        softBg: "#F8FAFC",
        star: "#F59E0B",
        delete: "#CBD5E1",
        hoverBorder: "rgba(59,130,246,0.16)",
        menuBg: "#FFFFFF",
        menuBorder: "#E2E8F0",
      };

  return (
    <div
      className="course-card"
      role={isTrash ? undefined : "button"}
      tabIndex={isTrash ? -1 : 0}
      aria-label={isTrash ? undefined : `打开课程：${title}`}
      onClick={handleOpenCourse}
      onKeyDown={(event) => {
        if (!isTrash && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          navigate(`/course/${String(id)}`);
        }
      }}
      style={{
        minHeight: "104px",
        padding: "16px 18px",
        borderRadius: "14px",
        cursor: isTrash ? "default" : "pointer",
        position: "relative",
        background: theme.card,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
        transition: "all .22s ease",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        overflow: "visible",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = theme.hoverShadow;
        e.currentTarget.style.border = `1px solid ${theme.hoverBorder}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = theme.shadow;
        e.currentTarget.style.border = `1px solid ${theme.border}`;
      }}
    >
      {!isTrash && (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: "16px",
            right: "18px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 20,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onStar(id)}
            title="收藏课程"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              fontSize: "18px",
              color: starred ? theme.star : theme.text,
              transition: ".2s",
            }}
          >
            {starred ? "★" : "☆"}
          </button>

          <button
            onClick={() => setShowMenu(!showMenu)}
            title="更多操作"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              fontSize: "24px",
              lineHeight: 1,
              color: theme.text,
            }}
          >
            ⋯
          </button>

          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: "30px",
                right: 0,
                width: "138px",
                background: theme.menuBg,
                border: `1px solid ${theme.menuBorder}`,
                borderRadius: "12px",
                boxShadow: darkMode
                  ? "0 18px 34px rgba(0,0,0,0.32)"
                  : "0 18px 34px rgba(15,42,74,0.12)",
                overflow: "hidden",
                zIndex: 99,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onRename?.(id, title);
                  setShowMenu(false);
                }}
                style={courseMenuItemStyle(darkMode)}
              >
                编辑课程
              </button>

              <button
                type="button"
                onClick={() => {
                  onDelete(id);
                  setShowMenu(false);
                }}
                style={{
                  ...courseMenuItemStyle(darkMode),
                  color: "#EF4444",
                  borderTop: `1px solid ${theme.menuBorder}`,
                }}
              >
                删除课程
              </button>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          paddingRight: isTrash ? 0 : "66px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background: darkMode
              ? "linear-gradient(135deg,rgba(129,140,248,0.26),rgba(99,102,241,0.14))"
              : "linear-gradient(135deg,#E7F0FF,#DCEAFF)",
            color: darkMode ? "#C7D2FE" : "#2563EB",
            fontSize: "17px",
            fontWeight: 800,
          }}
        >
          {courseInitial}
        </div>

        <div style={{ minWidth: 0 }}>
          <h2
            title={title}
            style={{
              margin: 0,
              color: theme.title,
              fontSize: "17px",
              fontWeight: 700,
              lineHeight: 1.35,
              letterSpacing: "-0.025em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </h2>
          <span
            style={{
              display: "block",
              marginTop: "3px",
              color: theme.text,
              fontSize: "11px",
            }}
          >
            课程空间
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "12px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            background: theme.softBg,
            borderRadius: "999px",
            padding: "6px 12px",
            color: theme.text,
            fontSize: "12px",
            fontWeight: 500,
          }}
        >
          笔记 {displayNoteCount}
        </div>

        <div
          style={{
            background: theme.softBg,
            borderRadius: "999px",
            padding: "6px 12px",
            color: theme.text,
            fontSize: "12px",
            fontWeight: 500,
          }}
        >
          DDL {displayDdlCount}
        </div>

        <div
          style={{
            background: theme.softBg,
            borderRadius: "999px",
            padding: "6px 12px",
            color: theme.text,
            fontSize: "12px",
            fontWeight: 500,
          }}
        >
          资料 {displayResourceCount}
        </div>
      </div>

      {isTrash && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "18px",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestore(id);
            }}
            style={{
              border: "none",
              background: theme.softBg,
              color: darkMode ? "#CBD5E1" : "#2563EB",
              borderRadius: "12px",
              padding: "9px 14px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            恢复
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onPermanentDelete(id);
            }}
            style={{
              border: "none",
              background: darkMode ? "rgba(220,38,38,0.12)" : "#FEF2F2",
              color: "#DC2626",
              borderRadius: "12px",
              padding: "9px 14px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            彻底删除
          </button>
        </div>
      )}
    </div>
  );
}

function courseMenuItemStyle(darkMode) {
  return {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: "11px 14px",
    cursor: "pointer",
    color: darkMode ? "#F8FAFC" : "#334155",
    fontSize: "13px",
    textAlign: "left",
  };
}

export default CourseCard;
