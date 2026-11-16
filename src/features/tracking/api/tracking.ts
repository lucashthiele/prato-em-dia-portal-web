import { useQueries, useQuery } from "@tanstack/react-query";
import { client, type components } from "../../../shared/api";

export type MealCategory = components["schemas"]["MealCategory"];
export type DailyMealCategories = components["schemas"]["DailyMealCategories"];
export type Execution = components["schemas"]["Execution"];
export type Calendar = components["schemas"]["Calendar"];
export type DailySummary = components["schemas"]["DailySummary"];
export type WeeklyPlan = components["schemas"]["WeeklyPlanOutput"];

/** Estado de cada categoria no dia; o servidor já resolve a sobreposição de planos. */
export function useDailyCategories(patientId: string, dates: string[]) {
  return useQueries({
    queries: dates.map((date) => ({
      queryKey: ["tracking", patientId, "categories", date],
      queryFn: async (): Promise<DailyMealCategories | null> => {
        const { data } = await client.GET(
          "/api/v1/nutritionists/me/patients/{patientId}/daily-meal-categories",
          { params: { path: { patientId }, query: { date } } },
        );
        return data ?? null;
      },
    })),
  });
}

/** Uma chamada por semana (ou por dia, no detalhe). */
export function useExecutions(patientId: string, from: string, to: string) {
  return useQuery({
    queryKey: ["tracking", patientId, "executions", from, to],
    queryFn: async (): Promise<Execution[]> => {
      const { data } = await client.GET(
        "/api/v1/nutritionists/me/patients/{patientId}/meal-executions",
        { params: { path: { patientId }, query: { from, to } } },
      );
      return data ?? [];
    },
  });
}

/** Períodos de planos e versões; muda pouco, então fica em cache entre as semanas. */
export function useCalendar(patientId: string) {
  return useQuery({
    queryKey: ["tracking", patientId, "calendar"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Calendar | null> => {
      const { data } = await client.GET(
        "/api/v1/nutritionists/me/patients/{patientId}/calendar-periods",
        { params: { path: { patientId } } },
      );
      return data ?? null;
    },
  });
}

export function useDailySummary(patientId: string, date: string) {
  return useQuery({
    queryKey: ["tracking", patientId, "summary", date],
    queryFn: async (): Promise<DailySummary | null> => {
      const { data } = await client.GET(
        "/api/v1/nutritionists/me/patients/{patientId}/daily-nutrition-summary",
        { params: { path: { patientId }, query: { date } } },
      );
      return data ?? null;
    },
  });
}

export function useWeeklyPlan(patientId: string, planId: string | undefined) {
  return useQuery({
    queryKey: ["tracking", patientId, "plan", planId],
    enabled: Boolean(planId),
    queryFn: async (): Promise<WeeklyPlan | null> => {
      const { data } = await client.GET(
        "/api/v1/nutritionists/me/patients/{patientId}/weekly-plans/{planId}",
        { params: { path: { patientId, planId: planId! } } },
      );
      return data ?? null;
    },
  });
}
