import { useState, type FC, type ReactElement, type FormEvent } from "react";
import type { Collection, Recipe } from "../../domain/recipe/types";
import { PlusIcon, TrashIcon, EditIcon, HeartIcon, BookOpenIcon, CloseIcon, FolderIcon } from "../../ui/icons";

export interface CollectionsSidebarProps {
  collections: Collection[];
  recipes: Recipe[];
  activeCollectionId: string | null;
  onlyFavorites: boolean;
  onSelectCollection: (collectionId: string | null) => void;
  onToggleFavoritesOnly: (only: boolean) => void;
  onSaveCollection: (collection: Collection) => void;
  onDeleteCollection: (collectionId: string) => void;
  onClose?: () => void;
}

export const CollectionsSidebar: FC<CollectionsSidebarProps> = ({
  collections,
  recipes,
  activeCollectionId,
  onlyFavorites,
  onSelectCollection,
  onToggleFavoritesOnly,
  onSaveCollection,
  onDeleteCollection,
  onClose
}): ReactElement => {
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [nameInput, setNameInput] = useState<string>("");
  const [descInput, setDescInput] = useState<string>("");

  const favoritesCount = recipes.filter((r: Recipe): boolean => r.favorite).length;

  // Count recipes in each collection
  const countForCollection = (colId: string): number => {
    return recipes.filter((r: Recipe): boolean => r.collectionIds?.includes(colId)).length;
  };

  const handleOpenCreate = (): void => {
    setNameInput("");
    setDescInput("");
    setShowCreateModal(true);
  };

  const handleOpenEdit = (col: Collection, e: React.MouseEvent): void => {
    e.stopPropagation();
    setEditingCollection(col);
    setNameInput(col.name);
    setDescInput(col.description || "");
  };

  const handleSaveNew = (e: FormEvent): void => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    const newCol: Collection = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      description: descInput.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onSaveCollection(newCol);
    setShowCreateModal(false);
  };

  const handleSaveEdit = (e: FormEvent): void => {
    e.preventDefault();
    if (!editingCollection) return;
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    const updated: Collection = {
      ...editingCollection,
      name: trimmed,
      description: descInput.trim() || undefined
    };

    onSaveCollection(updated);
    setEditingCollection(null);
  };

  const handleDelete = (colId: string, colName: string, e: React.MouseEvent): void => {
    e.stopPropagation();
    if (window.confirm(`Delete collection "${colName}"? Recipes will not be deleted.`)) {
      if (activeCollectionId === colId) {
        onSelectCollection(null);
      }
      onDeleteCollection(colId);
    }
  };

  return (
    <aside
      style={{
        width: "260px",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        gap: "var(--space-3)"
      }}
    >
      {/* Sidebar Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", margin: 0 }}>
          Folders
        </h2>
        <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              borderRadius: "var(--radius-full)",
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: 600
            }}
            title="Create new folder"
            aria-label="Create folder"
          >
            <PlusIcon width={12} height={12} /> New Folder
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                padding: "4px"
              }}
              title="Close collections sidebar"
              aria-label="Close"
            >
              <CloseIcon width={16} height={16} />
            </button>
          )}
        </div>
      </div>

      {/* Primary views: All and Favorites */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <button
          type="button"
          onClick={(): void => {
            onSelectCollection(null);
            onToggleFavoritesOnly(false);
          }}
          style={{
            background: activeCollectionId === null && !onlyFavorites ? "var(--surface-alt)" : "transparent",
            color: activeCollectionId === null && !onlyFavorites ? "var(--accent)" : "var(--text)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "8px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            fontWeight: activeCollectionId === null && !onlyFavorites ? 700 : 500,
            fontSize: "0.9rem",
            textAlign: "left"
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <BookOpenIcon width={16} height={16} /> All Recipes
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400 }}>
            {recipes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={(): void => {
            onSelectCollection(null);
            onToggleFavoritesOnly(true);
          }}
          style={{
            background: onlyFavorites ? "var(--surface-alt)" : "transparent",
            color: onlyFavorites ? "var(--accent)" : "var(--text)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "8px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            fontWeight: onlyFavorites ? 700 : 500,
            fontSize: "0.9rem",
            textAlign: "left"
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <HeartIcon fill={onlyFavorites ? "currentColor" : "none"} width={16} height={16} /> Favorites
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400 }}>
            {favoritesCount}
          </span>
        </button>
      </div>

      <div style={{ borderBottom: "1px solid var(--border)", margin: "var(--space-2) 0" }} />

      {/* User Collections List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto", flex: 1 }}>
        {collections.map((col: Collection) => {
          const isSelected = activeCollectionId === col.id && !onlyFavorites;
          const count = countForCollection(col.id);

          return (
            <div
              key={col.id}
              onClick={(): void => {
                onToggleFavoritesOnly(false);
                onSelectCollection(col.id);
              }}
              style={{
                background: isSelected ? "var(--surface-alt)" : "transparent",
                color: isSelected ? "var(--accent)" : "var(--text)",
                borderRadius: "var(--radius-md)",
                padding: "8px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                fontWeight: isSelected ? 700 : 500,
                fontSize: "0.9rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "8px" }}>
                <FolderIcon width={14} height={14} style={{ marginRight: "6px", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.name}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 400 }}>
                  {count}
                </span>

                <button
                  type="button"
                  onClick={(e): void => handleOpenEdit(col, e)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)",
                    padding: "2px",
                    display: "flex"
                  }}
                  title="Edit folder"
                  aria-label="Edit"
                >
                  <EditIcon width={12} height={12} />
                </button>

                <button
                  type="button"
                  onClick={(e): void => handleDelete(col.id, col.name, e)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--danger)",
                    padding: "2px",
                    display: "flex"
                  }}
                  title="Delete folder"
                  aria-label="Delete"
                >
                  <TrashIcon width={12} height={12} />
                </button>
              </div>
            </div>
          );
        })}

        {collections.length === 0 && (
          <div style={{ padding: "var(--space-4) var(--space-2)", fontSize: "0.85rem", color: "var(--muted)", textAlign: "center" }}>
            No custom folders yet. Click New Folder to create one.
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)"
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-6)",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", marginBottom: "var(--space-3)", margin: 0 }}>
              New Folder
            </h3>
            <form onSubmit={handleSaveNew} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nameInput}
                  onChange={(e): void => setNameInput(e.target.value)}
                  placeholder="e.g. Summer Grilling, Thanksgiving"
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={descInput}
                  onChange={(e): void => setDescInput(e.target.value)}
                  placeholder="e.g. Favorite recipes for backyard cookouts"
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={(): void => setShowCreateModal(false)}
                  style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Collection Modal */}
      {editingCollection && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)"
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-6)",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", margin: 0 }}>
              Edit Folder
            </h3>
            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nameInput}
                  onChange={(e): void => setNameInput(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={descInput}
                  onChange={(e): void => setDescInput(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={(): void => setEditingCollection(null)}
                  style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
