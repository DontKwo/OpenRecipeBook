export const ACCENT_COLORS: Record<string, string> = {
  terracotta: "#b84c2a",
  sage: "#3d7250",
  slate: "#2e6274",
  berry: "#8e2b4d",
  ochre: "#a36511"
};

export const applyThemeAndAccent = (theme?: string, accent?: string): void => {
  const effectiveTheme = theme ?? localStorage.getItem("orb_theme") ?? "system";
  const effectiveAccent = accent ?? localStorage.getItem("accentTheme") ?? "terracotta";

  if (effectiveTheme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", effectiveTheme);
  }

  document.documentElement.setAttribute("data-accent", effectiveAccent);

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", ACCENT_COLORS[effectiveAccent] || "#b84c2a");
  }
};
