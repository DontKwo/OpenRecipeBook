import { useState, useMemo, type FC, type ReactElement } from "react";
import type { DictionaryIngredient, UnitFamily } from "../../domain/recipe/types";
import { BUILT_IN_INGREDIENTS } from "../../data/defaultIngredients";
import { PlusIcon, TrashIcon, XIcon, DownloadIcon, UploadIcon } from "../../ui/icons";

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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // New ingredient form state
  const [name, setName] = useState<string>("");
  const [aliases, setAliases] = useState<string>("");
  const [aisle, setAisle] = useState<string>("Pantry");
  const [unitFamily, setUnitFamily] = useState<UnitFamily>("volume");
  const [gramsPerMl, setGramsPerMl] = useState<string>("");

  const allIngredients = useMemo(() => {
    return [...userIngredients, ...BUILT_IN_INGREDIENTS];
  }, [userIngredients]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allIngredients;
    return allIngredients.filter((item) => {
      return item.name.toLowerCase().includes(q) || item.aliases.some((a) => a.toLowerCase().includes(q));
    });
  }, [allIngredients, searchQuery]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const id = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    const aliasList = aliases
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const parsedDensity = gramsPerMl ? parseFloat(gramsPerMl) : undefined;

    const newIng: DictionaryIngredient = {
      id: `user-${id}`,
      name: name.trim(),
      aliases: aliasList,
      aisle: aisle.trim() || "Pantry",
      unitFamily,
      gramsPerMl: parsedDensity,
      densitySource: parsedDensity ? "User Added" : undefined,
      user: true
    };

    onSaveIngredient(newIng);
    setName("");
    setAliases("");
    setGramsPerMl("");
    setShowAddForm(false);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(userIngredients, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-ingredients.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || "");
        const parsed = JSON.parse(text) as DictionaryIngredient[];
        if (Array.isArray(parsed)) {
          onImportUserIngredients(parsed);
          alert(`Successfully imported ${parsed.length} custom ingredients!`);
        }
      } catch {
        alert("Failed to parse ingredients JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
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
      <div
        style={{
          background: "var(--surface)",
          padding: "var(--space-6)",
          borderRadius: "var(--radius-lg)",
          width: "90%",
          maxWidth: "700px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}>
              My Ingredients Dictionary
            </h2>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {userIngredients.length} custom entries · {BUILT_IN_INGREDIENTS.length} built-in
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
          >
            <XIcon width={20} height={20} />
          </button>
        </div>

        {/* Action bar: Search, Add, Import/Export */}
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients & aliases..."
            style={{ flex: 1, minWidth: "180px", padding: "8px 12px", borderRadius: "var(--radius-full)", border: "1px solid var(--border)", background: "var(--surface)" }}
          />
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              padding: "8px 16px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <PlusIcon width={16} height={16} /> Add Ingredient
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
            title="Export custom ingredients JSON"
          >
            <DownloadIcon width={16} height={16} />
          </button>

          <label
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "var(--radius-full)", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
            title="Import custom ingredients JSON"
          >
            <UploadIcon width={16} height={16} />
            <input type="file" accept=".json" onChange={handleImportJson} style={{ display: "none" }} />
          </label>
        </div>

        {/* Add Form Drawer */}
        {showAddForm && (
          <form onSubmit={handleCreate} style={{ background: "var(--surface-alt)", padding: "var(--space-4)", borderRadius: "var(--radius-md)", marginBottom: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <h4 style={{ margin: 0 }}>Add Custom Ingredient</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600 }}>Name *</label>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. oat milk" style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600 }}>Aisle</label>
                <input type="text" value={aisle} onChange={(e) => setAisle(e.target.value)} placeholder="e.g. Dairy / Plant Milk" style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--border)" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600 }}>Aliases (comma separated)</label>
              <input type="text" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="e.g. oatmilk, barista oat milk" style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--border)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600 }}>Unit Family</label>
                <select value={unitFamily} onChange={(e) => setUnitFamily(e.target.value as UnitFamily)} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <option value="volume">Volume (cups, ml, tbsp)</option>
                  <option value="weight">Weight (grams, oz, lb)</option>
                  <option value="count">Count (pieces, cans, cloves)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600 }}>Density (grams per ml, optional)</label>
                <input type="number" step="0.01" value={gramsPerMl} onChange={(e) => setGramsPerMl(e.target.value)} placeholder="e.g. 1.03" style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid var(--border)" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ background: "none", border: "1px solid var(--border)", padding: "6px 14px", borderRadius: "var(--radius-full)", cursor: "pointer" }}>Cancel</button>
              <button type="submit" style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: "none", padding: "6px 16px", borderRadius: "var(--radius-full)", cursor: "pointer", fontWeight: 600 }}>Save Ingredient</button>
            </div>
          </form>
        )}

        {/* List of Ingredients */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.9rem"
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {item.name} {item.user && <span style={{ fontSize: "0.75rem", background: "var(--accent)", color: "white", padding: "1px 6px", borderRadius: "var(--radius-full)" }}>Custom</span>}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  Aisle: {item.aisle} · Family: {item.unitFamily}
                  {item.aliases.length > 0 && ` · Aliases: ${item.aliases.join(", ")}`}
                </div>
              </div>

              {item.user && (
                <button
                  type="button"
                  onClick={() => onDeleteIngredient(item.id)}
                  style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: "4px" }}
                  title="Delete custom ingredient"
                >
                  <TrashIcon width={16} height={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
