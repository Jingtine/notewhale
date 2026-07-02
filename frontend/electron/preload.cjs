const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("notewhaleDesktop", {
  getBackendStatus() {
    return ipcRenderer.invoke("backend:status");
  },
  importNjuSchedule(config) {
    return ipcRenderer.invoke("nju-schedule:import", config);
  },
});
