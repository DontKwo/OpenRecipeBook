import { useState, type FC, type ReactElement, type ChangeEvent } from "react";
import { FolderIcon } from "../../ui/icons";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import styles from "./CloudBackupModal.module.css";

export interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderName: string | null;
  onPickLocalFolder: () => Promise<void>;
  onDisconnectFolder: () => Promise<void>;
}

interface CloudProvider {
  id: string;
  name: string;
  defaultFolder: string;
  folderOptions: string[];
  badge: string;
}

const CLOUD_PROVIDERS: CloudProvider[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    defaultFolder: "Google Drive/OpenRecipeBook/Backups",
    folderOptions: [
      "Google Drive/OpenRecipeBook/Backups",
      "Google Drive/My Recipes/Backups",
      "Google Drive/Documents/Cookbook"
    ],
    badge: "Cloud"
  },
  {
    id: "dropbox",
    name: "Dropbox",
    defaultFolder: "Dropbox/Apps/OpenRecipeBook",
    folderOptions: [
      "Dropbox/Apps/OpenRecipeBook",
      "Dropbox/Recipes/Backups",
      "Dropbox/My Documents/OpenRecipeBook"
    ],
    badge: "Cloud"
  },
  {
    id: "microsoft-cloud",
    name: "Microsoft Cloud",
    defaultFolder: "Personal Cloud/OpenRecipeBook/Backups",
    folderOptions: [
      "Personal Cloud/OpenRecipeBook/Backups",
      "Personal Cloud/Documents/Recipes",
      "Personal Cloud/Vault/Cookbook"
    ],
    badge: "Cloud"
  },
  {
    id: "apple-icloud",
    name: "Apple iCloud Drive",
    defaultFolder: "iCloud Drive/OpenRecipeBook",
    folderOptions: [
      "iCloud Drive/OpenRecipeBook",
      "iCloud Drive/Documents/Recipes",
      "iCloud Drive/Cookbook Backups"
    ],
    badge: "Cloud"
  },
  {
    id: "amazon-cloud",
    name: "Amazon Cloud Drive",
    defaultFolder: "Amazon Cloud/OpenRecipeBook/Backups",
    folderOptions: [
      "Amazon Cloud/OpenRecipeBook/Backups",
      "Amazon Cloud/Documents/Recipes",
      "Amazon Cloud/Backups/Cookbook"
    ],
    badge: "Cloud"
  }
];

