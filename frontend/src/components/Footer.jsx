function Footer({ darkMode = false }) {
  return (
    <footer
      style={{
        height: "52px",
        borderTop: darkMode
          ? "1px solid rgba(148,163,184,0.08)"
          : "1px solid rgba(226,232,240,0.9)",
        background: darkMode
          ? "rgba(15,23,42,0.72)"
          : "rgba(255,255,255,0.86)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0 44px",
        color: darkMode ? "#94A3B8" : "#64748B",
        fontSize: "13px",
        flexShrink: 0,
      }}
    >
      <div style={{ justifySelf: "start" }}>
        © 2026 NoteWhale 鲸记. All rights reserved.
      </div>

      <div
        style={{
          justifySelf: "center",
          display: "flex",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <span>帮助文档</span>
        <span style={{ opacity: 0.45 }}>|</span>
        <span>隐私政策</span>
        <span style={{ opacity: 0.45 }}>|</span>
        <span>使用条款</span>
      </div>

      <div style={{ justifySelf: "end" }}>
        Made with <span style={{ color: "#EF4444" }}>♥</span> by CH<sub>4</sub> Team
      </div>
    </footer>
  );
}

export default Footer;