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

  if (effectiveAccent.startsWith("#")) {
    document.documentElement.setAttribute("data-accent", "custom");
    document.documentElement.style.setProperty("--accent", effectiveAccent);
    document.documentElement.style.setProperty("--accent-contrast", "#ffffff");
  } else {
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--accent-contrast");
    document.documentElement.setAttribute("data-accent", effectiveAccent);
  }

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const hex = effectiveAccent.startsWith("#")
      ? effectiveAccent
      : ACCENT_COLORS[effectiveAccent] || "#3d7250";
    metaThemeColor.setAttribute("content", hex);
  }
};
