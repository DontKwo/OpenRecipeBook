import { useState, useMemo, type FC, type ReactElement, type MouseEvent, type ChangeEvent, type FormEvent } from "react";
import type { ShoppingList, ShoppingItem } from "../../domain/recipe/types";
import {
  formatShoppingListAsText,
  buildShoppingItemFromIngredient,
  getOrderedAisles,
  sortAisleGroups,
  reorderAisles
} from "../../domain/shopping/shoppingService";
import { PlusIcon, CopyIcon, TrashIcon, PrinterIcon, EditIcon, CheckIcon, CloseIcon, SearchIcon } from "../../ui/icons";

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
  const [activeListId, setActiveListId] = useState<string>(() => lists[0]?.id || "");
  const [newItemText, setNewItemText] = useState<string>("");
  const [newListName, setNewListName] = useState<string>("");
  const [showNewListModal, setShowNewListModal] = useState<boolean>(false);
  const [showAisleModal, setShowAisleModal] = useState<boolean>(false);
  const [customAisleInput, setCustomAisleInput] = useState<string>("");
  const [itemFilterQuery, setItemFilterQuery] = useState<string>("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

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

  const handleDeleteItem = (itemId: string, e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    if (!currentList) return;
    const remaining = currentList.items.filter((item: ShoppingItem): boolean => item.id !== itemId);
    onSaveList({ ...currentList, items: remaining });
  };

  const handleMoveItem = (itemId: string, targetListId: string, e: ChangeEvent<HTMLSelectElement>): void => {
    e.stopPropagation();
    if (!currentList || !targetListId || targetListId === currentList.id) return;
    const itemToMove = currentList.items.find((item: ShoppingItem): boolean => item.id === itemId);
    const targetList = lists.find((l: ShoppingList): boolean => l.id === targetListId);
    if (!itemToMove || !targetList) return;

    const remaining = currentList.items.filter((item: ShoppingItem): boolean => item.id !== itemId);
    onSaveList({ ...currentList, items: remaining });
    onSaveList({ ...targetList, items: [...targetList.items, itemToMove] });
  };

  const handleChangeItemAisle = (itemId: string, newAisle: string, e: ChangeEvent<HTMLSelectElement>): void => {
    e.stopPropagation();
    if (!currentList || !newAisle) return;
    const updated = currentList.items.map((item: ShoppingItem): ShoppingItem => {
      if (item.id === itemId) {
        return { ...item, aisle: newAisle };
      }
      return item;
    });
    onSaveList({ ...currentList, items: updated });
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
    const remaining = currentList.items.filter((item: ShoppingItem): boolean => !item.checked);
    onSaveList({ ...currentList, items: remaining });
  };

  const handleToggleAll = (checkStatus: boolean): void => {
    if (!currentList) return;
    const updated = currentList.items.map((item: ShoppingItem): ShoppingItem => ({ ...item, checked: checkStatus }));
    onSaveList({ ...currentList, items: updated });
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

  const handleStartInlineEdit = (item: ShoppingItem, e: MouseEvent): void => {
    e.stopPropagation();
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
    await navigator.clipboard.writeText(formatted);
    alert("Shopping list copied to clipboard!");
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

  const handlePrint = (): void => {
    window.print();
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

  const handleResetAisleOrder = (): void => {
    if (!currentList) return;
    if (window.confirm("Reset store aisle order to default layout?")) {
      onSaveList({
        ...currentList,
        aisleOrder: undefined
      });
    }
  };

  // Filter items by search text
  const displayedItems = useMemo((): ShoppingItem[] => {
    if (!currentList) return [];
    const query = itemFilterQuery.trim().toLowerCase();
    if (!query) return currentList.items;
    return currentList.items.filter((item: ShoppingItem): boolean => {
      const matchText = item.text.toLowerCase().includes(query);
      const matchAisle = item.aisle ? item.aisle.toLowerCase().includes(query) : false;
      return matchText || matchAisle;
    });
  }, [currentList, itemFilterQuery]);

  // Group items by aisle and sort by custom aisle order
  const sortedAisleSections = useMemo((): Array<{ aisle: string; items: ShoppingItem[] }> => {
    const rawGroups: Record<string, ShoppingItem[]> = {};
    for (const item of displayedItems) {
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
      <div style={{ textAlign: "center", padding: "var(--space-12)" }}>
        <h2>No Shopping Lists</h2>
        <button
          type="button"
          onClick={(): void => onCreateList("Weekly Groceries")}
          style={{
            background: "var(--accent)",
            color: "var(--accent-contrast)",
            border: "none",
            padding: "10px 20px",
            borderRadius: "var(--radius-full)",
            cursor: "pointer",
            marginTop: "var(--space-4)"
          }}
        >
          Create First List
        </button>
      </div>
    );
  }

  const checkedCount = currentList.items.filter((i: ShoppingItem): boolean => i.checked).length;
  const totalCount = currentList.items.length;

  return (
    <div style={{ maxWidth: "840px", margin: "0 auto", padding: "var(--space-6)" }}>
      {/* Header & List Selector */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)", gap: "var(--space-3)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.25rem", marginBottom: "4px" }}>
            Shopping List
          </h1>
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <select
              value={currentList.id}
              onChange={(e: ChangeEvent<HTMLSelectElement>): void => setActiveListId(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontWeight: 600
              }}
            >
              {lists.map((l: ShoppingList): ReactElement => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.items.length})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={(): void => setShowNewListModal(true)}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "0.85rem"
              }}
            >
              + New List
            </button>

            <button
              type="button"
              onClick={(): void => setShowAisleModal(true)}
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 500
              }}
              title="Organize aisle walk order for this store"
            >
              Aisles Order
            </button>

            {lists.length > 1 && (
              <button
                type="button"
                onClick={(): void => {
                  if (window.confirm(`Delete list "${currentList.name}"?`)) {
                    onDeleteList(currentList.id);
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--danger)",
                  cursor: "pointer",
                  padding: "6px"
                }}
                title="Delete this list"
                aria-label="Delete list"
              >
                <TrashIcon width={16} height={16} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)", marginRight: "var(--space-2)" }}>
            {checkedCount} of {totalCount} completed
          </span>

          <button
            type="button"
            onClick={handleShare}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem"
            }}
          >
            <CopyIcon width={14} height={14} /> Share
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem"
            }}
          >
            <PrinterIcon width={14} height={14} /> Print
          </button>

          <button
            type="button"
            onClick={(): void => handleToggleAll(true)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              padding: "8px 12px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              fontSize: "0.85rem"
            }}
          >
            Check All
          </button>

          <button
            type="button"
            onClick={handleClearChecked}
            style={{
              background: "var(--surface)",
              color: "var(--muted)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              fontSize: "0.85rem"
            }}
          >
            Clear Checked
          </button>
        </div>
      </div>

      {/* Search and Quick Add Bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        {/* Search filter if list has items */}
        {totalCount > 4 && (
          <div style={{ position: "relative" }}>
            <input
              type="search"
              value={itemFilterQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setItemFilterQuery(e.target.value)}
              placeholder="Filter items in this list..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontSize: "0.9rem"
              }}
            />
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
              <SearchIcon width={16} height={16} />
            </span>
          </div>
        )}

        {/* Add Item Row */}
        <form onSubmit={handleAddItem} style={{ display: "flex", gap: "var(--space-2)" }}>
          <input
            type="text"
            value={newItemText}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => setNewItemText(e.target.value)}
            placeholder="Add an item (e.g. 2 cups flour, apples, foil)..."
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)",
              background: "var(--surface)"
            }}
          />
          <button
            type="submit"
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
              gap: "6px"
            }}
          >
            <PlusIcon width={16} height={16} /> Add
          </button>
        </form>
      </div>

      {/* Aisle Groups */}
      {sortedAisleSections.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {sortedAisleSections.map(({ aisle, items }) => {
            const aisleChecked = items.filter((i: ShoppingItem): boolean => i.checked).length;
            const allAisleChecked = aisleChecked === items.length;

            return (
              <div
                key={aisle}
                style={{
                  background: "var(--surface)",
                  padding: "var(--space-4) var(--space-6)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <h2 style={{ fontSize: "1rem", textTransform: "uppercase", color: "var(--accent)", letterSpacing: "0.5px", margin: 0 }}>
                      {aisle}
                    </h2>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      ({items.length})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e: MouseEvent): void => handleToggleAisleItems(aisle, !allAisleChecked, e)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      fontSize: "0.78rem"
                    }}
                  >
                    {allAisleChecked ? "Uncheck all" : "Check all"}
                  </button>
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {items.map((item: ShoppingItem) => {
                    const isEditing = editingItemId === item.id;

                    return (
                      <li
                        key={item.id}
                        onClick={(): void => handleToggleItem(item.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "var(--space-2)",
                          padding: "8px 0",
                          borderBottom: "1px solid var(--surface-alt)",
                          cursor: "pointer",
                          textDecoration: item.checked ? "line-through" : "none",
                          color: item.checked ? "var(--muted)" : "var(--text)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(): void => {}}
                            style={{ cursor: "pointer" }}
                          />

                          {isEditing ? (
                            <form
                              onSubmit={(e: FormEvent): void => handleSaveInlineEdit(item.id, e)}
                              onClick={(e: MouseEvent): void => e.stopPropagation()}
                              style={{ display: "flex", gap: "4px", flex: 1 }}
                            >
                              <input
                                type="text"
                                autoFocus
                                value={editingText}
                                onChange={(e: ChangeEvent<HTMLInputElement>): void => setEditingText(e.target.value)}
                                onBlur={(): void => handleSaveInlineEdit(item.id)}
                                style={{
                                  flex: 1,
                                  padding: "4px 8px",
                                  borderRadius: "var(--radius-sm)",
                                  border: "1px solid var(--accent)",
                                  background: "var(--surface)",
                                  fontSize: "0.95rem"
                                }}
                              />
                              <button
                                type="submit"
                                style={{
                                  background: "var(--accent)",
                                  color: "var(--accent-contrast)",
                                  border: "none",
                                  borderRadius: "var(--radius-sm)",
                                  padding: "4px 8px",
                                  cursor: "pointer"
                                }}
                              >
                                <CheckIcon width={14} height={14} />
                              </button>
                            </form>
                          ) : (
                            <span
                              onDoubleClick={(e: MouseEvent): void => handleStartInlineEdit(item, e)}
                              style={{ fontSize: "1rem" }}
                            >
                              {item.text}
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }} onClick={(e: MouseEvent): void => e.stopPropagation()}>
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={(e: MouseEvent): void => handleStartInlineEdit(item, e)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--muted)",
                                cursor: "pointer",
                                padding: "2px",
                                display: "flex"
                              }}
                              title="Edit item name"
                              aria-label="Edit item"
                            >
                              <EditIcon width={13} height={13} />
                            </button>
                          )}

                          {item.recipeId && (
                            <span style={{ fontSize: "0.78rem", color: "var(--muted)", background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                              {item.recipeId}
                            </span>
                          )}

                          {/* Aisle selector */}
                          <select
                            value={item.aisle || "Pantry"}
                            onChange={(e: ChangeEvent<HTMLSelectElement>): void => handleChangeItemAisle(item.id, e.target.value, e)}
                            style={{
                              fontSize: "0.75rem",
                              padding: "2px 6px",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--border)",
                              background: "var(--surface)",
                              color: "var(--muted)"
                            }}
                          >
                            {orderedAisleList.map((a: string) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>

                          {/* Move to another list if multi-list */}
                          {lists.length > 1 && (
                            <select
                              defaultValue=""
                              onChange={(e: ChangeEvent<HTMLSelectElement>): void => handleMoveItem(item.id, e.target.value, e)}
                              style={{
                                fontSize: "0.75rem",
                                padding: "2px 6px",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--border)",
                                background: "var(--surface)",
                                color: "var(--muted)"
                              }}
                            >
                              <option value="" disabled>Move...</option>
                              {lists.filter((l: ShoppingList): boolean => l.id !== currentList.id).map((l: ShoppingList) => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Delete item button */}
                          <button
                            type="button"
                            onClick={(e: MouseEvent<HTMLButtonElement>): void => handleDeleteItem(item.id, e)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--muted)",
                              cursor: "pointer",
                              padding: "4px"
                            }}
                            title="Delete item"
                            aria-label="Delete"
                          >
                            <TrashIcon width={14} height={14} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--muted)" }}>
          {itemFilterQuery ? "No matching items found in this list." : "This shopping list is currently empty."}
        </div>
      )}

      {/* Reorder Aisles Modal */}
      {showAisleModal && (
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
              maxWidth: "480px",
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", margin: 0 }}>
                Store Aisles Order: {currentList.name}
              </h3>
              <button
                type="button"
                onClick={(): void => setShowAisleModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                aria-label="Close"
              >
                <CloseIcon width={18} height={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 var(--space-4) 0" }}>
              Arrange aisles to match the walk layout of this grocery store. Items on your list will appear in this order.
            </p>

            {/* Custom Aisle Add Form */}
            <form onSubmit={handleAddCustomAisle} style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              <input
                type="text"
                value={customAisleInput}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setCustomAisleInput(e.target.value)}
                placeholder="New aisle name (e.g. Bulk, Pharmacy)..."
                style={{ flex: 1, padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
              />
              <button
                type="submit"
                style={{
                  background: "var(--surface-alt)",
                  border: "1px solid var(--border)",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem"
                }}
              >
                + Add Aisle
              </button>
            </form>

            {/* Aisles List */}
            <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }}>
              {orderedAisleList.map((aisle: string, idx: number) => {
                const count = currentList.items.filter((i: ShoppingItem): boolean => (i.aisle || "Other") === aisle).length;

                return (
                  <div
                    key={aisle}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--surface-alt)",
                      border: "1px solid var(--border)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", width: "18px" }}>
                        {idx + 1}.
                      </span>
                      <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{aisle}</span>
                      {count > 0 && (
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)", background: "var(--surface)", padding: "1px 6px", borderRadius: "var(--radius-sm)" }}>
                          {count} item{count === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(): void => handleMoveAisle(idx, "up")}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          cursor: idx === 0 ? "default" : "pointer",
                          opacity: idx === 0 ? 0.4 : 1,
                          fontSize: "0.75rem"
                        }}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === orderedAisleList.length - 1}
                        onClick={(): void => handleMoveAisle(idx, "down")}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          cursor: idx === orderedAisleList.length - 1 ? "default" : "pointer",
                          opacity: idx === orderedAisleList.length - 1 ? 0.4 : 1,
                          fontSize: "0.75rem"
                        }}
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-4)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={handleResetAisleOrder}
                style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }}
              >
                Reset to Default Layout
              </button>
              <button
                type="button"
                onClick={(): void => setShowAisleModal(false)}
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  border: "none",
                  padding: "6px 16px",
                  borderRadius: "var(--radius-full)",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New List Modal */}
      {showNewListModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100
          }}
        >
          <div style={{ background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", width: "90%", maxWidth: "400px" }}>
            <h3 style={{ marginBottom: "var(--space-3)", margin: 0 }}>Create New Shopping List</h3>
            <form onSubmit={handleCreateNewList} style={{ marginTop: "var(--space-3)" }}>
              <input
                type="text"
                autoFocus
                required
                value={newListName}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setNewListName(e.target.value)}
                placeholder="e.g. Costco, Farmer's Market..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: "var(--space-4)" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={(): void => setShowNewListModal(false)}
                  style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: "none", padding: "8px 18px", borderRadius: "var(--radius-full)", cursor: "pointer", fontWeight: 600 }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
