import logo from "../assets/logo_main.png";
import { useLocation, useNavigate } from "react-router-dom";

function Sidebar({
  folders,
  selectedFolder,
  setSelectedFolder,
  setShowFolderModal,
  setShowCourseModal,
  darkMode = false,
  onOpenSettings,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = [
    { key: "全部", label: "首页", icon: "home" },
    { key: "全部课程", label: "全部课程", icon: "grid" },
    { key: "最近使用", label: "最近使用", icon: "clock" },
    { key: "收藏夹", label: "收藏夹", icon: "star" },
    { key: "学习日程", label: "学习日程", icon: "calendar", path: "/schedule" },
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
        button: "linear-gradient(135deg,#4C8DFF,#2563EB)",
        buttonShadow: "0 10px 22px rgba(37,99,235,0.18)",
      };

  function openSettingsPanel() {
    if (typeof onOpenSettings === "function") {
      onOpenSettings();
    }
  }

  function selectFolder(key) {
    if (location.pathname !== "/") {
      navigate("/");
    }
    setSelectedFolder(key);
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
            NoteWhale
          </h2>

          <p
            style={{
              margin: "2px 0 0",
              color: colors.subText,
              fontSize: "13px",
              letterSpacing: "0",
            }}
          >
            学习工作台
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
        新建课程
      </button>

      <div>
        {menuItems.map((item) => {
          const active = item.path
            ? location.pathname === item.path
            : selectedFolder === item.key;

          return (
            <button
              type="button"
              key={item.key}
              onClick={() => {
                if (item.path) {
                  navigate(item.path);
                  return;
                }
                selectFolder(item.key);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                height: "40px",
                padding: "0 12px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                marginBottom: "6px",
                background: active ? colors.activeBg : "transparent",
                color: active ? colors.activeText : colors.subText,
                transition: "0.2s",
                width: "100%",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <SidebarIcon name={item.icon} active={active} colors={colors} />

              <span
                style={{
                  fontSize: "14px",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0",
                }}
              >
                {item.label}
              </span>
            </button>
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
            aria-label="新建文件夹"
          >
            +
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
                  <SidebarIcon name="folder" active={active} colors={colors} />

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
                  {(folder.courses || []).length}
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
        <SidebarIcon name="settings" active={false} colors={colors} />
        <span>设置</span>
      </button>
    </aside>
  );
}

function SidebarIcon({ name, active, colors }) {
  const stroke = active ? colors.activeText : colors.icon;

  if (name === "calendar") return <CalendarIcon stroke={stroke} />;
  if (name === "trash") return <TrashIcon stroke={stroke} />;
  if (name === "settings") return <SettingsIcon stroke={stroke} />;
  if (name === "folder") return <FolderIcon stroke={stroke} />;
  if (name === "star") return <StarIcon stroke={stroke} />;
  if (name === "clock") return <ClockIcon stroke={stroke} />;
  if (name === "grid") return <GridIcon stroke={stroke} />;
  return <HomeIcon stroke={stroke} />;
}

function IconShell({ stroke, children }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function HomeIcon({ stroke }) {
  return (
    <IconShell stroke={stroke}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6.5 10.5V20h11V10.5" />
    </IconShell>
  );
}

function GridIcon({ stroke }) {
  return (
    <IconShell stroke={stroke}>
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" />
      <path d="M4 14h6v6H4z" />
      <path d="M14 14h6v6h-6z" />
    </IconShell>
  );
}

function ClockIcon({ stroke }) {
  return (
    <IconShell stroke={stroke}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </IconShell>
  );
}

function StarIcon({ stroke }) {
  return (
    <IconShell stroke={stroke}>
      <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
    </IconShell>
  );
}

function FolderIcon({ stroke }) {
  return (
    <IconShell stroke={stroke}>
      <path d="M4 7h6l2 2h8v9.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z" />
    </IconShell>
  );
}

function TrashIcon({ stroke }) {
  return (
    <IconShell stroke={stroke}>
      <path d="M3 6h18" />
      <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </IconShell>
  );
}

function CalendarIcon({ stroke }) {
  return (
    <IconShell stroke={stroke}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3.5 9h17" />
      <path d="M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2" />
    </IconShell>
  );
}

function SettingsIcon({ stroke }) {
  return (
    <IconShell stroke={stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1" />
    </IconShell>
  );
}

export default Sidebar;
