import logo from "../assets/logo_main.png";

function Sidebar({
  folders,
  selectedFolder,
  setSelectedFolder,
  setShowFolderModal,
  setShowCourseModal,
  darkMode = false,
  onOpenSettings,
}) {
  const menuItems = [
    { key: "全部", label: "首页", icon: "⌂" },
    { key: "全部课程", label: "全部课程", icon: "▤" },
    { key: "最近使用", label: "最近使用", icon: "◷" },
    { key: "收藏夹", label: "收藏夹", icon: "☆" },
    { key: "回收站", label: "回收站", icon: "trash" },
  ];

  const colors = darkMode
    ? {
        bg: "rgba(15,23,42,0.88)",
        border: "rgba(148,163,184,0.16)",
        text: "#F8FAFC",
        subText: "#94A3B8",
        activeBg: "rgba(129,140,248,0.16)",
        activeText: "#A5B4FC",
        icon: "#94A3B8",
        soft: "rgba(148,163,184,0.08)",
        button: "linear-gradient(135deg,#6366F1,#4F46E5)",
        buttonShadow: "0 10px 22px rgba(79,70,229,0.22)",
      }
    : {
        bg: "rgba(255,255,255,0.92)",
        border: "#E5EAF3",
        text: "#0F2A4A",
        subText: "#64748B",
        activeBg: "rgba(59,130,246,0.09)",
        activeText: "#2563EB",
        icon: "#94A3B8",
        soft: "#F8FAFC",
        button: "linear-gradient(135deg,#4C8DFF,#2563EB)",
        buttonShadow: "0 10px 22px rgba(37,99,235,0.18)",
      };

  function openSettingsPanel() {
    if (typeof onOpenSettings === "function") {
      onOpenSettings();
    }
  }

  return (
    <aside
      style={{
        width: "230px",
        height: "100vh",
        background: colors.bg,
        borderRight: `1px solid ${colors.border}`,
        padding: "22px 18px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
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
          }}
        />

        <div>
          <h2
            style={{
              margin: 0,
              color: colors.text,
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "0",
              lineHeight: 1.2,
            }}
          >
            鲸记
          </h2>

          <p
            style={{
              margin: "2px 0 0",
              color: colors.subText,
              fontSize: "13px",
              letterSpacing: "0",
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
          fontSize: "15px",
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
                height: "40px",
                padding: "0 12px",
                borderRadius: "10px",
                cursor: "pointer",
                marginBottom: "6px",
                background: active ? colors.activeBg : "transparent",
                color: active ? colors.activeText : colors.subText,
                transition: "0.2s",
              }}
            >
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  fontSize: "17px",
                  lineHeight: 1,
                  color: active ? colors.activeText : colors.icon,
                }}
              >
                {item.icon === "trash" ? <TrashIcon /> : item.icon}
              </span>

              <span
                style={{
                  fontSize: "14px",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0",
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
          marginTop: "20px",
          borderTop: `1px solid ${colors.border}`,
          paddingTop: "16px",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <span
            style={{
              color: colors.subText,
              fontSize: "14px",
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
              fontSize: "20px",
              color: colors.subText,
              padding: 0,
            }}
          >
            ＋
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            paddingRight: "4px",
            flex: 1,
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
                  height: "38px",
                  padding: "0 10px",
                  borderRadius: "10px",
                  marginBottom: "6px",
                  cursor: "pointer",
                  background: active ? colors.activeBg : "transparent",
                  color: active ? colors.activeText : colors.subText,
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
                      fontSize: "16px",
                    }}
                  >
                    ▭
                  </span>

                  <span
                    style={{
                      fontSize: "14px",
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
                    color: active ? colors.activeText : colors.icon,
                    fontSize: "12px",
                    marginLeft: "8px",
                  }}
                >
                  {folder.courses.length}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={openSettingsPanel}
        style={{
          width: "100%",
          border: "none",
          borderTop: `1px solid ${colors.border}`,
          padding: "14px 12px 0",
          marginTop: "14px",
          background: "transparent",
          cursor: "pointer",
          color: colors.subText,
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <span>⚙</span>
        <span>设置</span>
      </button>
    </aside>
  );
}


function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default Sidebar;
