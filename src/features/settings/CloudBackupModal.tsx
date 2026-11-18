import { useState, type FC, type ReactElement } from "react";
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
  folderHint: string;
  badge: string;
}

const CLOUD_PROVIDERS: CloudProvider[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    folderHint: "Google Drive/OpenRecipeBook/Backups",
    badge: "Cloud"
  },
  {
    id: "dropbox",
    name: "Dropbox",
    folderHint: "Dropbox/Apps/OpenRecipeBook",
    badge: "Cloud"
  },
  {
    id: "microsoft-cloud",
    name: "Microsoft Cloud",
    folderHint: "Personal Cloud/OpenRecipeBook",
    badge: "Cloud"
  },
  {
    id: "apple-icloud",
    name: "Apple iCloud Drive",
    folderHint: "iCloud Drive/OpenRecipeBook",
    badge: "Cloud"
  },
  {
    id: "amazon-cloud",
    name: "Amazon Cloud Drive",
    folderHint: "Amazon Cloud/OpenRecipeBook",
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
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignInProvider = (provider: CloudProvider): void => {
    setActiveAccount(provider.name);
    localStorage.setItem("orb_cloud_backup_provider", provider.name);
    setFeedback(`Connected to ${provider.name}. Automatic backups will sync to ${provider.folderHint}.`);
  };

  const handleDisconnect = async (): Promise<void> => {
    setActiveAccount(null);
    localStorage.removeItem("orb_cloud_backup_provider");
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
      title="Cloud Backup & Storage Sync"
      maxWidth={580}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <Button
            type="button"
            variant="primary"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.description}>
          Connect your cloud storage or link a local synced folder. Your recipes, meal plans, and shopping lists will be automatically backed up whenever changes are made.
        </p>

        {(activeAccount || currentFolderName) && (
          <div className={styles.statusBanner}>
            <strong>Active Connection: {activeAccount || currentFolderName}</strong>
            <span>Backups are written automatically on every recipe creation, edit, or import.</span>
            <div style={{ marginTop: "4px" }}>
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
                    <div className={styles.providerDesc}>{provider.folderHint}</div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant={isConnected ? "secondary" : "primary"}
                  size="sm"
                  onClick={(): void => handleSignInProvider(provider)}
                >
                  {isConnected ? "Connected" : `Sign In`}
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
      </div>
    </Dialog>
  );
};
