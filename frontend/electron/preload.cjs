const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("notewhaleDesktop", {
  getBackendStatus() {
    return ipcRenderer.invoke("backend:status");
  },
  openDataDirectory() {
    return ipcRenderer.invoke("desktop:open-data-dir");
  },
  importNjuSchedule(config) {
    return ipcRenderer.invoke("nju-schedule:import", config);
  },
});
