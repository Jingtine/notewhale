import { useEffect, useRef, useState } from "react";

import CourseCard from "./CourseCard";

function FolderSection({
  folderId,
  title,
  courses,
  onAddCourse,
  onStarCourse,
  onDeleteCourse,
  onRenameCourse,
  onRestoreCourse,
  onPermanentDeleteCourse,
  onDeleteFolder,
  onRenameFolder,
  canAddCourse = true,
  canDeleteFolder = false,
  canRenameFolder = false,
  isTrash = false,
  darkMode = false,
}) {
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const menuRef = useRef(null);

  const text = darkMode ? "#F8FAFC" : "#183B63";
  const subText = darkMode ? "#94A3B8" : "#64748B";
  const border = darkMode ? "rgba(148,163,184,0.22)" : "#CBD5E1";
  const menuBackground = darkMode ? "rgba(30,41,59,0.96)" : "rgba(255,255,255,0.96)";
  const menuBorder = darkMode ? "rgba(148,163,184,0.2)" : "rgba(203,213,225,0.88)";
  const menuShadow = darkMode
    ? "0 18px 44px rgba(0,0,0,0.28)"
    : "0 18px 44px rgba(15,42,74,0.12)";
  const canManageFolder = canDeleteFolder || canRenameFolder;

  useEffect(() => {
    if (!showFolderMenu) return;

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setShowFolderMenu(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showFolderMenu]);

  function handleRenameFolder() {
    setShowFolderMenu(false);
    onRenameFolder?.(folderId);
  }

  function handleDeleteFolder() {
    setShowFolderMenu(false);
    onDeleteFolder?.(folderId);
  }

  return (
    <section style={{ marginBottom: "34px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px", color: subText }}>
            {isTrash ? "⌫" : "▰"}
          </span>

          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 600,
              color: text,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h2>

          <span style={{ color: subText, fontSize: "14px", marginLeft: "4px" }}>
            {courses.length} 门课程
          </span>
        </div>

        {canManageFolder && (
          <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              aria-label="文件夹操作"
              onClick={() => setShowFolderMenu((value) => !value)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: darkMode ? "1px solid rgba(148,163,184,0.18)" : "1px solid transparent",
                background: showFolderMenu
                  ? darkMode
                    ? "rgba(148,163,184,0.14)"
                    : "rgba(255,255,255,0.78)"
                  : "transparent",
                color: subText,
                cursor: "pointer",
                fontSize: "0",
                lineHeight: 1,
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: showFolderMenu && !darkMode ? "0 8px 20px rgba(15,42,74,0.08)" : "none",
              }}
            >
              <span style={folderMoreIconStyle(subText)} />
            </button>

            {showFolderMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "44px",
                  zIndex: 20,
                  minWidth: "148px",
                  padding: "8px",
                  borderRadius: "14px",
                  border: `1px solid ${menuBorder}`,
                  background: menuBackground,
                  boxShadow: menuShadow,
                  backdropFilter: "blur(10px)",
                }}
              >
                {canRenameFolder && (
                  <button
                    type="button"
                    onClick={handleRenameFolder}
                    style={folderMenuItemStyle(darkMode)}
                  >
                    重命名
                  </button>
                )}

                {canDeleteFolder && (
                  <button
                    type="button"
                    onClick={handleDeleteFolder}
                    style={{
                      ...folderMenuItemStyle(darkMode),
                      color: darkMode ? "#FCA5A5" : "#B91C1C",
                    }}
                  >
                    删除文件夹
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {courses.length === 0 ? (
        <div
          style={{
            minHeight: "112px",
            border: `1px dashed ${border}`,
            borderRadius: "14px",
            color: subText,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: darkMode ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.48)",
            fontSize: "13px",
          }}
        >
          <span>{isTrash ? "回收站中暂无课程" : "这个文件夹还是空的"}</span>
          {canAddCourse && !isTrash && (
            <button
              type="button"
              onClick={() => onAddCourse(folderId)}
              style={{
                border: "none",
                background: "transparent",
                color: darkMode ? "#A5B4FC" : "#2563EB",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                padding: "4px 8px",
              }}
            >
              添加第一门课程
            </button>
          )}
        </div>
      ) : (
        <div className="course-grid">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              starred={course.starred}
              noteCount={course.noteCount}
              ddlCount={course.ddlCount}
              resourceCount={course.resourceCount}
              onStar={onStarCourse}
              onDelete={onDeleteCourse}
              onRename={onRenameCourse}
              onRestore={onRestoreCourse}
              onPermanentDelete={onPermanentDeleteCourse}
              isTrash={isTrash}
              darkMode={darkMode}
            />
          ))}

          {canAddCourse && (
            <div
              onClick={() => onAddCourse(folderId)}
              style={{
                minHeight: "112px",
                border: `1px dashed ${border}`,
                borderRadius: "14px",
                color: subText,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: darkMode ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.36)",
                fontSize: "14px",
              }}
            >
              ＋ 添加课程
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function folderMenuItemStyle(darkMode) {
  return {
    width: "100%",
    border: "none",
    borderRadius: "10px",
    background: "transparent",
    color: darkMode ? "#E5E7EB" : "#183B63",
    cursor: "pointer",
    display: "block",
    fontFamily: "inherit",
    fontSize: "14px",
    padding: "10px 12px",
    textAlign: "left",
    whiteSpace: "nowrap",
  };
}

function folderMoreIconStyle(color) {
  return {
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    background: color,
    boxShadow: `8px 0 0 ${color}, 16px 0 0 ${color}`,
    display: "block",
    transform: "translateX(-8px)",
    opacity: 0.9,
  };
}

export default FolderSection;
