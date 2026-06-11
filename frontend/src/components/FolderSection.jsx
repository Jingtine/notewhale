import CourseCard from "./CourseCard";

function FolderSection({
  folderId,
  title,
  courses,
  ddls = [],
  onAddCourse,
  onStarCourse,
  onDeleteCourse,
  onRenameCourse,
  onRestoreCourse,
  onPermanentDeleteCourse,
  onDeleteFolder,
  canAddCourse = true,
  canDeleteFolder = false,
  isTrash = false,
  darkMode = false,
}) {
  const theme = darkMode
  ? {
      title: "#F8FAFC",
      text: "#CBD5E1",
      border: "rgba(148,163,184,0.18)",
      cardBg: "rgba(30,41,59,0.72)",
    }
    : {
        title: "#183B63",
        text: "#64748B",
        border:
          "rgba(226,232,240,0.88)",
        cardBg:
          "rgba(255,255,255,0.42)",
      };

  return (
    <section
      style={{
        marginBottom: "34px",
      }}
    >
      {/* 顶部标题区 */}
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: "18px",
        }}
      >
        {/* 左侧 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {/* 小图标 */}
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "10px",
              background:
                theme.cardBg,
              border: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              flexShrink: 0,
              backdropFilter:
                "blur(20px)",
            }}
          >
            <span
              style={{
                color:
                  theme.text,
                fontSize: "13px",
              }}
            >
              {isTrash
                ? "⌫"
                : "▭"}
            </span>
          </div>

          {/* 标题 */}
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 600,
                color:
                  theme.title,
                letterSpacing:
                  "-0.03em",
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>

            <p
              style={{
                margin:
                  "4px 0 0",
                color:
                  theme.text,
                fontSize:
                  "13px",
              }}
            >
              共{" "}
              {
                courses.length
              }{" "}
              门课程
            </p>
          </div>
        </div>

        {/* 删除文件夹 */}
        {canDeleteFolder && (
          <button
            onClick={() =>
              onDeleteFolder(
                folderId
              )
            }
            style={{
              border: "none",
              background:
                "transparent",
              color:
                theme.text,
              cursor:
                "pointer",
              fontSize:
                "13px",
              fontFamily:
                "inherit",
            }}
          >
            删除文件夹
          </button>
        )}
      </div>

      {/* 空状态 */}
      {courses.length ===
      0 ? (
        <div
          style={{
            height: "120px",
            border: `1px dashed ${theme.border}`,
            borderRadius:
              "18px",
            background:
              theme.cardBg,
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            color:
              theme.text,
            fontSize:
              "14px",
            backdropFilter:
              "blur(20px)",
          }}
        >
          暂无课程
        </div>
      ) : (
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fill,minmax(280px,1fr))",

            gap: "20px",
          }}
        >
          {courses.map(
            (course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                starred={course.starred}
                noteCount={course.noteCount}
                ddlCount={ddls.filter((ddl) => String(ddl.courseId) === String(course.id) && !ddl.completed).length}
                onStar={onStarCourse}
                onDelete={onDeleteCourse}
                onRename={onRenameCourse}
                onRestore={onRestoreCourse}
                onPermanentDelete={onPermanentDeleteCourse}
                isTrash={isTrash}
                darkMode={darkMode}
              />
            )
          )}

          {/* 添加课程 */}
          {canAddCourse && (
            <div
              onClick={() =>
                onAddCourse(
                  folderId
                )
              }
              style={{
                minHeight:
                  "126px",

                borderRadius:
                  "18px",

                border: `1px dashed ${theme.border}`,

                background:
                  theme.cardBg,

                display:
                  "flex",

                flexDirection:
                  "column",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                cursor:
                  "pointer",

                transition:
                  ".2s",

                backdropFilter:
                  "blur(20px)",
              }}
              onMouseEnter={(
                e
              ) => {
                e.currentTarget.style.transform =
                  "translateY(-3px)";
              }}
              onMouseLeave={(
                e
              ) => {
                e.currentTarget.style.transform =
                  "translateY(0)";
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius:
                    "14px",
                  background:
                    darkMode
                      ? "rgba(255,255,255,0.12)"
                      : "#EFF6FF",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  marginBottom:
                    "12px",
                }}
              >
                <span
                  style={{
                    fontSize:
                      "20px",
                    color:
                      theme.text,
                  }}
                >
                  ＋
                </span>
              </div>

              <span
                style={{
                  fontSize:
                    "14px",
                  color:
                    theme.text,
                  fontWeight:
                    500,
                }}
              >
                添加课程
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default FolderSection;