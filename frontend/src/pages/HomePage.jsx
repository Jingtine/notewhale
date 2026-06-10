import CourseCard from "../components/CourseCard";
import DDLPanel from "../components/DDLPanel";

function HomePage() {
  return (
    <div
      style={{
        background: "#F5F9FF",
        minHeight: "100vh",
        padding: "40px",
      }}
    >
      {/* 顶部 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "30px",
        }}
      >
        <div>
          <h1>鲸记 NoteWhale</h1>
          <p>你的大学课程知识整理平台</p>
        </div>

        <button
          style={{
            height: "50px",
            padding: "0 20px",
            borderRadius: "12px",
            border: "none",
            background: "#4A90E2",
            color: "white",
            cursor: "pointer",
          }}
        >
          + 新建课程
        </button>
      </div>

      {/* 主体 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
        }}
      >
        {/* 左侧课程 */}
        <div>
          <CourseCard title="离散数学" />
          <CourseCard title="Java程序设计" />
          <CourseCard title="宏观经济学" />
          <CourseCard title="法理学" />
        </div>

        {/* 右侧DDL */}
        <DDLPanel />
      </div>
    </div>
  );
}

export default HomePage;