function AiModelSettingsPanel({
  value,
  onChange,
  backendStatus = null,
  darkMode = false,
  compact = false,
}) {
  const colors = {
    panel: darkMode ? "#111827" : "#FFFFFF",
    soft: darkMode ? "rgba(148,163,184,0.10)" : "#F8FAFC",
    border: darkMode ? "rgba(148,163,184,0.20)" : "#E2E8F0",
    title: darkMode ? "#F8FAFC" : "#173B63",
    text: darkMode ? "#CBD5E1" : "#64748B",
    muted: darkMode ? "#94A3B8" : "#94A3B8",
    active: darkMode ? "#93C5FD" : "#2563EB",
    success: "#10B981",
    warning: "#F59E0B",
  };

  function updateProvider(provider, patch) {
    onChange?.({
      ...value,
      [provider]: {
        ...(value?.[provider] || {}),
        ...patch,
      },
    });
  }

  return (
    <div style={{ display: "grid", gap: compact ? "14px" : "18px" }}>
      <ProviderCard
        title="文本模型"
        description="用于课程资料生成 AI 笔记，兼容 OpenAI chat/completions。"
        provider="text"
        value={value?.text}
        status={backendStatus?.text}
        colors={colors}
        compact={compact}
        onChange={updateProvider}
        placeholderModel="deepseek-chat / glm-4-flash-250414"
      />
      <ProviderCard
        title="视觉模型"
        description="用于 DDL 截图识别，需要支持 image_url 消息。"
        provider="vision"
        value={value?.vision}
        status={backendStatus?.vision}
        colors={colors}
        compact={compact}
        onChange={updateProvider}
        placeholderModel="glm-4v-flash"
      />
    </div>
  );
}

function ProviderCard({
  title,
  description,
  provider,
  value = {},
  status = null,
  colors,
  compact,
  onChange,
  placeholderModel,
}) {
  const enabled = Boolean(value.enabled);
  const complete = Boolean(enabled && value.apiUrl && value.apiKey && value.model);
  const statusText = enabled
    ? complete
      ? "使用自定义模型"
      : "自定义配置未完整"
    : status?.configured
      ? "使用后端默认模型"
      : "后端默认模型未配置";
  const statusColor = enabled
    ? complete
      ? colors.success
      : colors.warning
    : status?.configured
      ? colors.success
      : colors.warning;

  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "16px",
        background: colors.panel,
        padding: compact ? "16px" : "18px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          marginBottom: "14px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, color: colors.title, fontSize: "16px" }}>
            {title}
          </h3>
          <p style={{ margin: "6px 0 0", color: colors.text, fontSize: "13px", lineHeight: 1.6 }}>
            {description}
          </p>
        </div>
        <span
          style={{
            color: statusColor,
            background: `${statusColor}18`,
            borderRadius: "999px",
            padding: "6px 10px",
            fontSize: "12px",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {statusText}
        </span>
      </div>

      <label style={toggleRowStyle(colors)}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange(provider, { enabled: event.target.checked })}
        />
        <span>为本浏览器启用自定义接入</span>
      </label>

      <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
        <SettingsInput
          label="API URL"
          value={value.apiUrl || ""}
          placeholder="https://api.example.com/v1/chat/completions"
          colors={colors}
          disabled={!enabled}
          onChange={(apiUrl) => onChange(provider, { apiUrl })}
        />
        <SettingsInput
          label="API Key"
          type="password"
          value={value.apiKey || ""}
          placeholder="只保存在当前浏览器"
          colors={colors}
          disabled={!enabled}
          onChange={(apiKey) => onChange(provider, { apiKey })}
        />
        <SettingsInput
          label="Model"
          value={value.model || ""}
          placeholder={placeholderModel}
          colors={colors}
          disabled={!enabled}
          onChange={(model) => onChange(provider, { model })}
        />
      </div>

      {status && (
        <div style={{ marginTop: "12px", color: colors.muted, fontSize: "12px", lineHeight: 1.6 }}>
          后端默认：{status.host || "未配置"} · {status.model || "未配置"}
        </div>
      )}
    </section>
  );
}

function SettingsInput({ label, value, onChange, colors, disabled, placeholder, type = "text" }) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={{ color: colors.text, fontSize: "12px", fontWeight: 800 }}>{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={{
          height: "40px",
          borderRadius: "10px",
          border: `1px solid ${colors.border}`,
          background: disabled ? colors.soft : "transparent",
          color: colors.title,
          padding: "0 12px",
          fontFamily: "inherit",
          outline: "none",
          opacity: disabled ? 0.72 : 1,
        }}
      />
    </label>
  );
}

function toggleRowStyle(colors) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: colors.title,
    fontSize: "13px",
    fontWeight: 800,
  };
}

export default AiModelSettingsPanel;
