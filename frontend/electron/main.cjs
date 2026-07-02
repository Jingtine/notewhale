const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

let mainWindow = null;
let backendProcess = null;
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
    backendStatus = {
      state: "ready",
      managed: false,
      url: BACKEND_URL,
      message: "已连接正在运行的本地后端。",
    };
    return;
  }

  const backendDir = path.join(__dirname, "..", "..", "backend");
  const pythonPath = path.join(backendDir, ".venv", "Scripts", "python.exe");

  if (!fs.existsSync(pythonPath)) {
    backendStatus = {
      state: "missing",
      managed: false,
      url: BACKEND_URL,
      message: "未找到后端 Python 环境，请先在 backend 目录初始化 .venv。",
    };
    return;
  }

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

  backendStatus = {
    state: "starting",
    managed: true,
    url: BACKEND_URL,
    message: "正在启动本地后端服务...",
  };

  backendProcess.once("exit", (code, signal) => {
    if (backendStatus.state !== "stopping") {
      backendStatus = {
        state: "stopped",
        managed: true,
        url: BACKEND_URL,
        message: `本地后端已退出（code=${code ?? "null"}, signal=${signal ?? "null"}）。`,
      };
    }
    backendProcess = null;
  });

  if (await waitForBackendReady()) {
    backendStatus = {
      state: "ready",
      managed: true,
      url: BACKEND_URL,
      message: "本地后端已就绪。",
    };
  } else {
    backendStatus = {
      state: "timeout",
      managed: true,
      url: BACKEND_URL,
      message: "本地后端启动超时，请稍后重试或检查 backend 日志。",
    };
  }
}

function stopLocalBackend() {
  if (!backendProcess) return;
  backendStatus = {
    ...backendStatus,
    state: "stopping",
    message: "正在关闭本地后端服务...",
  };
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
    backendStatus = {
      ...backendStatus,
      state: "ready",
      url: BACKEND_URL,
      message: "本地后端已就绪。",
    };
  }

  return backendStatus;
});

app.whenReady().then(async () => {
  await startLocalBackend();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
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
