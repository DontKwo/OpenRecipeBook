// Format dated backup filename: openrecipebook-backup-YYYY-MM-DD-HHmmss.zip
export function formatDatedBackupFilename(date: Date = new Date()): string {
  const pad = (n: number): string => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `openrecipebook-backup-${year}-${month}-${day}-${hours}${minutes}${seconds}.zip`;
}

// Parse date from backup filename
export function parseBackupFilenameDate(filename: string): Date | null {
  const match = /^openrecipebook-backup-(\d{4})-(\d{2})-(\d{2})(?:-(\d{2})(\d{2})(\d{2}))?\.zip$/i.exec(filename);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const hours = match[4] ? parseInt(match[4], 10) : 0;
  const minutes = match[5] ? parseInt(match[5], 10) : 0;
  const seconds = match[6] ? parseInt(match[6], 10) : 0;

  return new Date(year, month, day, hours, minutes, seconds);
}

// Return list of old backup files to prune when total exceeds keepCount
export function getOldBackupsToPrune(filenames: string[], keepCount: number = 10): string[] {
  const validBackups: Array<{ name: string; date: Date }> = [];

  for (const name of filenames) {
    const parsedDate = parseBackupFilenameDate(name);
    if (parsedDate) {
      validBackups.push({ name, date: parsedDate });
    }
  }

  // Sort oldest first
  validBackups.sort((a, b): number => a.date.getTime() - b.date.getTime());

  if (validBackups.length <= keepCount) {
    return [];
  }

  const excessCount = validBackups.length - keepCount;
  return validBackups.slice(0, excessCount).map((b): string => b.name);
}

// Determine if scheduled backup should run based on last backup timestamp
export function shouldAutoBackup(lastBackupIso?: string, minHoursInterval: number = 20): boolean {
  if (!lastBackupIso) return true;
  const lastTime = new Date(lastBackupIso).getTime();
  if (isNaN(lastTime)) return true;

  const diffMs = Date.now() - lastTime;
  const minIntervalMs = minHoursInterval * 60 * 60 * 1000;
  return diffMs >= minIntervalMs;
}

export interface BackupDestination {
  name: string;
  isAvailable(): boolean;
  saveBackup(zipBytes: Uint8Array, filename: string): Promise<boolean>;
}

export interface AutoBackupResult {
  success: boolean;
  filename?: string;
  prunedCount?: number;
  error?: string;
}

const IDB_BACKUP_DB = "openrecipebook_handles";
const IDB_STORE_NAME = "folder_handles";
const IDB_KEY = "backup_dir";

// Open IDB database for storing directory handles
function openHandleDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject): void => {
    const req = indexedDB.open(IDB_BACKUP_DB, 1);
    req.onupgradeneeded = (): void => {
      req.result.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = (): void => resolve(req.result);
    req.onerror = (): void => reject(req.error);
  });
}

// Persist directory handle to IndexedDB
export async function storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openHandleDb();
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    tx.objectStore(IDB_STORE_NAME).put(handle, IDB_KEY);
  } catch {
    // IDB handle storage unavailable
  }
}

// Retrieve persisted directory handle from IndexedDB
export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDb();
    return await new Promise<FileSystemDirectoryHandle | null>((resolve): void => {
      const tx = db.transaction(IDB_STORE_NAME, "readonly");
      const req = tx.objectStore(IDB_STORE_NAME).get(IDB_KEY);
      req.onsuccess = (): void => resolve(req.result || null);
      req.onerror = (): void => resolve(null);
    });
  } catch {
    return null;
  }
}

// Clear stored directory handle
export async function clearStoredDirectoryHandle(): Promise<void> {
  try {
    const db = await openHandleDb();
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    tx.objectStore(IDB_STORE_NAME).delete(IDB_KEY);
  } catch {
    // Ignore error
  }
}

export class FileSystemFolderBackupDestination implements BackupDestination {
  name: string = "Synced Folder (Google Drive, Dropbox, OneDrive)";
  private cachedDirectoryHandle: FileSystemDirectoryHandle | null = null;

  public isAvailable(): boolean {
    return typeof window !== "undefined" && "showDirectoryPicker" in window;
  }

  // Pick folder and store handle in IndexedDB
  public async pickFolder(): Promise<{ success: boolean; folderName?: string }> {
    if (!this.isAvailable()) {
      return { success: false };
    }
    try {
      const picker = (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
      this.cachedDirectoryHandle = await picker();
      await storeDirectoryHandle(this.cachedDirectoryHandle);
      return { success: true, folderName: this.cachedDirectoryHandle.name };
    } catch {
      return { success: false };
    }
  }

  // Get name of configured backup folder
  public async getFolderName(): Promise<string | null> {
    if (!this.cachedDirectoryHandle) {
      this.cachedDirectoryHandle = await getStoredDirectoryHandle();
    }
    return this.cachedDirectoryHandle?.name || null;
  }

  // Save dated backup and rotate old files keeping maxCount (default 10)
  public async saveBackupWithRotation(zipBytes: Uint8Array, maxCount: number = 10): Promise<AutoBackupResult> {
    if (!this.cachedDirectoryHandle) {
      this.cachedDirectoryHandle = await getStoredDirectoryHandle();
    }
    if (!this.cachedDirectoryHandle) {
      return { success: false, error: "No folder configured" };
    }

    try {
      const filename = formatDatedBackupFilename();
      const fileHandle = await this.cachedDirectoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(new Uint8Array(zipBytes));
      await writable.close();

      // Enumerate existing backup files in directory to prune oldest
      const existingFiles: string[] = [];
      const dirAny = this.cachedDirectoryHandle as unknown as { values: () => AsyncIterable<FileSystemHandle> };
      if (dirAny.values) {
        for await (const entry of dirAny.values()) {
          if (entry.kind === "file") {
            existingFiles.push(entry.name);
          }
        }
      }

      const filesToPrune = getOldBackupsToPrune(existingFiles, maxCount);
      for (const pruneName of filesToPrune) {
        try {
          await this.cachedDirectoryHandle.removeEntry(pruneName);
        } catch {
          // Ignore individual file removal error
        }
      }

      return {
        success: true,
        filename,
        prunedCount: filesToPrune.length
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  public async saveBackup(zipBytes: Uint8Array, filename: string): Promise<boolean> {
    if (!this.cachedDirectoryHandle) {
      this.cachedDirectoryHandle = await getStoredDirectoryHandle();
      if (!this.cachedDirectoryHandle) {
        const picked = await this.pickFolder();
        if (!picked.success || !this.cachedDirectoryHandle) {
          return false;
        }
      }
    }

    try {
      const fileHandle = await this.cachedDirectoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(new Uint8Array(zipBytes));
      await writable.close();
      return true;
    } catch {
      return false;
    }
  }
}
