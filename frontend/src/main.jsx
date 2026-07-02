import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { BrowserRouter, HashRouter } from "react-router-dom";

import "./index.css";
import App from "./App.jsx";

const isDesktopShell = window.location.protocol === "file:" || window.notewhaleDesktop;
const app = isDesktopShell ? (
  <HashRouter>
    <App />
  </HashRouter>
) : (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    {app}
  </StrictMode>
);
