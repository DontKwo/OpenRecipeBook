import { useState, type FC, type ReactElement } from "react";
import type { Recipe } from "../../domain/recipe/types";
import { XIcon } from "../../ui/icons";

export interface ImportReviewModalProps {
  candidates: Recipe[];
  existingRecipes: Recipe[];
  onConfirmImport: (selected: Recipe[], duplicateAction: "skip" | "replace" | "keepBoth") => void;
  onCancel: () => void;
}

export const ImportReviewModal: FC<ImportReviewModalProps> = ({
  candidates,
  existingRecipes,
  onConfirmImport,
  onCancel
}): ReactElement => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(candidates.map((c) => c.id))
  );
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "replace" | "keepBoth">("replace");

  const existingTitles = new Set(existingRecipes.map((r) => r.title.toLowerCase().trim()));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const toImport = candidates.filter((c) => selectedIds.has(c.id));
    onConfirmImport(toImport, duplicateAction);
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
        zIndex: 200
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          padding: "var(--space-6)",
          borderRadius: "var(--radius-lg)",
          width: "90%",
          maxWidth: "600px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}>
            Review Imported Recipes ({candidates.length} found)
          </h2>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
          >
            <XIcon width={20} height={20} />
          </button>
        </div>

        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "var(--space-4)" }}>
          Select the recipes you want to import into your cookbook.
        </p>

        {/* Recipe list */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
          {candidates.map((candidate) => {
            const isSelected = selectedIds.has(candidate.id);
            const isDuplicate = existingTitles.has(candidate.title.toLowerCase().trim());

            return (
              <div
                key={candidate.id}
                onClick={() => toggleSelect(candidate.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-3) var(--space-4)",
                  background: isSelected ? "var(--surface-alt)" : "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ cursor: "pointer" }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{candidate.title}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                      {candidate.ingredientGroups[0]?.items.length || 0} ingredients · {candidate.directionGroups[0]?.steps.length || 0} steps
                    </div>
                  </div>
                </div>

                {isDuplicate && (
                  <span style={{ fontSize: "0.75rem", background: "rgba(184, 76, 42, 0.15)", color: "var(--accent)", padding: "2px 8px", borderRadius: "var(--radius-full)", fontWeight: 600 }}>
                    Already exists
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Duplicate Resolution Strategy */}
        <div style={{ marginBottom: "var(--space-6)", padding: "var(--space-3)", background: "var(--surface-alt)", borderRadius: "var(--radius-sm)" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "var(--space-2)" }}>
            If recipe already exists:
          </label>
          <div style={{ display: "flex", gap: "var(--space-4)", fontSize: "0.9rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name="dup"
                checked={duplicateAction === "replace"}
                onChange={() => setDuplicateAction("replace")}
              />
              Replace existing
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name="dup"
                checked={duplicateAction === "keepBoth"}
                onChange={() => setDuplicateAction("keepBoth")}
              />
              Keep both
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name="dup"
                checked={duplicateAction === "skip"}
                onChange={() => setDuplicateAction("skip")}
              />
              Skip
            </label>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              padding: "10px 20px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={handleConfirm}
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              padding: "10px 24px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
              opacity: selectedIds.size === 0 ? 0.5 : 1
            }}
          >
            Import {selectedIds.size} Recipes
          </button>
        </div>
      </div>
    </div>
  );
};
