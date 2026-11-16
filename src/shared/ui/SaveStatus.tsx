import clsx from "clsx";
import { Icon, type IconName } from "./Icon";
import styles from "./SaveStatus.module.css";

export interface SaveStatusProps {
  state: "unsaved" | "saving" | "saved" | "error";
  /** Substitui o texto padrão, por exemplo "Salvo às 14:32". */
  label?: string;
}

const DEFAULTS: Record<SaveStatusProps["state"], [IconName | null, string]> = {
  unsaved: ["clock", "Alterações não salvas"],
  saving: [null, "Salvando…"],
  saved: ["check", "Rascunho salvo"],
  error: ["alert", "Não foi possível salvar"],
};

export function SaveStatus({ state, label }: SaveStatusProps) {
  const [icon, text] = DEFAULTS[state];
  return (
    <span className={clsx(styles.save, styles[state])} role="status" aria-live="polite">
      {icon ? (
        <Icon name={icon} size={16} />
      ) : (
        <span className={styles.spinner} aria-hidden="true" />
      )}
      {label ?? text}
    </span>
  );
}
