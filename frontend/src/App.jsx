import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { clearAuthSession, getAuthToken, getSavedUser, saveAuthSession } from "./api/apiClient";
import { getCurrentUser, logoutAccount } from "./api/authApi";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const CoursePage = lazy(() => import("./pages/CoursePage"));
const NoteEditorPage = lazy(() => import("./pages/NoteEditorPage"));
const DDLPage = lazy(() => import("./pages/DDLPage"));

function App() {
  const [user, setUser] = useState(() => getSavedUser());
  const [authChecking, setAuthChecking] = useState(() => Boolean(getAuthToken()));

  useEffect(() => {
    let alive = true;

    async function syncCurrentUser() {
      const token = getAuthToken();

      if (!token) {
        setAuthChecking(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();

        if (!alive) return;

        const safeUser = normalizeUser(currentUser);
        setUser(safeUser);
        saveAuthSession({
          token,
          user: safeUser,
        });
      } catch {
        if (!alive) return;

        clearAuthSession();
        setUser(null);
      } finally {
        if (alive) setAuthChecking(false);
      }
    }

    syncCurrentUser();

    return () => {
      alive = false;
    };
  }, []);

  function handleLogin(sessionOrUser) {
    const nextUser = sessionOrUser?.user || sessionOrUser;
    const token = sessionOrUser?.token || getAuthToken();

    const safeUser = normalizeUser(nextUser);

    if (token) {
      saveAuthSession({
        token,
        user: safeUser,
      });
    }

    setUser(safeUser);
  }

  function handleLogout() {
    logoutAccount();
    setUser(null);
  }

  if (authChecking) {
    return <AppLoadingMessage text="正在恢复登录状态..." />;
  }

  return (
    <Suspense fallback={<AppLoadingMessage text="正在加载页面..." />}>
      <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute user={user}>
            <HomePage user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/course/:id"
        element={
          <ProtectedRoute user={user}>
            <CoursePage user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/course/:courseId/note/:noteId"
        element={
          <ProtectedRoute user={user}>
            <NoteEditorPage user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ddl"
        element={
          <ProtectedRoute user={user}>
            <DDLPage user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
      </Routes>
    </Suspense>
  );
}

function AppLoadingMessage({ text }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg,#F5F9FF 0%,#EEF6FF 100%)",
        color: "#64748B",
        fontFamily:
          `"Inter", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif`,
      }}
    >
      {text}
    </div>
  );
}

function normalizeUser(nextUser) {
  const name = nextUser?.name || "鲸记用户";

  return {
    id: nextUser?.id || `api-${Date.now()}`,
    name,
    account: nextUser?.account || nextUser?.email || "",
    email: nextUser?.email || "",
    studentId: nextUser?.studentId || "",
    role: nextUser?.role || "学生",
    avatar: nextUser?.avatar || name.slice(0, 1),
    loginAt: nextUser?.loginAt || new Date().toISOString(),
    authMode: nextUser?.authMode || "api",
  };
}

function ProtectedRoute({ user, children }) {
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const from = `${location.pathname}${location.search}`;
    return `/login?from=${encodeURIComponent(from)}`;
  }, [location.pathname, location.search]);

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

export default App;
