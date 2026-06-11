import { useEffect, useRef, useState } from "react";

function Header({
  searchText,
  setSearchText,
  darkMode,
  setDarkMode,
  upcomingDdls = [],
}) {
  const inputRef = useRef(null);

  const [showNotice, setShowNotice] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const validUpcomingDdls = upcomingDdls.filter((ddl) => {
    if (ddl.completed) return false;

    const ddlDate = new Date((ddl.date || "").replace(" ", "T"));
    const now = new Date();

    return !Number.isNaN(ddlDate.getTime()) && ddlDate >= now;
  });

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const hasShown = sessionStorage.getItem("notewhale_ddl_notice_shown");

    if (!hasShown && validUpcomingDdls.length > 0) {
      setShowNotice(true);

      sessionStorage.setItem("notewhale_ddl_notice_shown", "true");
    }
  }, [validUpcomingDdls.length]);

  const theme = darkMode
    ? {
        bg: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(148,163,184,0.08)",
        card: "rgba(30,41,59,0.85)",
        input: "rgba(30,41,59,0.78)",
        text: "#F8FAFC",
        subText: "#94A3B8",
        accent: "#818CF8",
        panel: "#1E293B",
        item: "#0F172A",
      }
    : {
        bg: "rgba(255,255,255,0.86)",
        border: "1px solid rgba(226,232,240,0.9)",
        card: "rgba(255,255,255,0.9)",
        input: "#FFFFFF",
        text: "#183B63",
        subText: "#64748B",
        accent: "#2563EB",
        panel: "#FFFFFF",
        item: "#F8FAFC",
      };

  return (
    <header
      style={{
        height: "74px",
        padding: "0 26px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: theme.border,
        background: theme.bg,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        position: "relative",
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "540px",
          height: "46px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderRadius: "16px",
          background: theme.input,
          border: theme.border,
          padding: "0 18px",
        }}
      >
        <span style={{ color: theme.subText }}>⌕</span>

        <input
          ref={inputRef}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索课程、笔记、文件..."
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: theme.text,
            fontSize: "14px",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={iconButtonStyle(theme)}
          title="切换日夜间模式"
        >
          {darkMode ? "☾" : "☼"}
        </button>

        <button
          onClick={() => setShowNotice(!showNotice)}
          style={{
            ...iconButtonStyle(theme),
            position: "relative",
          }}
          title="DDL提醒"
        >
          <BellIcon />

          {validUpcomingDdls.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "7px",
                right: "7px",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#EF4444",
              }}
            />
          )}
        </button>

        <div
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            height: "46px",
            padding: "0 14px 0 6px",
            borderRadius: "999px",
            background: theme.card,
            border: theme.border,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "linear-gradient(135deg,#6366F1,#4F46E5)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            W
          </div>

          <span style={{ color: theme.text, fontSize: "14px" }}>Whale</span>
          <span style={{ color: theme.subText, fontSize: "12px" }}>⌄</span>
        </div>
      </div>

      {showNotice && (
        <div
          style={{
            position: "absolute",
            top: "66px",
            right: "112px",
            width: "320px",
            background: theme.panel,
            border: theme.border,
            borderRadius: "18px",
            padding: "18px",
            boxShadow: darkMode
              ? "0 24px 48px rgba(0,0,0,0.38)"
              : "0 20px 40px rgba(15,42,74,0.14)",
            zIndex: 999,
          }}
        >
          <h3
            style={{
              margin: 0,
              color: theme.text,
              fontSize: "17px",
              fontWeight: 600,
            }}
          >
            近一周 DDL 提醒
          </h3>

          <p
            style={{
              margin: "6px 0 14px",
              color: theme.subText,
              fontSize: "13px",
            }}
          >
            共 {validUpcomingDdls.length} 项需要关注
          </p>

          {validUpcomingDdls.length === 0 ? (
            <div style={{ color: theme.subText, fontSize: "14px" }}>
              近一周暂无 DDL。
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {validUpcomingDdls.map((ddl) => (
                <div
                  key={ddl.id}
                  style={{
                    padding: "12px",
                    borderRadius: "14px",
                    background: theme.item,
                    border: theme.border,
                  }}
                >
                  <div
                    style={{
                      color: theme.text,
                      fontSize: "14px",
                      fontWeight: 600,
                      marginBottom: "6px",
                    }}
                  >
                    {ddl.title}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      color: theme.subText,
                      fontSize: "12px",
                    }}
                  >
                    <span>{ddl.date}</span>
                    <span style={{ color: theme.accent }}>
                      {ddl.courseName || "未归属课程"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showUserMenu && (
        <div
          style={{
            position: "absolute",
            top: "66px",
            right: "26px",
            width: "170px",
            background: theme.panel,
            border: theme.border,
            borderRadius: "16px",
            padding: "10px",
            boxShadow: darkMode
              ? "0 18px 36px rgba(0,0,0,0.28)"
              : "0 18px 36px rgba(15,42,74,0.12)",
            zIndex: 999,
          }}
        >
          {["个人资料", "账号设置", "退出登录"].map((item) => (
            <div
              key={item}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                cursor: "pointer",
                color: item === "退出登录" ? "#DC2626" : theme.text,
                fontSize: "14px",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

function iconButtonStyle(theme) {
  return {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    border: "none",
    background: "transparent",
    color: theme.subText,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  };
}

function BellIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default Header;