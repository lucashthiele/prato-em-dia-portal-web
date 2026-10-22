import type { ReactNode } from "react";
import styles from "./MetricTile.module.css";

export interface MetricTileProps {
  label: string;
  /** Já formatado em pt-BR. */
  value: ReactNode;
  unit?: string;
  hint?: string;
}

export function MetricTile({ label, value, unit, hint }: MetricTileProps) {
  return (
    <div className={styles.metric}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>
        {value}
        {unit ? <span className={styles.unit}> {unit}</span> : null}
      </div>
      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}
