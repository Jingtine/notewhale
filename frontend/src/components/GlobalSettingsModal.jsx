import AiModelSettingsPanel from "./AiModelSettingsPanel";

function GlobalSettingsModal({
  darkMode,
  user,
  apiStatus,
  backendCourseMessage,
  backendDdlMessage,
  courseCount,
  folderCount,
  ddlCount,
  activeDdlCount,
  noteCount,
  resourceCount,
  aiStatus,
  aiModelSettings,
  onChangeAiModelSettings,
  onClose,
}) {
  const colors = {
    panel: darkMode ? "#111827" : "#FFFFFF",
    card: darkMode ? "rgba(30,41,59,0.72)" : "#F8FBFF",
    border: darkMode ? "rgba(148,163,184,0.18)" : "#E2EAF5",
    title: darkMode ? "#F8FAFC" : "#173B63",
    text: darkMode ? "#CBD5E1" : "#64748B",
    muted: darkMode ? "#94A3B8" : "#94A3B8",
    active: darkMode ? "#93C5FD" : "#2563EB",
    success: "#10B981",
    warning: "#F59E0B",
  };
  const displayName = user?.name || "NoteWhale 用户";
  const accountText = user?.account || user?.email || "本地体验账号";
  const isOnline = Boolean(apiStatus.online);

  return (
    <div style={overlayStyle(darkMode)}>
      <div style={modalStyle(colors)}>
        <header style={modalHeaderStyle}>
          <div>
            <div style={{ color: colors.active, fontSize: "12px", fontWeight: 900 }}>
              Settings
            </div>
            <h2 style={{ margin: "6px 0 0", color: colors.title, fontSize: "28px" }}>
              工作区设置
            </h2>
            <p style={{ margin: "8px 0 0", color: colors.text, fontSize: "14px", lineHeight: 1.7 }}>
              管理同步状态、数据规模和 AI 模型接入。自定义模型仅保存在当前浏览器，请勿在公共设备保存密钥。
            </p>
          </div>
          <button onClick={onClose} style={closeButtonStyle(colors)}>×</button>
        </header>

        <div style={summaryGridStyle}>
          <SummaryCard label="账号" value={displayName} detail={accountText} colors={colors} />
          <SummaryCard
            label="后端"
            value={isOnline ? "在线" : "离线"}
            detail={isOnline ? apiStatus.apiBaseUrl || "API 已连接" : apiStatus.message || "无法连接 API"}
            colors={colors}
            tone={isOnline ? "success" : "warning"}
          />
          <SummaryCard label="课程" value={courseCount} detail={`${folderCount} 个文件夹`} colors={colors} />
          <SummaryCard label="学习项" value={noteCount + resourceCount + ddlCount} detail={`${activeDdlCount} 个待办 DDL`} colors={colors} />
        </div>

        <section style={sectionStyle(colors)}>
          <div style={sectionHeaderStyle}>
            <div>
              <h3 style={sectionTitleStyle(colors)}>AI 模型接入</h3>
              <p style={sectionTextStyle(colors)}>
                默认使用后端环境变量；启用自定义后，AI 笔记和 DDL 识别会在请求时临时使用这里的配置。
              </p>
            </div>
          </div>
          <AiModelSettingsPanel
            value={aiModelSettings}
            onChange={onChangeAiModelSettings}
            backendStatus={aiStatus}
            darkMode={darkMode}
          />
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
          <section style={sectionStyle(colors)}>
            <h3 style={sectionTitleStyle(colors)}>同步与存储</h3>
            <InfoLine label="课程同步" value={backendCourseMessage || "后端课程接口正常"} colors={colors} />
            <InfoLine label="DDL 同步" value={backendDdlMessage || "后端 DDL 接口正常"} colors={colors} />
            <InfoLine label="资料文件" value="上传资料保存在后端文件区，笔记保存在数据库" colors={colors} />
          </section>
          <section style={sectionStyle(colors)}>
            <h3 style={sectionTitleStyle(colors)}>产品能力</h3>
            <Capability colors={colors}>课程、文件夹、DDL、笔记按账号隔离</Capability>
            <Capability colors={colors}>AI 笔记支持长文档分块整理</Capability>
            <Capability colors={colors}>截图识别 DDL 可接入视觉模型</Capability>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, detail, colors, tone = "default" }) {
  const toneColor = tone === "success" ? colors.success : tone === "warning" ? colors.warning : colors.active;
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "16px", padding: "16px" }}>
      <div style={{ color: colors.muted, fontSize: "12px", fontWeight: 800 }}>{label}</div>
      <div style={{ color: toneColor, fontSize: "22px", fontWeight: 900, marginTop: "8px" }}>{value}</div>
      <div style={{ color: colors.text, fontSize: "12px", marginTop: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</div>
    </div>
  );
}

function InfoLine({ label, value, colors }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "10px 0", borderBottom: `1px solid ${colors.border}` }}>
      <span style={{ color: colors.text, fontSize: "13px" }}>{label}</span>
      <strong style={{ color: colors.title, fontSize: "13px", textAlign: "right" }}>{value}</strong>
    </div>
  );
}

function Capability({ colors, children }) {
  return (
    <div style={{ color: colors.title, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: "12px", padding: "11px 12px", fontSize: "13px", fontWeight: 800 }}>
      {children}
    </div>
  );
}

function overlayStyle(darkMode) {
  return {
    position: "fixed",
    inset: 0,
    background: darkMode ? "rgba(2,6,23,0.62)" : "rgba(15,42,74,0.20)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "28px",
    boxSizing: "border-box",
  };
}

function modalStyle(colors) {
  return {
    width: "min(980px, 100%)",
    maxHeight: "calc(100vh - 56px)",
    overflowY: "auto",
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: "24px",
    padding: "26px",
    boxSizing: "border-box",
    boxShadow: "0 28px 80px rgba(15,42,74,0.18)",
  };
}

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  alignItems: "flex-start",
  marginBottom: "22px",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  alignItems: "flex-start",
  marginBottom: "14px",
};

function sectionStyle(colors) {
  return {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "18px",
  };
}

function sectionTitleStyle(colors) {
  return { margin: "0 0 8px", color: colors.title, fontSize: "17px", fontWeight: 900 };
}

function sectionTextStyle(colors) {
  return { margin: 0, color: colors.text, fontSize: "13px", lineHeight: 1.7 };
}

function closeButtonStyle(colors) {
  return {
    width: "38px",
    height: "38px",
    border: "none",
    borderRadius: "12px",
    background: colors.card,
    color: colors.text,
    cursor: "pointer",
    fontSize: "22px",
  };
}

export default GlobalSettingsModal;
