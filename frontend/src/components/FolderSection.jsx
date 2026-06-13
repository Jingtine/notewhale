import CourseCard from "./CourseCard";

function FolderSection({
  folderId,
  title,
  courses,
  onAddCourse,
  onStarCourse,
  onDeleteCourse,
  onRestoreCourse,
  onPermanentDeleteCourse,
  onDeleteFolder,
  canAddCourse = true,
  canDeleteFolder = false,
  isTrash = false,
  darkMode = false,
}) {
  const text = darkMode ? "#4B4762" : "#183B63";
  const subText = darkMode ? "#6F698C" : "#94A3B8";
  const border = darkMode ? "rgba(139,132,174,0.25)" : "#CBD5E1";

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
              fontSize: "22px",
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

        {canDeleteFolder && (
          <button
            onClick={() => onDeleteFolder(folderId)}
            style={{
              border: "none",
              background: "transparent",
              color: subText,
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
          >
            删除文件夹
          </button>
        )}
      </div>

      {courses.length === 0 ? (
        <div
          style={{
            height: "96px",
            border: `1px dashed ${border}`,
            borderRadius: "14px",
            color: subText,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: darkMode ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.45)",
            fontSize: "14px",
          }}
        >
          暂无课程
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
            gap: "18px",
          }}
        >
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

export default FolderSection;