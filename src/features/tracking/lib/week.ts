import type { Calendar, DailyMealCategories, Execution } from "../api/tracking";
import { MEAL_TYPES, type MealType } from "./labels";

export type CellState = "logged" | "partial" | "none";

export type Cell =
  /** Sem refeição planejada na categoria: aparece como "—", diferente de "Sem registro". */
  | { kind: "unplanned" }
  /** Dia que ainda não chegou e tem refeição prevista: não há estado a mostrar. */
  | { kind: "upcoming" }
  | { kind: "state"; state: CellState; substituted: boolean };

export interface Day {
  date: string;
  future: boolean;
  /** Número da versão que passa a valer neste dia (troca de versão), quando conhecido. */
  versionFrom?: number;
  cells: Record<MealType, Cell>;
}

export interface Counts {
  planned: number;
  logged: number;
  partial: number;
  none: number;
  substituted: number;
}

const STATE: Record<string, CellState> = { LOGGED: "logged", PARTIAL: "partial" };

function hasSubstitution(executions: Execution[], date: string, type: MealType): boolean {
  return executions.some(
    (execution) =>
      execution.date === date &&
      execution.mealType === type &&
      (execution.items ?? []).some((item) => item.allowedSubstitutionId),
  );
}

/** Troca de versão: o início de cada período de versão depois do primeiro. */
export function versionMarkers(
  calendar: Calendar | null | undefined,
  versionNumber: (versionId: string) => number | undefined,
): Map<string, number> {
  const markers = new Map<string, number>();
  const periods = [...(calendar?.prescriptions ?? [])]
    .filter((period) => period.start && period.versionId)
    .sort((a, b) => a.start!.localeCompare(b.start!));
  periods.forEach((period, index) => {
    if (index === 0 || period.versionId === periods[index - 1].versionId) return;
    const number = versionNumber(period.versionId!);
    if (number != null) markers.set(period.start!, number);
  });
  return markers;
}

export interface WeekInput {
  dates: string[];
  today: string;
  /** Uma entrada por data; `null` quando o servidor não tem estado para o dia. */
  categories: (DailyMealCategories | null)[];
  executions: Execution[];
  markers: Map<string, number>;
}

export function buildWeek({ dates, today, categories, executions, markers }: WeekInput): Day[] {
  return dates.map((date, index) => {
    const future = date > today;
    const byType = new Map(
      (categories[index]?.categories ?? []).map((category) => [category.mealType, category]),
    );
    const cells = {} as Record<MealType, Cell>;
    for (const type of MEAL_TYPES) {
      const category = byType.get(type);
      const planned = Boolean(category?.plannedMealId);
      const state = STATE[category?.state ?? ""] ?? "none";
      if (future) cells[type] = planned ? { kind: "upcoming" } : { kind: "unplanned" };
      else if (!category || (!planned && state === "none")) cells[type] = { kind: "unplanned" };
      else
        cells[type] = {
          kind: "state",
          state,
          substituted: hasSubstitution(executions, date, type),
        };
    }
    return { date, future, versionFrom: markers.get(date), cells };
  });
}

/** Contagens de categorias; dias futuros não entram e "Sem registro" conta só as previstas. */
export function countWeek(days: Day[], categories: (DailyMealCategories | null)[]): Counts {
  const counts: Counts = { planned: 0, logged: 0, partial: 0, none: 0, substituted: 0 };
  days.forEach((day, index) => {
    if (day.future) return;
    const planned = new Set(
      (categories[index]?.categories ?? []).filter((c) => c.plannedMealId).map((c) => c.mealType),
    );
    for (const type of MEAL_TYPES) {
      const cell = day.cells[type];
      if (planned.has(type)) counts.planned += 1;
      if (cell.kind !== "state") continue;
      if (cell.state === "logged") counts.logged += 1;
      else if (cell.state === "partial") counts.partial += 1;
      else counts.none += 1;
      if (cell.substituted) counts.substituted += 1;
    }
  });
  return counts;
}

/** Semana sem plano e sem registros: o painel mostra um estado vazio em vez de zeros. */
export function isEmptyWeek(days: Day[]): boolean {
  return days.every((day) => MEAL_TYPES.every((type) => day.cells[type].kind === "unplanned"));
}
