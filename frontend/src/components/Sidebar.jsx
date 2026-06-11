import logo from "../assets/logo_main.png";

function Sidebar({
  folders,
  selectedFolder,
  setSelectedFolder,
  setShowFolderModal,
  setShowCourseModal,
  darkMode = false,
}) {
  const menuItems = [
    { key: "全部", label: "首页", icon: "⌂" },
    { key: "全部课程", label: "全部课程", icon: "▤" },
    { key: "最近使用", label: "最近使用", icon: "◷" },
    { key: "收藏夹", label: "收藏夹", icon: "☆" },
    { key: "回收站", label: "回收站", icon: "trash" },
  ];

  const colors = {
    bg: darkMode ? "#0F172A" : "rgba(255,255,255,0.92)",
    border: darkMode ? "rgba(148,163,184,0.14)" : "#E5EAF3",
    text: darkMode ? "#F1F5F9" : "#0F2A4A",
    subText: darkMode ? "#94A3B8" : "#64748B",
    icon: darkMode ? "#94A3B8" : "#94A3B8",
    activeBg: darkMode ? "rgba(99,102,241,0.16)" : "rgba(59,130,246,0.08)",
    activeText: darkMode ? "#C7D2FE" : "#2563EB",
    button: darkMode
      ? "linear-gradient(135deg,#6366F1,#4F46E5)"
      : "linear-gradient(135deg,#4C8DFF,#2563EB)",
    buttonShadow: darkMode
      ? "0 12px 26px rgba(79,70,229,0.22)"
      : "0 12px 28px rgba(37,99,235,0.20)",
  };

  function renderIcon(item, active) {
    const color = active ? colors.activeText : colors.icon;

    if (item.icon === "trash") {
      return (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M6 7l1 14h10l1-14" />
          <path d="M9 7V4h6v3" />
        </svg>
      );
    }

    return item.icon;
  }

  return (
    <aside
      style={{
        width: "236px",
        height: "100vh",
        background: colors.bg,
        borderRight: `1px solid ${colors.border}`,
        padding: "22px 18px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "22px",
        }}
      >
        <img
          src={logo}
          alt="logo"
          style={{
            width: "42px",
            height: "42px",
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <div>
          <h2
            style={{
              margin: 0,
              color: colors.text,
              fontSize: "20px",
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            鲸记
          </h2>

          <p
            style={{
              margin: "3px 0 0",
              color: colors.subText,
              fontSize: "12px",
            }}
          >
            NoteWhale
          </p>
        </div>
      </div>

      <button
        onClick={() => setShowCourseModal(true)}
        style={{
          border: "none",
          height: "44px",
          borderRadius: "12px",
          background: colors.button,
          color: "white",
          fontSize: "14px",
          fontWeight: 500,
          cursor: "pointer",
          boxShadow: colors.buttonShadow,
          marginBottom: "22px",
          fontFamily: "inherit",
        }}
      >
        ＋ 新建课程
      </button>

      <div>
        {menuItems.map((item) => {
          const active = selectedFolder === item.key;

          return (
            <div
              key={item.key}
              onClick={() => setSelectedFolder(item.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                height: "42px",
                padding: "0 14px",
                borderRadius: "12px",
                cursor: "pointer",
                marginBottom: "6px",
                background: active ? colors.activeBg : "transparent",
                transition: ".2s",
              }}
            >
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: active ? colors.activeText : colors.icon,
                  fontSize: "15px",
                  flexShrink: 0,
                }}
              >
                {renderIcon(item, active)}
              </span>

              <span
                style={{
                  fontSize: "14px",
                  color: active ? colors.activeText : colors.subText,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "18px",
          borderTop: `1px solid ${colors.border}`,
          paddingTop: "18px",
          minHeight: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              color: colors.subText,
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            我的文件夹
          </span>

          <button
            onClick={() => setShowFolderModal(true)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: colors.subText,
              fontSize: "18px",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            ＋
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            flex: 1,
            paddingRight: "4px",
          }}
        >
          {folders.map((folder) => {
            const active = selectedFolder === folder.title;

            return (
              <div
                key={folder.id}
                onClick={() => setSelectedFolder(folder.title)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: "40px",
                  padding: "0 12px",
                  borderRadius: "12px",
                  marginBottom: "6px",
                  cursor: "pointer",
                  background: active ? colors.activeBg : "transparent",
                  transition: ".2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      color: active ? colors.activeText : colors.icon,
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  >
                    ▭
                  </span>

                  <span
                    style={{
                      fontSize: "14px",
                      color: active ? colors.activeText : colors.subText,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {folder.title}
                  </span>
                </div>

                <span
                  style={{
                    color: colors.icon,
                    fontSize: "12px",
                    flexShrink: 0,
                  }}
                >
                  {folder.courses.length}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          paddingTop: "14px",
          marginTop: "12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: colors.subText,
          fontSize: "14px",
        }}
      >
        <span>⚙</span>
        <span>设置</span>
      </div>
    </aside>
  );
}

export default Sidebar;