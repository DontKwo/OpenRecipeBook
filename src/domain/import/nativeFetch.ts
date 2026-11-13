import type { Recipe } from "../recipe/types";
import { extractRecipesFromHtml } from "./jsonld";

export interface FetchPageResult {
  ok: boolean;
  html?: string;
  error?: string;
  unsupportedInBrowser?: boolean;
}

export interface ImportUrlResult {
  ok: boolean;
  recipes: Recipe[];
  error?: string;
  unsupportedInBrowser?: boolean;
}

interface NativeElectronWindow {
  nativeApi?: {
    isElectron: boolean;
    fetchPage: (url: string) => Promise<{ ok: boolean; html?: string; status?: number; error?: string }>;
  };
}

interface NativeCapacitorWindow {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      CapacitorHttp?: {
        get: (options: { url: string }) => Promise<{ status: number; data: string }>;
      };
    };
  };
}

export async function fetchRecipePage(targetUrl: string): Promise<FetchPageResult> {
  if (typeof window === "undefined") {
    return {
      ok: false,
      unsupportedInBrowser: true,
      error: "Window environment not available."
    };
  }

  const electronWindow = window as unknown as NativeElectronWindow;
  const capacitorWindow = window as unknown as NativeCapacitorWindow;

  // 1. Electron desktop native environment
  if (electronWindow.nativeApi?.fetchPage) {
    try {
      const response = await electronWindow.nativeApi.fetchPage(targetUrl);
      if (response.ok && response.html) {
        return { ok: true, html: response.html };
      }
      return { ok: false, error: response.error || "Failed to fetch webpage" };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // 2. Capacitor Android native environment
  if (capacitorWindow.Capacitor?.isNativePlatform?.() && capacitorWindow.Capacitor.Plugins?.CapacitorHttp) {
    try {
      const response = await capacitorWindow.Capacitor.Plugins.CapacitorHttp.get({ url: targetUrl });
      if (response.status >= 200 && response.status < 300 && response.data) {
        return { ok: true, html: response.data };
      }
      return { ok: false, error: `Failed to fetch webpage with status ${response.status}` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // 3. Plain browser environment (CORS restricted without external proxy)
  return {
    ok: false,
    unsupportedInBrowser: true,
    error: "Direct URL fetch is blocked by browser CORS security. Use the installed Windows/Android app, paste the page source, or use the bookmarklet."
  };
}

export async function importRecipesFromUrl(targetUrl: string): Promise<ImportUrlResult> {
  const fetchResult = await fetchRecipePage(targetUrl);
  if (!fetchResult.ok || !fetchResult.html) {
    return {
      ok: false,
      recipes: [],
      error: fetchResult.error,
      unsupportedInBrowser: fetchResult.unsupportedInBrowser
    };
  }

  const recipes = extractRecipesFromHtml(fetchResult.html);
  if (recipes.length === 0) {
    return {
      ok: false,
      recipes: [],
      error: "No recipe data (schema.org/Recipe JSON-LD) found on this page."
    };
  }

  // Set source URL on extracted recipes
  for (const recipe of recipes) {
    recipe.sourceUrl = targetUrl;
  }

  return { ok: true, recipes };
}
