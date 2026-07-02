const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

let mainWindow = null;
let backendProcess = null;
let startupScreenVisible = false;
let backendStatus = {
  state: "starting",
  managed: false,
  url: "http://127.0.0.1:8000",
  message: "正在准备本地后端服务...",
};

const BACKEND_HOST = "127.0.0.1";
const BACKEND_PORT = 8000;
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
const HEALTH_URL = `${BACKEND_URL}/health`;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1060,
    minHeight: 720,
    title: "NoteWhale",
    backgroundColor: "#F5F9FF",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function updateBackendStatus(nextStatus) {
  backendStatus = nextStatus;

  if (startupScreenVisible) {
    loadStartupScreen();
  }
}

function loadStartupScreen() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  startupScreenVisible = true;
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NoteWhale</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f5f9ff;
        color: #173b63;
        font-family: "Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif;
      }
      .shell {
        width: min(520px, calc(100vw - 56px));
        padding: 32px;
        border: 1px solid #dbe7f5;
        border-radius: 24px;
        background: rgba(255,255,255,0.92);
        box-shadow: 0 24px 64px rgba(15,42,74,0.14);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 26px;
      }
      .mark {
        width: 48px;
        height: 48px;
        border-radius: 15px;
        display: grid;
        place-items: center;
        color: #ffffff;
        background: #2563eb;
        font-size: 22px;
        font-weight: 900;
      }
      .name {
        margin: 0;
        font-size: 22px;
        font-weight: 900;
      }
      .sub {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 13px;
      }
      .status {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: 15px;
        border: 1px solid #e2eaf5;
        border-radius: 16px;
        background: #f8fbff;
      }
      .spinner {
        width: 18px;
        height: 18px;
        margin-top: 2px;
        border: 3px solid #bfdbfe;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
        flex-shrink: 0;
      }
      .state {
        margin: 0;
        color: #173b63;
        font-size: 15px;
        font-weight: 900;
      }
      .message {
        margin: 5px 0 0;
        color: #64748b;
        font-size: 13px;
        line-height: 1.7;
      }
      .foot {
        margin: 18px 0 0;
        color: #94a3b8;
        font-size: 12px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="brand">
        <div class="mark">鲸</div>
        <div>
          <h1 class="name">NoteWhale 桌面版</h1>
          <p class="sub">正在准备你的学习工作区</p>
        </div>
      </section>
      <section class="status">
        <div class="spinner" aria-hidden="true"></div>
        <div>
          <p class="state">${escapeHtml(statusTitle(backendStatus.state))}</p>
          <p class="message">${escapeHtml(backendStatus.message)}</p>
        </div>
      </section>
      <p class="foot">账号、课程、DDL、资料和课表导入会使用本地后端服务。</p>
    </main>
  </body>
</html>`;

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(() => {});
}

function statusTitle(state) {
  const titles = {
    ready: "本地服务已就绪",
    starting: "正在启动本地服务",
    stopping: "正在关闭本地服务",
    timeout: "本地服务启动超时",
    missing: "本地运行环境缺失",
    stopped: "本地服务已停止",
  };

  return titles[state] || "正在准备本地服务";
}

function loadApplication() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  startupScreenVisible = false;
  const devServerUrl = process.env.NOTEWHALE_DEV_SERVER_URL;

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function normalizeUrl(url) {
  return String(url || "").trim();
}

function checkBackendHealth(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const request = http.get(HEALTH_URL, { timeout: timeoutMs }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

async function waitForBackendReady(timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await checkBackendHealth(800)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return false;
}

async function startLocalBackend() {
  if (await checkBackendHealth()) {
    updateBackendStatus({
      state: "ready",
      managed: false,
      url: BACKEND_URL,
      message: "已连接正在运行的本地后端。",
    });
    return;
  }

  const backendDir = path.join(__dirname, "..", "..", "backend");
  const pythonPath = path.join(backendDir, ".venv", "Scripts", "python.exe");

  if (!fs.existsSync(pythonPath)) {
    updateBackendStatus({
      state: "missing",
      managed: false,
      url: BACKEND_URL,
      message: "未找到后端 Python 环境，请先在 backend 目录初始化 .venv。",
    });
    return;
  }

  updateBackendStatus({
    state: "starting",
    managed: true,
    url: BACKEND_URL,
    message: "正在启动本地后端服务...",
  });

  backendProcess = spawn(
    pythonPath,
    ["-m", "uvicorn", "main:app", "--host", BACKEND_HOST, "--port", String(BACKEND_PORT)],
    {
      cwd: backendDir,
      env: {
        ...process.env,
        DATABASE_URL: "",
        NOTEWHALE_UPLOAD_DIR: "uploads",
        NOTEWHALE_SECRET_KEY:
          process.env.NOTEWHALE_SECRET_KEY || "notewhale-local-desktop-secret",
        NOTEWHALE_TEXT_API_URL:
          process.env.NOTEWHALE_TEXT_API_URL ||
          "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        NOTEWHALE_TEXT_MODEL: process.env.NOTEWHALE_TEXT_MODEL || "glm-4-flash-250414",
        NOTEWHALE_VISION_API_URL:
          process.env.NOTEWHALE_VISION_API_URL ||
          "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        NOTEWHALE_VISION_MODEL: process.env.NOTEWHALE_VISION_MODEL || "glm-4v-flash",
      },
      stdio: "ignore",
      windowsHide: true,
    },
  );

  backendProcess.once("exit", (code, signal) => {
    if (backendStatus.state !== "stopping") {
      updateBackendStatus({
        state: "stopped",
        managed: true,
        url: BACKEND_URL,
        message: `本地后端已退出（code=${code ?? "null"}, signal=${signal ?? "null"}）。`,
      });
    }
    backendProcess = null;
  });

  if (await waitForBackendReady()) {
    updateBackendStatus({
      state: "ready",
      managed: true,
      url: BACKEND_URL,
      message: "本地后端已就绪。",
    });
  } else {
    updateBackendStatus({
      state: "timeout",
      managed: true,
      url: BACKEND_URL,
      message: "本地后端启动超时，请稍后重试或检查 backend 日志。",
    });
  }
}

function stopLocalBackend() {
  if (!backendProcess) return;
  updateBackendStatus({
    ...backendStatus,
    state: "stopping",
    message: "正在关闭本地后端服务...",
  });
  backendProcess.kill();
}

function waitForScheduleExtraction({ initialUrl, targetUrl, extractorScript }) {
  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 1100,
      height: 820,
      minWidth: 920,
      minHeight: 680,
      title: "南京大学课表认证",
      parent: mainWindow || undefined,
      modal: false,
      backgroundColor: "#FFFFFF",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        partition: `nju-import-${Date.now()}`,
      },
    });
    let settled = false;

    function settle(callback, value) {
      if (settled) return;
      settled = true;
      authWindow.removeAllListeners();
      if (!authWindow.isDestroyed()) {
        authWindow.close();
      }
      callback(value);
    }

    async function tryExtract(url) {
      if (!String(url || "").startsWith(targetUrl)) return;

      try {
        const result = await authWindow.webContents.executeJavaScript(extractorScript, true);
        settle(resolve, result);
      } catch (error) {
        settle(reject, error);
      }
    }

    authWindow.on("closed", () => {
      if (!settled) {
        settled = true;
        reject(new Error("认证窗口已关闭，未完成课表读取。"));
      }
    });
    authWindow.webContents.on("did-fail-load", (_event, _code, description, _url, isMainFrame) => {
      if (!settled && isMainFrame) {
        settle(reject, new Error(description || "南京大学认证页面加载失败。"));
      }
    });
    authWindow.webContents.on("did-finish-load", () => {
      tryExtract(authWindow.webContents.getURL());
    });
    authWindow.webContents.on("did-navigate", (_event, url) => {
      tryExtract(url);
    });
    authWindow.webContents.on("did-navigate-in-page", (_event, url) => {
      tryExtract(url);
    });
    authWindow.loadURL(initialUrl).catch((error) => settle(reject, error));
  });
}

ipcMain.handle("nju-schedule:import", async (_event, config = {}) => {
  const initialUrl = normalizeUrl(config.initialUrl);
  const targetUrl = normalizeUrl(config.targetUrl);
  const extractorScript = String(config.extractorScript || "");

  if (!initialUrl || !targetUrl || !extractorScript) {
    throw new Error("缺少南京大学课表读取配置。");
  }

  return waitForScheduleExtraction({ initialUrl, targetUrl, extractorScript });
});

ipcMain.handle("backend:status", async () => {
  const healthy = await checkBackendHealth();

  if (healthy && backendStatus.state !== "ready") {
    updateBackendStatus({
      ...backendStatus,
      state: "ready",
      url: BACKEND_URL,
      message: "本地后端已就绪。",
    });
  }

  return backendStatus;
});

app.whenReady().then(async () => {
  createMainWindow();
  loadStartupScreen();
  await startLocalBackend();
  loadApplication();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      loadApplication();
    }
  });
});

app.on("before-quit", () => {
  stopLocalBackend();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
