import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent
} from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./Button";
import { CloseIcon } from "./icons";
import styles from "./Dialog.module.css";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number | string;
  ariaLabel?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth,
  ariaLabel
}: DialogProps): JSX.Element | null {
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 640);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = (): void => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return (): void => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && containerRef.current) {
        const focusables = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el: HTMLElement) => !el.hasAttribute("disabled"));

        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return (): void => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const focusable = containerRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const dialogContent = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : ariaLabel || "Dialog"}
      className={isMobile ? styles.sheetMobile : styles.dialogDesktop}
      style={!isMobile && maxWidth ? { maxWidth } : undefined}
    >
      {isMobile && <div className={styles.sheetHandle} />}
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        <IconButton
          size="sm"
          variant="ghost"
          icon={<CloseIcon />}
          aria-label="Close dialog"
          onClick={onClose}
        />
      </div>
      <div className={styles.content}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
    >
      {dialogContent}
    </div>,
    document.body
  );
}
