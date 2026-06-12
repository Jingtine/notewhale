function DDLPanel({
  ddls = [],
  darkMode = false,
  onAddDDL,
  onViewAllDDL,
}) {
  const theme = darkMode
    ? {
        bg: "rgba(30,41,59,0.88)",
        border: "rgba(148,163,184,0.18)",
        title: "#F8FAFC",
        text: "#CBD5E1",
        muted: "#94A3B8",
        soft: "rgba(148,163,184,0.12)",
        button: "linear-gradient(135deg,#6366F1,#4F46E5)",
        remainBg: "rgba(245,158,11,0.14)",
        remainText: "#FBBF24",
        dangerBg: "rgba(239,68,68,0.14)",
        dangerText: "#F87171",
        successBg: "rgba(16,185,129,0.14)",
        successText: "#34D399",
      }
    : {
        bg: "rgba(255,255,255,0.76)",
        border: "rgba(226,232,240,0.88)",
        title: "#183B63",
        text: "#64748B",
        muted: "#94A3B8",
        soft: "#F8FAFC",
        button: "linear-gradient(135deg,#4C8DFF,#2563EB)",
        remainBg: "#FFF7ED",
        remainText: "#F59E0B",
        dangerBg: "#FEF2F2",
        dangerText: "#EF4444",
        successBg: "#ECFDF5",
        successText: "#10B981",
      };

  const previewDDLs = ddls.slice(0, 5);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {/* 顶部 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: theme.title,
              fontSize: "24px",
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            DDL
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              color: theme.text,
              fontSize: "13px",
            }}
          >
            共 {ddls.length} 项待完成
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            onClick={onViewAllDDL}
            title="进入 DDL 管理"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              border: darkMode
                ? "1px solid rgba(148,163,184,0.18)"
                : "1px solid rgba(226,232,240,0.9)",
              background: darkMode
                ? "rgba(30,41,59,0.88)"
                : "rgba(255,255,255,0.86)",
              color: darkMode ? "#CBD5E1" : "#64748B",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              lineHeight: 1,
              fontFamily: "inherit",
              boxShadow: darkMode
                ? "0 10px 24px rgba(0,0,0,0.18)"
                : "0 8px 20px rgba(15,42,74,0.05)",
            }}
          >
            ⋯
          </button>

          <button
            onClick={onAddDDL}
            style={{
              border: "none",
              borderRadius: "14px",
              padding: "10px 16px",
              background: theme.button,
              color: "white",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
              fontFamily: "inherit",
            }}
          >
            ＋ 新建日程
          </button>
        </div>
      </div>

      {/* DDL 卡片 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {previewDDLs.map((ddl) => {
          const remain = getDDLRemainInfo(ddl.date, theme);

          return (
            <div
              key={ddl.id}
              style={{
                background: theme.bg,
                border: `1px solid ${theme.border}`,
                borderRadius: "14px",
                padding: "14px 16px",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              {/* 上面 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginBottom: "10px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      fontWeight: 600,
                      color: theme.title,
                      lineHeight: 1.4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ddl.title}
                  </h3>

                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "12px",
                      color: theme.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ddl.courseName || "未归属课程"}
                  </p>
                </div>

                <span
                  style={{
                    flexShrink: 0,
                    borderRadius: "999px",
                    padding: "5px 9px",
                    background: remain.bg,
                    color: remain.color,
                    fontSize: "12px",
                    fontWeight: 700,
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {remain.text}
                </span>
              </div>

              {/* 时间 */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: theme.soft,
                  borderRadius: "999px",
                  padding: "5px 10px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: theme.text,
                  }}
                >
                  ⏱
                </span>

                <span
                  style={{
                    fontSize: "12px",
                    color: theme.text,
                    fontWeight: 500,
                  }}
                >
                  {ddl.date}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 查看全部 */}
      {ddls.length > 4 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "6px",
          }}
        >
          <button
            onClick={onViewAllDDL}
            style={{
              border: "none",
              background: "transparent",
              color: theme.text,
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "inherit",
            }}
          >
            查看全部（{ddls.length}） →
          </button>
        </div>
      )}
    </div>
  );
}

function parseDDLDate(dateText) {
  if (!dateText) return null;

  const normalized = String(dateText).replace(" ", "T");
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getDDLRemainInfo(dateText, theme) {
  const ddlDate = parseDDLDate(dateText);

  if (!ddlDate) {
    return {
      text: "未设时间",
      bg: theme.soft,
      color: theme.muted,
    };
  }

  const now = new Date();
  const diff = ddlDate.getTime() - now.getTime();
  const absDays = Math.ceil(Math.abs(diff) / (1000 * 60 * 60 * 24));
  const remainDays = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return {
      text: `逾期 ${absDays} 天`,
      bg: theme.dangerBg,
      color: theme.dangerText,
    };
  }

  if (remainDays <= 0) {
    return {
      text: "今天截止",
      bg: theme.remainBg,
      color: theme.remainText,
    };
  }

  if (remainDays <= 7) {
    return {
      text: `剩余 ${remainDays} 天`,
      bg: theme.remainBg,
      color: theme.remainText,
    };
  }

  return {
    text: `剩余 ${remainDays} 天`,
    bg: theme.successBg,
    color: theme.successText,
  };
}

export default DDLPanel;
