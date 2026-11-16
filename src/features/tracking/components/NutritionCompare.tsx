import { formatAmount, NUTRIENTS } from "../lib/labels";
import type { DailySummary } from "../api/tracking";
import styles from "./NutritionCompare.module.css";

export interface Target {
  amount?: number;
  unit?: string;
}

interface NutritionCompareProps {
  summary: DailySummary | null;
  /** `null` quando as metas não puderam ser carregadas. */
  targets: Map<string, Target> | null;
}

/** Resumo nutricional do dia: meta diária da versão × planejado × registrado. */
export function NutritionCompare({ summary, targets }: NutritionCompareProps) {
  return (
    <section className={styles.section} aria-labelledby="nutrition-title">
      <h3 id="nutrition-title" className={styles.title}>
        Resumo nutricional do dia
      </h3>
      {summary ? (
        <div className={styles.wrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Nutriente</th>
                <th scope="col" className={styles.num}>
                  Meta diária
                </th>
                <th scope="col" className={styles.num}>
                  Planejado
                </th>
                <th scope="col" className={styles.num}>
                  Registrado
                </th>
              </tr>
            </thead>
            <tbody>
              {NUTRIENTS.map(({ code, label }) => {
                const target = targets?.get(code);
                const planned = summary.planned?.[code];
                const realized = summary.realized?.[code];
                return (
                  <tr key={code}>
                    <th scope="row">{label}</th>
                    <td className={styles.num}>
                      {targets === null ? (
                        <span className={styles.muted}>Indisponível</span>
                      ) : target ? (
                        formatAmount(target.amount, target.unit)
                      ) : (
                        <span className={styles.muted}>Sem meta</span>
                      )}
                    </td>
                    <td className={styles.num}>{formatAmount(planned?.amount, planned?.unit)}</td>
                    <td className={styles.num}>
                      {formatAmount(realized?.amount ?? 0, realized?.unit ?? planned?.unit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.muted}>Não há resumo nutricional para este dia.</p>
      )}
    </section>
  );
}
