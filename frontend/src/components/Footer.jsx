import { useState } from "react";

const footerItems = {
  help: {
    title: "帮助文档",
    body: [
      "在首页管理课程、资料、笔记和 DDL。",
      "进入课程后可以上传资料、生成 AI 笔记、整理复习任务。",
      "日程页支持导入固定课表，并根据 DDL 与考试自动生成复习计划。",
    ],
  },
  privacy: {
    title: "隐私政策",
    body: [
      "账号、课程、笔记和日程数据默认保存在本机或当前后端服务中。",
      "自定义模型密钥仅用于你主动发起的 AI 请求，不会作为公开内容展示。",
      "导入教务系统课表时不保存教务账号密码，只读取认证后的课程结果。",
    ],
  },
  terms: {
    title: "使用条款",
    body: [
      "NoteWhale 用于个人学习管理，请勿上传侵犯他人权益的资料。",
      "AI 生成内容仅作学习辅助，重要作业、考试信息请以课程通知为准。",
      "本地测试版本可能持续迭代，升级前建议保留重要资料备份。",
    ],
  },
};

function Footer({ darkMode = false }) {
  const [activeItem, setActiveItem] = useState(null);
  const currentItem = activeItem ? footerItems[activeItem] : null;
  const mutedColor = darkMode ? "#94A3B8" : "#64748B";

  const linkStyle = {
    border: 0,
    background: "transparent",
    color: mutedColor,
    cursor: "pointer",
    font: "inherit",
    padding: "2px 4px",
  };

  return (
    <>
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
          color: mutedColor,
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
          <button style={linkStyle} type="button" onClick={() => setActiveItem("help")}>
            帮助文档
          </button>
          <span style={{ opacity: 0.45 }}>|</span>
          <button style={linkStyle} type="button" onClick={() => setActiveItem("privacy")}>
            隐私政策
          </button>
          <span style={{ opacity: 0.45 }}>|</span>
          <button style={linkStyle} type="button" onClick={() => setActiveItem("terms")}>
            使用条款
          </button>
        </div>

        <div style={{ justifySelf: "end" }}>
          Made with <span style={{ color: "#EF4444" }}>♥</span> by CH<sub>4</sub> Team
        </div>
      </footer>

      {currentItem ? (
        <div
          role="presentation"
          onClick={() => setActiveItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            background: "rgba(15,23,42,0.22)",
            padding: "24px",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={currentItem.title}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              border: darkMode
                ? "1px solid rgba(148,163,184,0.18)"
                : "1px solid rgba(226,232,240,0.95)",
              borderRadius: "8px",
              background: darkMode ? "#111827" : "#ffffff",
              boxShadow: "0 24px 70px rgba(15,23,42,0.22)",
              color: darkMode ? "#E5E7EB" : "#0F2748",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
                {currentItem.title}
              </h2>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                aria-label="关闭"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: darkMode
                    ? "1px solid rgba(148,163,184,0.24)"
                    : "1px solid rgba(203,213,225,0.95)",
                  background: darkMode ? "rgba(15,23,42,0.72)" : "#F8FAFC",
                  color: darkMode ? "#CBD5E1" : "#33516F",
                  cursor: "pointer",
                  fontSize: "18px",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
                color: darkMode ? "#CBD5E1" : "#52677F",
                lineHeight: 1.7,
                fontSize: "14px",
              }}
            >
              {currentItem.body.map((line) => (
                <p key={line} style={{ margin: 0 }}>
                  {line}
                </p>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default Footer;
