import type { Recipe, Ingredient, Step, IngredientGroup, DirectionGroup } from "./types";
import { parseIngredient } from "../scaling/parseIngredient";

export const generateModifierId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};

export const updateRecipeTitle = (recipe: Recipe, newTitle: string): Recipe => {
  const trimmed = newTitle.trim();
  if (!trimmed || trimmed === recipe.title) return recipe;
  return {
    ...recipe,
    title: trimmed,
    updatedAt: new Date().toISOString()
  };
};

export const updateRecipeDescription = (recipe: Recipe, newDescription?: string): Recipe => {
  const trimmed = newDescription?.trim() || undefined;
  if (trimmed === recipe.description) return recipe;
  return {
    ...recipe,
    description: trimmed,
    updatedAt: new Date().toISOString()
  };
};

export const updateRecipeServings = (
  recipe: Recipe,
  servings: number,
  servingsLabel?: string
): Recipe => {
  const validServings = Math.max(1, Math.round(servings));
  return {
    ...recipe,
    servings: validServings,
    servingsLabel: servingsLabel?.trim() || recipe.servingsLabel,
    updatedAt: new Date().toISOString()
  };
};

export const updateRecipeTimes = (
  recipe: Recipe,
  prepMinutes?: number,
  cookMinutes?: number
): Recipe => {
  const prep = prepMinutes !== undefined ? Math.max(0, prepMinutes) : undefined;
  const cook = cookMinutes !== undefined ? Math.max(0, cookMinutes) : undefined;
  const total = (prep || 0) + (cook || 0) || undefined;
  return {
    ...recipe,
    prepMinutes: prep,
    cookMinutes: cook,
    totalMinutes: total,
    updatedAt: new Date().toISOString()
  };
};

export const updateRecipeNotes = (recipe: Recipe, notes?: string): Recipe => {
  const trimmed = notes?.trim() || undefined;
  return {
    ...recipe,
    notes: trimmed,
    updatedAt: new Date().toISOString()
  };
};

export const updateIngredientLine = (
  recipe: Recipe,
  groupIndex: number,
  itemIndex: number,
  rawText: string
): Recipe => {
  const group = recipe.ingredientGroups[groupIndex];
  if (!group || !group.items[itemIndex]) return recipe;

  const currentItem = group.items[itemIndex];
  const parsed = parseIngredient(rawText, currentItem.id);
  const updatedItem: Ingredient = {
    ...parsed.ingredient,
    id: currentItem.id,
    raw: rawText
  };

  const newItems = [...group.items];
  newItems[itemIndex] = updatedItem;

  const newGroups = [...recipe.ingredientGroups];
  newGroups[groupIndex] = { ...group, items: newItems };

  return {
    ...recipe,
    ingredientGroups: newGroups,
    updatedAt: new Date().toISOString()
  };
};

export const addIngredientLine = (
  recipe: Recipe,
  groupIndex: number,
  rawText: string = "",
  afterItemIndex?: number
): { recipe: Recipe; newId: string } => {
  const newId = generateModifierId("ing");
  const parsed = parseIngredient(rawText, newId);
  const newItem: Ingredient = {
    ...parsed.ingredient,
    id: newId,
    raw: rawText
  };

  const newGroups = [...recipe.ingredientGroups];
  if (newGroups.length === 0) {
    newGroups.push({ items: [newItem] });
  } else {
    const targetGroup = { ...newGroups[groupIndex] };
    const items = [...targetGroup.items];
    if (afterItemIndex !== undefined && afterItemIndex >= 0 && afterItemIndex < items.length) {
      items.splice(afterItemIndex + 1, 0, newItem);
    } else {
      items.push(newItem);
    }
    targetGroup.items = items;
    newGroups[groupIndex] = targetGroup;
  }

  return {
    recipe: {
      ...recipe,
      ingredientGroups: newGroups,
      updatedAt: new Date().toISOString()
    },
    newId
  };
};

export const deleteIngredientLine = (
  recipe: Recipe,
  groupIndex: number,
  itemIndex: number
): { recipe: Recipe; deletedItem: Ingredient; groupIndex: number; itemIndex: number } => {
  const group = recipe.ingredientGroups[groupIndex];
  const deletedItem = group.items[itemIndex];

  const newItems = group.items.filter((_: Ingredient, idx: number): boolean => idx !== itemIndex);
  const newGroups = [...recipe.ingredientGroups];
  newGroups[groupIndex] = { ...group, items: newItems };

  return {
    recipe: {
      ...recipe,
      ingredientGroups: newGroups,
      updatedAt: new Date().toISOString()
    },
    deletedItem,
    groupIndex,
    itemIndex
  };
};

export const restoreIngredientLine = (
  recipe: Recipe,
  groupIndex: number,
  itemIndex: number,
  item: Ingredient
): Recipe => {
  const newGroups = [...recipe.ingredientGroups];
  if (!newGroups[groupIndex]) return recipe;

  const group = { ...newGroups[groupIndex] };
  const items = [...group.items];
  const insertAt = Math.min(Math.max(0, itemIndex), items.length);
  items.splice(insertAt, 0, item);
  group.items = items;
  newGroups[groupIndex] = group;

  return {
    ...recipe,
    ingredientGroups: newGroups,
    updatedAt: new Date().toISOString()
  };
};

