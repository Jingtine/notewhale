import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import CoursePage from "./pages/CoursePage";
import DDLPage from "./pages/DDLPage";

function App() {
  const user = true;

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/"
        element={
          user ? (
            <HomePage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/course/:id"
        element={
          user ? (
            <CoursePage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/ddl"
        element={
          user ? (
            <DDLPage />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

export default App;