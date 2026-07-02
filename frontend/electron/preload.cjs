const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("notewhaleDesktop", {
  importNjuSchedule(config) {
    return ipcRenderer.invoke("nju-schedule:import", config);
  },
});
