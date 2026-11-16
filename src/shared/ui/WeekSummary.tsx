import clsx from "clsx";
import { Icon, type IconName } from "./Icon";
import styles from "./WeekSummary.module.css";

export interface WeekSummaryProps {
  title: string;
  subtitle?: string;
  /** Contagens de categorias de refeição; dias futuros ficam de fora. Sem percentual. */
  counts: { planned: number; logged: number; partial: number; none: number; substituted: number };
}

type Tone = "success" | "warm" | "neutral";

// Rótulos e ícones iguais aos do StatusChip.
const CELLS: { key: keyof WeekSummaryProps["counts"]; label: string; icon: IconName; tone: Tone }[] =
  [
    { key: "planned", label: "Previstas", icon: "file", tone: "neutral" },
    { key: "logged", label: "Registradas", icon: "check", tone: "success" },
    { key: "partial", label: "Parciais", icon: "clock", tone: "warm" },
    { key: "none", label: "Sem registro", icon: "minus", tone: "neutral" },
    { key: "substituted", label: "Com substituição", icon: "swap", tone: "warm" },
  ];

export function WeekSummary({ title, subtitle, counts }: WeekSummaryProps) {
  return (
    <section className={styles.week} aria-label={title}>
      <div className={styles.title}>{title}</div>
      {subtitle ? <div className={styles.sub}>{subtitle}</div> : null}
      <ul className={styles.grid}>
        {CELLS.map((cell) => (
          <li key={cell.key} className={clsx(styles.cell, styles[cell.tone])}>
            <span className={styles.label}>
              <Icon name={cell.icon} size={16} />
              <span>{cell.label}</span>
            </span>
            <span className={styles.n}>{counts[cell.key]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
