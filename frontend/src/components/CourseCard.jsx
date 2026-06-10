function CourseCard({ title }) {
  return (
    <div
      style={{
        background: "#ffffff",
        padding: "20px",
        borderRadius: "16px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        marginBottom: "16px",
        cursor: "pointer",
      }}
    >
      <h3>{title}</h3>
    </div>
  );
}

export default CourseCard;