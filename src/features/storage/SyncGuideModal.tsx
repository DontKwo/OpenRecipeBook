import { useState, type FC, type ReactElement } from "react";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { SyncIcon } from "../../ui/icons";
import styles from "./SyncGuideModal.module.css";

export interface SyncGuideModalProps {
  storagePath?: string;
  initialTab?: "windows" | "unix" | "android";
  onClose: () => void;
}

export const SyncGuideModal: FC<SyncGuideModalProps> = ({
  storagePath,
  initialTab = "windows",
  onClose
}): ReactElement => {
  const [platformTab, setPlatformTab] = useState<"windows" | "unix" | "android">(initialTab);

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <SyncIcon width={20} height={20} />
          Sync Across Devices
        </span>
      }
      maxWidth={600}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <Button
            type="button"
            id="sync_guide.close_btn"
            data-testid="sync_guide.close_btn"
            variant="primary"
            onClick={onClose}
          >
            Got It
          </Button>
        </div>
      }
    >
      <div className={styles.wrapper}>
        <p className={styles.intro}>
          OpenRecipeBook keeps zero accounts or central servers. Sync recipes across devices using peer-to-peer folder sync (Syncthing), desktop sync folders, or portable <code>.openrecipebook.zip</code> archives.
        </p>

        {storagePath && (
          <div className={styles.codeLine}>
            Current Storage: {storagePath}
          </div>
        )}

        <SegmentedControl
          name="Sync platform instructions"
          value={platformTab}
          onChange={(val: string): void => setPlatformTab(val as "windows" | "unix" | "android")}
          options={[
            { value: "windows", label: "Windows" },
            { value: "unix", label: "macOS & Linux" },
            { value: "android", label: "Android" }
          ]}
        />

        {platformTab === "windows" && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Live Folder Sync on Windows</h3>
            <ol className={styles.steps}>
              <li>
                Create a synced folder in <strong>Syncthing</strong> or your preferred desktop folder-sync tool (for example <code>Sync\OpenRecipeBook</code>).
              </li>
              <li>
                Open <strong>Settings</strong> -&gt; <strong>Browse &amp; Add Recipe Files</strong> -&gt; click <strong>Change Folder...</strong> and select that synced folder. OpenRecipeBook copies your <code>&lt;slug&gt;__&lt;id&gt;.recipe.json</code> files there immediately.
              </li>
              <li>
                Point your other Windows PC at its matching synced folder. At startup (or whenever you click <strong>Rescan</strong>), newer recipe edits on disk merge automatically by timestamp.
              </li>
            </ol>
          </div>
        )}

        {platformTab === "unix" && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Folder Sync on macOS &amp; Linux</h3>
            <ol className={styles.steps}>
              <li>
                Point <strong>Syncthing</strong> or your desktop folder-sync tool at your default desktop recipe folder: <code>~/Documents/OpenRecipeBook/recipes</code>.
              </li>
              <li>
                Or launch the desktop host directly against any synced folder with the CLI flag: <code>--storage-dir=/path/to/synced/recipes</code>.
              </li>
              <li>
                After editing or receiving recipes from another device, click <strong>Rescan</strong> inside <strong>Recipe Storage Location</strong> to refresh your library.
              </li>
            </ol>
          </div>
        )}

        {platformTab === "android" && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Moving Recipes to &amp; from Android</h3>
            <ol className={styles.steps}>
              <li>
                Android 11+ restricts third-party sync apps from writing directly into app-private <code>Android/data/org.openrecipebook.app/files/recipes</code> storage without special permissions.
              </li>
              <li>
                <strong>Recommended Full Sync (keeps meal plans, folders &amp; shopping lists):</strong> Tap <strong>Export Full Library (.zip)</strong> in <strong>Settings</strong>, send the <code>.openrecipebook.zip</code> via <strong>LocalSend</strong>, Syncthing shared folder, or file transfer, then choose <strong>Import Recipes</strong> on your target device.
              </li>
              <li>
                <strong>Single-Recipe Sync:</strong> Copy synced <code>.recipe.json</code> files from your shared folder via <strong>Settings</strong> -&gt; <strong>Browse &amp; Add Recipe Files</strong> -&gt; <strong>Add Files</strong>.
              </li>
            </ol>
          </div>
        )}

        <div className={styles.noteBox}>
          <strong>How merging works:</strong> Folder sync merges individual <code>.recipe.json</code> files by newest <code>updatedAt</code> timestamp (last-write-wins). Meal plans, folders, and shopping lists sync cleanly when restoring a full <code>.openrecipebook.zip</code> archive.
        </div>
      </div>
    </Dialog>
  );
};
