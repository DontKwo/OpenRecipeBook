import React, { type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Chip.module.css";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}

export function Chip({
  selected = false,
  icon,
  badge,
  children,
  className = "",
  type = "button",
  ...rest
}: ChipProps): JSX.Element {
  return (
    <button
      type={type}
      className={`${styles.chip} ${selected ? styles.selected : ""} ${className}`.trim()}
      {...rest}
    >
      {icon}
      <span>{children}</span>
      {badge !== undefined && badge !== null && (
        <span className={styles.badge}>{badge}</span>
      )}
    </button>
  );
}
