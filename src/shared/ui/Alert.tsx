import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Alert.module.css";
import { Icon, type IconName } from "./Icon";

export interface AlertProps {
  tone?: "info" | "success" | "warm" | "danger";
  title?: string;
  children: ReactNode;
  /** Um `Button` `sm`. */
  action?: ReactNode;
}

const TONE_ICON: Record<NonNullable<AlertProps["tone"]>, IconName> = {
  info: "alert",
  success: "check",
  danger: "alert",
  warm: "swap",
};

export function Alert({ tone = "info", title, children, action }: AlertProps) {
  return (
    <div className={clsx(styles.alert, styles[tone])} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={TONE_ICON[tone]} size={20} />
      <div className={styles.body}>
        {title ? <div className={styles.title}>{title}</div> : null}
        <div>{children}</div>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
