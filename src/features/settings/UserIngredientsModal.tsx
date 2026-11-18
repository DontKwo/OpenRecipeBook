import { useState, useMemo, type FC, type ReactElement, type ChangeEvent, type FormEvent } from "react";
import type { DictionaryIngredient, UnitFamily, IngredientSubstitution } from "../../domain/recipe/types";
import { BUILT_IN_INGREDIENTS } from "../../data/defaultIngredients";
import { getSubstitutionsForIngredient } from "../../domain/ingredients/substitutions";
import { PlusIcon, TrashIcon, DownloadIcon, UploadIcon } from "../../ui/icons";
import { Button, IconButton } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { useToast } from "../../ui/Toast";

export interface UserIngredientsModalProps {
  userIngredients: DictionaryIngredient[];
  onSaveIngredient: (item: DictionaryIngredient) => void;
  onDeleteIngredient: (id: string) => void;
  onImportUserIngredients: (items: DictionaryIngredient[]) => void;
  onClose: () => void;
}

export const UserIngredientsModal: FC<UserIngredientsModalProps> = ({
  userIngredients,
  onSaveIngredient,
  onDeleteIngredient,
  onImportUserIngredients,
  onClose
}): ReactElement => {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [onlyWithSubs, setOnlyWithSubs] = useState<boolean>(false);

  // New ingredient form state
  const [name, setName] = useState<string>("");
  const [aliases, setAliases] = useState<string>("");
  const [aisle, setAisle] = useState<string>("Pantry");
  const [unitFamily, setUnitFamily] = useState<UnitFamily>("volume");
  const [gramsPerMl, setGramsPerMl] = useState<string>("");

  const allIngredients = useMemo((): DictionaryIngredient[] => {
    return [...userIngredients, ...BUILT_IN_INGREDIENTS];
  }, [userIngredients]);

  const filtered = useMemo((): DictionaryIngredient[] => {
    const q = searchQuery.toLowerCase().trim();
    return allIngredients.filter((item: DictionaryIngredient): boolean => {
      const subs = item.substitutions && item.substitutions.length > 0
        ? item.substitutions
        : getSubstitutionsForIngredient(item.name);

      if (onlyWithSubs && subs.length === 0) {
        return false;
      }

      if (!q) return true;

      const matchName = item.name.toLowerCase().includes(q);
      const matchAlias = item.aliases.some((a: string): boolean => a.toLowerCase().includes(q));
      const matchSub = subs.some((s) =>
        s.substituteIngredient.toLowerCase().includes(q) ||
        s.why.toLowerCase().includes(q) ||
        s.when.toLowerCase().includes(q)
      );
      return matchName || matchAlias || matchSub;
    });
  }, [allIngredients, searchQuery, onlyWithSubs]);

  const handleCreate = (e: FormEvent): void => {
    e.preventDefault();
    if (!name.trim()) return;

    const aliasList = aliases
      .split(",")
      .map((a: string): string => a.trim())
      .filter(Boolean);

    const newItem: DictionaryIngredient = {
      id: `user-ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim().toLowerCase(),
      aliases: aliasList,
      aisle: aisle.trim() || "Pantry",
      unitFamily,
      gramsPerMl: gramsPerMl ? parseFloat(gramsPerMl) : undefined,
      user: true
    };

    onSaveIngredient(newItem);
    setName("");
    setAliases("");
    setGramsPerMl("");
    setShowAddForm(false);
    showToast(`Added custom ingredient "${newItem.name}"`);
  };

  const handleExportJson = (): void => {
    const blob = new Blob([JSON.stringify(userIngredients, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-custom-ingredients-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported custom ingredients JSON");
  };

  const handleImportJson = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>): void => {
      try {
        const text = String(event.target?.result || "");
        const parsed = JSON.parse(text) as DictionaryIngredient[];
        if (Array.isArray(parsed)) {
          onImportUserIngredients(parsed);
          showToast(`Successfully imported ${parsed.length} custom ingredients`);
        }
      } catch {
        showToast("Failed to parse ingredients JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <Dialog
      isOpen={true}
      title="My Ingredients Dictionary"
      onClose={onClose}
      maxWidth={680}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          {userIngredients.length} custom entries | {BUILT_IN_INGREDIENTS.length} built-in
        </div>

        {/* Action bar: Search, Add, Import/Export */}
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => setSearchQuery(e.target.value)}
            placeholder="Search ingredients & aliases..."
            style={{
              flex: 1,
              minWidth: "180px",
              padding: "8px 12px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)"
            }}
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={(): void => setShowAddForm(!showAddForm)}
          >
            <PlusIcon width={14} height={14} /> Add Ingredient
          </Button>

          <Button
            type="button"
            variant={onlyWithSubs ? "primary" : "secondary"}
            size="sm"
            onClick={(): void => setOnlyWithSubs(!onlyWithSubs)}
          >
            {onlyWithSubs ? "All Ingredients" : "Has Substitutions"}
          </Button>

          <IconButton
            icon={<DownloadIcon width={16} height={16} />}
            aria-label="Export custom ingredients JSON"
            size="sm"
            onClick={handleExportJson}
          />

          <label
            style={{ cursor: "pointer", display: "inline-flex" }}
            title="Import custom ingredients JSON"
          >
            <span style={{ display: "none" }}>Import</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              style={{ display: "none" }}
            />
            <IconButton
              icon={<UploadIcon width={16} height={16} />}
              aria-label="Import custom ingredients JSON"
              size="sm"
              onClick={(): void => {}}
            />
          </label>
        </div>

        {/* Add Form Drawer */}
        {showAddForm && (
          <form
            onSubmit={handleCreate}
            style={{
              background: "var(--surface-alt)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)"
            }}
          >
            <h4 style={{ margin: 0 }}>Add Custom Ingredient</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>
                  Name *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
                  placeholder="e.g. oat milk"
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>
                  Aisle
                </label>
                <input
                  type="text"
                  value={aisle}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setAisle(e.target.value)}
                  placeholder="e.g. Dairy / Plant Milk"
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)"
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>
                Aliases (comma separated)
              </label>
              <input
                type="text"
                value={aliases}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setAliases(e.target.value)}
                placeholder="e.g. oatmilk, barista oat milk"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)"
                }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>
                  Unit Family
                </label>
                <select
                  value={unitFamily}
                  onChange={(e: ChangeEvent<HTMLSelectElement>): void => setUnitFamily(e.target.value as UnitFamily)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)"
                  }}
                >
                  <option value="volume">Volume (cups, ml, tbsp)</option>
                  <option value="weight">Weight (grams, oz, lb)</option>
                  <option value="count">Count (pieces, cans, cloves)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)" }}>
                  Density (grams per ml, optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={gramsPerMl}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setGramsPerMl(e.target.value)}
                  placeholder="e.g. 1.03"
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)"
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(): void => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                Save Ingredient
              </Button>
            </div>
          </form>
        )}

        {/* List of Ingredients */}
        <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.map((item: DictionaryIngredient): ReactElement => {
            const subs = item.substitutions && item.substitutions.length > 0
              ? item.substitutions
              : getSubstitutionsForIngredient(item.name);
            const isExpanded = expandedSubId === item.id;

            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: isExpanded ? "var(--surface-alt)" : "var(--surface)",
                  fontSize: "0.875rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {item.name}{" "}
                      {item.user && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            background: "var(--accent)",
                            color: "var(--accent-contrast)",
                            padding: "1px 6px",
                            borderRadius: "var(--radius-full)"
                          }}
                        >
                          Custom
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      Aisle: {item.aisle} | Family: {item.unitFamily}
                      {item.aliases.length > 0 && ` | Aliases: ${item.aliases.join(", ")}`}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {subs.length > 0 && (
                      <button
                        type="button"
                        onClick={(): void => setExpandedSubId(isExpanded ? null : item.id)}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-full)",
                          padding: "3px 10px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          color: "var(--accent)",
                          fontWeight: 600
                        }}
                      >
                        {subs.length} Substitute{subs.length > 1 ? "s" : ""} ({isExpanded ? "Hide" : "View"})
                      </button>
                    )}

                    {item.user && (
                      <IconButton
                        icon={<TrashIcon width={16} height={16} />}
                        aria-label={`Delete custom ingredient ${item.name}`}
                        size="sm"
                        onClick={(): void => onDeleteIngredient(item.id)}
                      />
                    )}
                  </div>
                </div>

                {isExpanded && subs.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      background: "var(--surface)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)" }}>
                      Culinary Substitutions for {item.name}:
                    </div>
                    {subs.map((s: IngredientSubstitution, idx: number): ReactElement => (
                      <div
                        key={idx}
                        style={{
                          padding: "6px 8px",
                          background: "var(--surface-alt)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          fontSize: "0.75rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: 3
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                          <strong>{s.substituteIngredient}</strong>
                          <span
                            style={{
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: s.qualityGrade.startsWith("A") ? "#e8f5e9" : "#fff3e0",
                              color: s.qualityGrade.startsWith("A") ? "#2e7d32" : "#b26a00"
                            }}
                          >
                            Grade {s.qualityGrade} ({s.ratio}x ratio)
                          </span>
                        </div>
                        {s.amountNote && (
                          <div style={{ color: "var(--warning)", fontWeight: 600 }}>{s.amountNote}</div>
                        )}
                        <div><strong>Why:</strong> {s.why}</div>
                        <div><strong>When:</strong> {s.when}</div>
                        <div><strong>How:</strong> {s.how}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
};
