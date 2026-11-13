import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import styles from "./Toast.module.css";

export interface ToastItem {
  id: string;
  message: string;
  duration?: number;
  undo?: () => void;
  undoLabel?: string;
}

export interface ToastContextType {
  showToast: (options: string | Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string): void => {
    setToasts((prev: ToastItem[]): ToastItem[] =>
      prev.filter((t: ToastItem): boolean => t.id !== id)
    );
  }, []);

  const showToast = useCallback(
    (options: string | Omit<ToastItem, "id">): void => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem =
        typeof options === "string"
          ? { id, message: options, duration: 4000 }
          : { ...options, id, duration: options.duration ?? 4000 };

      setToasts((prev: ToastItem[]): ToastItem[] => [...prev, item]);

      if (item.duration && item.duration > 0) {
        setTimeout((): void => {
          removeToast(id);
        }, item.duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className={styles.toastContainer} aria-live="polite" aria-atomic="true">
          {toasts.map((toast: ToastItem): JSX.Element => (
            <div key={toast.id} className={styles.toast}>
              <span className={styles.message}>{toast.message}</span>
              {toast.undo && (
                <button
                  type="button"
                  className={styles.undoButton}
                  onClick={(): void => {
                    toast.undo?.();
                    removeToast(toast.id);
                  }}
                >
                  {toast.undoLabel || "Undo"}
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
