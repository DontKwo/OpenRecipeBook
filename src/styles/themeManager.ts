export const ACCENT_COLORS: Record<string, string> = {
  sage: "#3d7250",
  terracotta: "#b84c2a",
  slate: "#2e6274",
  berry: "#8e2b4d",
  ochre: "#a36511"
};

export const applyThemeAndAccent = (theme?: string, accent?: string): void => {
  const effectiveTheme = theme ?? localStorage.getItem("orb_theme") ?? "system";
  const effectiveAccent = accent ?? localStorage.getItem("accentTheme") ?? "sage";

  if (effectiveTheme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", effectiveTheme);
  }

  const hex = effectiveAccent.startsWith("#")
    ? effectiveAccent
    : ACCENT_COLORS[effectiveAccent] || "#3d7250";

  document.documentElement.setAttribute(
    "data-accent",
    effectiveAccent.startsWith("#") ? "custom" : effectiveAccent
  );
  document.documentElement.style.setProperty("--accent", hex);
  document.documentElement.style.setProperty("--accent-contrast", "#ffffff");

  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement("meta");
    metaThemeColor.setAttribute("name", "theme-color");
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute("content", hex);

  try {
    const win = window as unknown as {
      AndroidBridge?: { setStatusBarColor?: (color: string) => void };
    };
    if (win.AndroidBridge?.setStatusBarColor) {
      win.AndroidBridge.setStatusBarColor(hex);
    }
  } catch {
    // Ignore Android bridge error
  }
};
