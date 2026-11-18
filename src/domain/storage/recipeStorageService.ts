import { db } from "../../data/db";
import type {
  Collection,
  Combo,
  DictionaryIngredient,
  MealPlanEntry,
  Recipe,
  ShoppingList
} from "../recipe/types";
import { normalizeRecipe } from "../recipe/normalize";
import { exportRecipeToJson, importBackupZip, importRecipeFromJson } from "../export/ownFormat";
import { parseSchemaRecipeJsonLd } from "../import/jsonld";
import { parsePaprikaRecipesZip } from "../import/paprika";
import { parseRecipeKeeperZip } from "../import/recipeKeeper";
import { parsePlainTextRecipe } from "../import/textRecipeParser";

export type StorageFileKind = "recipe" | "archive" | "text" | "metadata" | "other";

export interface StorageFileEntry {
  name: string;
  path: string;
  sizeBytes: number;
  updatedAt: string;
  kind: StorageFileKind;
  recipeId?: string;
  recipeTitle?: string;
}

export interface StorageLocationInfo {
  platform: "desktop" | "android";
  storagePath: string;
  canOpenSystemFolder: boolean;
  canChooseFolder: boolean;
  files: StorageFileEntry[];
}

export interface LibraryMetadataSnapshot {
  version: number;
  updatedAt: string;
  collections: Collection[];
  mealPlan: MealPlanEntry[];
  shoppingLists: ShoppingList[];
  combos: Combo[];
  userIngredients: DictionaryIngredient[];
}

export interface AddStorageFilesResult {
  addedFiles: string[];
  importedRecipes: Recipe[];
  reviewCandidates: Recipe[];
  errors: string[];
}

export interface SyncStorageResult {
  importedRecipes: Recipe[];
  restoredMetadata: LibraryMetadataSnapshot | null;
  storageInfo: StorageLocationInfo;
}

interface NativeStorageInfoResponse {
  ok: boolean;
  platform?: "desktop" | "android";
  storagePath?: string;
  canOpenSystemFolder?: boolean;
  canChooseFolder?: boolean;
  files?: StorageFileEntry[];
  error?: string;
}

interface NativePickedFile {
  name: string;
  contentBase64: string;
  sizeBytes?: number;
}

