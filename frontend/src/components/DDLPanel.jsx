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
      soft: "rgba(148,163,184,0.12)",
      button: "linear-gradient(135deg,#6366F1,#4F46E5)",
    }
    : {
        bg:
          "rgba(255,255,255,0.76)",

        border:
          "rgba(226,232,240,0.88)",

        title: "#183B63",

        text: "#64748B",

        soft: "#F8FAFC",

        button:
          "linear-gradient(135deg,#4C8DFF,#2563EB)",
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
          justifyContent:
            "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color:
                theme.title,
              fontSize: "24px",
              fontWeight: 600,
              letterSpacing:
                "-0.03em",
            }}
          >
            DDL
          </h2>

          <p
            style={{
              margin:
                "6px 0 0",
              color:
                theme.text,
              fontSize:
                "13px",
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
            ＋ 新建
          </button>
        </div>
      </div>

      {/* DDL 卡片 */}
      <div
        style={{
          display: "flex",
          flexDirection:
            "column",
          gap: "12px",
        }}
      >
        {previewDDLs.map(
          (ddl) => (
            <div
              key={ddl.id}
              style={{
                background:
                  theme.bg,

                border: `1px solid ${theme.border}`,

                borderRadius: "14px",
                padding: "14px 16px",

                backdropFilter:
                  "blur(20px)",

                WebkitBackdropFilter:
                  "blur(20px)",
              }}
            >
              {/* 上面 */}
              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "flex-start",

                  marginBottom:
                    "10px",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize:
                        "15px",
                      fontWeight:
                        600,
                      color:
                        theme.title,
                      lineHeight: 1.4,
                    }}
                  >
                    {
                      ddl.title
                    }
                  </h3>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                      fontSize:
                        "12px",
                      color:
                        theme.text,
                    }}
                  >
                    {
                      ddl.courseName
                    }
                  </p>
                </div>

                {/* 圆点 */}
                <div
                  style={{
                    width: "10px",
                    height:
                      "10px",
                    borderRadius:
                      "50%",
                    background:
                      darkMode
                        ? "#7B74A3"
                        : "#3B82F6",
                    flexShrink: 0,
                    marginTop:
                      "4px",
                  }}
                />
              </div>

              {/* 时间 */}
              <div
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: "8px",

                  background:
                    theme.soft,

                  borderRadius:
                    "999px",

                  padding:
                    "5px 10px",
                }}
              >
                <span
                  style={{
                    fontSize:
                      "12px",
                    color:
                      theme.text,
                  }}
                >
                  ⏱
                </span>

                <span
                  style={{
                    fontSize:
                      "12px",
                    color:
                      theme.text,
                    fontWeight:
                      500,
                  }}
                >
                  {ddl.date}
                </span>
              </div>
            </div>
          )
        )}
      </div>

      {/* 查看全部 */}
      {ddls.length > 4 && (
        <div
          style={{
            display: "flex",
            justifyContent:
              "center",
            marginTop: "6px",
          }}
        >
          <button
            onClick={
              onViewAllDDL
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
                "14px",
              fontWeight:
                500,
              fontFamily:
                "inherit",
            }}
          >
            查看全部（
            {ddls.length}
            ） →
          </button>
        </div>
      )}
    </div>
  );
}

export default DDLPanel;