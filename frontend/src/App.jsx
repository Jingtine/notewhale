import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import CoursePage from "./pages/CoursePage";
import NoteEditorPage from "./pages/NoteEditorPage";
import DDLPage from "./pages/DDLPage";

const USER_STORAGE_KEY = "notewhale_user";

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  function handleLogin(nextUser) {
    const safeUser = {
      id: nextUser?.id || `local-${Date.now()}`,
      name: nextUser?.name || "鲸记用户",
      account: nextUser?.account || nextUser?.email || "",
      role: nextUser?.role || "学生",
      avatar: nextUser?.avatar || (nextUser?.name || "鲸").slice(0, 1),
      loginAt: nextUser?.loginAt || new Date().toISOString(),
      authMode: nextUser?.authMode || "local-demo",
    };

    setUser(safeUser);
  }

  function handleLogout() {
    setUser(null);
  }

  return (
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
  );
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
