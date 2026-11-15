import { useState, type FC, type ReactElement } from "react";
import type { Recipe } from "../../domain/recipe/types";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";

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
    () => new Set(candidates.map((c: Recipe): string => c.id))
  );
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "replace" | "keepBoth">("replace");

  const existingTitles = new Set(existingRecipes.map((r: Recipe): string => r.title.toLowerCase().trim()));

  const toggleSelect = (id: string): void => {
    setSelectedIds((prev: Set<string>): Set<string> => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = (): void => {
    const toImport = candidates.filter((c: Recipe): boolean => selectedIds.has(c.id));
    onConfirmImport(toImport, duplicateAction);
  };

  return (
    <Dialog
      isOpen={true}
      title={`Review Imported Recipes (${candidates.length})`}
      onClose={onCancel}
      maxWidth={580}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem" }}>
          Select the recipes you want to import into your cookbook.
        </p>

        {/* Recipe list */}
        <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          {candidates.map((candidate: Recipe) => {
            const isSelected = selectedIds.has(candidate.id);
            const isDuplicate = existingTitles.has(candidate.title.toLowerCase().trim());

            return (
              <div
                key={candidate.id}
                onClick={(): void => toggleSelect(candidate.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
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
                    onChange={(): void => {}}
                    style={{ cursor: "pointer", accentColor: "var(--accent)" }}
                    aria-label={`Select ${candidate.title}`}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{candidate.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {candidate.ingredientGroups[0]?.items.length || 0} ingredients · {candidate.directionGroups[0]?.steps.length || 0} steps
                    </div>
                  </div>
                </div>

                {isDuplicate && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      background: "rgba(184, 76, 42, 0.15)",
                      color: "var(--accent)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      fontWeight: 600
                    }}
                  >
                    Already exists
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Duplicate Resolution Strategy */}
        <div
          style={{
            padding: "var(--space-3)",
            background: "var(--surface-alt)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)"
          }}
        >
          <span style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "6px", color: "var(--muted)" }}>
            If recipe already exists:
          </span>
          <div style={{ display: "flex", gap: "var(--space-4)", fontSize: "0.875rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name="dup"
                checked={duplicateAction === "replace"}
                onChange={(): void => setDuplicateAction("replace")}
              />
              Replace existing
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name="dup"
                checked={duplicateAction === "keepBoth"}
                onChange={(): void => setDuplicateAction("keepBoth")}
              />
              Keep both
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name="dup"
                checked={duplicateAction === "skip"}
                onChange={(): void => setDuplicateAction("skip")}
              />
              Skip
            </label>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={selectedIds.size === 0}
            onClick={handleConfirm}
          >
            Import {selectedIds.size} Recipes
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
