const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("notewhaleDesktop", {
  getBackendStatus() {
    return ipcRenderer.invoke("backend:status");
  },
  openDataDirectory() {
    return ipcRenderer.invoke("desktop:open-data-dir");
  },
  localRequest(request) {
    return ipcRenderer.invoke("local-api:request", request);
  },
  importNjuSchedule(config) {
    return ipcRenderer.invoke("nju-schedule:import", config);
  },
});
