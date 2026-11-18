import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type FC,
  type ReactElement,
  type ChangeEvent,
  type DragEvent
} from "react";
import type { Recipe } from "../../domain/recipe/types";
import {
  getStorageLocationInfo,
  openSystemStorageFolder,
  chooseSystemStorageFolder,
  addFilesToStorage,
  pickAndAddNativeFiles,
  deleteStorageFile,
  readStorageFileText,
  parseRecipeFromStorageText,
  type StorageFileEntry,
  type StorageLocationInfo,
  type AddStorageFilesResult
} from "../../domain/storage/recipeStorageService";
import {
  FolderIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  XIcon
} from "../../ui/icons";
import { Dialog } from "../../ui/Dialog";
import { Button, IconButton } from "../../ui/Button";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import styles from "./StorageLocationModal.module.css";

export interface StorageLocationModalProps {
  recipes: Recipe[];
  onClose: () => void;
  onSyncFromStorage: () => Promise<void>;
  onFilesImported: (result: AddStorageFilesResult) => Promise<void>;
  onOpenRecipe: (recipeId: string) => void;
  onDeleteRecipeById?: (recipeId: string) => Promise<void>;
}

function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const StorageLocationModal: FC<StorageLocationModalProps> = ({
  recipes,
  onClose,
  onSyncFromStorage,
  onFilesImported,
  onOpenRecipe,
  onDeleteRecipeById
}): ReactElement => {
  const [info, setInfo] = useState<StorageLocationInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<StorageFileEntry | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const loadStorageInfo = async (): Promise<void> => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const next = await getStorageLocationInfo(recipes);
      setInfo(next);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to inspect storage folder");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStorageInfo();
  }, [recipes.length]);

  const filteredFiles = useMemo((): StorageFileEntry[] => {
    if (!info) return [];
    const q = query.trim().toLowerCase();
    if (!q) return info.files;
    return info.files.filter((entry: StorageFileEntry): boolean => {
      return (
        entry.name.toLowerCase().includes(q) ||
        (entry.recipeTitle || "").toLowerCase().includes(q) ||
        entry.kind.toLowerCase().includes(q)
      );
    });
  }, [info, query]);

  const handleOpenFolder = async (): Promise<void> => {
    setErrorMessage(null);
    const res = await openSystemStorageFolder();
    if (res.message) {
      setStatusMessage(res.message);
    } else if (res.storagePath) {
      setStatusMessage(`Folder path: ${res.storagePath}`);
    }
  };

  const handleChooseFolder = async (): Promise<void> => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await chooseSystemStorageFolder(recipes);
      if (res.ok && res.storagePath) {
        await onSyncFromStorage();
        await loadStorageInfo();
        setStatusMessage(`Storage folder set to: ${res.storagePath}`);
      } else if (!res.canceled && res.error) {
        setErrorMessage(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRescan = async (): Promise<void> => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await onSyncFromStorage();
      await loadStorageInfo();
      setStatusMessage("Folder scanned and synced.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddResult = async (res: AddStorageFilesResult): Promise<void> => {
    await onFilesImported(res);
    await loadStorageInfo();
    if (res.errors.length > 0) {
      setErrorMessage(res.errors.join("; "));
    } else if (res.addedFiles.length > 0) {
      setStatusMessage(
        `Added ${res.addedFiles.length} file(s) (${res.importedRecipes.length} recipe(s) imported)`
      );
    }
  };

  const handlePickFilesClick = async (): Promise<void> => {
    setErrorMessage(null);
    const nativeRes = await pickAndAddNativeFiles();
    if (nativeRes !== null) {
      if (nativeRes.addedFiles.length > 0 || nativeRes.errors.length > 0) {
        await handleAddResult(nativeRes);
      }
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      const res = await addFilesToStorage(Array.from(fileList));
      await handleAddResult(res);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const handleDropFiles = async (e: DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer?.files;
    if (!dropped || dropped.length === 0) return;
    setBusy(true);
    try {
      const res = await addFilesToStorage(Array.from(dropped));
      await handleAddResult(res);
    } finally {
      setBusy(false);
    }
  };

  const handleOpenFileEntry = async (entry: StorageFileEntry): Promise<void> => {
    if (entry.recipeId && recipes.some((r: Recipe): boolean => r.id === entry.recipeId)) {
      onOpenRecipe(entry.recipeId);
      onClose();
      return;
    }
    const text = await readStorageFileText(entry.name);
    if (!text) {
      setErrorMessage(`Could not read ${entry.name}`);
      return;
    }
    try {
      const parsed = parseRecipeFromStorageText(entry.name, text);
      if (parsed.length > 0) {
        await onFilesImported({
          addedFiles: [],
          importedRecipes: parsed,
          reviewCandidates: [],
          errors: []
        });
        onOpenRecipe(parsed[0].id);
        onClose();
        return;
      }
      setStatusMessage(`${entry.name} is not a single recipe file.`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const handleDownloadFile = async (entry: StorageFileEntry): Promise<void> => {
    const text = await readStorageFileText(entry.name);
    if (!text) {
      setErrorMessage(`Unable to read ${entry.name}`);
      return;
    }
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = entry.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmDeleteFile = async (): Promise<void> => {
    if (!fileToDelete) return;
    const target = fileToDelete;
    setFileToDelete(null);
    setBusy(true);
    try {
      const res = await deleteStorageFile(target.name);
      if (res.ok && target.recipeId && onDeleteRecipeById) {
        await onDeleteRecipeById(target.recipeId);
      }
      await loadStorageInfo();
      setStatusMessage(`Deleted ${target.name}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyPath = async (): Promise<void> => {
    if (!info?.storagePath) return;
    try {
      await navigator.clipboard.writeText(info.storagePath);
      setStatusMessage("Storage folder path copied.");
    } catch {
      setStatusMessage(info.storagePath);
    }
  };

  return (
    <>
      <Dialog
        isOpen
        onClose={onClose}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <FolderIcon width={20} height={20} />
            Recipe Storage Location
          </span>
        }
        maxWidth={640}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        }
      >
        <div className={styles.wrapper}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".json,.recipe.json,.zip,.openrecipebook.zip,.paprikarecipes,.txt,.md,.jsonld"
            onChange={(e): void => {
              void handleFileInputChange(e);
            }}
            style={{ display: "none" }}
          />

          <div className={styles.pathCard}>
            <span className={styles.pathLabel}>
              {info?.platform === "android" ? "Android Recipe Folder" : "Desktop Recipe Folder"}
            </span>
            <div className={styles.pathValue} data-testid="storage-path-value">
              {loading ? "Loading storage path..." : info?.storagePath || "Unavailable"}
            </div>
            <div className={styles.pathActions}>
              <Button
                variant="primary"
                size="sm"
                icon={<FolderIcon width={15} height={15} />}
                onClick={(): void => {
                  void handleOpenFolder();
                }}
              >
                Open Folder
              </Button>
              {info?.canChooseFolder && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={(): void => {
                    void handleChooseFolder();
                  }}
                >
                  Change Folder...
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                icon={<CopyIcon width={14} height={14} />}
                onClick={(): void => {
                  void handleCopyPath();
                }}
              >
                Copy Path
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={(): void => {
                  void handleRescan();
                }}
              >
                Rescan
              </Button>
            </div>
          </div>

          <div
            className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ""}`.trim()}
            onDragOver={(e: DragEvent<HTMLDivElement>): void => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(): void => setIsDragging(false)}
            onDrop={(e: DragEvent<HTMLDivElement>): void => {
              void handleDropFiles(e);
            }}
          >
            <div className={styles.dropText}>
              <span className={styles.dropTitle}>Add Recipe Files to Storage</span>
              <span className={styles.dropHint}>
                Supports .recipe.json, .json, .zip backups, .paprikarecipes, .txt, and .md
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              icon={<PlusIcon width={16} height={16} />}
              onClick={(): void => {
                void handlePickFilesClick();
              }}
            >
              Add Files
            </Button>
          </div>

          {statusMessage && <div className={styles.statusBanner}>{statusMessage}</div>}
          {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}

          <div
            className={styles.filterRow}
            onClick={(): void => searchInputRef.current?.focus()}
          >
            <SearchIcon width={16} height={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setQuery(e.target.value)}
              placeholder="Search files in storage folder..."
              className={styles.filterInput}
              aria-label="Search files in storage folder"
            />
            {query && (
              <IconButton
                size="sm"
                variant="ghost"
                icon={<XIcon width={14} height={14} />}
                aria-label="Clear file filter"
                onClick={(e): void => {
                  e.stopPropagation();
                  setQuery("");
                }}
              />
            )}
          </div>

          <div className={styles.fileList}>
            {loading ? (
              <div className={styles.emptyState}>Reading files from storage folder...</div>
            ) : filteredFiles.length === 0 ? (
              <div className={styles.emptyState}>
                {info && info.files.length > 0
                  ? "No files matched your search."
                  : "No files in storage folder yet. Click Add Files above to import or add recipes."}
              </div>
            ) : (
              filteredFiles.map((entry: StorageFileEntry): ReactElement => (
                <div key={entry.name} className={styles.fileRow}>
                  <FileTextIcon width={18} height={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName} title={entry.name}>
                      {entry.recipeTitle ? `${entry.recipeTitle} (${entry.name})` : entry.name}
                    </div>
                    <div className={styles.fileMeta}>
                      <span className={styles.kindBadge}>{entry.kind}</span>
                      <span>{formatByteSize(entry.sizeBytes)}</span>
                      <span>{new Date(entry.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className={styles.fileActions}>
                    {(entry.kind === "recipe" || entry.kind === "text") && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(): void => {
                            void handleOpenFileEntry(entry);
                          }}
                        >
                          Open
                        </Button>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          icon={<DownloadIcon width={15} height={15} />}
                          aria-label={`Export ${entry.name}`}
                          onClick={(): void => {
                            void handleDownloadFile(entry);
                          }}
                        />
                      </>
                    )}
                    {entry.kind !== "metadata" && (
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={<TrashIcon width={15} height={15} />}
                        aria-label={`Delete ${entry.name}`}
                        onClick={(): void => setFileToDelete(entry)}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Dialog>

      {fileToDelete && (
        <ConfirmDialog
          isOpen
          title="Delete Storage File"
          message={`Delete "${fileToDelete.name}" from disk storage?`}
          confirmLabel="Delete File"
          isDanger
          onConfirm={(): void => {
            void handleConfirmDeleteFile();
          }}
          onCancel={(): void => setFileToDelete(null)}
        />
      )}
    </>
  );
};
