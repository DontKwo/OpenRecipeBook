const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nativeApi", {
  isElectron: true,
  isDesktop: true,
  isAndroid: false,
  fetchPage: (targetUrl) => ipcRenderer.invoke("fetch-page", targetUrl),
  getStorageInfo: () => ipcRenderer.invoke("get-storage-info"),
  openStorageFolder: () => ipcRenderer.invoke("open-storage-folder"),
  chooseStorageFolder: () => ipcRenderer.invoke("choose-storage-folder"),
  writeStorageFile: (filename, content) => ipcRenderer.invoke("write-storage-file", { filename, content }),
  writeStorageFileBase64: (filename, base64Data) =>
    ipcRenderer.invoke("write-storage-file-base64", { filename, base64Data }),
  readStorageFile: (filename) => ipcRenderer.invoke("read-storage-file", filename),
  deleteStorageFile: (filename) => ipcRenderer.invoke("delete-storage-file", filename),
  pickAndAddFiles: () => ipcRenderer.invoke("pick-and-add-files"),
  saveFileDialog: (options) => ipcRenderer.invoke("save-file-dialog", options)
});
