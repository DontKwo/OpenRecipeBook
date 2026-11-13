// OpenRecipeBook "Save Recipe" Bookmarklet
// Extracts schema.org JSON-LD from current page and opens OpenRecipeBook with data encoded
(function () {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  let recipeData = null;

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || "");
      const checkNode = (node) => {
        if (!node || typeof node !== "object") return;
        const type = node["@type"];
        if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
          recipeData = node;
        }
        if (Array.isArray(node["@graph"])) {
          node["@graph"].forEach(checkNode);
        }
      };
      checkNode(parsed);
      if (recipeData) break;
    } catch (e) {
      // Ignore invalid JSON script tags
    }
  }

  if (!recipeData) {
    alert("OpenRecipeBook: Could not find schema.org recipe data on this page.");
    return;
  }

  const encoded = encodeURIComponent(JSON.stringify(recipeData));
  const appUrl = "https://josh.github.io/OpenRecipeBook/#import=" + encoded;
  window.open(appUrl, "_blank");
})();
