import { useState } from "react";

const PROVIDER_PRESETS = {
  text: [
    {
      id: "deepseek",
      label: "DeepSeek",
      apiUrl: "https://api.deepseek.com/v1/chat/completions",
      model: "deepseek-chat",
      detail: "性价比文本生成",
    },
    {
      id: "zhipu",
      label: "智谱 GLM",
      apiUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      model: "glm-4-flash-250414",
      detail: "中文课程笔记友好",
    },
    {
      id: "openai",
      label: "OpenAI",
      apiUrl: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4.1-mini",
      detail: "OpenAI 兼容接入",
    },
  ],
  vision: [
    {
      id: "zhipu",
      label: "智谱视觉",
      apiUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      model: "glm-4v-flash",
      detail: "DDL 截图识别",
    },
    {
      id: "openai",
      label: "OpenAI 视觉",
      apiUrl: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4.1-mini",
      detail: "支持图片消息",
    },
    {
      id: "compatible",
      label: "兼容服务",
      apiUrl: "",
      model: "",
      detail: "自填 URL 与模型",
    },
  ],
};

function AiModelSettingsPanel({
  value,
  onChange,
  backendStatus = null,
  darkMode = false,
  compact = false,
}) {
  const [checkResults, setCheckResults] = useState({});
  const colors = {
    panel: darkMode ? "#111827" : "#FFFFFF",
    soft: darkMode ? "rgba(148,163,184,0.10)" : "#F8FAFC",
    softer: darkMode ? "rgba(59,130,246,0.10)" : "#EFF6FF",
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
    setCheckResults((prev) => ({ ...prev, [provider]: null }));
  }

  function checkProvider(provider, config, status) {
    const result = getProviderCheckResult(config, status);
    setCheckResults((prev) => ({ ...prev, [provider]: result }));
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
        onCheck={checkProvider}
        checkResult={checkResults.text}
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
        onCheck={checkProvider}
        checkResult={checkResults.vision}
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
  onCheck,
  checkResult,
  placeholderModel,
}) {
  const enabled = Boolean(value.enabled);
  const complete = Boolean(enabled && value.apiUrl && value.apiKey && value.model);
  const presets = PROVIDER_PRESETS[provider] || [];
  const activePreset = getActivePreset(presets, value, enabled);
  const statusText = enabled
    ? complete
      ? "自定义已就绪"
      : "自定义未完整"
    : status?.configured
      ? "后端默认可用"
      : "后端默认未配置";
  const statusColor = enabled
    ? complete
      ? colors.success
      : colors.warning
    : status?.configured
      ? colors.success
      : colors.warning;

  function applyPreset(preset) {
    if (preset.id === "compatible") {
      onChange(provider, { enabled: true });
      return;
    }

    onChange(provider, {
      enabled: true,
      apiUrl: preset.apiUrl,
      model: preset.model,
    });
  }

  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "16px",
        background: colors.panel,
        padding: compact ? "16px" : "18px",
      }}
    >
      <div style={providerHeaderStyle}>
        <div>
          <h3 style={{ margin: 0, color: colors.title, fontSize: "16px" }}>
            {title}
          </h3>
          <p style={{ margin: "6px 0 0", color: colors.text, fontSize: "13px", lineHeight: 1.6 }}>
            {description}
          </p>
        </div>
        <span style={statusPillStyle(statusColor)}>{statusText}</span>
      </div>

      <div style={modeGridStyle}>
        <button
          type="button"
          onClick={() => onChange(provider, { enabled: false })}
          style={presetButtonStyle(colors, !enabled)}
        >
          <strong>后端默认</strong>
          <span>{status?.host || "环境变量配置"}</span>
        </button>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset)}
            style={presetButtonStyle(colors, enabled && activePreset === preset.id)}
          >
            <strong>{preset.label}</strong>
            <span>{preset.detail}</span>
          </button>
        ))}
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

      <div style={checkRowStyle}>
        <button
          type="button"
          onClick={() => onCheck(provider, value, status)}
          style={checkButtonStyle(colors)}
        >
          检查配置
        </button>
        <span style={{ color: colors.muted, fontSize: "12px", lineHeight: 1.5 }}>
          本地检查必填项和 URL 格式；真实连通性以生成结果为准。
        </span>
      </div>

      {checkResult && (
        <div style={checkResultStyle(colors, checkResult.tone)}>
          {checkResult.message}
        </div>
      )}

      {status && (
        <div style={{ marginTop: "12px", color: colors.muted, fontSize: "12px", lineHeight: 1.6 }}>
          后端默认：{status.host || "未配置"} · {status.model || "未配置"}
        </div>
      )}
    </section>
  );
}

function getActivePreset(presets, value, enabled) {
  if (!enabled) return "backend";

  const matched = presets.find(
    (preset) =>
      preset.apiUrl &&
      preset.model &&
      preset.apiUrl === value?.apiUrl &&
      preset.model === value?.model
  );

  return matched?.id || "compatible";
}

function getProviderCheckResult(config = {}, status = null) {
  if (!config.enabled) {
    return status?.configured
      ? { tone: "success", message: `后端默认模型已配置：${status.host || "默认服务"} · ${status.model}` }
      : { tone: "warning", message: "后端默认模型未配置；可切换到自定义接入并补全 API URL、Key 和 Model。" };
  }

  const missing = [];
  if (!config.apiUrl) missing.push("API URL");
  if (!config.apiKey) missing.push("API Key");
  if (!config.model) missing.push("Model");

  if (missing.length > 0) {
    return { tone: "warning", message: `自定义配置还缺少：${missing.join("、")}。` };
  }

  try {
    const parsed = new URL(config.apiUrl);

    if (!["https:", "http:"].includes(parsed.protocol)) {
      return { tone: "warning", message: "API URL 需要以 http:// 或 https:// 开头。" };
    }

    return {
      tone: "success",
      message: `配置格式已就绪：${parsed.host} · ${config.model}。`,
    };
  } catch {
    return { tone: "warning", message: "API URL 格式不正确，请检查服务地址。" };
  }
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

const providerHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  marginBottom: "14px",
};

const modeGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "10px",
  marginBottom: "12px",
};

const checkRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "12px",
};

function statusPillStyle(color) {
  return {
    color,
    background: `${color}18`,
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}

function presetButtonStyle(colors, active) {
  return {
    display: "grid",
    gap: "5px",
    minHeight: "62px",
    border: `1px solid ${active ? colors.active : colors.border}`,
    borderRadius: "12px",
    background: active ? colors.softer : colors.soft,
    color: active ? colors.active : colors.title,
    textAlign: "left",
    padding: "10px 12px",
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

function checkButtonStyle(colors) {
  return {
    height: "36px",
    border: `1px solid ${colors.border}`,
    borderRadius: "10px",
    background: colors.panel,
    color: colors.active,
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 900,
    padding: "0 12px",
  };
}

function checkResultStyle(colors, tone) {
  const color = tone === "success" ? colors.success : colors.warning;

  return {
    marginTop: "10px",
    border: `1px solid ${color}33`,
    background: `${color}12`,
    color,
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: 800,
    lineHeight: 1.5,
  };
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
