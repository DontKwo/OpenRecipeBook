import { useState, useEffect, type FC, type ReactElement } from "react";
import type { Recipe } from "../../domain/recipe/types";
import { BRAND } from "../../config/brand";
import { DownloadIcon, UploadIcon, TrashIcon, CheckIcon } from "../../ui/icons";
import {
  FileSystemFolderBackupDestination,
  clearStoredDirectoryHandle,
  type AutoBackupResult
} from "../../domain/backup/backupFolder";

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
        setStorageUsage(`${usedMb} MB used of ${quotaMb} MB available`);
      }).catch(() => {
        setStorageUsage("Storage estimate unavailable");
      });
    } else {
      setStorageUsage("Local IndexedDB storage active");
    }
  }, []);

  const handleThemeChange = (newTheme: string): void => {
    setTheme(newTheme);
    localStorage.setItem("orb_theme", newTheme);
    if (newTheme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  const handleAccentChange = (newAccent: string): void => {
    setAccent(newAccent);
    localStorage.setItem("accentTheme", newAccent);
    document.documentElement.setAttribute("data-accent", newAccent);
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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onRestoreFullBackup(file);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "var(--space-6)" }}>
      <header style={{ marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.25rem", marginBottom: "var(--space-2)" }}>
          Settings
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Application preferences, backups, and local storage.
        </p>
      </header>

      {/* Appearance Section */}
      <section style={{ marginBottom: "var(--space-6)", background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "var(--space-4)" }}>Appearance</h2>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          {["system", "light", "dark"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleThemeChange(mode)}
              style={{
                background: theme === mode ? "var(--accent)" : "var(--surface)",
                color: theme === mode ? "var(--accent-contrast)" : "var(--text)",
                border: "1px solid " + (theme === mode ? "var(--accent)" : "var(--border)"),
                padding: "8px 18px",
                borderRadius: "var(--radius-full)",
                fontWeight: 600,
                textTransform: "capitalize",
                cursor: "pointer"
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "var(--space-4)" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)", marginBottom: "var(--space-2)" }}>
            Accent Color
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {[
              { id: "terracotta", label: "Terracotta" },
              { id: "sage", label: "Sage" },
              { id: "slate", label: "Slate" },
              { id: "berry", label: "Berry" },
              { id: "ochre", label: "Ochre" }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAccentChange(item.id)}
                style={{
                  background: accent === item.id ? "var(--surface-alt)" : "var(--surface)",
                  color: accent === item.id ? "var(--accent)" : "var(--text)",
                  border: "1px solid var(--border)",
                  padding: "6px 14px",
                  borderRadius: "var(--radius-full)",
                  fontWeight: accent === item.id ? 700 : 500,
                  fontSize: "0.88rem",
                  cursor: "pointer"
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Backup and Restore */}
      <section style={{ marginBottom: "var(--space-6)", background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "var(--space-2)" }}>Data Backup & Restore</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "var(--space-4)" }}>
          Your data lives locally in your browser/device IndexedDB. Export regular full zip backups to your Google Drive, Dropbox, or local folder to keep your cookbook safe.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
          <button
            type="button"
            onClick={onExportFullBackup}
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              padding: "10px 20px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <DownloadIcon width={16} height={16} /> Export Full Library (.zip)
          </button>

          <label
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: "10px 20px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <UploadIcon width={16} height={16} /> Restore from Backup (.zip)
            <input
              type="file"
              accept=".zip,.json"
              onChange={handleFileInput}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {/* Synced Backup Folder (Drive, Dropbox, OneDrive) */}
        <div
          style={{
            marginTop: "var(--space-6)",
            padding: "var(--space-4)",
            background: "var(--surface-alt)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
            <h3 style={{ fontSize: "1rem", margin: 0 }}>
              Automatic Cloud-Synced Folder
            </h3>
            {folderName && (
              <span style={{ fontSize: "0.8rem", color: "var(--success)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <CheckIcon width={14} height={14} /> Linked
              </span>
            )}
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 var(--space-3) 0" }}>
            Select a folder synced by Google Drive, Dropbox, or OneDrive on your computer. OpenRecipeBook automatically saves dated .openrecipebook.zip backups there and retains the 10 most recent.
          </p>

          {isFolderBackupAvailable ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
              <button
                type="button"
                onClick={handlePickFolder}
                style={{
                  background: "var(--surface)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  padding: "6px 14px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {folderName ? `Change Folder (${folderName})` : "Choose Synced Folder"}
              </button>

              {folderName && (
                <>
                  <button
                    type="button"
                    disabled={isBackingUp}
                    onClick={handleTriggerFolderBackup}
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-contrast)",
                      border: "none",
                      padding: "6px 14px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: isBackingUp ? "wait" : "pointer",
                      opacity: isBackingUp ? 0.7 : 1
                    }}
                  >
                    {isBackingUp ? "Backing up..." : "Back Up Now"}
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectFolder}
                    style={{
                      background: "none",
                      color: "var(--danger)",
                      border: "none",
                      padding: "4px 8px",
                      fontSize: "0.82rem",
                      cursor: "pointer"
                    }}
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          ) : (
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0, fontStyle: "italic" }}>
              Automatic folder sync uses the File System Access API (supported in desktop Chrome, Edge, and the Windows app). On mobile, export manually using the button above to save directly to your cloud drive.
            </p>
          )}

          {backupFeedback && (
            <div style={{ marginTop: "var(--space-3)", fontSize: "0.82rem", color: "var(--accent)", fontWeight: 500 }}>
              {backupFeedback}
            </div>
          )}
        </div>
      </section>

      {/* My Ingredients Section */}
      <section style={{ marginBottom: "var(--space-6)", background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "var(--space-2)" }}>My Ingredients Dictionary</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "var(--space-4)" }}>
          Manage custom ingredients, aisles, aliases, and density values used for autocomplete, shopping lists, and ingredient totals.
        </p>
        <button
          type="button"
          onClick={onOpenUserIngredients}
          style={{
            background: "var(--surface)",
            color: "var(--accent)",
            border: "1px solid var(--border)",
            padding: "8px 18px",
            borderRadius: "var(--radius-full)",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Manage Custom Ingredients
        </button>
      </section>

      {/* Trash Section (30-day retention) */}
      <section style={{ marginBottom: "var(--space-6)", background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
          <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Trash ({trashedRecipes.length})</h2>
          {trashedRecipes.length > 0 && onEmptyTrash && (
            <button
              type="button"
              onClick={onEmptyTrash}
              style={{ background: "none", border: "1px solid var(--danger)", color: "var(--danger)", padding: "4px 12px", borderRadius: "var(--radius-full)", cursor: "pointer", fontSize: "0.82rem" }}
            >
              Empty Trash
            </button>
          )}
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "var(--space-4)" }}>
          Deleted recipes remain in trash for 30 days before being automatically purged.
        </p>

        {trashedRecipes.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {trashedRecipes.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--surface-alt)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.9rem"
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{r.title}</span>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)", marginLeft: "8px" }}>
                    Deleted {r.deletedAt ? new Date(r.deletedAt).toLocaleDateString() : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  {onRestoreRecipe && (
                    <button
                      type="button"
                      onClick={() => onRestoreRecipe(r.id)}
                      style={{ background: "none", border: "1px solid var(--accent)", color: "var(--accent)", padding: "3px 10px", borderRadius: "var(--radius-full)", cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      Restore
                    </button>
                  )}
                  {onPermanentDeleteRecipe && (
                    <button
                      type="button"
                      onClick={() => onPermanentDeleteRecipe(r.id)}
                      style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: "4px" }}
                      title="Delete permanently"
                    >
                      <TrashIcon width={14} height={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Trash is empty.</div>
        )}
      </section>

      {/* Storage & Library Stats */}
      <section style={{ marginBottom: "var(--space-6)", background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "var(--space-4)" }}>Storage & Statistics</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "0.95rem" }}>
          <div>
            <strong>Stored Recipes:</strong> {recipeCount}
          </div>
          <div>
            <strong>Storage Quota:</strong> {storageUsage}
          </div>
        </div>
      </section>

      {/* Desktop Keyboard Shortcuts */}
      <section style={{ marginBottom: "var(--space-6)", background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "var(--space-4)" }}>Keyboard Shortcuts (Desktop)</h2>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
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
      <section style={{ background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "var(--space-2)" }}>About {BRAND.appName}</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "var(--space-3)" }}>
          {BRAND.tagline}. Free, local-first open-source cookbook under the MIT License.
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          Package ID: <code>{BRAND.packageId}</code> · Version 0.1.0
        </p>
      </section>
    </div>
  );
};
