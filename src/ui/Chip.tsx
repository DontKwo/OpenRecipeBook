import { type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Chip.module.css";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
  badge?: ReactNode;
  label?: ReactNode;
  children?: ReactNode;
}

export function Chip({
  selected = false,
  icon,
  badge,
  label,
  children,
  className = "",
  type = "button",
  ...rest
}: ChipProps): JSX.Element {
  const content = children !== undefined ? children : label;

  return (
    <button
      type={type}
      className={`${styles.chip} ${selected ? styles.selected : ""} ${className}`.trim()}
      {...rest}
    >
      {icon}
      {content !== undefined && <span>{content}</span>}
      {badge !== undefined && badge !== null && (
        <span className={styles.badge}>{badge}</span>
      )}
    </button>
  );
}
