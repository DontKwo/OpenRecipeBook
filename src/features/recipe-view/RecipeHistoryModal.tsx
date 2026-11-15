import { useEffect, useState, type FC, type ReactElement } from "react";
import type { Recipe } from "../../domain/recipe/types";
import {
  getRecipeVersions,
  getRecipeVersionSnapshot,
  type VersionSummary
} from "../../domain/recipe/versionHistory";
import { HistoryIcon, CheckIcon } from "../../ui/icons";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";

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
    <Dialog
      isOpen
      onClose={onClose}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <HistoryIcon width={20} height={20} />
          Version History
        </span>
      }
      maxWidth={520}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", fontSize: "0.8125rem", color: "var(--muted)" }}>
          <span>Retaining up to 10 snapshots</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      }
    >
      <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {loading ? (
          <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--muted)" }}>
            Loading saved versions...
          </div>
        ) : versions.length === 0 ? (
          <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--muted)" }}>
            No previous version snapshots saved yet. Edit this recipe to generate snapshots.
          </div>
        ) : (
          versions.map((ver: VersionSummary, index: number): ReactElement => (
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
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
                <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 2 }}>
                  {ver.summary}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={<CheckIcon width={14} height={14} />}
                disabled={restoringId === ver.id}
                onClick={(): Promise<void> => handleRestoreClick(ver.id)}
              >
                Restore
              </Button>
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
};
