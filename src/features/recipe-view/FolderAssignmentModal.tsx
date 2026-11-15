import { useState, type FC, type ReactElement, type ChangeEvent } from "react";
import type { Recipe, Collection } from "../../domain/recipe/types";
import { FolderIcon, PlusIcon, CheckIcon } from "../../ui/icons";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";

export interface FolderAssignmentModalProps {
  recipe: Recipe;
  collections: Collection[];
  onSaveCollection: (collection: Collection) => Promise<void>;
  onUpdateRecipe: (recipe: Recipe) => Promise<void>;
  onClose: () => void;
}

export const FolderAssignmentModal: FC<FolderAssignmentModalProps> = ({
  recipe,
  collections,
  onSaveCollection,
  onUpdateRecipe,
  onClose
}): ReactElement => {
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>(
    recipe.collectionIds || []
  );
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const toggleFolder = (folderId: string): void => {
    setSelectedFolderIds((prev: string[]): string[] =>
      prev.includes(folderId) ? prev.filter((id: string): boolean => id !== folderId) : [...prev, folderId]
    );
  };

  const handleCreateFolder = async (): Promise<void> => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const newCollection: Collection = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      createdAt: new Date().toISOString()
    };
    await onSaveCollection(newCollection);
    setSelectedFolderIds((prev: string[]): string[] => [...prev, newCollection.id]);
    setNewFolderName("");
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const updated: Recipe = {
        ...recipe,
        collectionIds: selectedFolderIds,
        updatedAt: new Date().toISOString()
      };
      await onUpdateRecipe(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FolderIcon width={20} height={20} />
          Organize into Folders
        </span>
      }
      maxWidth={440}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", width: "100%" }}>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={saving}
            icon={<CheckIcon width={16} height={16} />}
            onClick={handleSave}
          >
            Save Folders
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)" }}>
          Select folders for &ldquo;{recipe.title}&rdquo;:
        </p>

        {/* Existing folders */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
          {collections.length === 0 ? (
            <div style={{ padding: "var(--space-3)", color: "var(--muted)", fontSize: "0.875rem" }}>
              No folders created yet. Create your first folder below!
            </div>
          ) : (
            collections.map((col: Collection): ReactElement => {
              const isChecked = selectedFolderIds.includes(col.id);
              return (
                <label
                  key={col.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    background: isChecked ? "var(--surface-alt)" : "transparent",
                    cursor: "pointer",
                    border: "1px solid var(--border)"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(): void => toggleFolder(col.id)}
                    style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
                  />
                  <FolderIcon width={18} height={18} style={{ color: "var(--accent)" }} />
                  <span style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{col.name}</span>
                </label>
              );
            })
          )}
        </div>

        {/* Create new folder input */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
            CREATE NEW FOLDER
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setNewFolderName(e.target.value)}
              onKeyDown={(e): void => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreateFolder();
                }
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)"
              }}
            />
            <Button
              variant="secondary"
              icon={<PlusIcon width={16} height={16} />}
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
