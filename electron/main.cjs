const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;

function getConfigPath() {
  return path.join(app.getPath("userData"), "storage-config.json");
}

function getRecipesDirectory() {
  let configured = path.join(app.getPath("documents"), "OpenRecipeBook", "recipes");
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (parsed && typeof parsed.storagePath === "string" && parsed.storagePath.trim()) {
        configured = parsed.storagePath.trim();
      }
    }
  } catch {
    // Use default Documents path
  }
  fs.mkdirSync(configured, { recursive: true });
  return configured;
}

function setRecipesDirectory(nextPath) {
  fs.mkdirSync(nextPath, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify({ storagePath: nextPath }, null, 2), "utf8");
}

function sanitizeFilename(rawName) {
  const cleaned = String(rawName || "")
    .replace(/[/\\]/g, "_")
    .replace(/\.\./g, "")
    .replace(/[<>:"|?*\x00-\x1F]/g, "_")
    .trim();
  return cleaned && cleaned !== "." ? cleaned : "";
}

function classifyFile(filename) {
  const lower = filename.toLowerCase();
  if (lower === "library-metadata.json") return "metadata";
  if (lower.endsWith(".recipe.json") || lower.endsWith(".json") || lower.endsWith(".jsonld")) return "recipe";
  if (lower.endsWith(".zip") || lower.endsWith(".paprikarecipes")) return "archive";
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return "text";
  return "other";
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "OpenRecipeBook",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const indexPath = path.join(__dirname, "../dist/index.html");
  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL("http://localhost:5173");
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("fetch-page", async (_event, targetUrl) => {
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OpenRecipeBook/0.2.0"
      }
    });
    const htmlText = await response.text();
    return { ok: true, html: htmlText, status: response.status };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("get-storage-info", async () => {
  try {
    const dir = getRecipesDirectory();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fullPath = path.join(dir, entry.name);
      const stat = fs.statSync(fullPath);
      const kind = classifyFile(entry.name);
      let recipeId;
      let recipeTitle;
      if (kind === "recipe" && stat.size < 2 * 1024 * 1024) {
        try {
          const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
          if (parsed && parsed.format === "openrecipebook-recipe" && parsed.recipe) {
            recipeId = parsed.recipe.id;
            recipeTitle = parsed.recipe.title;
          } else if (parsed && parsed.title) {
            recipeId = parsed.id;
            recipeTitle = parsed.title;
          }
        } catch {
          // Ignore malformed JSON
        }
      }
      files.push({
        name: entry.name,
        path: fullPath,
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
        kind,
        recipeId,
        recipeTitle
      });
    }
    files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return {
      ok: true,
      platform: "desktop",
      storagePath: dir,
      canOpenSystemFolder: true,
      canChooseFolder: true,
      files
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("open-storage-folder", async () => {
  const dir = getRecipesDirectory();
  const errMsg = await shell.openPath(dir);
  if (errMsg) {
    return { ok: false, storagePath: dir, error: errMsg };
  }
  return { ok: true, storagePath: dir, message: `Opened ${dir}` };
});

ipcMain.handle("choose-storage-folder", async () => {
  if (!mainWindow) return { ok: false, canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select Recipe Storage Folder",
    defaultPath: getRecipesDirectory(),
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, canceled: true };
  }
  const chosen = result.filePaths[0];
  setRecipesDirectory(chosen);
  return { ok: true, storagePath: chosen };
});

ipcMain.handle("write-storage-file", async (_event, { filename, content }) => {
  const safe = sanitizeFilename(filename);
  if (!safe) return { ok: false, error: "Invalid filename" };
  const target = path.join(getRecipesDirectory(), safe);
  fs.writeFileSync(target, String(content || ""), "utf8");
  return { ok: true, path: target };
});

ipcMain.handle("write-storage-file-base64", async (_event, { filename, base64Data }) => {
  const safe = sanitizeFilename(filename);
  if (!safe) return { ok: false, error: "Invalid filename" };
  const target = path.join(getRecipesDirectory(), safe);
  fs.writeFileSync(target, Buffer.from(String(base64Data || ""), "base64"));
  return { ok: true, path: target };
});

ipcMain.handle("read-storage-file", async (_event, filename) => {
  const safe = sanitizeFilename(filename);
  if (!safe) return { ok: false, error: "Invalid filename" };
  const target = path.join(getRecipesDirectory(), safe);
  if (!fs.existsSync(target)) return { ok: false, error: "File not found" };
  return { ok: true, content: fs.readFileSync(target, "utf8") };
});

ipcMain.handle("delete-storage-file", async (_event, filename) => {
  const safe = sanitizeFilename(filename);
  if (!safe) return { ok: false, error: "Invalid filename" };
  const target = path.join(getRecipesDirectory(), safe);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
  return { ok: true };
});

ipcMain.handle("pick-and-add-files", async () => {
  if (!mainWindow) return { ok: false, canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Add Recipe Files",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Recipe & Backup Files", extensions: ["json", "zip", "paprikarecipes", "txt", "md", "jsonld"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, canceled: true };
  }
  const files = result.filePaths.map((fp) => {
    const buf = fs.readFileSync(fp);
    return {
      name: path.basename(fp),
      contentBase64: buf.toString("base64"),
      sizeBytes: buf.length
    };
  });
  return { ok: true, files };
});

ipcMain.handle("save-file-dialog", async (_event, { defaultName, filters }) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters
  });
  return result.filePath || null;
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
