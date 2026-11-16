import { Link } from "react-router";
import { ApiError } from "../../../shared/api";
import { Alert, Button, EmptyState } from "../../../shared/ui";
import { useFoodNames, usePatientPrescriptions } from "../../prescriptions";
import { useDailyCategories, useDailySummary, useExecutions, useWeeklyPlan } from "../api/tracking";
import { CategoryBlock } from "../components/CategoryBlock";
import { NutritionCompare, type Target } from "../components/NutritionCompare";
import { fullDate, mondayOf, parseIso, todayIso, weekdayLabel } from "../lib/dates";
import { MEAL_TYPES } from "../lib/labels";
import { buildWeek } from "../lib/week";
import styles from "./DayPage.module.css";

export function DayPage({ patientId, date }: { patientId: string; date: string }) {
  const back = (
    <Link
      className={styles.back}
      to={`/pacientes/${patientId}?aba=acompanhamento&semana=${mondayOf(date)}`}
    >
      Voltar para a semana
    </Link>
  );

  if (!parseIso(date)) {
    return (
      <div className={styles.page}>
        {back}
        <EmptyState title="Data inválida" icon="search">
          Escolha um dia na semana do acompanhamento.
        </EmptyState>
      </div>
    );
  }
  return <DayContent patientId={patientId} date={date} back={back} />;
}

function DayContent({
  patientId,
  date,
  back,
}: {
  patientId: string;
  date: string;
  back: React.ReactNode;
}) {
  const [categories] = useDailyCategories(patientId, [date]);
  const executions = useExecutions(patientId, date, date);
  const summary = useDailySummary(patientId, date);
  const plan = useWeeklyPlan(patientId, summary.data?.planId);
  const prescriptions = usePatientPrescriptions(patientId);

  const plannedMeals = (plan.data?.meals ?? []).filter((meal) => meal.date === date);
  const foodName = useFoodNames([
    ...plannedMeals.flatMap((meal) => (meal.items ?? []).map((item) => item.foodId)),
    ...(executions.data ?? []).flatMap((e) => (e.items ?? []).map((item) => item.foodId)),
  ]);

  // Dia sem plano: o servidor pode recusar o resumo; a tela segue com o que houver.
  const summaryMissing =
    summary.error instanceof ApiError && summary.error.status >= 400 && summary.error.status < 500;
  const blocking = [categories, executions, plan, ...(summaryMissing ? [] : [summary])].find(
    (query) => query.isError,
  );

  const heading = (
    <h2 className={styles.title}>
      {weekdayLabel(date)}, {fullDate(date)}
    </h2>
  );

  if (blocking) {
    return (
      <div className={styles.page}>
        {back}
        {heading}
        <Alert
          tone="danger"
          title="Não foi possível carregar o dia"
          action={
            <Button size="sm" variant="outline" onClick={() => void blocking.refetch()}>
              Tentar de novo
            </Button>
          }
        >
          {blocking.error instanceof ApiError && blocking.error.status === 0
            ? "Não foi possível falar com o servidor."
            : "Tente novamente em instantes."}
        </Alert>
      </div>
    );
  }

  if (
    categories.isPending ||
    executions.isPending ||
    (summary.isPending && !summaryMissing) ||
    (plan.isPending && plan.fetchStatus !== "idle")
  ) {
    return (
      <div className={styles.page}>
        {back}
        {heading}
        <p role="status" aria-busy="true" className={styles.muted}>
          Carregando o dia…
        </p>
      </div>
    );
  }

  const [day] = buildWeek({
    dates: [date],
    today: todayIso(),
    categories: [categories.data ?? null],
    executions: executions.data ?? [],
    markers: new Map(),
  });

  const versionId = summary.data?.prescriptionVersionId;
  const version = (prescriptions.data ?? [])
    .flatMap((p) => p.versions ?? [])
    .find((v) => v.id === versionId);
  const targets: Map<string, Target> | null = prescriptions.isError
    ? null
    : new Map((version?.nutritionTargets ?? []).map((t) => [t.nutrientCode ?? "", t]));

  return (
    <div className={styles.page}>
      {back}
      {heading}
      {MEAL_TYPES.map((type) => (
        <CategoryBlock
          key={type}
          type={type}
          cell={day.cells[type]}
          planned={plannedMeals.filter((meal) => meal.mealType === type)}
          executions={(executions.data ?? []).filter((e) => e.mealType === type)}
          foodName={foodName}
        />
      ))}
      <NutritionCompare summary={summary.data ?? null} targets={targets} />
    </div>
  );
}
