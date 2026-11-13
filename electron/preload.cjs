const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nativeApi", {
  isElectron: true,
  fetchPage: (targetUrl) => ipcRenderer.invoke("fetch-page", targetUrl),
  saveFileDialog: (options) => ipcRenderer.invoke("save-file-dialog", options)
});
