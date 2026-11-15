export function sanitizeText(text: string): string {
  if (!text) return "";
  let result = text;

  // Strip leading ~ in ingredient lines
  result = result.replace(/^~\s*/, "");

  // Strip unit-trailing + (e.g. "3 cups+ mini marshmallows" -> "3 cups mini marshmallows")
  result = result.replace(
    /(\b(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|g|grams?|ml|pinch|dash))\+/gi,
    "$1"
  );

  // Normalize temperatures to deg F and deg C symbols
  result = result.replace(/(\d+)\s*(?:degrees|deg\.?)\s*([FC])\b/gi, "$1°$2");
  result = result.replace(/(\d+)\s*deg\s*\./gi, "$1°F.");
  result = result.replace(/(\d+)\s*deg\s+F\b/gi, "$1°F");
  result = result.replace(/(\d+)\s*deg\s+C\b/gi, "$1°C");
  result = result.replace(/\b(\d{2,3})\s*F\b/g, "$1°F");
  result = result.replace(/\b(\d{2,3})\s*C\b/g, "$1°C");

  // Fix unbalanced lead-in (*Lead-in.** -> **Lead-in.**)
  result = result.replace(/^\*([^\*\n]+)\*\*/, "**$1**");

  // Strip stray backticks
  result = result.replace(/`/g, "");

  // Strip trailing stray * at end of text
  result = result.replace(/([a-zA-Z0-9\.\,\!\?])\s*\*\s*$/, "$1");

  // Strip leading # from lines
  result = result.replace(/^#+\s*/gm, "");

  // Strip Notes: or Options: prefixes
  result = result.replace(/^(?:Cook's\s+)?(?:Notes?|Options?):\s*\n?/i, "");

  return result.trim();
}

export function sanitizeHeading(heading?: string): string | undefined {
  if (!heading) return undefined;
  const cleaned = heading.replace(/:\s*$/, "").trim();
  return cleaned || undefined;
}
