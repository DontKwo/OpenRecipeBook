import { useState, useMemo, useRef, type FC, type ReactElement, type ChangeEvent } from "react";
import type { Recipe, RecipeRating, DictionaryIngredient, Collection } from "../../domain/recipe/types";
import { normalizeRecipe } from "../../domain/recipe/normalize";
import { parseIngredient } from "../../domain/scaling/parseIngredient";
import { BUILT_IN_INGREDIENTS } from "../../data/defaultIngredients";
import { importRecipesFromUrl } from "../../domain/import/nativeFetch";
import { extractRecipesFromHtml } from "../../domain/import/jsonld";
import { parsePlainTextRecipe } from "../../domain/import/textRecipeParser";
import { LinkIcon, CameraIcon, FileTextIcon } from "../../ui/icons";

export interface RecipeEditorProps {
  initialRecipe?: Recipe;
  collections?: Collection[];
  userIngredients?: DictionaryIngredient[];
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
}

export const RecipeEditor: FC<RecipeEditorProps> = ({
  initialRecipe,
  collections,
  userIngredients,
  onSave,
  onCancel
}): ReactElement => {
  const [title, setTitle] = useState<string>(initialRecipe?.title || "");
  const [description, setDescription] = useState<string>(initialRecipe?.description || "");
  const [servings, setServings] = useState<number>(initialRecipe?.servings || 4);
  const [prepMinutes, setPrepMinutes] = useState<number | undefined>(initialRecipe?.prepMinutes);
  const [cookMinutes, setCookMinutes] = useState<number | undefined>(initialRecipe?.cookMinutes);
  const [course, setCourse] = useState<string>(initialRecipe?.courses[0] || "Dinner");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(initialRecipe?.collectionIds || []);
  const [notes, setNotes] = useState<string>(initialRecipe?.notes || "");
  const [rating, setRating] = useState<RecipeRating>(initialRecipe?.rating || 0);
  const [sourceUrl, setSourceUrl] = useState<string>(initialRecipe?.sourceUrl || "");
  const [sourceName, setSourceName] = useState<string>(initialRecipe?.sourceName || "");

  // Import shortcuts state
  const [showUrlModal, setShowUrlModal] = useState<boolean>(false);
  const [importUrl, setImportUrl] = useState<string>("");
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [corsBlocked, setCorsBlocked] = useState<boolean>(false);
  const [pastedHtmlSource, setPastedHtmlSource] = useState<string>("");
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Multi-line text inputs for frictionless editing
  const [ingredientsText, setIngredientsText] = useState<string>(() => {
    if (!initialRecipe) return "";
    const lines: string[] = [];
    for (const group of initialRecipe.ingredientGroups) {
      if (group.heading) lines.push(`${group.heading}:`);
      for (const item of group.items) lines.push(item.raw);
    }
    return lines.join("\n");
  });

  const [directionsText, setDirectionsText] = useState<string>(() => {
    if (!initialRecipe) return "";
    const lines: string[] = [];
    for (const group of initialRecipe.directionGroups) {
      if (group.heading) lines.push(`${group.heading}:`);
      for (const step of group.steps) lines.push(step.text);
    }
    return lines.join("\n");
  });

  const [cursorLineIndex, setCursorLineIndex] = useState<number>(0);

  const allIngredients = useMemo((): DictionaryIngredient[] => {
    return [...BUILT_IN_INGREDIENTS, ...(userIngredients || [])];
  }, [userIngredients]);

  const ingLines = useMemo((): string[] => {
    return ingredientsText.split(/\r?\n/);
  }, [ingredientsText]);

  const activeLine = ingLines[cursorLineIndex] ?? ingLines[ingLines.length - 1] ?? "";

  const suggestions = useMemo((): DictionaryIngredient[] => {
    if (!activeLine || activeLine.endsWith(":")) return [];
    const parsed = parseIngredient(activeLine);
    const searchTarget = (parsed.ingredient.name || activeLine).trim().toLowerCase();
    if (searchTarget.length < 2) return [];

    const matches: DictionaryIngredient[] = [];
    for (const item of allIngredients) {
      const matchName = item.name.toLowerCase().includes(searchTarget);
      const matchAlias = item.aliases.some((a) => a.toLowerCase().includes(searchTarget));
      if (matchName || matchAlias) {
        matches.push(item);
        if (matches.length >= 5) break;
      }
    }
    return matches;
  }, [activeLine, allIngredients]);

  const applySuggestion = (ingredientName: string): void => {
    const lines = [...ingLines];
    const targetIdx = cursorLineIndex < lines.length ? cursorLineIndex : lines.length - 1;
    if (targetIdx < 0) return;

    const line = lines[targetIdx];
    const parsed = parseIngredient(line);
    let newLine: string;
    if (parsed.ingredient.quantity || parsed.ingredient.unit) {
      const qty = parsed.ingredient.quantity
        ? (parsed.ingredient.quantity.kind === "single"
            ? String(parsed.ingredient.quantity.value)
            : `${parsed.ingredient.quantity.min}-${parsed.ingredient.quantity.max}`)
        : "";
      const unit = parsed.ingredient.unit ? ` ${parsed.ingredient.unit}` : "";
      newLine = `${qty}${unit} ${ingredientName}`.trim();
    } else {
      newLine = ingredientName;
    }
    lines[targetIdx] = newLine;
    setIngredientsText(lines.join("\n"));
  };

  const handleTextareaCursor = (e: React.SyntheticEvent<HTMLTextAreaElement>): void => {
    const target = e.currentTarget;
    const cursor = target.selectionStart || 0;
    const textBefore = target.value.substring(0, cursor);
    const lineIndex = textBefore.split(/\r?\n/).length - 1;
    setCursorLineIndex(lineIndex);
  };

  // "Paste it all" quick import drawer
  const [showPasteAll, setShowPasteAll] = useState<boolean>(false);
  const [pastedBlob, setPastedBlob] = useState<string>("");

  const handleApplyPasteAll = (): void => {
    if (!pastedBlob.trim()) {
      setShowPasteAll(false);
      return;
    }
    const parsed = parsePlainTextRecipe(pastedBlob);
    if (parsed.title && parsed.title !== "Untitled Recipe") {
      setTitle(parsed.title);
    }
    if (parsed.description) {
      setDescription(parsed.description);
    }
    if (parsed.servings) {
      setServings(parsed.servings);
    }
    if (parsed.prepMinutes) {
      setPrepMinutes(parsed.prepMinutes);
    }
    if (parsed.cookMinutes) {
      setCookMinutes(parsed.cookMinutes);
    }
    if (parsed.sourceUrl) {
      setSourceUrl(parsed.sourceUrl);
    }
    if (parsed.notes) {
      setNotes(parsed.notes);
    }

    const linesIng: string[] = [];
    for (const group of parsed.ingredientGroups) {
      if (group.heading) linesIng.push(`${group.heading}:`);
      for (const item of group.items) linesIng.push(item);
    }
    if (linesIng.length > 0) {
      setIngredientsText(linesIng.join("\n"));
    }

    const linesDir: string[] = [];
    for (const group of parsed.directionGroups) {
      if (group.heading) linesDir.push(`${group.heading}:`);
      for (const step of group.steps) linesDir.push(step);
    }
    if (linesDir.length > 0) {
      setDirectionsText(linesDir.join("\n"));
    }

    setShowPasteAll(false);
  };

  const populateFromParsedRecipe = (recipe: Partial<Recipe>): void => {
    if (recipe.title) setTitle(recipe.title);
    if (recipe.description) setDescription(recipe.description);
    if (recipe.servings) setServings(recipe.servings);
    if (recipe.prepMinutes !== undefined) setPrepMinutes(recipe.prepMinutes);
    if (recipe.cookMinutes !== undefined) setCookMinutes(recipe.cookMinutes);
    if (recipe.courses && recipe.courses.length > 0) setCourse(recipe.courses[0]);
    if (recipe.sourceUrl) setSourceUrl(recipe.sourceUrl);
    if (recipe.sourceName) setSourceName(recipe.sourceName);
    if (recipe.notes) setNotes(recipe.notes);

    if (recipe.ingredientGroups && recipe.ingredientGroups.length > 0) {
      const lines: string[] = [];
      for (const group of recipe.ingredientGroups) {
        if (group.heading) lines.push(`${group.heading}:`);
        for (const item of group.items) lines.push(item.raw);
      }
      setIngredientsText(lines.join("\n"));
    }

    if (recipe.directionGroups && recipe.directionGroups.length > 0) {
      const lines: string[] = [];
      for (const group of recipe.directionGroups) {
        if (group.heading) lines.push(`${group.heading}:`);
        for (const step of group.steps) lines.push(step.text);
      }
      setDirectionsText(lines.join("\n"));
    }
  };

  const handleFetchUrl = async (): Promise<void> => {
    if (!importUrl.trim()) return;
    setIsFetchingUrl(true);
    setUrlError(null);
    setCorsBlocked(false);

    try {
      const result = await importRecipesFromUrl(importUrl.trim());
      if (result.ok && result.recipes.length > 0) {
        populateFromParsedRecipe(result.recipes[0]);
        setShowUrlModal(false);
        setImportUrl("");
      } else if (result.unsupportedInBrowser) {
        setCorsBlocked(true);
        setUrlError(result.error || "Direct URL fetch is blocked by browser CORS restrictions.");
      } else {
        setUrlError(result.error || "No recipe found at this URL.");
      }
    } catch (err: unknown) {
      setUrlError(err instanceof Error ? err.message : "Failed to fetch webpage");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleParsePastedHtml = (): void => {
    if (!pastedHtmlSource.trim()) return;
    const recipes = extractRecipesFromHtml(pastedHtmlSource);
    if (recipes.length > 0) {
      const rec = recipes[0];
      if (importUrl.trim()) rec.sourceUrl = importUrl.trim();
      populateFromParsedRecipe(rec);
      setShowUrlModal(false);
      setPastedHtmlSource("");
      setImportUrl("");
      setCorsBlocked(false);
    } else {
      setUrlError("No recipe schema found in the pasted HTML.");
    }
  };

  const handleTextFileSelected = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>): void => {
      const text = typeof event.target?.result === "string" ? event.target.result : "";
      if (text) {
        const parsed = parsePlainTextRecipe(text);
        if (parsed.title && parsed.title !== "Untitled Recipe") setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.servings) setServings(parsed.servings);
        if (parsed.prepMinutes) setPrepMinutes(parsed.prepMinutes);
        if (parsed.cookMinutes) setCookMinutes(parsed.cookMinutes);
        if (parsed.sourceUrl) setSourceUrl(parsed.sourceUrl);
        if (parsed.notes) setNotes(parsed.notes);

        const linesIng: string[] = [];
        for (const group of parsed.ingredientGroups) {
          if (group.heading) linesIng.push(`${group.heading}:`);
          for (const item of group.items) linesIng.push(item);
        }
        if (linesIng.length > 0) setIngredientsText(linesIng.join("\n"));

        const linesDir: string[] = [];
        for (const group of parsed.directionGroups) {
          if (group.heading) linesDir.push(`${group.heading}:`);
          for (const step of group.steps) linesDir.push(step);
        }
        if (linesDir.length > 0) setDirectionsText(linesDir.join("\n"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePhotoFileSelected = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrStatus("Photo loaded. Open 'Paste it all' or edit directly to review parsed recipe details.");
    setTimeout((): void => {
      setOcrStatus(null);
    }, 4000);
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!title.trim()) return;

    // Parse ingredients text into groups
    const rawIngLines = ingredientsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const ingredientGroups = [];
    let currentGroupHeading: string | undefined = undefined;
    let currentGroupItems = [];

    for (const line of rawIngLines) {
      if (line.endsWith(":")) {
        if (currentGroupItems.length > 0) {
          ingredientGroups.push({ heading: currentGroupHeading, items: currentGroupItems });
          currentGroupItems = [];
        }
        currentGroupHeading = line.replace(/:$/, "").trim();
      } else {
        const parsed = parseIngredient(line);
        currentGroupItems.push(parsed.ingredient);
      }
    }
    if (currentGroupItems.length > 0 || ingredientGroups.length === 0) {
      ingredientGroups.push({ heading: currentGroupHeading, items: currentGroupItems });
    }

    // Parse directions text into groups
    const rawDirLines = directionsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const directionGroups = [];
    let currentDirHeading: string | undefined = undefined;
    let currentDirSteps = [];

    for (const line of rawDirLines) {
      if (line.endsWith(":")) {
        if (currentDirSteps.length > 0) {
          directionGroups.push({ heading: currentDirHeading, steps: currentDirSteps });
          currentDirSteps = [];
        }
        currentDirHeading = line.replace(/:$/, "").trim();
      } else {
        currentDirSteps.push({
          id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text: line
        });
      }
    }
    if (currentDirSteps.length > 0 || directionGroups.length === 0) {
      directionGroups.push({ heading: currentDirHeading, steps: currentDirSteps });
    }

    const recipeToSave: Recipe = {
      id: initialRecipe?.id || `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      title: title.trim(),
      description: description.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      sourceName: sourceName.trim() || undefined,
      servings: servings || 4,
      prepMinutes,
      cookMinutes,
      ingredientGroups,
      directionGroups,
      notes: notes.trim() || undefined,
      cookLog: initialRecipe?.cookLog || [],
      courses: course ? [course] : ["Dinner"],
      categories: initialRecipe?.categories || [],
      collectionIds: selectedCollectionIds,
      tags: initialRecipe?.tags || [],
      rating,
      favorite: initialRecipe?.favorite || false,
      photoIds: initialRecipe?.photoIds || [],
      createdAt: initialRecipe?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1
    };

    onSave(normalizeRecipe(recipeToSave));
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "var(--space-6)" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md"
        style={{ display: "none" }}
        onChange={handleTextFileSelected}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handlePhotoFileSelected}
      />

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", margin: 0 }}>
          {initialRecipe ? "Edit Recipe" : "New Recipe"}
        </h1>

        {!initialRecipe && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <button
              type="button"
              onClick={() => setShowPasteAll(!showPasteAll)}
              style={{
                background: showPasteAll ? "var(--surface-alt)" : "var(--surface)",
                color: "var(--accent)",
                border: "1px solid var(--border)",
                padding: "8px 14px",
                borderRadius: "var(--radius-full)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.85rem"
              }}
            >
              {showPasteAll ? "Type It In" : "Paste It All"}
            </button>
            <button
              type="button"
              onClick={() => setShowUrlModal(true)}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                padding: "8px 14px",
                borderRadius: "var(--radius-full)",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <LinkIcon width={14} height={14} /> Import Link
            </button>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                padding: "8px 14px",
                borderRadius: "var(--radius-full)",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <CameraIcon width={14} height={14} /> Scan Photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                padding: "8px 14px",
                borderRadius: "var(--radius-full)",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <FileTextIcon width={14} height={14} /> Text File
            </button>
          </div>
        )}
      </div>

      {ocrStatus && (
        <div style={{ background: "var(--surface-alt)", padding: "10px 16px", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)", fontSize: "0.9rem", color: "var(--text)" }}>
          {ocrStatus}
        </div>
      )}

      {showUrlModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "var(--space-4)" }}>
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", maxWidth: "520px", width: "100%", padding: "var(--space-6)", boxShadow: "var(--shadow-lg)" }}>
            <h3 style={{ fontSize: "1.3rem", marginBottom: "var(--space-2)" }}>Import Recipe from Website</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "var(--space-4)" }}>
              Enter recipe URL to automatically load ingredients, directions, and timings.
            </p>

            <div style={{ display: "flex", gap: "8px", marginBottom: "var(--space-3)" }}>
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/recipe"
                disabled={isFetchingUrl}
                style={{ flex: 1, padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
              />
              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={isFetchingUrl || !importUrl.trim()}
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: "var(--radius-full)",
                  fontWeight: 600,
                  cursor: isFetchingUrl || !importUrl.trim() ? "not-allowed" : "pointer"
                }}
              >
                {isFetchingUrl ? "Fetching..." : "Fetch"}
              </button>
            </div>

            {urlError && (
              <div style={{ background: "var(--surface-alt)", borderLeft: "3px solid var(--accent)", padding: "12px 14px", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-4)", fontSize: "0.88rem", color: "var(--text)" }}>
                <p style={{ margin: "0 0 8px 0" }}>{urlError}</p>
                {corsBlocked && (
                  <div>
                    <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "8px" }}>
                      Direct fetch is blocked in web browsers by CORS. Alternatively, paste HTML source code below:
                    </p>
                    <textarea
                      rows={4}
                      value={pastedHtmlSource}
                      onChange={(e) => setPastedHtmlSource(e.target.value)}
                      placeholder="Paste page HTML source (Ctrl+U or right click -> View Page Source)..."
                      style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: "0.8rem", marginBottom: "8px" }}
                    />
                    <button
                      type="button"
                      onClick={handleParsePastedHtml}
                      disabled={!pastedHtmlSource.trim()}
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "6px 14px", borderRadius: "var(--radius-full)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      Parse HTML Source
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
              <button
                type="button"
                onClick={() => {
                  setShowUrlModal(false);
                  setUrlError(null);
                  setCorsBlocked(false);
                }}
                style={{ background: "none", border: "1px solid var(--border)", padding: "8px 18px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasteAll ? (
        <div style={{ background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "var(--space-2)" }}>Paste Ingredients & Instructions</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "var(--space-4)" }}>
            Paste recipe text from a website, document, or email. The app will separate ingredients and directions automatically.
          </p>
          <textarea
            rows={12}
            value={pastedBlob}
            onChange={(e) => setPastedBlob(e.target.value)}
            placeholder={"Ingredients\n2 cups flour\n1 cup milk\n\nDirections\nMix and bake at 350F for 20 minutes."}
            style={{ width: "100%", padding: "var(--space-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontFamily: "var(--font-sans)", marginBottom: "var(--space-4)" }}
          />
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button
              type="button"
              onClick={handleApplyPasteAll}
              style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: "none", padding: "10px 20px", borderRadius: "var(--radius-full)", fontWeight: 600, cursor: "pointer" }}
            >
              Parse & Fill Form
            </button>
            <button
              type="button"
              onClick={() => setShowPasteAll(false)}
              style={{ background: "none", border: "1px solid var(--border)", padding: "10px 20px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* Title */}
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "var(--space-2)" }}>
              Recipe Title <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grandma's Apple Crisp"
              style={{ width: "100%", padding: "12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", fontSize: "1.1rem" }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "var(--space-2)" }}>
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary or story..."
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
            />
          </div>

          {/* Yield & Times */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "var(--space-1)" }}>
                Servings
              </label>
              <input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value, 10) || 1)}
                style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "var(--space-1)" }}>
                Prep (min)
              </label>
              <input
                type="number"
                min={0}
                value={prepMinutes || ""}
                onChange={(e) => setPrepMinutes(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "var(--space-1)" }}>
                Cook (min)
              </label>
              <input
                type="number"
                min={0}
                value={cookMinutes || ""}
                onChange={(e) => setCookMinutes(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "var(--space-1)" }}>
                Course
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Dessert">Dessert</option>
                <option value="Snack">Snack</option>
                <option value="Drink">Drink</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "var(--space-1)" }}>
                Rating
              </label>
              <select
                value={rating}
                onChange={(e) => setRating((parseInt(e.target.value, 10) || 0) as RecipeRating)}
                style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <option value={0}>No rating</option>
                <option value={1}>1 star</option>
                <option value={2}>2 stars</option>
                <option value={3}>3 stars</option>
                <option value={4}>4 stars</option>
                <option value={5}>5 stars</option>
              </select>
            </div>
          </div>

          {/* Collections Selector */}
          {collections && collections.length > 0 && (
            <div style={{ marginTop: "var(--space-1)" }}>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "var(--space-1)" }}>
                Collections
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {collections.map((col: Collection) => {
                  const isSelected = selectedCollectionIds.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={(): void => {
                        if (isSelected) {
                          setSelectedCollectionIds(selectedCollectionIds.filter((id: string): boolean => id !== col.id));
                        } else {
                          setSelectedCollectionIds([...selectedCollectionIds, col.id]);
                        }
                      }}
                      style={{
                        background: isSelected ? "var(--accent)" : "var(--surface)",
                        color: isSelected ? "var(--accent-contrast)" : "var(--text)",
                        border: "1px solid " + (isSelected ? "var(--accent)" : "var(--border)"),
                        padding: "4px 12px",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.85rem",
                        fontWeight: isSelected ? 600 : 400,
                        cursor: "pointer"
                      }}
                    >
                      {isSelected ? "\u2713 " : "+ "}{col.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ingredients Input */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <label style={{ fontWeight: 600 }}>
                Ingredients (one per line; end line with ":" for group headings)
              </label>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                Autocomplete active
              </span>
            </div>

            <textarea
              rows={7}
              value={ingredientsText}
              onChange={(e) => {
                setIngredientsText(e.target.value);
                handleTextareaCursor(e);
              }}
              onKeyUp={handleTextareaCursor}
              onClick={handleTextareaCursor}
              onSelect={handleTextareaCursor}
              placeholder={"Dry Ingredients:\n2 cups flour\n1 tsp baking soda\n\nWet Ingredients:\n1 cup milk\n2 eggs"}
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}
            />

            {/* Suggestions pill strip */}
            {suggestions.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  alignItems: "center",
                  padding: "6px 10px",
                  marginTop: "6px",
                  background: "var(--surface-alt)",
                  borderRadius: "var(--radius-sm)"
                }}
              >
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Suggested ingredients:</span>
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => applySuggestion(s.name)}
                    style={{
                      background: "var(--surface)",
                      color: "var(--accent)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-full)",
                      padding: "2px 8px",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      cursor: "pointer"
                    }}
                  >
                    + {s.name}
                  </button>
                ))}
              </div>
            )}

            {/* Live parsed breakdown preview */}
            {ingLines.some((l) => l.trim().length > 0) && (
              <div
                style={{
                  marginTop: "8px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  background: "var(--surface)"
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", marginBottom: "6px" }}>
                  Live Parsed Breakdown
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
                  {ingLines.map((line, idx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    if (trimmed.endsWith(":")) {
                      return (
                        <div key={idx} style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--accent)" }}>
                          Group: {trimmed.replace(/:$/, "")}
                        </div>
                      );
                    }
                    const parsed = parseIngredient(trimmed);
                    const qtyStr = parsed.ingredient.quantity
                      ? (parsed.ingredient.quantity.kind === "single"
                          ? String(parsed.ingredient.quantity.value)
                          : `${parsed.ingredient.quantity.min}-${parsed.ingredient.quantity.max}`)
                      : null;

                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "0.82rem",
                          borderBottom: "1px solid var(--border-subtle)",
                          paddingBottom: "3px"
                        }}
                      >
                        {qtyStr ? (
                          <span style={{ background: "var(--surface-alt)", padding: "1px 6px", borderRadius: "var(--radius-sm)", fontWeight: 600 }}>
                            {qtyStr}
                          </span>
                        ) : (
                          <span style={{ background: "var(--surface-alt)", padding: "1px 6px", borderRadius: "var(--radius-sm)", color: "var(--muted)" }}>
                            No amount
                          </span>
                        )}

                        {parsed.ingredient.unit && (
                          <span style={{ background: "var(--surface-alt)", padding: "1px 6px", borderRadius: "var(--radius-sm)", color: "var(--muted)" }}>
                            {parsed.ingredient.unit}
                          </span>
                        )}

                        <span style={{ fontWeight: 500 }}>
                          {parsed.ingredient.name || trimmed}
                        </span>

                        {!parsed.ingredient.scalable && (
                          <span style={{ fontSize: "0.75rem", color: "var(--accent)", border: "1px solid var(--border)", padding: "1px 4px", borderRadius: "var(--radius-sm)" }}>
                            Not scaled
                          </span>
                        )}

                        {parsed.ingredient.note && (
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                            ({parsed.ingredient.note})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Directions Input */}
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "var(--space-2)" }}>
              Directions (one step per line)
            </label>
            <textarea
              rows={8}
              value={directionsText}
              onChange={(e) => setDirectionsText(e.target.value)}
              placeholder={"Whisk dry ingredients together in large bowl.\nAdd milk and eggs, stirring until combined.\nBake at 350F for 20 minutes."}
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: "0.95rem" }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "var(--space-2)" }}>
              Cook's Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tips, serving suggestions, or storage instructions..."
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
            />
          </div>

          {/* Source and Credit */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "var(--space-2)" }}>
                Source URL (optional)
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/recipe"
                style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "var(--space-2)" }}>
                Credit / Source Name (optional)
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="Grandma, Food Blog, etc."
                style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
            <button
              type="submit"
              style={{
                background: "var(--accent)",
                color: "var(--accent-contrast)",
                border: "none",
                padding: "12px 28px",
                borderRadius: "var(--radius-full)",
                fontWeight: 600,
                fontSize: "1rem",
                cursor: "pointer"
              }}
            >
              Save Recipe
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                padding: "12px 24px",
                borderRadius: "var(--radius-full)",
                fontWeight: 500,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
