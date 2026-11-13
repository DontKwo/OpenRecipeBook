import React from "react";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDanger = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element | null {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidth={420}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "danger" : "primary"}
            onClick={(): void => {
              onConfirm();
              onCancel();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
        {message}
      </p>
    </Dialog>
  );
}
