import clsx from "clsx";
import { Icon, type IconName } from "./Icon";
import styles from "./StatusChip.module.css";

export type Status =
  | "done"
  | "skipped"
  | "substituted"
  | "none"
  | "draft"
  | "published"
  | "archived"
  | "active"
  | "ended"
  | "pending"
  | "sent"
  | "failed";

type Tone = "success" | "warm" | "danger" | "neutral";

// [rótulo, ícone, tom, dica]: estado sempre com ícone e texto, nunca só cor.
const STATUS: Record<Status, [string, IconName, Tone, string?]> = {
  done: ["Realizada", "check", "success"],
  skipped: ["Não realizada", "x", "danger"],
  substituted: ["Alterada", "swap", "warm", "Realizada com substituição"],
  none: ["Sem registro", "minus", "neutral"],
  draft: ["Rascunho", "file", "warm"],
  published: ["Publicada", "check", "success"],
  archived: ["Arquivada", "history", "neutral"],
  active: ["Vínculo ativo", "check", "success"],
  ended: ["Vínculo encerrado", "x", "neutral"],
  pending: ["Envio pendente", "clock", "neutral"],
  sent: ["Acesso enviado", "mail", "success"],
  failed: ["Falha no envio", "alert", "danger"],
};

export interface StatusChipProps {
  status: Status;
  label?: string;
  className?: string;
}

export function StatusChip({ status, label, className }: StatusChipProps) {
  const [text, icon, tone, hint] = STATUS[status];
  return (
    <span className={clsx(styles.chip, styles[tone], className)} title={label ? undefined : hint}>
      <Icon name={icon} size={14} />
      <span>{label ?? text}</span>
    </span>
  );
}
