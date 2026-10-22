import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";
import { Icon, type IconName } from "./Icon";

export interface EmptyStateProps {
  title: string;
  icon?: IconName;
  /** No máximo uma ação: um `Button`. */
  action?: ReactNode;
  children?: ReactNode;
}

export function EmptyState({ title, icon = "file", action, children }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <span className={styles.icon}>
        <Icon name={icon} size={24} />
      </span>
      <div className={styles.title}>{title}</div>
      {children ? <p className={styles.body}>{children}</p> : null}
      {action}
    </div>
  );
}
