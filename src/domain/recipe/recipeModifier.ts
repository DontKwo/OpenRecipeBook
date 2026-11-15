import type { Recipe } from "./types";

export const updateRecipeNotes = (recipe: Recipe, notes?: string): Recipe => {
  const trimmed = notes?.trim() || undefined;
  if (trimmed === recipe.notes) return recipe;
  return {
    ...recipe,
    notes: trimmed,
    updatedAt: new Date().toISOString()
  };
};

export const appendRecipeNote = (recipe: Recipe, newNote: string): Recipe => {
  const trimmed = newNote.trim();
  if (!trimmed) return recipe;
  const existing = recipe.notes ? recipe.notes.trim() : "";
  const updatedNotes = existing ? `${existing}\n- ${trimmed}` : `- ${trimmed}`;
  return {
    ...recipe,
    notes: updatedNotes,
    updatedAt: new Date().toISOString()
  };
};