interface NativeApiBridge {
  isElectron?: boolean;
  isDesktop?: boolean;
  isAndroid?: boolean;
  getStorageInfo?: () => Promise<NativeStorageInfoResponse>;
  openStorageFolder?: () => Promise<{ ok: boolean; storagePath?: string; message?: string; error?: string }>;
  chooseStorageFolder?: () => Promise<{ ok: boolean; storagePath?: string; canceled?: boolean; error?: string }>;
  writeStorageFile?: (filename: string, content: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
  writeStorageFileBase64?: (
    filename: string,
    base64Data: string
  ) => Promise<{ ok: boolean; path?: string; error?: string }>;
  readStorageFile?: (filename: string) => Promise<{ ok: boolean; content?: string; error?: string }>;
  deleteStorageFile?: (filename: string) => Promise<{ ok: boolean; error?: string }>;
  pickAndAddFiles?: () => Promise<{
    ok: boolean;
    canceled?: boolean;
    files?: NativePickedFile[];
    error?: string;
  }>;
  saveFileDialog?: (options: {
    defaultName?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<string | null>;
}

interface AndroidBridgeGlobal {
  getStorageInfo?: () => string;
  openStorageFolder?: () => string;
  writeStorageFile?: (filename: string, content: string) => string;
  writeStorageFileBase64?: (filename: string, base64Data: string) => string;
  readStorageFile?: (filename: string) => string;
  deleteStorageFile?: (filename: string) => string;
}

interface VirtualStorageRecord {
  name: string;
  content: string;
  sizeBytes: number;
  updatedAt: string;
}

const VIRTUAL_FILES_KEY = "virtualStorageFiles";
const VIRTUAL_PATH_KEY = "virtualStoragePath";
const DEFAULT_DESKTOP_FALLBACK_PATH = "Documents\\OpenRecipeBook\\recipes";
const DEFAULT_ANDROID_FALLBACK_PATH = "Android/data/org.openrecipebook.app/files/recipes";
const METADATA_FILENAME = "library-metadata.json";

const memoryVirtualFiles = new Map<string, VirtualStorageRecord>();
let memoryVirtualPath = "";

function getWindowRef(): (Window & { nativeApi?: NativeApiBridge; AndroidBridge?: AndroidBridgeGlobal }) | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window as Window & { nativeApi?: NativeApiBridge; AndroidBridge?: AndroidBridgeGlobal };
}

function getNativeApi(): NativeApiBridge | null {
  const win = getWindowRef();
  if (!win) return null;
  if (win.nativeApi) {
    return win.nativeApi;
  }
  if (win.AndroidBridge?.getStorageInfo) {
    const bridge = win.AndroidBridge;
    return {
      isAndroid: true,
      isDesktop: false,
      getStorageInfo: async (): Promise<NativeStorageInfoResponse> =>
        JSON.parse(bridge.getStorageInfo?.() || '{"ok":false}'),
      openStorageFolder: async (): Promise<{ ok: boolean; storagePath?: string; message?: string; error?: string }> =>
        JSON.parse(bridge.openStorageFolder?.() || '{"ok":false}'),
      writeStorageFile: async (
        filename: string,
        content: string
      ): Promise<{ ok: boolean; path?: string; error?: string }> =>
        JSON.parse(bridge.writeStorageFile?.(filename, content) || '{"ok":false}'),
      writeStorageFileBase64: async (
        filename: string,
        base64Data: string
      ): Promise<{ ok: boolean; path?: string; error?: string }> =>
        JSON.parse(bridge.writeStorageFileBase64?.(filename, base64Data) || '{"ok":false}'),
      readStorageFile: async (filename: string): Promise<{ ok: boolean; content?: string; error?: string }> =>
        JSON.parse(bridge.readStorageFile?.(filename) || '{"ok":false}'),
      deleteStorageFile: async (filename: string): Promise<{ ok: boolean; error?: string }> =>
        JSON.parse(bridge.deleteStorageFile?.(filename) || '{"ok":false}')
    };
  }
  return null;
}

export function detectPlatform(): "desktop" | "android" {
  const win = getWindowRef();
  if (win?.nativeApi?.isAndroid || win?.AndroidBridge) {
    return "android";
  }
  if (typeof navigator !== "undefined" && /android/i.test(navigator.userAgent)) {
    return "android";
  }
  return "desktop";
}

export function sanitizeStorageFilename(rawName: string): string {
  const stripped = rawName
    .replace(/[/\\]/g, "_")
    .replace(/\.\./g, "")
    .replace(/[<>:"|?*\x00-\x1F]/g, "_")
    .trim();
  return stripped || `recipe-${Date.now()}.recipe.json`;
}

export function slugifyRecipeTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "recipe";
}

export function getRecipeStorageFilename(recipe: Pick<Recipe, "id" | "title">): string {
  const safeId = sanitizeStorageFilename(recipe.id);
  const slug = slugifyRecipeTitle(recipe.title);
  return `${slug}__${safeId}.recipe.json`;
}

export function classifyStorageFilename(filename: string): StorageFileKind {
  const lower = filename.toLowerCase();
  if (lower === METADATA_FILENAME) return "metadata";
  if (lower.endsWith(".recipe.json") || lower.endsWith(".json") || lower.endsWith(".jsonld")) {
    return "recipe";
  }
  if (lower.endsWith(".zip") || lower.endsWith(".paprikarecipes")) {
    return "archive";
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return "text";
  }
  return "other";
}

function extractRecipeMetadataFromText(text: string): { recipeId?: string; recipeTitle?: string } {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed && parsed.format === "openrecipebook-recipe" && parsed.recipe && typeof parsed.recipe === "object") {
      const rec = parsed.recipe as Record<string, unknown>;
      return {
        recipeId: typeof rec.id === "string" ? rec.id : undefined,
        recipeTitle: typeof rec.title === "string" ? rec.title : undefined
      };
    }
    if (parsed && typeof parsed.title === "string") {
      return {
        recipeId: typeof parsed.id === "string" ? parsed.id : undefined,
        recipeTitle: parsed.title
      };
    }
    if (parsed && typeof parsed.name === "string") {
      return { recipeTitle: parsed.name };
    }
  } catch {
    // Non-JSON file
  }
  return {};
}

async function readVirtualFileMap(): Promise<Record<string, VirtualStorageRecord>> {
  if (typeof indexedDB !== "undefined") {
    try {
      const setting = await db.settings.get(VIRTUAL_FILES_KEY);
      if (setting && typeof setting.value === "object" && setting.value !== null) {
        return setting.value as Record<string, VirtualStorageRecord>;
      }
    } catch {
      // Fall back to in-memory map
    }
  }
  const result: Record<string, VirtualStorageRecord> = {};
  for (const [k, v] of memoryVirtualFiles.entries()) {
    result[k] = v;
  }
  return result;
}

async function writeVirtualFileMap(fileMap: Record<string, VirtualStorageRecord>): Promise<void> {
  memoryVirtualFiles.clear();
  for (const [k, v] of Object.entries(fileMap)) {
    memoryVirtualFiles.set(k, v);
  }
  if (typeof indexedDB !== "undefined") {
    try {
      await db.settings.put({ key: VIRTUAL_FILES_KEY, value: fileMap });
    } catch {
      // Ignore IndexedDB unavailability
    }
  }
}

async function getVirtualStoragePath(): Promise<string> {
  if (typeof indexedDB !== "undefined") {
    try {
      const setting = await db.settings.get(VIRTUAL_PATH_KEY);
      if (setting && typeof setting.value === "string" && setting.value.trim()) {
        return setting.value;
      }
    } catch {
      // Fall back to memory
    }
  }
  if (memoryVirtualPath) {
    return memoryVirtualPath;
  }
  return detectPlatform() === "android" ? DEFAULT_ANDROID_FALLBACK_PATH : DEFAULT_DESKTOP_FALLBACK_PATH;
}

async function setVirtualStoragePath(nextPath: string): Promise<void> {
  memoryVirtualPath = nextPath;
  if (typeof indexedDB !== "undefined") {
    try {
      await db.settings.put({ key: VIRTUAL_PATH_KEY, value: nextPath });
    } catch {
      // Ignore IndexedDB unavailability
    }
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export async function readStorageFileText(filename: string): Promise<string | null> {
  const safeName = sanitizeStorageFilename(filename);
  const api = getNativeApi();
  if (api?.readStorageFile) {
    try {
      const res = await api.readStorageFile(safeName);
      if (res.ok && typeof res.content === "string") {
        return res.content;
      }
    } catch {
      return null;
    }
  }
  const virtualMap = await readVirtualFileMap();
  return virtualMap[safeName]?.content ?? null;
}

export async function writeStorageFileText(filename: string, content: string): Promise<boolean> {
  const safeName = sanitizeStorageFilename(filename);
  const api = getNativeApi();
  if (api?.writeStorageFile) {
    try {
      const res = await api.writeStorageFile(safeName, content);
      if (res.ok) return true;
    } catch {
      return false;
    }
  }
  const virtualMap = await readVirtualFileMap();
  virtualMap[safeName] = {
    name: safeName,
    content,
    sizeBytes: utf8ByteLength(content),
    updatedAt: new Date().toISOString()
  };
  await writeVirtualFileMap(virtualMap);
  return true;
}

async function writeStorageBinary(filename: string, bytes: Uint8Array): Promise<boolean> {
  const safeName = sanitizeStorageFilename(filename);
  const api = getNativeApi();
  if (api?.writeStorageFileBase64) {
    try {
      const res = await api.writeStorageFileBase64(safeName, uint8ArrayToBase64(bytes));
      if (res.ok) return true;
    } catch {
      return false;
    }
  }
  const virtualMap = await readVirtualFileMap();
  virtualMap[safeName] = {
    name: safeName,
    content: `[binary:${bytes.length}]`,
    sizeBytes: bytes.length,
    updatedAt: new Date().toISOString()
  };
  await writeVirtualFileMap(virtualMap);
  return true;
}

export async function deleteStorageFile(filename: string): Promise<{ ok: boolean; recipeId?: string }> {
  const safeName = sanitizeStorageFilename(filename);
  const existingText = await readStorageFileText(safeName);
  const meta = existingText ? extractRecipeMetadataFromText(existingText) : {};

  const api = getNativeApi();
  if (api?.deleteStorageFile) {
    try {
      const res = await api.deleteStorageFile(safeName);
      return { ok: Boolean(res.ok), recipeId: meta.recipeId };
    } catch {
      return { ok: false };
    }
  }

  const virtualMap = await readVirtualFileMap();
  if (virtualMap[safeName]) {
    delete virtualMap[safeName];
    await writeVirtualFileMap(virtualMap);
  }
  return { ok: true, recipeId: meta.recipeId };
}

export async function getStorageLocationInfo(recipes: Recipe[] = []): Promise<StorageLocationInfo> {
  const api = getNativeApi();
  if (api?.getStorageInfo) {
    try {
      const res = await api.getStorageInfo();
      if (res.ok && res.storagePath) {
        const files = (res.files || []).map((entry: StorageFileEntry): StorageFileEntry => ({
          ...entry,
          kind: entry.kind || classifyStorageFilename(entry.name)
        }));
        return {
          platform: res.platform || detectPlatform(),
          storagePath: res.storagePath,
          canOpenSystemFolder: res.canOpenSystemFolder ?? true,
          canChooseFolder: res.canChooseFolder ?? false,
          files
        };
      }
    } catch {
      // Fall back to virtual storage listing below
    }
  }

  const storagePath = await getVirtualStoragePath();
  const virtualMap = await readVirtualFileMap();

  // Seed virtual entries for existing active recipes when empty
  let changed = false;
  for (const recipe of recipes) {
    if (recipe.deletedAt) continue;
    const filename = getRecipeStorageFilename(recipe);
    if (!virtualMap[filename]) {
      const json = exportRecipeToJson(recipe);
      virtualMap[filename] = {
        name: filename,
        content: json,
        sizeBytes: utf8ByteLength(json),
        updatedAt: recipe.updatedAt || new Date().toISOString()
      };
      changed = true;
    }
  }
  if (changed) {
    await writeVirtualFileMap(virtualMap);
  }

  const sep = storagePath.includes("\\") ? "\\" : "/";
  const files: StorageFileEntry[] = Object.values(virtualMap)
    .map((entry: VirtualStorageRecord): StorageFileEntry => {
      const kind = classifyStorageFilename(entry.name);
      const meta = kind === "recipe" ? extractRecipeMetadataFromText(entry.content) : {};
      return {
        name: entry.name,
        path: `${storagePath}${sep}${entry.name}`,
        sizeBytes: entry.sizeBytes,
        updatedAt: entry.updatedAt,
        kind,
        recipeId: meta.recipeId,
        recipeTitle: meta.recipeTitle
      };
    })
    .sort((a: StorageFileEntry, b: StorageFileEntry): number => b.updatedAt.localeCompare(a.updatedAt));

  return {
    platform: detectPlatform(),
    storagePath,
    canOpenSystemFolder: Boolean(api?.openStorageFolder),
    canChooseFolder: Boolean(api?.chooseStorageFolder),
    files
  };
}

export async function writeRecipeToStorage(recipe: Recipe): Promise<void> {
  if (recipe.deletedAt) {
    await deleteRecipeFromStorage(recipe.id, recipe.title);
    return;
  }
  const filename = getRecipeStorageFilename(recipe);
  const info = await getStorageLocationInfo();
  for (const existing of info.files) {
    if (existing.recipeId === recipe.id && existing.name !== filename) {
      await deleteStorageFile(existing.name);
    }
  }
  const jsonText = exportRecipeToJson(recipe);
  await writeStorageFileText(filename, jsonText);
}

export async function deleteRecipeFromStorage(recipeId: string, title?: string): Promise<void> {
  const info = await getStorageLocationInfo();
  for (const existing of info.files) {
    if (existing.recipeId === recipeId || existing.name.endsWith(`__${sanitizeStorageFilename(recipeId)}.recipe.json`)) {
      await deleteStorageFile(existing.name);
    }
  }
  if (title) {
    const exactName = getRecipeStorageFilename({ id: recipeId, title });
    await deleteStorageFile(exactName);
  }
}

export async function writeLibraryMetadataToStorage(snapshot: Omit<LibraryMetadataSnapshot, "version" | "updatedAt">): Promise<void> {
  const payload: LibraryMetadataSnapshot = {
    version: 1,
    updatedAt: new Date().toISOString(),
    ...snapshot
  };
  await writeStorageFileText(METADATA_FILENAME, JSON.stringify(payload, null, 2));
}

export function parseRecipeFromStorageText(filename: string, text: string): Recipe[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    const parsed = parsePlainTextRecipe(text);
    const fallbackTitle = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
    const title = parsed.title && parsed.title !== "Untitled Recipe" ? parsed.title : fallbackTitle || "Imported Recipe";
    const nowIso = new Date().toISOString();
    const rec: Recipe = normalizeRecipe({
      id: `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      description: parsed.description,
      sourceUrl: parsed.sourceUrl,
      servings: parsed.servings || 4,
      prepMinutes: parsed.prepMinutes,
      cookMinutes: parsed.cookMinutes,
      totalMinutes: parsed.totalMinutes,
      ingredientGroups: parsed.ingredientGroups.map((group) => ({
        heading: group.heading,
        items: group.items.map((raw, idx) => ({
          id: `ing-${idx + 1}`,
          raw,
          scalable: true
        }))
      })),
      directionGroups: parsed.directionGroups.map((group) => ({
        heading: group.heading,
        steps: group.steps.map((stepText, idx) => ({
          id: `step-${idx + 1}`,
          text: stepText
        }))
      })),
      notes: parsed.notes,
      cookLog: [],
      courses: ["Dinner"],
      categories: [],
      collectionIds: [],
      tags: [],
      rating: 0,
      favorite: false,
      photoIds: [],
      createdAt: nowIso,
      updatedAt: nowIso,
      schemaVersion: 1
    });
    return [rec];
  }

  if (lower.endsWith(".json") || lower.endsWith(".jsonld")) {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed && parsed.format === "openrecipebook-recipe") {
      const single = importRecipeFromJson(text);
      return [normalizeRecipe(single.recipe)];
    }
    if (parsed && ("@context" in parsed || parsed["@type"] === "Recipe")) {
      return parseSchemaRecipeJsonLd(parsed);
    }
    if (parsed && typeof parsed.title === "string") {
      return [normalizeRecipe(parsed as unknown as Recipe)];
    }
  }

  return [];
}

export async function syncLibraryWithStorage(existingRecipes: Recipe[]): Promise<SyncStorageResult> {
  const info = await getStorageLocationInfo(existingRecipes);
  const existingById = new Map<string, Recipe>(existingRecipes.map((r: Recipe): [string, Recipe] => [r.id, r]));
  const existingFileIds = new Set<string>();
  const importedRecipes: Recipe[] = [];

  for (const entry of info.files) {
    if (entry.kind !== "recipe") continue;
    const text = await readStorageFileText(entry.name);
    if (!text) continue;
    try {
      const parsedList = parseRecipeFromStorageText(entry.name, text);
      for (const parsed of parsedList) {
        existingFileIds.add(parsed.id);
        const current = existingById.get(parsed.id);
        if (!current) {
          importedRecipes.push(parsed);
          existingById.set(parsed.id, parsed);
        } else if (!current.deletedAt) {
          const diskTime = new Date(parsed.updatedAt).getTime();
          const dbTime = new Date(current.updatedAt).getTime();
          if (!isNaN(diskTime) && !isNaN(dbTime) && diskTime > dbTime + 1000) {
            importedRecipes.push(parsed);
            existingById.set(parsed.id, parsed);
          }
        }
      }
    } catch {
      // Skip unreadable file so startup continues safely
    }
  }

  // Mirror any active recipes missing on disk
  for (const recipe of existingRecipes) {
    if (recipe.deletedAt) continue;
    if (!existingFileIds.has(recipe.id)) {
      await writeRecipeToStorage(recipe);
    }
  }

  let restoredMetadata: LibraryMetadataSnapshot | null = null;
  const metaFile = info.files.find((f: StorageFileEntry): boolean => f.name === METADATA_FILENAME);
  if (metaFile) {
    const metaText = await readStorageFileText(METADATA_FILENAME);
    if (metaText) {
      try {
        const parsedMeta = JSON.parse(metaText) as LibraryMetadataSnapshot;
        if (parsedMeta && typeof parsedMeta === "object" && Array.isArray(parsedMeta.collections)) {
          restoredMetadata = parsedMeta;
        }
      } catch {
        // Ignore malformed metadata
      }
    }
  }

  const updatedInfo = await getStorageLocationInfo(Array.from(existingById.values()));
  return {
    importedRecipes,
    restoredMetadata,
    storageInfo: updatedInfo
  };
}

export async function openSystemStorageFolder(): Promise<{ ok: boolean; storagePath?: string; message?: string }> {
  const api = getNativeApi();
  if (api?.openStorageFolder) {
    try {
      const res = await api.openStorageFolder();
      return {
        ok: Boolean(res.ok),
        storagePath: res.storagePath,
        message: res.message || res.error
      };
    } catch (err: unknown) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err)
      };
    }
  }
  const path = await getVirtualStoragePath();
  return {
    ok: false,
    storagePath: path,
    message: `Storage folder path: ${path}`
  };
}

export async function chooseSystemStorageFolder(
  activeRecipes: Recipe[]
): Promise<{ ok: boolean; storagePath?: string; canceled?: boolean; error?: string }> {
  const api = getNativeApi();
  if (!api?.chooseStorageFolder) {
    return {
      ok: false,
      error: "Changing folders is available in the Windows Desktop app."
    };
  }
  const res = await api.chooseStorageFolder();
  if (res.canceled) {
    return { ok: false, canceled: true };
  }
  if (res.ok && res.storagePath) {
    await setVirtualStoragePath(res.storagePath);
    for (const recipe of activeRecipes) {
      if (!recipe.deletedAt) {
        await writeRecipeToStorage(recipe);
      }
    }
    return { ok: true, storagePath: res.storagePath };
  }
  return { ok: false, error: res.error || "Could not switch storage folder" };
}

async function processRawFilePayload(
  rawName: string,
  bytes: Uint8Array,
  result: AddStorageFilesResult
): Promise<void> {
  const safeName = sanitizeStorageFilename(rawName);
  const lower = safeName.toLowerCase();

  try {
    if (lower.endsWith(".zip") || lower.endsWith(".paprikarecipes")) {
      await writeStorageBinary(safeName, bytes);
      result.addedFiles.push(safeName);
      if (lower.endsWith(".paprikarecipes")) {
        result.reviewCandidates.push(...parsePaprikaRecipesZip(bytes));
      } else {
        try {
          const rk = parseRecipeKeeperZip(bytes);
          result.reviewCandidates.push(...rk.recipes);
        } catch {
          const backup = importBackupZip(bytes);
          result.reviewCandidates.push(...backup.recipes);
        }
      }
      return;
    }

    const text = decodeUtf8(bytes);
    if (lower.endsWith(".json") || lower.endsWith(".jsonld") || lower.endsWith(".txt") || lower.endsWith(".md")) {
      const parsedRecipes = parseRecipeFromStorageText(safeName, text);
      if (parsedRecipes.length > 0) {
        for (const rec of parsedRecipes) {
          await writeRecipeToStorage(rec);
          result.importedRecipes.push(rec);
        }
        result.addedFiles.push(
          parsedRecipes.length === 1 ? getRecipeStorageFilename(parsedRecipes[0]) : safeName
        );
      } else {
        await writeStorageFileText(safeName, text);
        result.addedFiles.push(safeName);
      }
      return;
    }

    await writeStorageBinary(safeName, bytes);
    result.addedFiles.push(safeName);
  } catch (err: unknown) {
    result.errors.push(`${safeName}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function addFilesToStorage(files: File[]): Promise<AddStorageFilesResult> {
  const result: AddStorageFilesResult = {
    addedFiles: [],
    importedRecipes: [],
    reviewCandidates: [],
    errors: []
  };

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    await processRawFilePayload(file.name, new Uint8Array(buffer), result);
  }

  return result;
}

export async function pickAndAddNativeFiles(): Promise<AddStorageFilesResult | null> {
  const api = getNativeApi();
  if (!api?.pickAndAddFiles) {
    return null;
  }
  const picked = await api.pickAndAddFiles();
  if (picked.canceled || !picked.ok || !picked.files) {
    return {
      addedFiles: [],
      importedRecipes: [],
      reviewCandidates: [],
      errors: picked.error ? [picked.error] : []
    };
  }
  const result: AddStorageFilesResult = {
    addedFiles: [],
    importedRecipes: [],
    reviewCandidates: [],
    errors: []
  };
  for (const entry of picked.files) {
    await processRawFilePayload(entry.name, base64ToUint8Array(entry.contentBase64), result);
  }
  return result;
}

export function clearVirtualStorageMemoryForTests(): void {
  memoryVirtualFiles.clear();
  memoryVirtualPath = "";
}
