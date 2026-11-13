import { useEffect, useState, type FC, type ReactElement } from "react";
import type { Recipe } from "../../domain/recipe/types";
import {
  getRecipeVersions,
  getRecipeVersionSnapshot,
  type VersionSummary
} from "../../domain/recipe/versionHistory";
import { XIcon, HistoryIcon, CheckIcon } from "../../ui/icons";

export interface RecipeHistoryModalProps {
  recipeId: string;
  onRestore: (restoredRecipe: Recipe) => void;
  onClose: () => void;
}

export const RecipeHistoryModal: FC<RecipeHistoryModalProps> = ({
  recipeId,
  onRestore,
  onClose
}): ReactElement => {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      try {
        const list = await getRecipeVersions(recipeId);
        if (active) {
          setVersions(list);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [recipeId]);

  const handleRestoreClick = async (versionId: string): Promise<void> => {
    setRestoringId(versionId);
    try {
      const snapshot = await getRecipeVersionSnapshot(versionId);
      if (snapshot) {
        onRestore(snapshot);
        onClose();
      }
    } catch {
      setRestoringId(null);
    }
  };

  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 120,
        padding: "var(--space-4)"
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border)",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "var(--space-4) var(--space-6)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <HistoryIcon width={20} height={20} />
            <h3 style={{ fontFamily: "var(--font-serif)", margin: 0, fontSize: "1.25rem" }}>
              Saved Version History
            </h3>
          </div>
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
            aria-label="Close history modal"
          >
            <XIcon width={20} height={20} />
          </button>
        </div>

        {/* Content list */}
        <div style={{ maxHeight: "360px", overflowY: "auto", padding: "var(--space-4) var(--space-6)" }}>
          {loading ? (
            <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--muted)" }}>
              Loading saved versions...
            </div>
          ) : versions.length === 0 ? (
            <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--muted)" }}>
              No previous version snapshots saved yet. Edit this recipe to generate snapshots.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {versions.map((ver: VersionSummary, index: number): ReactElement => (
                <div
                  key={ver.id}
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--surface-alt)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "var(--space-3)"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        {formatTimestamp(ver.timestamp)}
                      </span>
                      {index === 0 && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            padding: "2px 6px",
                            borderRadius: "var(--radius-full)",
                            color: "var(--accent)",
                            fontWeight: 600
                          }}
                        >
                          Latest
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "2px" }}>
                      {ver.summary}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(): Promise<void> => handleRestoreClick(ver.id)}
                    disabled={restoringId === ver.id}
                    style={{
                      background: "var(--surface)",
                      color: "var(--accent)",
                      border: "1px solid var(--accent)",
                      padding: "6px 14px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      flexShrink: 0
                    }}
                  >
                    <CheckIcon width={14} height={14} /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "var(--space-3) var(--space-6)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.82rem",
            color: "var(--muted)"
          }}
        >
          <span>Retaining the 10 most recent edits</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              padding: "6px 16px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
