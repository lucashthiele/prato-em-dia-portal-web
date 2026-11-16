import { Button } from "../../../shared/ui";
import { fullDate } from "../lib/dates";
import styles from "./WeekNav.module.css";

interface WeekNavProps {
  monday: string;
  sunday: string;
  isCurrent: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCurrent: () => void;
}

export function WeekNav({
  monday,
  sunday,
  isCurrent,
  onPrevious,
  onNext,
  onCurrent,
}: WeekNavProps) {
  return (
    <nav className={styles.nav} aria-label="Semanas">
      <Button variant="outline" size="sm" onClick={onPrevious}>
        Semana anterior
      </Button>
      <h3 className={styles.range} aria-live="polite">
        {fullDate(monday)} a {fullDate(sunday)}
      </h3>
      <Button variant="outline" size="sm" onClick={onNext}>
        Próxima semana
      </Button>
      {isCurrent ? null : (
        <Button variant="ghost" size="sm" onClick={onCurrent}>
          Semana atual
        </Button>
      )}
    </nav>
  );
}
