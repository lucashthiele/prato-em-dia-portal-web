import { Link } from "react-router";
import { StatusChip } from "../../../shared/ui";
import { shortDate, weekdayLabel } from "../lib/dates";
import { MEAL_TYPE_LABEL, MEAL_TYPES } from "../lib/labels";
import type { Cell, Day } from "../lib/week";
import styles from "./WeekGrid.module.css";

export function CellView({ cell }: { cell: Cell }) {
  if (cell.kind === "unplanned") {
    return (
      <span className={styles.dash}>
        —<span className={styles.srOnly}>Sem refeição planejada</span>
      </span>
    );
  }
  if (cell.kind === "upcoming") return <span className={styles.upcoming}>Prevista</span>;
  return (
    <span className={styles.chips}>
      <StatusChip status={cell.state} />
      {cell.substituted ? <StatusChip status="substituted" /> : null}
    </span>
  );
}

export function WeekGrid({ patientId, days }: { patientId: string; days: Day[] }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>Refeições da semana por dia e categoria</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            {MEAL_TYPES.map((type) => (
              <th key={type} scope="col">
                {MEAL_TYPE_LABEL[type]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row" className={styles.day}>
                <Link
                  className={styles.link}
                  to={`/pacientes/${patientId}/acompanhamento/${day.date}`}
                >
                  {weekdayLabel(day.date)}, {shortDate(day.date)}
                </Link>
                {day.versionFrom != null ? (
                  <span className={styles.marker}>Versão {day.versionFrom} a partir daqui</span>
                ) : null}
              </th>
              {MEAL_TYPES.map((type) => (
                <td key={type}>
                  <CellView cell={day.cells[type]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
