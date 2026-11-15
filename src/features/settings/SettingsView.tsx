import { useState, useEffect, type FC, type ReactElement, type ChangeEvent } from "react";
import type { Recipe } from "../../domain/recipe/types";
import { BRAND } from "../../config/brand";
import { DownloadIcon, UploadIcon, TrashIcon } from "../../ui/icons";
import { Button, IconButton } from "../../ui/Button";
import { applyThemeAndAccent } from "../../styles/themeManager";
import {
  FileSystemFolderBackupDestination,
  clearStoredDirectoryHandle,
  type AutoBackupResult
} from "../../domain/backup/backupFolder";
import styles from "./SettingsView.module.css";

export interface SettingsViewProps {
  onExportFullBackup: () => void;
  onRestoreFullBackup: (file: File) => void;
  onOpenUserIngredients: () => void;
  recipeCount: number;
  trashedRecipes?: Recipe[];
  onRestoreRecipe?: (id: string) => void;
  onPermanentDeleteRecipe?: (id: string) => void;
  onEmptyTrash?: () => void;
  onRunAutoFolderBackup?: () => Promise<AutoBackupResult>;
}

export const SettingsView: FC<SettingsViewProps> = ({
  onExportFullBackup,
  onRestoreFullBackup,
  onOpenUserIngredients,
  recipeCount,
  trashedRecipes = [],
  onRestoreRecipe,
  onPermanentDeleteRecipe,
  onEmptyTrash,
  onRunAutoFolderBackup
}): ReactElement => {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("orb_theme") || "system");
  const [accent, setAccent] = useState<string>(() => localStorage.getItem("accentTheme") || "terracotta");
  const [storageUsage, setStorageUsage] = useState<string>("Calculating...");
  const [folderName, setFolderName] = useState<string | null>(null);
  const [isFolderBackupAvailable, setIsFolderBackupAvailable] = useState<boolean>(false);
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);

  useEffect(() => {
    const destination = new FileSystemFolderBackupDestination();
    setIsFolderBackupAvailable(destination.isAvailable());
    if (destination.isAvailable()) {
      destination.getFolderName().then((name: string | null): void => {
        setFolderName(name);
      });
    }
  }, []);

  useEffect(() => {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      navigator.storage.estimate().then((estimate) => {
        const usedMb = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMb = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
        setStorageUsage(`${usedMb} MB (Browser sandbox limit: ${quotaMb} MB)`);
      }).catch((): void => {
        setStorageUsage("Local sandbox storage active");
      });
    } else {
      setStorageUsage("Local sandbox storage active");
    }
  }, []);

  const handleThemeChange = (newTheme: string): void => {
    setTheme(newTheme);
    localStorage.setItem("orb_theme", newTheme);
    applyThemeAndAccent(newTheme, accent);
  };

  const handleAccentChange = (newAccent: string): void => {
    setAccent(newAccent);
    localStorage.setItem("accentTheme", newAccent);
    applyThemeAndAccent(theme, newAccent);
  };

  const handlePickFolder = async (): Promise<void> => {
    const destination = new FileSystemFolderBackupDestination();
    const result = await destination.pickFolder();
    if (result.success && result.folderName) {
      setFolderName(result.folderName);
      setBackupFeedback(`Linked folder: ${result.folderName}`);
    }
  };

  const handleDisconnectFolder = async (): Promise<void> => {
    await clearStoredDirectoryHandle();
    setFolderName(null);
    setBackupFeedback("Disconnected backup folder");
  };

  const handleTriggerFolderBackup = async (): Promise<void> => {
    if (!onRunAutoFolderBackup) return;
    setIsBackingUp(true);
    setBackupFeedback("Writing backup...");
    try {
      const res = await onRunAutoFolderBackup();
      if (res.success) {
        setBackupFeedback(`Backup saved: ${res.filename}${res.prunedCount ? ` (pruned ${res.prunedCount} old)` : ""}`);
      } else {
        setBackupFeedback(`Backup failed: ${res.error || "Unknown error"}`);
      }
    } catch {
      setBackupFeedback("Backup failed unexpectedly");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      onRestoreFullBackup(file);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Application preferences, backups, and local storage.
        </p>
      </header>

      {/* Appearance Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {["system", "light", "dark"].map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={theme === mode ? "primary" : "secondary"}
              size="sm"
              onClick={(): void => handleThemeChange(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>

        <div style={{ marginTop: "var(--space-3)" }}>
          <span style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: "var(--space-2)" }}>
            Accent Color
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {[
              { id: "terracotta", label: "Terracotta" },
              { id: "sage", label: "Sage" },
              { id: "slate", label: "Slate" },
              { id: "berry", label: "Berry" },
              { id: "ochre", label: "Ochre" }
            ].map((item) => (
              <Button
                key={item.id}
                type="button"
                variant={accent === item.id ? "primary" : "secondary"}
                size="sm"
                onClick={(): void => handleAccentChange(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Backup and Restore */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Backup & Restore</h2>
        <p className={styles.sectionText}>
          Your data lives locally in your device IndexedDB. Export regular full zip backups to Google Drive, Dropbox, or a local folder to keep your cookbook safe.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Button
            type="button"
            variant="primary"
            onClick={onExportFullBackup}
          >
            <DownloadIcon width={16} height={16} /> Export Full Library (.zip)
          </Button>

          <label style={{ cursor: "pointer", display: "inline-flex" }}>
            <span style={{ display: "none" }}>Restore file</span>
            <input
              type="file"
              accept=".zip,.json"
              onChange={handleFileInput}
              style={{ display: "none" }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={(): void => {}}
            >
              <UploadIcon width={16} height={16} /> Restore from Backup (.zip)
            </Button>
          </label>
        </div>

        {/* Synced Backup Folder */}
        <div
          style={{
            marginTop: "var(--space-3)",
            padding: "var(--space-4)",
            background: "var(--surface-alt)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)"
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
            Local Folder Sync (Auto-Backups)
          </div>
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)" }}>
            Select a folder on your computer (e.g. inside Google Drive or Dropbox). Every recipe change will automatically write a stamped backup zip.
          </p>

          {isFolderBackupAvailable ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
              {folderName ? (
                <>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--accent)" }}>
                    Connected: {folderName}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isBackingUp}
                    onClick={handleTriggerFolderBackup}
                  >
                    {isBackingUp ? "Saving..." : "Backup Now"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectFolder}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handlePickFolder}
                >
                  Choose Backup Folder
                </Button>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
              Direct folder sync requires a desktop browser supporting the File System Access API (Chrome, Edge). Use manual .zip backup on mobile.
            </div>
          )}

          {backupFeedback && (
            <div style={{ fontSize: "0.8125rem", color: "var(--accent)", marginTop: "4px" }}>
              {backupFeedback}
            </div>
          )}
        </div>
      </section>

      {/* Dictionary Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>My Ingredients Dictionary</h2>
        <p className={styles.sectionText}>
          Manage custom ingredients, aisles, aliases, and density values used for autocomplete, shopping lists, and ingredient totals.
        </p>
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={onOpenUserIngredients}
          >
            Manage Custom Ingredients
          </Button>
        </div>
      </section>

      {/* Trash Section (30-day retention) */}
      <section className={styles.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
            Trash ({trashedRecipes.length})
          </h2>
          {trashedRecipes.length > 0 && onEmptyTrash && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={onEmptyTrash}
            >
              Empty Trash
            </Button>
          )}
        </div>
        <p className={styles.sectionText}>
          Deleted recipes remain in trash for 30 days before being automatically purged.
        </p>

        {trashedRecipes.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {trashedRecipes.map((r: Recipe) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--surface-alt)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)"
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{r.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    Deleted {r.deletedAt ? new Date(r.deletedAt).toLocaleDateString() : "recently"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                  {onRestoreRecipe && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(): void => onRestoreRecipe(r.id)}
                    >
                      Restore
                    </Button>
                  )}
                  {onPermanentDeleteRecipe && (
                    <IconButton
                      icon={<TrashIcon width={14} height={14} />}
                      aria-label={`Permanently delete ${r.title}`}
                      size="sm"
                      onClick={(): void => onPermanentDeleteRecipe(r.id)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Trash is empty.</div>
        )}
      </section>

      {/* Storage & Library Stats */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Storage & Statistics</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "0.9375rem" }}>
          <div>
            <strong>Stored Recipes:</strong> {recipeCount}
          </div>
          <div>
            <strong>Local Storage Used:</strong> {storageUsage}
          </div>
          <p className={styles.sectionText}>
            OpenRecipeBook is 100% private and offline-first. All data and photos reside solely within your device sandboxed local storage (IndexedDB). No servers, tracking, or background tasks use your device hardware or storage.
          </p>
        </div>
      </section>

      {/* Desktop Keyboard Shortcuts (Hidden on touch devices) */}
      <section className={styles.keyboardSection}>
        <h2 className={styles.sectionTitle}>Keyboard Shortcuts (Desktop)</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-2)" }}>
          <li>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>/</kbd> Focus search
          </li>
          <li>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>N</kbd> New recipe
          </li>
          <li>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>E</kbd> Edit recipe
          </li>
          <li>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>S</kbd> Cycle scale multiplier
          </li>
          <li>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>C</kbd> Launch cook mode
          </li>
          <li>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>Esc</kbd> Close view or editor
          </li>
          <li>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>?</kbd> Toggle shortcuts help
          </li>
        </ul>
      </section>

      {/* About */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>About {BRAND.appName}</h2>
        <p className={styles.sectionText}>
          {BRAND.tagline}. Free, local-first open-source cookbook under the MIT License.
        </p>
        <p style={{ fontSize: "0.8125rem", color: "var(--muted)", margin: 0 }}>
          Package ID: <code>{BRAND.packageId}</code> · Version 0.1.0
        </p>
      </section>
    </div>
  );
};
