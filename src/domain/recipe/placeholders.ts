export interface CoursePlaceholder {
  gradient: string;
  svgContent: string;
}

export function getCoursePlaceholder(course?: string): CoursePlaceholder {
  const normalizedCourse = (course || "").toLowerCase().trim();

  if (normalizedCourse.includes("breakfast")) {
    return {
      gradient: "linear-gradient(135deg, #f7d794 0%, #e17055 100%)",
      svgContent: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="50" cy="50" r="22"/>
        <path d="M50 18v-8M50 90v-8M18 50h-8M90 50h-8M27 27l-6-6M79 79l-6-6M27 73l-6 6M79 21l-6 6"/>
        <path d="M35 55c5 5 25 5 30 0"/>
      </svg>`
    };
  }

  if (normalizedCourse.includes("dessert") || normalizedCourse.includes("cookie") || normalizedCourse.includes("cake")) {
    return {
      gradient: "linear-gradient(135deg, #f8a5c2 0%, #e77f67 100%)",
      svgContent: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M25 50h50l-8 32H33L25 50z"/>
        <path d="M25 50c0-12 12-18 25-18s25 6 25 18"/>
        <circle cx="50" cy="26" r="5" fill="currentColor"/>
      </svg>`
    };
  }

  if (normalizedCourse.includes("drink") || normalizedCourse.includes("beverage")) {
    return {
      gradient: "linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)",
      svgContent: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M30 25h40l-8 45H38L30 25z"/>
        <path d="M50 70v15M38 85h24"/>
        <path d="M34 40h32"/>
      </svg>`
    };
  }

  if (normalizedCourse.includes("soup") || normalizedCourse.includes("stew")) {
    return {
      gradient: "linear-gradient(135deg, #fab1a0 0%, #e17055 100%)",
      svgContent: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 50c0 18 13 32 30 32s30-14 30-32H20z"/>
        <path d="M15 50h70"/>
        <path d="M38 38c0-8 6-8 6-16M50 38c0-8 6-8 6-16M62 38c0-8 6-8 6-16"/>
      </svg>`
    };
  }

  if (normalizedCourse.includes("pasta")) {
    return {
      gradient: "linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)",
      svgContent: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 55c0 16 12 28 28 28s28-12 28-28H22z"/>
        <path d="M18 55h64"/>
        <path d="M35 55c0-12 10-18 15-25 5 7 15 13 15 25"/>
      </svg>`
    };
  }

  // Default dinner / general cooking cloche placeholder
  return {
    gradient: "linear-gradient(135deg, #dfe6e9 0%, #b2bec3 100%)",
    svgContent: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 65c0-18 13-30 30-30s30 12 30 30H20z"/>
      <path d="M15 65h70"/>
      <circle cx="50" cy="30" r="4" fill="currentColor"/>
    </svg>`
  };
}