export const updateStepText = (
  recipe: Recipe,
  groupIndex: number,
  stepIndex: number,
  text: string
): Recipe => {
  const group = recipe.directionGroups[groupIndex];
  if (!group || !group.steps[stepIndex]) return recipe;

  const currentStep = group.steps[stepIndex];
  const updatedStep: Step = {
    ...currentStep,
    text
  };

  const newSteps = [...group.steps];
  newSteps[stepIndex] = updatedStep;

  const newGroups = [...recipe.directionGroups];
  newGroups[groupIndex] = { ...group, steps: newSteps };

  return {
    ...recipe,
    directionGroups: newGroups,
    updatedAt: new Date().toISOString()
  };
};

export const updateStepNote = (
  recipe: Recipe,
  groupIndex: number,
  stepIndex: number,
  note?: string
): Recipe => {
  const group = recipe.directionGroups[groupIndex];
  if (!group || !group.steps[stepIndex]) return recipe;

  const currentStep = group.steps[stepIndex];
  const updatedStep: Step = {
    ...currentStep,
    note: note?.trim() || undefined
  };

  const newSteps = [...group.steps];
  newSteps[stepIndex] = updatedStep;

  const newGroups = [...recipe.directionGroups];
  newGroups[groupIndex] = { ...group, steps: newSteps };

  return {
    ...recipe,
    directionGroups: newGroups,
    updatedAt: new Date().toISOString()
  };
};

export const addStepLine = (
  recipe: Recipe,
  groupIndex: number,
  text: string = "",
  afterStepIndex?: number
): { recipe: Recipe; newId: string } => {
  const newId = generateModifierId("step");
  const newStep: Step = {
    id: newId,
    text
  };

  const newGroups = [...recipe.directionGroups];
  if (newGroups.length === 0) {
    newGroups.push({ steps: [newStep] });
  } else {
    const targetGroup = { ...newGroups[groupIndex] };
    const steps = [...targetGroup.steps];
    if (afterStepIndex !== undefined && afterStepIndex >= 0 && afterStepIndex < steps.length) {
      steps.splice(afterStepIndex + 1, 0, newStep);
    } else {
      steps.push(newStep);
    }
    targetGroup.steps = steps;
    newGroups[groupIndex] = targetGroup;
  }

  return {
    recipe: {
      ...recipe,
      directionGroups: newGroups,
      updatedAt: new Date().toISOString()
    },
    newId
  };
};

export const deleteStepLine = (
  recipe: Recipe,
  groupIndex: number,
  stepIndex: number
): { recipe: Recipe; deletedStep: Step; groupIndex: number; stepIndex: number } => {
  const group = recipe.directionGroups[groupIndex];
  const deletedStep = group.steps[stepIndex];

  const newSteps = group.steps.filter((_: Step, idx: number): boolean => idx !== stepIndex);
  const newGroups = [...recipe.directionGroups];
  newGroups[groupIndex] = { ...group, steps: newSteps };

  return {
    recipe: {
      ...recipe,
      directionGroups: newGroups,
      updatedAt: new Date().toISOString()
    },
    deletedStep,
    groupIndex,
    stepIndex
  };
};

export const restoreStepLine = (
  recipe: Recipe,
  groupIndex: number,
  stepIndex: number,
  step: Step
): Recipe => {
  const newGroups = [...recipe.directionGroups];
  if (!newGroups[groupIndex]) return recipe;

  const group = { ...newGroups[groupIndex] };
  const steps = [...group.steps];
  const insertAt = Math.min(Math.max(0, stepIndex), steps.length);
  steps.splice(insertAt, 0, step);
  group.steps = steps;
  newGroups[groupIndex] = group;

  return {
    ...recipe,
    directionGroups: newGroups,
    updatedAt: new Date().toISOString()
  };
};

export const moveIngredientLine = (
  recipe: Recipe,
  sourceGroup: number,
  sourceIndex: number,
  targetGroup: number,
  targetIndex: number
): Recipe => {
  if (sourceGroup === targetGroup && sourceIndex === targetIndex) return recipe;
  const groups: IngredientGroup[] = recipe.ingredientGroups.map((g: IngredientGroup): IngredientGroup => ({
    ...g,
    items: [...g.items]
  }));

  const itemToMove = groups[sourceGroup]?.items[sourceIndex];
  if (!itemToMove) return recipe;

  groups[sourceGroup].items.splice(sourceIndex, 1);
  groups[targetGroup].items.splice(targetIndex, 0, itemToMove);

  return {
    ...recipe,
    ingredientGroups: groups,
    updatedAt: new Date().toISOString()
  };
};

export const moveStepLine = (
  recipe: Recipe,
  sourceGroup: number,
  sourceIndex: number,
  targetGroup: number,
  targetIndex: number
): Recipe => {
  if (sourceGroup === targetGroup && sourceIndex === targetIndex) return recipe;
  const groups: DirectionGroup[] = recipe.directionGroups.map((g: DirectionGroup): DirectionGroup => ({
    ...g,
    steps: [...g.steps]
  }));

  const stepToMove = groups[sourceGroup]?.steps[sourceIndex];
  if (!stepToMove) return recipe;

  groups[sourceGroup].steps.splice(sourceIndex, 1);
  groups[targetGroup].steps.splice(targetIndex, 0, stepToMove);

  return {
    ...recipe,
    directionGroups: groups,
    updatedAt: new Date().toISOString()
  };
};
