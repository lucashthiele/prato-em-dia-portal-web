import * as Dialog from "@radix-ui/react-dialog";
import { useId, type ReactNode } from "react";
import { Button } from "./Button";
import styles from "./ConfirmDialog.module.css";

export interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  open: boolean;
  /** Ação secundária (três botões: cancelar, secundária, confirmar). Anda junto com `onSecondary`. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Apoio da ação de confirmar, entre o corpo e os botões. */
  confirmHint?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "primary",
  loading,
  open,
  secondaryLabel,
  onSecondary,
  confirmHint,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const hintId = useId();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.scrim} />
        <Dialog.Content className={styles.dialog} role="alertdialog">
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>
          <Dialog.Description asChild>
            <div className={styles.body}>{children}</div>
          </Dialog.Description>
          {confirmHint ? (
            <p id={hintId} className={styles.hint}>
              {confirmHint}
            </p>
          ) : null}
          <div className={styles.actions}>
            <Button variant="ghost" onClick={onCancel}>
              {cancelLabel}
            </Button>
            {secondaryLabel ? (
              <Button variant="outline" onClick={onSecondary} loading={loading}>
                {secondaryLabel}
              </Button>
            ) : null}
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              onClick={onConfirm}
              loading={loading}
              aria-describedby={confirmHint ? hintId : undefined}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
