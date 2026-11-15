import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    icon,
    children,
    className = "",
    type = "button",
    ...rest
  },
  ref
): JSX.Element {
  const sizeClass = size === "sm" ? styles.sizeSm : size === "lg" ? styles.sizeLg : styles.sizeMd;
  const variantClass = styles[variant];

  return (
    <button
      ref={ref}
      type={type}
      className={`${styles.button} ${variantClass} ${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {icon}
      {children !== undefined && <span>{children}</span>}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    variant = "ghost",
    size = "md",
    icon,
    className = "",
    type = "button",
    ...rest
  },
  ref
): JSX.Element {
  const sizeClass = size === "sm" ? styles.sizeSm : size === "lg" ? styles.sizeLg : styles.sizeMd;
  const variantClass = styles[variant];

  return (
    <button
      ref={ref}
      type={type}
      className={`${styles.button} ${styles.iconOnly} ${variantClass} ${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {icon}
    </button>
  );
});
