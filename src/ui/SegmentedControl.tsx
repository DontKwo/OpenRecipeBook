import { type ReactNode } from "react";
import styles from "./SegmentedControl.module.css";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label?: ReactNode;
  icon?: ReactNode;
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  name?: string;
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className = "",
  name
}: SegmentedControlProps<T>): JSX.Element {
  return (
    <div
      role="group"
      aria-label={name}
      className={`${styles.container} ${className}`.trim()}
    >
      {options.map((opt: SegmentedOption<T>): JSX.Element => {
        const isSelected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.ariaLabel}
            className={`${styles.item} ${isSelected ? styles.active : ""}`.trim()}
            onClick={(): void => onChange(opt.value)}
          >
            {opt.icon}
            {opt.label !== undefined && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