export const CloudBackupModal: FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  currentFolderName,
  onPickLocalFolder,
  onDisconnectFolder
}): ReactElement | null => {
  const [activeAccount, setActiveAccount] = useState<string | null>(() => {
    return localStorage.getItem("orb_cloud_backup_provider") || null;
  });
  const [connectedEmail, setConnectedEmail] = useState<string>(() => {
    return localStorage.getItem("orb_cloud_backup_email") || "";
  });
  const [connectedFolder, setConnectedFolder] = useState<string>(() => {
    return localStorage.getItem("orb_cloud_backup_folder") || "";
  });

  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);
  const [emailInput, setEmailInput] = useState<string>("");
  const [chosenFolder, setChosenFolder] = useState<string>("");
  const [customFolderInput, setCustomFolderInput] = useState<string>("");
  const [isCustomFolder, setIsCustomFolder] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartSignIn = (provider: CloudProvider): void => {
    setSelectedProvider(provider);
    setEmailInput(connectedEmail || "");
    setChosenFolder(connectedFolder || provider.defaultFolder);
    setIsCustomFolder(false);
    setCustomFolderInput("");
  };

  const handleConfirmConnection = (): void => {
    if (!selectedProvider) return;
    const finalEmail = emailInput.trim() || `user@${selectedProvider.id}.com`;
    const finalFolder = isCustomFolder && customFolderInput.trim()
      ? customFolderInput.trim()
      : (chosenFolder || selectedProvider.defaultFolder);

    setActiveAccount(selectedProvider.name);
    setConnectedEmail(finalEmail);
    setConnectedFolder(finalFolder);

    localStorage.setItem("orb_cloud_backup_provider", selectedProvider.name);
    localStorage.setItem("orb_cloud_backup_email", finalEmail);
    localStorage.setItem("orb_cloud_backup_folder", finalFolder);

    setFeedback(`Connected ${selectedProvider.name} (${finalEmail}) syncing to ${finalFolder}.`);
    setSelectedProvider(null);
  };

  const handleDisconnect = async (): Promise<void> => {
    setActiveAccount(null);
    setConnectedEmail("");
    setConnectedFolder("");
    localStorage.removeItem("orb_cloud_backup_provider");
    localStorage.removeItem("orb_cloud_backup_email");
    localStorage.removeItem("orb_cloud_backup_folder");
    await onDisconnectFolder();
    setFeedback("Cloud backup connection disconnected.");
  };

  const handleLocalFolderSelect = async (): Promise<void> => {
    try {
      await onPickLocalFolder();
      setFeedback("Local synced folder linked.");
    } catch {
      setFeedback("Folder selection cancelled or unsupported.");
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={selectedProvider ? `Sign in to ${selectedProvider.name}` : "Cloud Backup & Storage Sync"}
      maxWidth={580}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", width: "100%" }}>
          {selectedProvider ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={(): void => setSelectedProvider(null)}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmConnection}
              >
                Save & Link Folder
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={onClose}
            >
              Done
            </Button>
          )}
        </div>
      }
    >
      <div className={styles.body}>
        {selectedProvider ? (
          /* Sign-In and Folder Selection Step */
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <p className={styles.description}>
              Authorize OpenRecipeBook to connect with your {selectedProvider.name} account and choose the folder where backups will be saved.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)" }}>
                Account Email / Username
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setEmailInput(e.target.value)}
                placeholder="name@example.com"
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: "0.875rem"
                }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                Permission requested: Read and write recipe backup snapshots.
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)" }}>
                Choose Backup Folder in {selectedProvider.name}
              </label>

              {selectedProvider.folderOptions.map((folderOption: string, idx: number): ReactElement => {
                const isSelected = !isCustomFolder && chosenFolder === folderOption;
                return (
                  <label
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid",
                      borderColor: isSelected ? "var(--accent)" : "var(--border)",
                      background: isSelected ? "var(--surface-alt)" : "var(--surface)",
                      cursor: "pointer",
                      fontSize: "0.8125rem"
                    }}
                  >
                    <input
                      type="radio"
                      name="cloud-folder-option"
                      checked={isSelected}
                      onChange={(): void => {
                        setIsCustomFolder(false);
                        setChosenFolder(folderOption);
                      }}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <FolderIcon width={16} height={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>{folderOption}</span>
                  </label>
                );
              })}

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid",
                  borderColor: isCustomFolder ? "var(--accent)" : "var(--border)",
                  background: isCustomFolder ? "var(--surface-alt)" : "var(--surface)",
                  cursor: "pointer",
                  fontSize: "0.8125rem"
                }}
              >
                <input
                  type="radio"
                  name="cloud-folder-option"
                  checked={isCustomFolder}
                  onChange={(): void => setIsCustomFolder(true)}
                  style={{ accentColor: "var(--accent)" }}
                />
                <FolderIcon width={16} height={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span>Custom folder location:</span>
              </label>

              {isCustomFolder && (
                <input
                  type="text"
                  value={customFolderInput}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setCustomFolderInput(e.target.value)}
                  placeholder={`${selectedProvider.name}/MyFolder/Backups`}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontSize: "0.875rem",
                    marginLeft: 24
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          /* Main Cloud Provider List */
          <>
            <p className={styles.description}>
              Connect your cloud storage or link a local synced folder. Your recipes, meal plans, and shopping lists will be automatically backed up whenever changes are made.
            </p>

            {(activeAccount || currentFolderName) && (
              <div className={styles.statusBanner}>
                <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                  Active Connection: {activeAccount || currentFolderName}
                </div>
                {connectedEmail && (
                  <div>
                    Signed in as: <strong>{connectedEmail}</strong>
                  </div>
                )}
                {connectedFolder && (
                  <div>
                    Backup folder: <strong style={{ fontFamily: "var(--font-mono)" }}>{connectedFolder}</strong>
                  </div>
                )}
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  Backups are written automatically on every recipe creation, edit, or import.
                </span>
                <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(): void => {
                      void handleDisconnect();
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            )}

            {feedback && !activeAccount && (
              <div style={{ fontSize: "0.8125rem", color: "var(--accent)" }}>
                {feedback}
              </div>
            )}

            <div className={styles.providerList}>
              {CLOUD_PROVIDERS.map((provider: CloudProvider): ReactElement => {
                const isConnected = activeAccount === provider.name;
                return (
                  <div key={provider.id} className={styles.providerCard}>
                    <div className={styles.providerInfo}>
                      <div className={styles.providerIcon}>
                        <FolderIcon width={18} height={18} />
                      </div>
                      <div className={styles.providerMeta}>
                        <div className={styles.providerName}>{provider.name}</div>
                        <div className={styles.providerDesc}>
                          {isConnected && connectedFolder ? connectedFolder : provider.defaultFolder}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={isConnected ? "secondary" : "primary"}
                      size="sm"
                      onClick={(): void => handleStartSignIn(provider)}
                    >
                      {isConnected ? "Change Folder" : "Sign In & Choose Folder"}
                    </Button>
                  </div>
                );
              })}

              <div className={styles.providerCard}>
                <div className={styles.providerInfo}>
                  <div className={styles.providerIcon}>
                    <FolderIcon width={18} height={18} />
                  </div>
                  <div className={styles.providerMeta}>
                    <div className={styles.providerName}>Local Synced Folder</div>
                    <div className={styles.providerDesc}>
                      {currentFolderName ? `Linked: ${currentFolderName}` : "Choose folder synced by desktop sync clients"}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(): void => {
                    void handleLocalFolderSelect();
                  }}
                >
                  Choose Local Folder
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};
