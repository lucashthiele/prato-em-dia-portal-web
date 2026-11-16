import { useSearchParams } from "react-router";
import { ApiError } from "../../../shared/api";
import { Alert, Button, EmptyState, WeekSummary } from "../../../shared/ui";
import { usePatientPrescriptions } from "../../prescriptions";
import { useCalendar, useDailyCategories, useExecutions } from "../api/tracking";
import { WeekGrid } from "../components/WeekGrid";
import { WeekNav } from "../components/WeekNav";
import { addDays, mondayOf, parseIso, shortDate, todayIso, weekDates } from "../lib/dates";
import { buildWeek, countWeek, isEmptyWeek, versionMarkers } from "../lib/week";
import styles from "./WeekPanel.module.css";

/** O servidor recusar a data (fora do calendário do paciente) não é falha: o dia fica sem estado. */
function isUnavailableDay(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    ![401, 403].includes(error.status)
  );
}

export function WeekPanel({ patientId }: { patientId: string }) {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const requested = parseIso(params.get("semana")) ? params.get("semana")! : today;
  const monday = mondayOf(requested);
  const sunday = addDays(monday, 6);
  const dates = weekDates(monday);

  const categories = useDailyCategories(patientId, dates);
  const executions = useExecutions(patientId, monday, sunday);
  const calendar = useCalendar(patientId);
  const prescriptions = usePatientPrescriptions(patientId);

  function goTo(week: string) {
    const next = new URLSearchParams(params);
    if (week === mondayOf(today)) next.delete("semana");
    else next.set("semana", week);
    setParams(next);
  }

  const nav = (
    <WeekNav
      monday={monday}
      sunday={sunday}
      isCurrent={monday === mondayOf(today)}
      onPrevious={() => goTo(addDays(monday, -7))}
      onNext={() => goTo(addDays(monday, 7))}
      onCurrent={() => goTo(mondayOf(today))}
    />
  );

  const failed = [
    ...categories.filter((q) => q.isError && !isUnavailableDay(q.error)),
    ...[executions, calendar].filter((q) => q.isError),
  ];
  if (failed.length > 0) {
    const offline = failed.some((q) => q.error instanceof ApiError && q.error.status === 0);
    return (
      <div className={styles.panel}>
        {nav}
        <Alert
          tone="danger"
          title="Não foi possível carregar o acompanhamento"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => failed.forEach((query) => void query.refetch())}
            >
              Tentar de novo
            </Button>
          }
        >
          {offline ? "Não foi possível falar com o servidor." : "Tente novamente em instantes."}
        </Alert>
      </div>
    );
  }

  if (categories.some((q) => q.isPending) || executions.isPending || calendar.isPending) {
    return (
      <div className={styles.panel}>
        {nav}
        <p role="status" aria-busy="true" className={styles.muted}>
          Carregando acompanhamento…
        </p>
      </div>
    );
  }

  const versionNumbers = new Map(
    (prescriptions.data ?? []).flatMap((p) => (p.versions ?? []).map((v) => [v.id, v.number])),
  );
  const dayCategories = categories.map((q) => q.data ?? null);
  const days = buildWeek({
    dates,
    today,
    categories: dayCategories,
    executions: executions.data ?? [],
    markers: versionMarkers(calendar.data, (id) => versionNumbers.get(id) ?? undefined),
  });

  return (
    <div className={styles.panel}>
      {nav}
      {isEmptyWeek(days) ? (
        <EmptyState title="Sem plano nesta semana" icon="clock">
          O paciente não tem plano semanal nem registros entre {shortDate(monday)} e{" "}
          {shortDate(sunday)}.
        </EmptyState>
      ) : (
        <>
          <WeekSummary
            title={`Semana de ${shortDate(monday)} a ${shortDate(sunday)}`}
            subtitle="Dias futuros não entram nas contagens."
            counts={countWeek(days, dayCategories)}
          />
          <WeekGrid patientId={patientId} days={days} />
        </>
      )}
    </div>
  );
}
