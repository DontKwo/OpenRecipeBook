import { useState, type FC, type ReactElement, type ChangeEvent } from "react";
import type { Recipe, MealPlanEntry } from "../../domain/recipe/types";
import { createMealPlanEntry } from "../../domain/planner/plannerService";
import { db } from "../../data/db";
import { CalendarIcon, CheckIcon } from "../../ui/icons";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";

export interface AddToMealPlanModalProps {
  recipe: Recipe;
  onSuccess: () => void;
  onClose: () => void;
}

export const AddToMealPlanModal: FC<AddToMealPlanModalProps> = ({
  recipe,
  onSuccess,
  onClose
}): ReactElement => {
  const todayIso = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState<string>(todayIso);
  const [slot, setSlot] = useState<string>("dinner");
  const baseServings = recipe.servings || 4;
  const [servings, setServings] = useState<number>(baseServings);
  const [saving, setSaving] = useState<boolean>(false);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const multiplier = (Number(servings) || baseServings) / baseServings;
      const entry: MealPlanEntry = createMealPlanEntry(date, slot, recipe.id, undefined, multiplier);
      await db.mealPlan.put(entry);
      onSuccess();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <CalendarIcon width={20} height={20} />
          Add to Meal Plan
        </span>
      }
      maxWidth={420}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", width: "100%" }}>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={saving}
            icon={<CheckIcon width={16} height={16} />}
            onClick={handleSave}
          >
            Add to Plan
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
            DATE
          </label>
          <input
            type="date"
            value={date}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => setDate(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: "0.9375rem"
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
            MEAL SLOT
          </label>
          <select
            value={slot}
            onChange={(e: ChangeEvent<HTMLSelectElement>): void => setSlot(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: "0.9375rem"
            }}
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
            SERVINGS
          </label>
          <input
            type="number"
            min="1"
            value={servings}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => setServings(parseInt(e.target.value, 10) || 1)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: "0.9375rem"
            }}
          />
        </div>
      </div>
    </Dialog>
  );
};

