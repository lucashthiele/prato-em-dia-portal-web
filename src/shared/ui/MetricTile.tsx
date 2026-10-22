import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./MetricTile.module.css";

export interface MetricTileProps {
  label: string;
  /** Já formatado em pt-BR. */
  value: ReactNode;
  unit?: string;
  hint?: string;
  /** `danger` só para o que exige ação; o texto de `hint` deve dizer o motivo. */
  tone?: "neutral" | "danger";
}

export function MetricTile({ label, value, unit, hint, tone = "neutral" }: MetricTileProps) {
  return (
    <div className={styles.metric}>
      <div className={styles.label}>{label}</div>
      <div className={clsx(styles.value, tone === "danger" && styles.danger)}>
        {value}
        {unit ? <span className={styles.unit}> {unit}</span> : null}
      </div>
      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}
