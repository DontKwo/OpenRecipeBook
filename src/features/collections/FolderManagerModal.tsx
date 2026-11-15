import { useState, type FC, type ReactElement, type ChangeEvent, type KeyboardEvent } from "react";
import type { Collection, Recipe } from "../../domain/recipe/types";
import { FolderIcon, PlusIcon, EditIcon, TrashIcon, CheckIcon } from "../../ui/icons";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { ConfirmDialog } from "../../ui/ConfirmDialog";

export interface FolderManagerModalProps {
  collections: Collection[];
  recipes: Recipe[];
  onSaveCollection: (collection: Collection) => Promise<void> | void;
  onDeleteCollection: (collectionId: string) => Promise<void> | void;
  onClose: () => void;
}

export const FolderManagerModal: FC<FolderManagerModalProps> = ({
  collections,
  recipes,
  onSaveCollection,
  onDeleteCollection,
  onClose
}): ReactElement => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [deletingCol, setDeletingCol] = useState<Collection | null>(null);

  const handleStartEdit = (col: Collection): void => {
    setEditingId(col.id);
    setEditName(col.name);
  };

  const handleSaveEdit = async (col: Collection): Promise<void> => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await onSaveCollection({ ...col, name: trimmed });
    setEditingId(null);
  };

  const handleCreate = async (): Promise<void> => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const newCol: Collection = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      createdAt: new Date().toISOString()
    };
    await onSaveCollection(newCol);
    setNewFolderName("");
  };

  const getRecipeCount = (colId: string): number => {
    return recipes.filter((r: Recipe): boolean => r.collectionIds?.includes(colId) ?? false).length;
  };

  return (
    <>
      <Dialog
        isOpen
        onClose={onClose}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <FolderIcon width={20} height={20} />
            Manage Folders
          </span>
        }
        maxWidth={460}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* New folder row */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="New folder name..."
              value={newFolderName}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setNewFolderName(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreate();
                }
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: "0.9375rem"
              }}
            />
            <Button
              variant="primary"
              size="sm"
              icon={<PlusIcon width={16} height={16} />}
              onClick={handleCreate}
              disabled={!newFolderName.trim()}
            >
              Create
            </Button>
          </div>

          {/* List of folders */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
            {collections.length === 0 ? (
              <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--muted)" }}>
                No folders created yet.
              </div>
            ) : (
              collections.map((col: Collection): ReactElement => {
                const count = getRecipeCount(col.id);
                const isEditing = editingId === col.id;

                return (
                  <div
                    key={col.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-alt)",
                      border: "1px solid var(--border)",
                      gap: 8
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e: ChangeEvent<HTMLInputElement>): void => setEditName(e.target.value)}
                          onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleSaveEdit(col);
                            }
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--accent)",
                            background: "var(--surface)",
                            color: "var(--text)"
                          }}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<CheckIcon width={14} height={14} />}
                          onClick={(): Promise<void> => handleSaveEdit(col)}
                        />
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <FolderIcon width={18} height={18} style={{ color: "var(--accent)" }} />
                          <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{col.name}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>({count})</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<EditIcon width={16} height={16} />}
                            aria-label={`Edit ${col.name}`}
                            onClick={(): void => handleStartEdit(col)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<TrashIcon width={16} height={16} />}
                            aria-label={`Delete ${col.name}`}
                            onClick={(): void => setDeletingCol(col)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Dialog>

      {deletingCol && (
        <ConfirmDialog
          isOpen
          title="Delete Folder"
          message={`Are you sure you want to delete folder "${deletingCol.name}"? Recipes in this folder will not be deleted.`}
          confirmLabel="Delete Folder"
          isDanger
          onConfirm={(): void => {
            void onDeleteCollection(deletingCol.id);
            setDeletingCol(null);
          }}
          onCancel={(): void => setDeletingCol(null)}
        />
      )}
    </>
  );
};
