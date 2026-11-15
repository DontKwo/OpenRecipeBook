import React, { type ReactNode } from "react";

export function renderInlineContent(text: string): ReactNode[] {
  const tokenRegex =
    /(\[([^\]]+)\]\((https?:\/\/[^\s\)]+|mailto:[^\s\)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const [, , linkText, linkUrl, , boldText, , italicStarText, , italicUnderscoreText] = match;
    if (linkText && linkUrl) {
      nodes.push(
        <a
          key={`link-${match.index}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkText}
        </a>
      );
    } else if (boldText) {
      nodes.push(<strong key={`b-${match.index}`}>{boldText}</strong>);
    } else if (italicStarText) {
      nodes.push(<em key={`em-${match.index}`}>{italicStarText}</em>);
    } else if (italicUnderscoreText) {
      nodes.push(<em key={`em-${match.index}`}>{italicUnderscoreText}</em>);
    }
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export interface RichTextProps {
  text?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function RichText({ text = "", className = "", style }: RichTextProps): JSX.Element {
  if (!text.trim()) {
    return <span className={className} style={style} />;
  }

  const blocks = text.trim().split(/\n\s*\n/);

  return (
    <div className={className} style={style}>
      {blocks.map((block: string, blockIdx: number): JSX.Element => {
        const lines = block
          .split("\n")
          .map((l: string): string => l.trim())
          .filter(Boolean);
        const isBulletList =
          lines.length > 0 && lines.every((l: string): boolean => /^[-*]\s+/.test(l));
        const isNumberedList =
          lines.length > 0 && lines.every((l: string): boolean => /^\d+\.\s+/.test(l));

        if (isBulletList) {
          return (
            <ul key={`ul-${blockIdx}`} style={{ margin: "var(--space-2) 0", paddingLeft: "1.25rem" }}>
              {lines.map((l: string, lIdx: number): JSX.Element => (
                <li key={`li-${lIdx}`} style={{ marginBottom: "var(--space-1)" }}>
                  {renderInlineContent(l.replace(/^[-*]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        if (isNumberedList) {
          return (
            <ol key={`ol-${blockIdx}`} style={{ margin: "var(--space-2) 0", paddingLeft: "1.25rem" }}>
              {lines.map((l: string, lIdx: number): JSX.Element => (
                <li key={`li-${lIdx}`} style={{ marginBottom: "var(--space-1)" }}>
                  {renderInlineContent(l.replace(/^\d+\.\s+/, ""))}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`p-${blockIdx}`} style={{ margin: "var(--space-2) 0", lineHeight: 1.6 }}>
            {lines.map((line: string, lineIdx: number): JSX.Element => (
              <React.Fragment key={`line-${lineIdx}`}>
                {lineIdx > 0 && <br />}
                {renderInlineContent(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
