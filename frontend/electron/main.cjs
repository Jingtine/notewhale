const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

let mainWindow = null;

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
    authWindow.webContents.on("did-fail-load", (_event, _code, description) => {
      if (!settled) {
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

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
