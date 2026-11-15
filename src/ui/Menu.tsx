import {
  useState,
  useRef,
  useEffect,
  cloneElement,
  Fragment,
  type ReactNode,
  type ReactElement,
  type MouseEvent,
  type CSSProperties,
  type Ref,
  type MutableRefObject
} from "react";
import { createPortal } from "react-dom";
import styles from "./Menu.module.css";

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  dividerBefore?: boolean;
}

export interface MenuProps {
  trigger: ReactElement;
  items: MenuItem[];
  align?: "left" | "right";
  ariaLabel?: string;
}

export function Menu({
  trigger,
  items,
  align = "right",
  ariaLabel = "Menu"
}: MenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 640);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = (): void => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return (): void => window.removeEventListener("resize", handleResize);
  }, []);

  const updatePosition = (): void => {
    if (!triggerRef.current || isMobile) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 240;
    const padding = 12;

    let left = align === "right" ? rect.right - menuWidth : rect.left;
    if (left < padding) left = padding;
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    let top = rect.bottom + 6;
    if (top + 280 > window.innerHeight - padding) {
      top = Math.max(padding, rect.top - 280);
    }

    setMenuStyle({
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`
    });
  };

  const handleOpen = (): void => {
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = (): void => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!menuRef.current) return;
        const buttons = Array.from(
          menuRef.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
        );
        if (buttons.length === 0) return;
        const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
        let nextIndex = 0;
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex >= buttons.length - 1 ? 0 : currentIndex + 1;
        } else {
          nextIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
        }
        buttons[nextIndex]?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return (): void => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstBtn = menuRef.current.querySelector<HTMLButtonElement>("button:not(:disabled)");
      firstBtn?.focus();
    }
  }, [isOpen]);

  const clonedTrigger = cloneElement(trigger, {
    ref: (el: HTMLElement | null): void => {
      triggerRef.current = el;
      const originalRef = (trigger as { ref?: Ref<HTMLElement> }).ref;
      if (typeof originalRef === "function") originalRef(el);
      else if (originalRef && typeof originalRef === "object") {
        (originalRef as MutableRefObject<HTMLElement | null>).current = el;
      }
    },
    onClick: (e: MouseEvent<HTMLElement>): void => {
      trigger.props.onClick?.(e);
      if (isOpen) handleClose();
      else handleOpen();
    },
    "aria-haspopup": "menu",
    "aria-expanded": isOpen
  });

  return (
    <>
      {clonedTrigger}
      {isOpen &&
        createPortal(
          <>
            <div
              className={isMobile ? styles.backdrop : styles.desktopBackdrop}
              onClick={handleClose}
              aria-hidden="true"
            />
            <div
              ref={menuRef}
              role="menu"
              aria-label={ariaLabel}
              className={isMobile ? styles.menuSheet : styles.menuDesktop}
              style={isMobile ? undefined : menuStyle}
            >
              {isMobile && <div className={styles.sheetHandle} />}
              {items.map((item: MenuItem): JSX.Element => (
                <Fragment key={item.id}>
                  {item.dividerBefore && <div className={styles.divider} />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    className={`${styles.item} ${item.danger ? styles.danger : ""}`.trim()}
                    onClick={(): void => {
                      handleClose();
                      item.onClick();
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </Fragment>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
