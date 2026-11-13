import React, { type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps): JSX.Element {
  const sizeClass = size === "sm" ? styles.sizeSm : size === "lg" ? styles.sizeLg : styles.sizeMd;
  const variantClass = styles[variant];

  return (
    <button
      type={type}
      className={`${styles.button} ${variantClass} ${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon: ReactNode;
}

export function IconButton({
  variant = "ghost",
  size = "md",
  icon,
  className = "",
  type = "button",
  ...rest
}: IconButtonProps): JSX.Element {
  const sizeClass = size === "sm" ? styles.sizeSm : size === "lg" ? styles.sizeLg : styles.sizeMd;
  const variantClass = styles[variant];

  return (
    <button
      type={type}
      className={`${styles.button} ${styles.iconOnly} ${variantClass} ${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {icon}
    </button>
  );
}
