import type { Recipe } from "../recipe/types";
import { extractRecipesFromHtml } from "./jsonld";

export type FetchFailureReason =
  | "cors"
  | "paywall_or_blocked"
  | "not_found"
  | "no_recipe_found"
  | "network";

export interface FetchPageResult {
  ok: boolean;
  html?: string;
  status?: number;
  error?: string;
  unsupportedInBrowser?: boolean;
  failureReason?: FetchFailureReason;
}

export interface ImportUrlResult {
  ok: boolean;
  recipes: Recipe[];
  status?: number;
  error?: string;
  unsupportedInBrowser?: boolean;
  failureReason?: FetchFailureReason;
}

interface NativeElectronWindow {
  nativeApi?: {
    isElectron: boolean;
    fetchPage: (url: string) => Promise<{ ok: boolean; html?: string; status?: number; error?: string }>;
  };
}

interface NativeAndroidWindow {
  AndroidBridge?: {
    fetchUrl: (url: string) => string;
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

function classifyHttpFailure(status?: number, html?: string, rawError?: string): {
  reason: FetchFailureReason;
  message: string;
} {
  if (status === 404 || status === 410) {
    return {
      reason: "not_found",
      message: `Recipe page returned HTTP ${status} (not found). Paste the recipe text below to import anyway.`
    };
  }
  if (status === 401 || status === 402 || status === 403 || status === 429 || status === 451) {
    return {
      reason: "paywall_or_blocked",
      message: `Site returned HTTP ${status} (paywall, login gate, or bot protection). Copy the recipe on the page and paste it below.`
    };
  }
  if (html && /(subscribe to continue|create a free account|nytimes\.com\/subscription|captcha|access denied)/i.test(html)) {
    return {
      reason: "paywall_or_blocked",
      message: "This site requires a login or blocked automated access. Copy the recipe text on the page and paste it below."
    };
  }
  return {
    reason: "network",
    message: rawError || (status ? `Failed to fetch webpage (HTTP ${status}). Paste the recipe text below.` : "Failed to fetch webpage. Paste the recipe text below.")
  };
}

export async function fetchRecipePage(targetUrl: string): Promise<FetchPageResult> {
  if (typeof window === "undefined") {
    return {
      ok: false,
      unsupportedInBrowser: true,
      failureReason: "cors",
      error: "Window environment not available."
    };
  }

  const electronWindow = window as unknown as NativeElectronWindow;
  const androidWindow = window as unknown as NativeAndroidWindow;
  const capacitorWindow = window as unknown as NativeCapacitorWindow;

  if (electronWindow.nativeApi?.fetchPage) {
    try {
      const response = await electronWindow.nativeApi.fetchPage(targetUrl);
      if (response.ok && response.html) {
        return { ok: true, html: response.html, status: response.status };
      }
      const classified = classifyHttpFailure(response.status, response.html, response.error);
      return {
        ok: false,
        status: response.status,
        failureReason: classified.reason,
        error: classified.message
      };
    } catch (err: unknown) {
      return {
        ok: false,
        failureReason: "network",
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  if (androidWindow.AndroidBridge?.fetchUrl) {
    try {
      const raw = androidWindow.AndroidBridge.fetchUrl(targetUrl);
      const parsed = JSON.parse(raw) as { ok?: boolean; status?: number; html?: string; error?: string };
      if (parsed.ok && parsed.html) {
        return { ok: true, html: parsed.html, status: parsed.status };
      }
      const classified = classifyHttpFailure(parsed.status, parsed.html, parsed.error);
      return {
        ok: false,
        status: parsed.status,
        failureReason: classified.reason,
        error: classified.message
      };
    } catch (err: unknown) {
      return {
        ok: false,
        failureReason: "network",
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  if (capacitorWindow.Capacitor?.isNativePlatform?.() && capacitorWindow.Capacitor.Plugins?.CapacitorHttp) {
    try {
      const response = await capacitorWindow.Capacitor.Plugins.CapacitorHttp.get({ url: targetUrl });
      if (response.status >= 200 && response.status < 300 && response.data) {
        return { ok: true, html: response.data, status: response.status };
      }
      const classified = classifyHttpFailure(response.status, response.data);
      return {
        ok: false,
        status: response.status,
        failureReason: classified.reason,
        error: classified.message
      };
    } catch (err: unknown) {
      return {
        ok: false,
        failureReason: "network",
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  return {
    ok: false,
    unsupportedInBrowser: true,
    failureReason: "cors",
    error: "Browser security prevents fetching third-party URLs directly in the web demo. Install the desktop/Android app or paste the copied recipe text (or page HTML source) below."
  };
}

export async function importRecipesFromUrl(targetUrl: string): Promise<ImportUrlResult> {
  const fetchResult = await fetchRecipePage(targetUrl);
  if (!fetchResult.ok || !fetchResult.html) {
    return {
      ok: false,
      recipes: [],
      status: fetchResult.status,
      error: fetchResult.error,
      unsupportedInBrowser: fetchResult.unsupportedInBrowser,
      failureReason: fetchResult.failureReason
    };
  }

  const recipes = extractRecipesFromHtml(fetchResult.html);
  if (recipes.length === 0) {
    const looksPaywalled = /(subscribe to continue|create a free account|enable javascript|captcha)/i.test(fetchResult.html);
    return {
      ok: false,
      recipes: [],
      status: fetchResult.status,
      failureReason: looksPaywalled ? "paywall_or_blocked" : "no_recipe_found",
      error: looksPaywalled
        ? "This site returned a login or anti-bot wall instead of a recipe. Copy the recipe text from your browser and paste it below."
        : "No structured recipe data was found on this page. Copy the recipe text from your browser and paste it below."
    };
  }

  for (const recipe of recipes) {
    recipe.sourceUrl = targetUrl;
  }

  return { ok: true, recipes, status: fetchResult.status };
}
