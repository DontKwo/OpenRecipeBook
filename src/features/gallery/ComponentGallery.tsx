import { useState, type FC, type ReactElement } from "react";
import {
  PlusIcon,
  HeartIcon,
  StarIcon
} from "../../ui/icons";
import { getCoursePlaceholder } from "../../domain/recipe/placeholders";

export const ComponentGallery: FC = (): ReactElement => {
  const [rating, setRating] = useState<number>(4);
  const [isFavorite, setIsFavorite] = useState<boolean>(true);
  const [multiplier, setMultiplier] = useState<number>(2);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "var(--space-6)" }}>
      <header style={{ marginBottom: "var(--space-8)", borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-4)" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.5rem", marginBottom: "var(--space-2)" }}>
          Design System & Component Gallery
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Internal design gallery for reviewing tokens, typography, controls, and illustrations.
        </p>
      </header>

      {/* Typography */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "var(--space-4)", color: "var(--accent)" }}>
          Typography & Numeral Formatting
        </h2>
        <div style={{ background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.25rem", marginBottom: "var(--space-2)" }}>
            Classic Buttermilk Pancakes
          </h1>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", marginBottom: "var(--space-2)" }}>
            Section Heading: Step 1. Prepare Batter
          </h2>
          <p style={{ marginBottom: "var(--space-3)", color: "var(--text)", maxWidth: "65ch" }}>
            Body text with generous line height and optimal reading measure. Fluffy, golden pancakes made from scratch with real buttermilk and melted butter.
          </p>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontVariantNumeric: "tabular-nums" }}>
            Tabular quantities: 2 1/4 cups flour · 1 tbsp sugar · 375 g butter
          </div>
        </div>
      </section>

      {/* Buttons & Presets */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "var(--space-4)", color: "var(--accent)" }}>
          Buttons & Multiplier Chips
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center", marginBottom: "var(--space-4)" }}>
          <button
            type="button"
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              padding: "10px 20px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <PlusIcon width={16} height={16} /> New Recipe
          </button>

          <button
            type="button"
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: "10px 20px",
              borderRadius: "var(--radius-full)",
              fontWeight: 500,
              cursor: "pointer"
            }}
          >
            Secondary Action
          </button>

          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            style={{
              background: "var(--surface)",
              color: isFavorite ? "var(--danger)" : "var(--muted)",
              border: "1px solid var(--border)",
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-full)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
            aria-label="Toggle favorite"
          >
            <HeartIcon fill={isFavorite ? "currentColor" : "none"} width={20} height={20} />
          </button>
        </div>

        {/* Multiplier chips */}
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <span style={{ fontSize: "0.9rem", color: "var(--muted)", marginRight: "var(--space-2)" }}>Scale:</span>
          {[0.5, 1, 2, 3].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setMultiplier(val)}
              style={{
                background: multiplier === val ? "var(--accent)" : "var(--surface)",
                color: multiplier === val ? "var(--accent-contrast)" : "var(--text)",
                border: "1px solid " + (multiplier === val ? "var(--accent)" : "var(--border)"),
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {val === 0.5 ? "1/2×" : `${val}×`}
            </button>
          ))}
        </div>
      </section>

      {/* Interactive Rating */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "var(--space-4)", color: "var(--accent)" }}>
          Star Rating Component
        </h2>
        <div style={{ display: "flex", gap: "4px" }}>
          {[1, 2, 3, 4, 5].map((starIndex) => (
            <button
              key={starIndex}
              type="button"
              onClick={() => setRating(starIndex)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: starIndex <= rating ? "#e17055" : "var(--border)"
              }}
              aria-label={`${starIndex} stars`}
            >
              <StarIcon fill={starIndex <= rating ? "currentColor" : "none"} width={26} height={26} />
            </button>
          ))}
          <span style={{ marginLeft: "8px", alignSelf: "center", color: "var(--muted)", fontSize: "0.95rem" }}>
            {rating} of 5 stars
          </span>
        </div>
      </section>

      {/* Generated Course Placeholder Art */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "var(--space-4)", color: "var(--accent)" }}>
          Course Placeholder Art (No Stock Photography)
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
          {["Breakfast", "Dessert", "Drink", "Soup", "Pasta", "Dinner"].map((courseName) => {
            const placeholder = getCoursePlaceholder(courseName);
            return (
              <div
                key={courseName}
                style={{
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  background: "var(--surface)"
                }}
              >
                <div
                  style={{
                    height: "120px",
                    background: placeholder.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(36, 30, 27, 0.7)"
                  }}
                  dangerouslySetInnerHTML={{ __html: placeholder.svgContent }}
                />
                <div style={{ padding: "var(--space-2) var(--space-3)", textAlign: "center", fontWeight: 600 }}>
                  {courseName}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
