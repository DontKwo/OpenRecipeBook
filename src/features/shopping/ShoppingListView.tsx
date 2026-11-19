import { useState, useMemo, type FC, type ReactElement, type MouseEvent, type ChangeEvent, type FormEvent } from "react";
import type { ShoppingList, ShoppingItem } from "../../domain/recipe/types";
import {
  formatShoppingListAsText,
  buildShoppingItemFromIngredient,
  getOrderedAisles,
  sortAisleGroups,
  reorderAisles
} from "../../domain/shopping/shoppingService";
import { PlusIcon, SearchIcon, MoreIcon, ChevronUp, ChevronDown, CheckIcon, XIcon } from "../../ui/icons";
import { Button, IconButton } from "../../ui/Button";
import { Menu } from "../../ui/Menu";
import { Dialog } from "../../ui/Dialog";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { useToast } from "../../ui/Toast";
import styles from "./ShoppingListView.module.css";

export interface ShoppingListViewProps {
  lists: ShoppingList[];
  onSaveList: (list: ShoppingList) => void;
  onCreateList: (name: string) => void;
  onDeleteList: (listId: string) => void;
}

export const ShoppingListView: FC<ShoppingListViewProps> = ({
  lists,
  onSaveList,
  onCreateList,
  onDeleteList
}): ReactElement => {
  const { showToast } = useToast();

  const [activeListId, setActiveListId] = useState<string>(() => lists[0]?.id || "");
  const [newItemText, setNewItemText] = useState<string>("");
  const [newListName, setNewListName] = useState<string>("");
  const [showNewListModal, setShowNewListModal] = useState<boolean>(false);
  const [showAisleModal, setShowAisleModal] = useState<boolean>(false);
  const [showResetAisleConfirm, setShowResetAisleConfirm] = useState<boolean>(false);
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState<boolean>(false);
  const [customAisleInput, setCustomAisleInput] = useState<string>("");
  const [itemFilterQuery, setItemFilterQuery] = useState<string>("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [aislePickerItem, setAislePickerItem] = useState<ShoppingItem | null>(null);

  const currentList = useMemo((): ShoppingList | undefined => {
    return lists.find((l: ShoppingList): boolean => l.id === activeListId) || lists[0];
  }, [lists, activeListId]);

  const orderedAisleList = useMemo((): string[] => {
    return getOrderedAisles(currentList);
  }, [currentList]);

  const handleToggleItem = (itemId: string): void => {
    if (!currentList) return;
    const updatedItems = currentList.items.map((item: ShoppingItem): ShoppingItem => {
      if (item.id === itemId) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });
    onSaveList({ ...currentList, items: updatedItems });
  };

  const handleDeleteItem = (itemId: string): void => {
    if (!currentList) return;
    const itemToDelete = currentList.items.find((item: ShoppingItem): boolean => item.id === itemId);
    if (!itemToDelete) return;

    const remaining = currentList.items.filter((item: ShoppingItem): boolean => item.id !== itemId);
    onSaveList({ ...currentList, items: remaining });

    showToast({
      message: `Removed "${itemToDelete.text}"`,
      undo: (): void => {
        onSaveList({ ...currentList, items: [...remaining, itemToDelete] });
      },
      undoLabel: "Undo"
    });
  };

  const handleTogglePantry = (itemId: string): void => {
    if (!currentList) return;
    const targetItem = currentList.items.find((i: ShoppingItem): boolean => i.id === itemId);
    if (!targetItem) return;
    const nextInPantry = !targetItem.inPantry;
    const updated = currentList.items.map((item: ShoppingItem): ShoppingItem => {
      if (item.id === itemId) {
        return { ...item, inPantry: nextInPantry, checked: nextInPantry ? false : item.checked };
      }
      return item;
    });
    onSaveList({ ...currentList, items: updated });
    showToast(nextInPantry ? `Moved "${targetItem.text}" to Pantry` : `Moved "${targetItem.text}" to Grocery List`);
  };

  const handleMoveItemToList = (itemId: string, targetListId: string): void => {
    if (!currentList || !targetListId || targetListId === currentList.id) return;
    const itemToMove = currentList.items.find((item: ShoppingItem): boolean => item.id === itemId);
    const targetList = lists.find((l: ShoppingList): boolean => l.id === targetListId);
    if (!itemToMove || !targetList) return;

    const remaining = currentList.items.filter((item: ShoppingItem): boolean => item.id !== itemId);
    onSaveList({ ...currentList, items: remaining });
    onSaveList({ ...targetList, items: [...targetList.items, itemToMove] });
    showToast(`Moved to ${targetList.name}`);
  };

  const handleChangeItemAisle = (itemId: string, newAisle: string): void => {
    if (!currentList || !newAisle) return;
    const updated = currentList.items.map((item: ShoppingItem): ShoppingItem => {
      if (item.id === itemId) {
        return { ...item, aisle: newAisle };
      }
      return item;
    });
    onSaveList({ ...currentList, items: updated });
    setAislePickerItem(null);
  };

  const handleAddItem = (e: FormEvent): void => {
    e.preventDefault();
    if (!currentList || !newItemText.trim()) return;

    const newItem = buildShoppingItemFromIngredient(newItemText.trim());
    onSaveList({
      ...currentList,
      items: [...currentList.items, newItem]
    });
    setNewItemText("");
  };

  const handleClearChecked = (): void => {
    if (!currentList) return;
    const checkedItems = currentList.items.filter((item: ShoppingItem): boolean => item.checked);
    if (checkedItems.length === 0) return;

    const remaining = currentList.items.filter((item: ShoppingItem): boolean => !item.checked);
    onSaveList({ ...currentList, items: remaining });

    showToast({
      message: `Cleared ${checkedItems.length} completed items`,
      undo: (): void => {
        onSaveList({ ...currentList, items: [...remaining, ...checkedItems] });
      },
      undoLabel: "Undo"
    });
  };

  const handleToggleAisleItems = (aisle: string, checkStatus: boolean, e: MouseEvent): void => {
    e.stopPropagation();
    if (!currentList) return;
    const updated = currentList.items.map((item: ShoppingItem): ShoppingItem => {
      if ((item.aisle || "Other") === aisle) {
        return { ...item, checked: checkStatus };
      }
      return item;
    });
    onSaveList({ ...currentList, items: updated });
  };

  const handleStartInlineEdit = (item: ShoppingItem): void => {
    setEditingItemId(item.id);
    setEditingText(item.text);
  };

  const handleSaveInlineEdit = (itemId: string, e?: FormEvent): void => {
    e?.preventDefault();
    if (!currentList) return;
    const trimmed = editingText.trim();
    if (trimmed) {
      const updated = currentList.items.map((item: ShoppingItem): ShoppingItem => {
        if (item.id === itemId) {
          return { ...item, text: trimmed };
        }
        return item;
      });
      onSaveList({ ...currentList, items: updated });
    }
    setEditingItemId(null);
  };

  const handleCopyText = async (): Promise<void> => {
    if (!currentList) return;
    const formatted = formatShoppingListAsText(currentList);
    try {
      await navigator.clipboard.writeText(formatted);
      showToast("Shopping list copied to clipboard");
    } catch {
      showToast("Unable to copy to clipboard");
    }
  };

  const handleShare = async (): Promise<void> => {
    if (!currentList) return;
    const formatted = formatShoppingListAsText(currentList);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: currentList.name,
          text: formatted
        });
        return;
      } catch {
        // Fall back to clipboard
      }
    }
    await handleCopyText();
  };

  const handleCreateNewList = (e: FormEvent): void => {
    e.preventDefault();
    if (!newListName.trim()) return;
    onCreateList(newListName.trim());
    setNewListName("");
    setShowNewListModal(false);
  };

  const handleMoveAisle = (index: number, direction: "up" | "down"): void => {
    if (!currentList) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newOrder = reorderAisles(orderedAisleList, index, targetIndex);
    onSaveList({
      ...currentList,
      aisleOrder: newOrder
    });
  };

  const handleAddCustomAisle = (e: FormEvent): void => {
    e.preventDefault();
    const trimmed = customAisleInput.trim();
    if (!currentList || !trimmed) return;
    if (orderedAisleList.includes(trimmed)) {
      setCustomAisleInput("");
      return;
    }

    const nextCustom = [...(currentList.customAisles || []), trimmed];
    const nextOrder = [...orderedAisleList, trimmed];
    onSaveList({
      ...currentList,
      customAisles: nextCustom,
      aisleOrder: nextOrder
    });
    setCustomAisleInput("");
  };

  const displayedItems = useMemo((): ShoppingItem[] => {
    if (!currentList) return [];
    const q = itemFilterQuery.toLowerCase().trim();
    if (!q) return currentList.items;
    return currentList.items.filter((item: ShoppingItem): boolean => {
      const matchText = item.text.toLowerCase().includes(q);
      const matchAisle = (item.aisle || "Other").toLowerCase().includes(q);
      return matchText || matchAisle;
    });
  }, [currentList, itemFilterQuery]);

  const pantryItems = useMemo((): ShoppingItem[] => {
    return displayedItems.filter((i: ShoppingItem): boolean => Boolean(i.inPantry));
  }, [displayedItems]);

  const activeGroceryItems = useMemo((): ShoppingItem[] => {
    return displayedItems.filter((i: ShoppingItem): boolean => !i.inPantry);
  }, [displayedItems]);

  const sortedAisleSections = useMemo((): Array<{ aisle: string; items: ShoppingItem[] }> => {
    const rawGroups: Record<string, ShoppingItem[]> = {};
    for (const item of activeGroceryItems) {
      const aisle = item.aisle || "Other";
      if (!rawGroups[aisle]) {
        rawGroups[aisle] = [];
      }
      rawGroups[aisle].push(item);
    }
    return sortAisleGroups(rawGroups, orderedAisleList);
  }, [displayedItems, orderedAisleList]);

  if (!currentList) {
    return (
      <div className={styles.emptyState}>
        <h2>No Shopping Lists</h2>
        <Button
          type="button"
          variant="primary"
          onClick={(): void => onCreateList("Weekly Groceries")}
        >
          Create First List
        </Button>
      </div>
    );
  }

  const checkedCount = currentList.items.filter((i: ShoppingItem): boolean => i.checked).length;
  const totalCount = currentList.items.length;

  return (
    <div className={styles.container}>
      {/* Top Header Row (single row, never wraps at 360px) */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <select
            className={styles.titleSelect}
            value={currentList.id}
            onChange={(e: ChangeEvent<HTMLSelectElement>): void => setActiveListId(e.target.value)}
            aria-label="Select shopping list"
          >
            {lists.map((l: ShoppingList): ReactElement => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.headerActions}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(): void => setShowNewListModal(true)}
          >
            <PlusIcon width={14} height={14} /> New
          </Button>

          {checkedCount > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClearChecked}
            >
              Clear Checked ({checkedCount})
            </Button>
          )}

          <Menu
            trigger={
              <IconButton
                icon={<MoreIcon width={18} height={18} />}
                aria-label="Shopping list menu"
                size="sm"
              />
            }
            items={[
              {
                id: "aisles-order",
                label: "Aisles Order",
                onClick: (): void => setShowAisleModal(true)
              },
              {
                id: "share",
                label: "Share List",
                onClick: handleShare
              },
              {
                id: "copy",
                label: "Copy to Clipboard",
                onClick: handleCopyText
              },
              {
                id: "print",
                label: "Print List",
                onClick: (): void => window.print()
              },
              {
                id: "clear-checked",
                label: "Clear Checked",
                disabled: checkedCount === 0,
                onClick: handleClearChecked
              },
              ...(lists.length > 1
                ? [
                    {
                      id: "delete-list",
                      label: "Delete List",
                      danger: true,
                      onClick: (): void => setShowDeleteListConfirm(true)
                    }
                  ]
                : [])
            ]}
          />
        </div>
      </div>

      {/* Quick Add Input */}
      <form onSubmit={handleAddItem} className={styles.addForm}>
        <input
          type="text"
          className={styles.addInput}
          placeholder="Add grocery item (e.g. 2 gal whole milk)..."
          value={newItemText}
          onChange={(e: ChangeEvent<HTMLInputElement>): void => setNewItemText(e.target.value)}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!newItemText.trim()}
        >
          Add
        </Button>
      </form>

      {/* Status & Search Strip */}
      <div className={styles.statusStrip}>
        <span>{checkedCount} of {totalCount} completed</span>
        {totalCount > 5 && (
          <div className={styles.searchBar}>
            <SearchIcon width={14} height={14} style={{ color: "var(--muted)" }} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Filter items..."
              value={itemFilterQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setItemFilterQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Aisle Group Sections */}
      {sortedAisleSections.map(({ aisle, items }) => {
        const allAisleChecked = items.length > 0 && items.every((i) => i.checked);

        return (
          <div key={aisle} className={styles.aisleSection}>
            <div className={styles.aisleHeader}>
              <h2 className={styles.aisleTitle}>
                {aisle} ({items.length})
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e: MouseEvent<HTMLButtonElement>): void =>
                  handleToggleAisleItems(aisle, !allAisleChecked, e)
                }
              >
                {allAisleChecked ? "Uncheck all" : "Check all"}
              </Button>
            </div>

            {items.map((item: ShoppingItem) => {
              const isEditing = editingItemId === item.id;

              return (
                <div key={item.id} className={styles.itemRow}>
                  <input
                    type="checkbox"
                    className={styles.itemCheckbox}
                    checked={item.checked}
                    onChange={(): void => handleToggleItem(item.id)}
                    aria-label={`Mark ${item.text} as completed`}
                  />

                  {isEditing ? (
                    <form
                      onSubmit={(e: FormEvent): void => handleSaveInlineEdit(item.id, e)}
                      style={{ display: "flex", gap: "4px", flex: 1 }}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingText}
                        onChange={(e: ChangeEvent<HTMLInputElement>): void => setEditingText(e.target.value)}
                        onBlur={(): void => handleSaveInlineEdit(item.id)}
                        className={styles.addInput}
                        style={{ padding: "4px 8px", fontSize: "0.9375rem" }}
                      />
                      <IconButton
                        icon={<CheckIcon width={14} height={14} />}
                        aria-label="Save edit"
                        type="submit"
                        size="sm"
                      />
                    </form>
                  ) : (
                    <span
                      className={item.checked ? styles.itemTextChecked : styles.itemText}
                      onClick={(): void => handleToggleItem(item.id)}
                      onDoubleClick={(): void => handleStartInlineEdit(item)}
                    >
                      {item.text}
                    </span>
                  )}

                  <div className={styles.itemActions}>
                    <Menu
                      trigger={
                        <IconButton
                          icon={<MoreIcon width={16} height={16} />}
                          aria-label={`Actions for ${item.text}`}
                          size="sm"
                        />
                      }
                      items={[
                        {
                          id: `edit-${item.id}`,
                          label: "Edit Text",
                          onClick: (): void => handleStartInlineEdit(item)
                        },
                        {
                          id: `pantry-${item.id}`,
                          label: item.inPantry ? "Move to Grocery List" : "I Have This (Pantry)",
                          onClick: (): void => handleTogglePantry(item.id)
                        },
                        {
                          id: `aisle-${item.id}`,
                          label: "Change Aisle",
                          onClick: (): void => setAislePickerItem(item)
                        },
                        ...(lists.length > 1
                          ? lists
                              .filter((l) => l.id !== currentList.id)
                              .map((target) => ({
                                id: `move-${target.id}`,
                                label: `Move to ${target.name}`,
                                onClick: (): void => handleMoveItemToList(item.id, target.id)
                              }))
                          : []),
                        {
                          id: `delete-${item.id}`,
                          label: "Delete",
                          danger: true,
                          onClick: (): void => handleDeleteItem(item.id) // # noqa: 81
                        }
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Pantry / Already Have Section */}
      {pantryItems.length > 0 && (
        <div
          style={{
            marginTop: "var(--space-6)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-alt)",
            padding: "var(--space-4)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 700, color: "var(--muted)" }}>
              Pantry Staples &bull; Already Have ({pantryItems.length})
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Excluded from grocery trip
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {pantryItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 10px",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)"
                }}
              >
                <span style={{ color: "var(--muted)", textDecoration: "line-through", fontSize: "0.875rem" }}>
                  {item.text}
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                    onClick={(): void => handleTogglePantry(item.id)}
                  >
                    Need to Buy &uarr;
                  </Button>
                  <IconButton
                    icon={<XIcon width={14} height={14} />}
                    size="sm"
                    aria-label={`Delete ${item.text}`}
                    onClick={(): void => handleDeleteItem(item.id)} // # noqa: 81
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New List Dialog */}
      <Dialog
        isOpen={showNewListModal}
        title="Create Shopping List"
        onClose={(): void => setShowNewListModal(false)}
        maxWidth={400}
      >
        <form onSubmit={handleCreateNewList} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <input
            type="text"
            autoFocus
            required
            className={styles.addInput}
            value={newListName}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => setNewListName(e.target.value)}
            placeholder="e.g. Costco, Farmer's Market..."
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={(): void => setShowNewListModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!newListName.trim()}
            >
              Create
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Aisles Order Dialog */}
      <Dialog
        isOpen={showAisleModal}
        title={`Aisles Order: ${currentList.name}`}
        onClose={(): void => setShowAisleModal(false)}
        maxWidth={480}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
            Arrange aisles to match the walking order of this store.
          </p>

          <form onSubmit={handleAddCustomAisle} style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              type="text"
              className={styles.addInput}
              value={customAisleInput}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setCustomAisleInput(e.target.value)}
              placeholder="Add custom aisle name..."
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={!customAisleInput.trim()}
            >
              Add
            </Button>
          </form>

          <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
            {orderedAisleList.map((aisle, idx) => (
              <div
                key={aisle}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  background: "var(--surface-alt)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)"
                }}
              >
                <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{aisle}</span>
                <div style={{ display: "flex", gap: "2px" }}>
                  <IconButton
                    icon={<ChevronUp width={14} height={14} />}
                    aria-label={`Move ${aisle} up`}
                    size="sm"
                    disabled={idx === 0}
                    onClick={(): void => handleMoveAisle(idx, "up")}
                  />
                  <IconButton
                    icon={<ChevronDown width={14} height={14} />}
                    aria-label={`Move ${aisle} down`}
                    size="sm"
                    disabled={idx === orderedAisleList.length - 1}
                    onClick={(): void => handleMoveAisle(idx, "down")}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-2)" }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(): void => setShowResetAisleConfirm(true)}
            >
              Reset to Default
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={(): void => setShowAisleModal(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Change Item Aisle Dialog */}
      <Dialog
        isOpen={Boolean(aislePickerItem)}
        title={`Set Aisle for "${aislePickerItem?.text}"`}
        onClose={(): void => setAislePickerItem(null)}
        maxWidth={400}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "300px", overflowY: "auto" }}>
          {orderedAisleList.map((a) => (
            <Button
              key={a}
              type="button"
              variant={aislePickerItem?.aisle === a ? "primary" : "secondary"}
              onClick={(): void => {
                if (aislePickerItem) {
                  handleChangeItemAisle(aislePickerItem.id, a);
                }
              }}
            >
              {a}
            </Button>
          ))}
        </div>
      </Dialog>

      {/* Reset Aisle Confirm */}
      <ConfirmDialog
        isOpen={showResetAisleConfirm}
        title="Reset aisle order?"
        message="Restore the default supermarket aisle walk layout for this list?"
        confirmLabel="Reset"
        onConfirm={(): void => {
          onSaveList({ ...currentList, aisleOrder: undefined });
          setShowResetAisleConfirm(false);
        }}
        onCancel={(): void => setShowResetAisleConfirm(false)}
      />

      {/* Delete List Confirm */}
      <ConfirmDialog
        isOpen={showDeleteListConfirm}
        title={`Delete "${currentList.name}"?`}
        message="Are you sure you want to delete this shopping list? All items in it will be removed."
        confirmLabel="Delete List"
        isDanger={true}
        onConfirm={(): void => {
          onDeleteList(currentList.id);
          setShowDeleteListConfirm(false);
        }}
        onCancel={(): void => setShowDeleteListConfirm(false)}
      />
    </div>
  );
};
