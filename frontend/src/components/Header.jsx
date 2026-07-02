import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function Header({
  searchText,
  setSearchText,
  darkMode,
  setDarkMode,
  upcomingDdls = [],
  user = null,
  onLogout,
  onOpenDataStatus,
  searchItems = [],
}) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const searchBoxRef = useRef(null);

  const [showNotice, setShowNotice] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  const displayName = user?.name || "鲸记用户";
  const role = user?.role || "学生";
  const account = user?.account || user?.email || "本地体验账号";
  const avatarText = (user?.avatar || displayName || "鲸").slice(0, 1).toUpperCase();

  const validUpcomingDdls = upcomingDdls.filter((ddl) => {
    if (ddl.completed) return false;

    const ddlDate = new Date((ddl.date || "").replace(" ", "T"));
    const now = new Date();

    return !Number.isNaN(ddlDate.getTime()) && ddlDate >= now;
  });

  const keyword = (searchText || "").trim().toLowerCase();

  const filteredSearchItems = useMemo(() => {
    if (!keyword) return [];

    return searchItems
      .filter((item) => {
        const text = [item.title, item.subtitle, item.content, item.typeLabel]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(keyword);
      })
      .slice(0, 9);
  }, [keyword, searchItems]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setShowSearchPanel(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handlePointerDown(e) {
      if (!searchBoxRef.current?.contains(e.target)) {
        setShowSearchPanel(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const hasShown = sessionStorage.getItem("notewhale_ddl_notice_shown");

    if (!hasShown && validUpcomingDdls.length > 0) {
      sessionStorage.setItem("notewhale_ddl_notice_shown", "true");
      const noticeTimer = window.setTimeout(() => setShowNotice(true), 0);
      return () => window.clearTimeout(noticeTimer);
    }
  }, [validUpcomingDdls.length]);

  const theme = darkMode
    ? {
        bg: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(148,163,184,0.08)",
        strongBorder: "1px solid rgba(148,163,184,0.18)",
        card: "rgba(30,41,59,0.85)",
        input: "rgba(30,41,59,0.78)",
        text: "#F8FAFC",
        subText: "#94A3B8",
        accent: "#818CF8",
        panel: "#1E293B",
        item: "#0F172A",
        soft: "rgba(148,163,184,0.12)",
        dangerSoft: "rgba(239,68,68,0.12)",
      }
    : {
        bg: "rgba(255,255,255,0.86)",
        border: "1px solid rgba(226,232,240,0.9)",
        strongBorder: "1px solid #E2E8F0",
        card: "rgba(255,255,255,0.9)",
        input: "#FFFFFF",
        text: "#183B63",
        subText: "#64748B",
        accent: "#2563EB",
        panel: "#FFFFFF",
        item: "#F8FAFC",
        soft: "#F1F6FF",
        dangerSoft: "#FEF2F2",
      };

  function handleLogoutClick() {
    setShowUserMenu(false);
    onLogout?.();
  }

  function handleOpenDataStatus() {
    setShowUserMenu(false);
    onOpenDataStatus?.();
  }

  function openSearchResult(item) {
    if (!item?.path) return;

    setShowSearchPanel(false);
    setSearchText?.("");
    navigate(item.path);
  }

  function handleSearchKeyDown(e) {
    if (e.key === "Escape") {
      setShowSearchPanel(false);
      inputRef.current?.blur();
    }

    if (e.key === "Enter" && filteredSearchItems.length > 0) {
      e.preventDefault();
      openSearchResult(filteredSearchItems[0]);
    }
  }

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
      <div ref={searchBoxRef} style={{ position: "relative", zIndex: 1000 }}>
        <div
          style={{
            width: "min(540px, 46vw)",
            height: "46px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderRadius: "14px",
            background: theme.input,
            border: theme.border,
            padding: "0 18px",
          }}
        >
          <span style={{ color: theme.subText }}>⌕</span>

          <input
            ref={inputRef}
            value={searchText}
            onFocus={() => setShowSearchPanel(true)}
            onKeyDown={handleSearchKeyDown}
            onChange={(e) => {
              setSearchText(e.target.value);
              setShowSearchPanel(true);
            }}
            placeholder="搜索课程、笔记、文件、DDL..."
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

          <span
            style={{
              color: theme.subText,
              fontSize: "12px",
              background: theme.soft,
              borderRadius: "8px",
              padding: "4px 7px",
            }}
          >
            Ctrl K
          </span>
        </div>

        {showSearchPanel && (
          <SearchDropdown
            theme={theme}
            darkMode={darkMode}
            keyword={keyword}
            items={filteredSearchItems}
            onOpen={openSearchResult}
          />
        )}
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
              background: "linear-gradient(135deg,#6366F1,#2563EB)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            {avatarText}
          </div>

          <span style={{ color: theme.text, fontSize: "14px", fontWeight: 700 }}>
            {displayName}
          </span>
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
            border: theme.strongBorder,
            borderRadius: "16px",
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
              fontWeight: 700,
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
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {validUpcomingDdls.map((ddl) => (
                <div
                  key={ddl.id}
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    background: theme.item,
                    border: theme.border,
                  }}
                >
                  <div
                    style={{
                      color: theme.text,
                      fontSize: "14px",
                      fontWeight: 700,
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
            width: "260px",
            background: theme.panel,
            border: theme.strongBorder,
            borderRadius: "16px",
            padding: "12px",
            boxShadow: darkMode
              ? "0 18px 36px rgba(0,0,0,0.28)"
              : "0 18px 36px rgba(15,42,74,0.12)",
            zIndex: 999,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              padding: "8px 8px 14px",
              borderBottom: theme.strongBorder,
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "linear-gradient(135deg,#6366F1,#2563EB)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
              }}
            >
              {avatarText}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: theme.text,
                  fontSize: "15px",
                  fontWeight: 800,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  color: theme.subText,
                  fontSize: "12px",
                  marginTop: "4px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {role} · {account}
              </div>
            </div>
          </div>

          <MenuItem theme={theme} onClick={handleOpenDataStatus}>
            数据状态
          </MenuItem>
          <MenuItem theme={theme} onClick={handleOpenDataStatus}>
            同步与存储
          </MenuItem>
          <MenuItem theme={theme} muted>
            账号设置 · 后续接入
          </MenuItem>

          <button
            onClick={handleLogoutClick}
            style={{
              width: "100%",
              marginTop: "8px",
              border: "none",
              borderRadius: "10px",
              padding: "11px 12px",
              background: theme.dangerSoft,
              color: "#DC2626",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            退出登录
          </button>
        </div>
      )}
    </header>
  );
}

function SearchDropdown({ theme, darkMode, keyword, items, onOpen }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "56px",
        left: 0,
        width: "min(620px, 58vw)",
        background: theme.panel,
        border: theme.strongBorder,
        borderRadius: "16px",
        padding: "12px",
        boxShadow: darkMode
          ? "0 24px 50px rgba(0,0,0,0.38)"
          : "0 20px 46px rgba(15,42,74,0.14)",
      }}
    >
      <div
        style={{
          color: theme.subText,
          fontSize: "12px",
          padding: "4px 6px 10px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <span>全局搜索</span>
        <span>{keyword ? `${items.length} 条结果` : "课程 / 笔记 / 文件 / DDL"}</span>
      </div>

      {!keyword && (
        <div
          style={{
            padding: "18px 14px",
            borderRadius: "12px",
            background: theme.item,
            color: theme.subText,
            fontSize: "14px",
            lineHeight: 1.7,
            border: theme.border,
          }}
        >
          输入关键词后，可同时搜索课程、笔记正文、资料文件名和 DDL。按 Enter 可打开第一条结果。
        </div>
      )}

      {keyword && items.length === 0 && (
        <div
          style={{
            padding: "18px 14px",
            borderRadius: "12px",
            background: theme.item,
            color: theme.subText,
            fontSize: "14px",
            border: theme.border,
          }}
        >
          没有找到相关内容。
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: "grid", gap: "8px", maxHeight: "430px", overflowY: "auto" }}>
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => onOpen(item)}
              style={{
                width: "100%",
                border: "none",
                background: theme.item,
                borderRadius: "12px",
                padding: "12px",
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "64px minmax(0, 1fr) auto",
                alignItems: "center",
                gap: "12px",
                textAlign: "left",
                fontFamily: "inherit",
                color: theme.text,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "54px",
                  height: "28px",
                  borderRadius: "999px",
                  background: theme.soft,
                  color: theme.accent,
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                {item.typeLabel}
              </span>

              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    color: theme.text,
                    fontSize: "14px",
                    fontWeight: 800,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.title}
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color: theme.subText,
                    fontSize: "12px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.subtitle || item.content || "打开查看详情"}
                </span>
              </span>

              <span style={{ color: theme.subText, fontSize: "13px" }}>↵</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ theme, children, onClick, muted = false }) {
  return (
    <button
      onClick={onClick}
      disabled={muted}
      style={{
        width: "100%",
        border: "none",
        background: "transparent",
        color: muted ? theme.subText : theme.text,
        borderRadius: "10px",
        padding: "10px 12px",
        cursor: muted ? "default" : "pointer",
        fontSize: "14px",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
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
